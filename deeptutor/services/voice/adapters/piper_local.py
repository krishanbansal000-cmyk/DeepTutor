"""In-process Piper adapter with cached English and Hindi voices.

Piper is imported lazily so DeepTutor continues to run without the optional
``voice-piper`` extra. Voice files live in the ignored runtime-data tree at
``data/models/piper`` and are loaded once per backend process.

If Piper's espeakbridge DLL is blocked by Windows Application Control policy
(AppLocker/WDAC), the adapter falls back to pyttsx3 (Windows SAPI5 speech
engine) so Drona can still speak in classroom mode.
"""

from __future__ import annotations

import asyncio
from collections.abc import Iterator
import logging
from pathlib import Path
import re
import tempfile
import os
from threading import Lock
from typing import Any

from deeptutor.runtime.home import get_runtime_data_root
from deeptutor.services.voice.base import BaseTTSAdapter, TTSStream, VoiceProviderError
from deeptutor.services.voice.config import TTSConfig

logger = logging.getLogger(__name__)

DEFAULT_ENGLISH_VOICE = "en_US-kristin-medium"
DEFAULT_HINDI_VOICE = "hi_IN-priyamvada-medium"

# Set to True when Piper's espeakbridge DLL fails to load (Windows AppLocker).
# Once set, all synthesis falls back to pyttsx3 (Windows SAPI5 built-in speech).
_piper_blocked: bool | None = None

_VOICE_ALIASES = {
    "en": DEFAULT_ENGLISH_VOICE,
    "eng": DEFAULT_ENGLISH_VOICE,
    "english": DEFAULT_ENGLISH_VOICE,
    "en_us": DEFAULT_ENGLISH_VOICE,
    "hi": DEFAULT_HINDI_VOICE,
    "hin": DEFAULT_HINDI_VOICE,
    "hindi": DEFAULT_HINDI_VOICE,
    "hi_in": DEFAULT_HINDI_VOICE,
    # Piper has no dedicated Bundeli/Awadhi/Bhojpuri models. Hindi is the
    # closest local phonemizer/voice fallback for these Devanagari languages.
    "bundeli": DEFAULT_HINDI_VOICE,
    "awadhi": DEFAULT_HINDI_VOICE,
    "bhojpuri": DEFAULT_HINDI_VOICE,
}
_HINDI_LANGUAGES = {"hi", "hin", "hi-in", "hi_in", "hindi", "bundeli", "awadhi", "bhojpuri"}
_SAFE_VOICE_ID = re.compile(r"^[A-Za-z0-9_-]+$")


