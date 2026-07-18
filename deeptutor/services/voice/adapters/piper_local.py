"""In-process Piper adapter with cached English and Hindi voices.

Piper is imported lazily so DeepTutor continues to run without the optional
``voice-piper`` extra. Voice files live in the ignored runtime-data tree at
``data/models/piper`` and are loaded once per backend process.
"""

from __future__ import annotations

import asyncio
from collections.abc import Iterator
import logging
from pathlib import Path
import re
from threading import Lock
from typing import Any

from deeptutor.runtime.home import get_runtime_data_root
from deeptutor.services.voice.base import BaseTTSAdapter, TTSStream, VoiceProviderError
from deeptutor.services.voice.config import TTSConfig

logger = logging.getLogger(__name__)

DEFAULT_ENGLISH_VOICE = "en_US-kristin-medium"
DEFAULT_HINDI_VOICE = "hi_IN-priyamvada-medium"

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
        stream = await asyncio.to_thread(self.prepare_stream, text, config)
        audio = await asyncio.to_thread(lambda: b"".join(stream.chunks))
        if not audio:
            raise VoiceProviderError("Piper returned empty audio.")
        content_type = (
            f"audio/pcm;rate={stream.sample_rate};channels={stream.channels}"
        )
        return audio, content_type

    def prepare_stream(self, text: str, config: TTSConfig) -> TTSStream:
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


__all__ = [
    "DEFAULT_ENGLISH_VOICE",
    "DEFAULT_HINDI_VOICE",
    "PiperLocalTTSAdapter",
]