class PiperLocalTTSAdapter(BaseTTSAdapter):
    """Run Piper locally and expose browser-friendly PCM16 chunks."""

    def __init__(self, model_dir: Path | None = None) -> None:
        self._model_dir = model_dir
        self._voices: dict[str, Any] = {}
        self._voice_locks: dict[str, Lock] = {}
        self._load_lock = Lock()

    @property
    def model_dir(self) -> Path:
        return (self._model_dir or (get_runtime_data_root() / "models" / "piper")).resolve()

    async def synthesize(self, text: str, config: TTSConfig) -> tuple[bytes, str]:
        global _piper_blocked
        # Check if Piper's espeakbridge is blocked; if so, use pyttsx3 fallback.
        if _piper_blocked is None:
            _piper_blocked = _check_piper_blocked()
        if _piper_blocked:
            return await _pyttsx3_synthesize(text, config)
        try:
            stream = await asyncio.to_thread(self.prepare_stream, text, config)
            audio = await asyncio.to_thread(lambda: b"".join(stream.chunks))
            if not audio:
                raise VoiceProviderError("Piper returned empty audio.")
            content_type = (
                f"audio/pcm;rate={stream.sample_rate};channels={stream.channels}"
            )
            return audio, content_type
        except VoiceProviderError as exc:
            if "espeakbridge" in str(exc).lower() or "Application Control" in str(exc):
                logger.warning("Piper espeakbridge blocked — falling back to pyttsx3 (Windows SAPI5)")
                _piper_blocked = True
                return await _pyttsx3_synthesize(text, config)
            raise

    def prepare_stream(self, text: str, config: TTSConfig) -> TTSStream:
        global _piper_blocked
        if _piper_blocked is None:
            _piper_blocked = _check_piper_blocked()
        if _piper_blocked:
            # pyttsx3 doesn't support streaming — return the whole WAV as
            # a single chunk so the StreamingResponse can still iterate it.
            import wave, io
            tmp_fd, tmp_path = tempfile.mkstemp(suffix=".wav")
            os.close(tmp_fd)
            try:
                import pyttsx3
                engine = pyttsx3.init()
                speed = config.speed if config.speed and config.speed > 0 else 1.0
                engine.setProperty("rate", int(200 * speed))
                engine.save_to_file(text, tmp_path)
                engine.runAndWait()
                with wave.open(tmp_path, "rb") as wav:
                    sample_rate = wav.getframerate()
                    channels = wav.getnchannels()
                    frames = wav.readframes(wav.getnframes())
                audio_bytes = frames
            except Exception as exc:
                raise VoiceProviderError(f"pyttsx3 streaming fallback failed: {exc}") from exc
            finally:
                try:
                    os.remove(tmp_path)
                except OSError:
                    pass
            return TTSStream(
                chunks=iter([audio_bytes]),
                sample_rate=sample_rate,
                channels=channels,
                sample_width=2,
            )
        voice_id = self._resolve_voice_id(config)
        voice = self._load_voice(voice_id)
        sample_rate = int(voice.config.sample_rate)
        return TTSStream(
            chunks=self._audio_chunks(voice_id, voice, text, config),
            sample_rate=sample_rate,
        )

    def _resolve_voice_id(self, config: TTSConfig) -> str:
        requested = (config.voice or "").strip()
        normalized = requested.lower().replace("-", "_")
        language = (config.language or "").strip().lower()

        if not requested or normalized in {"auto", "default"}:
            return (
                DEFAULT_HINDI_VOICE
                if language in _HINDI_LANGUAGES or language.split("-", 1)[0] == "hi"
                else DEFAULT_ENGLISH_VOICE
            )
        voice_id = _VOICE_ALIASES.get(normalized, requested)
        if not _SAFE_VOICE_ID.fullmatch(voice_id):
            raise VoiceProviderError(f"Invalid Piper voice name: {requested!r}")
        return voice_id

    def _load_voice(self, voice_id: str) -> Any:
        cached = self._voices.get(voice_id)
        if cached is not None:
            return cached

        with self._load_lock:
            cached = self._voices.get(voice_id)
            if cached is not None:
                return cached
            try:
                from piper import PiperVoice
            except ImportError as exc:
                raise VoiceProviderError(
                    'Piper is not installed. Run: pip install -e ".[voice-piper]"'
                ) from exc

            model_path = self.model_dir / f"{voice_id}.onnx"
            config_path = self.model_dir / f"{voice_id}.onnx.json"
            if not model_path.is_file() or not config_path.is_file():
                raise VoiceProviderError(
                    f"Piper voice {voice_id!r} is not installed in {self.model_dir}. "
                    "Download it with: python -m piper.download_voices "
                    f"--download-dir \"{self.model_dir}\" {voice_id}"
                )
            try:
                cached = PiperVoice.load(model_path, config_path=config_path)
            except Exception as exc:
                raise VoiceProviderError(
                    f"Could not load Piper voice {voice_id!r}: {exc}"
                ) from exc
            self._voices[voice_id] = cached
            self._voice_locks[voice_id] = Lock()
            logger.info("Loaded local Piper voice %s", voice_id)
            return cached

    def _audio_chunks(
        self,
        voice_id: str,
        voice: Any,
        text: str,
        config: TTSConfig,
    ) -> Iterator[bytes]:
        try:
            from piper import SynthesisConfig
        except ImportError as exc:  # pragma: no cover - checked while loading
            raise VoiceProviderError("Piper is not installed.") from exc

        speed = config.speed if config.speed and config.speed > 0 else 1.0
        synthesis_config = SynthesisConfig(length_scale=1.0 / speed)
        lock = self._voice_locks[voice_id]
        try:
            with lock:
                for chunk in voice.synthesize(text, syn_config=synthesis_config):
                    audio = chunk.audio_int16_bytes
                    if audio:
                        yield audio
        except VoiceProviderError:
            raise
        except Exception as exc:
            raise VoiceProviderError(f"Piper synthesis failed: {exc}") from exc


def _check_piper_blocked() -> bool:
    """Probe whether Piper's espeakbridge DLL can be loaded.

    Returns True when the DLL is blocked by Windows Application Control policy
    (AppLocker/WDAC). In that case, all synthesis falls back to pyttsx3.
    """
    try:
        # Importing espeakbridge triggers the DLL load. On Windows with
        # AppLocker, this raises ImportError with "Application Control" in
        # the message, or OSError — we catch both.
        from piper import espeakbridge  # noqa: F401
        try:
            espeakbridge.initialize()
        except Exception:
            return True
        return False
    except ImportError as exc:
        if "Application Control" in str(exc) or "DLL load failed" in str(exc):
            logger.warning("Piper espeakbridge DLL blocked — using pyttsx3 (Windows SAPI5) fallback for TTS")
            return True
        # piper not installed at all — let the normal error path handle it.
        return False
    except OSError:
        logger.warning("Piper espeakbridge DLL blocked — using pyttsx3 (Windows SAPI5) fallback for TTS")
        return True
    except Exception:
        return False


async def _pyttsx3_synthesize(text: str, config: TTSConfig) -> tuple[bytes, str]:
    """Fallback TTS using Windows SAPI5 speech engine via pyttsx3.

    Generates a WAV file and returns the bytes. This is used when Piper's
    espeakbridge DLL is blocked by Windows Application Control policy.
    """
    def _do_synthesize() -> tuple[bytes, str]:
        try:
            import pyttsx3
        except ImportError as exc:
            raise VoiceProviderError(
                "Neither Piper nor pyttsx3 is available. "
                "Run: pip install -e \".[voice-piper]\" or pip install pyttsx3"
            ) from exc

        engine = pyttsx3.init()
        # Set rate (speed). pyttsx3 rate is words-per-minute; default ~200.
        speed = config.speed if config.speed and config.speed > 0 else 1.0
        engine.setProperty("rate", int(200 * speed))

        # Try to set a voice matching the language.
        language = (config.language or "").strip().lower()
        voices = engine.getProperty("voices")
        if voices:
            if language.startswith("hi") or language in {"hindi", "bundeli", "awadhi", "bhojpuri"}:
                # Look for a Hindi voice in SAPI5
                for v in voices:
                    if "hindi" in v.name.lower() or "hi" in v.id.lower():
                        engine.setProperty("voice", v.id)
                        break
            else:
                # Default to first English voice
                for v in voices:
                    if "english" in v.name.lower() or "en" in v.id.lower():
                        engine.setProperty("voice", v.id)
                        break

        # Save to a temp WAV file
        tmp_fd, tmp_path = tempfile.mkstemp(suffix=".wav")
        os.close(tmp_fd)
        try:
            engine.save_to_file(text, tmp_path)
            engine.runAndWait()
            with open(tmp_path, "rb") as f:
                audio = f.read()
            if not audio:
                raise VoiceProviderError("pyttsx3 returned empty audio.")
            return audio, "audio/wav"
        finally:
            try:
                os.remove(tmp_path)
            except OSError:
                pass

    return await asyncio.to_thread(_do_synthesize)


__all__ = [
    "DEFAULT_ENGLISH_VOICE",
    "DEFAULT_HINDI_VOICE",
    "PiperLocalTTSAdapter",
]
