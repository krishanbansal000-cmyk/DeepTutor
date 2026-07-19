"""Voice endpoints — text-to-speech, speech-to-text, and voice chat.

These are thin HTTP surfaces over :mod:`deeptutor.services.voice`. Config comes
from the admin-managed model catalog (``services.tts`` / ``services.stt``), so
voice is shared infrastructure like embedding/search — any authenticated user
may call it; it is not gated by per-user LLM grants.

The ``/voice/chat`` endpoint additionally consults the active LLM profile: when
the model advertises ``supports_audio`` (e.g. Gemma 4 E4B IT on DeepInfra), the
audio is sent directly to the LLM as an ``input_audio`` content part — skipping
the separate STT step. Otherwise the audio is transcribed via the active STT
provider and the transcript is returned for the caller to send through the
normal chat pipeline.
"""

from __future__ import annotations

import base64 as _b64
import io
import logging
import wave

from fastapi import APIRouter, File, Form, HTTPException, Response, UploadFile, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from deeptutor.services.voice import (
    VoiceProviderError,
    stream_speech,
    synthesize_speech,
    transcribe_audio,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Guard against pathological uploads (the providers cap well below this anyway).
_MAX_AUDIO_BYTES = 25 * 1024 * 1024  # 25 MB, matching OpenAI's limit.
# Gemma 4 E4B accepts up to 30s of audio; cap uploads so we don't attempt to
# send clips the model will reject. 25 MB of wav/mp3 is well over 30s.
_MAX_VOICE_CHAT_AUDIO_BYTES = 10 * 1024 * 1024  # 10 MB
_DEFAULT_PCM_SAMPLE_RATE = 24_000
_DEFAULT_PCM_CHANNELS = 1
_PCM16_SAMPLE_WIDTH = 2

# MIME types the direct-audio LLM path can forward. DeepInfra's OpenAI-
# compatible schema accepts wav and mp3 only.
_DIRECT_AUDIO_MIME_TYPES = frozenset(
    {"audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp3"}
)
_DIRECT_AUDIO_FORMAT_BY_MIME = {
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
}


class TTSRequest(BaseModel):
    """Text-to-speech request body."""

    text: str = Field(..., min_length=1)
    voice: str | None = None
    format: str | None = None
    language: str | None = None


def _parse_pcm_content_type(content_type: str) -> tuple[int, int] | None:
    """Return ``(sample_rate, channels)`` when a provider sent raw PCM audio."""
    media_type, *params = (content_type or "").split(";")
    if media_type.strip().lower() not in {"audio/pcm", "audio/x-pcm", "audio/l16"}:
        return None
    sample_rate = _DEFAULT_PCM_SAMPLE_RATE
    channels = _DEFAULT_PCM_CHANNELS
    for item in params:
        key, sep, value = item.strip().partition("=")
        if not sep:
            continue
        key = key.strip().lower()
        value = value.strip().strip('"')
        try:
            parsed = int(value)
        except ValueError:
            continue
        if key in {"rate", "sample-rate", "samplerate"} and parsed > 0:
            sample_rate = parsed
        elif key in {"channels", "channel"} and parsed > 0:
            channels = parsed
    return sample_rate, channels


def _pcm16_to_wav(audio: bytes, *, sample_rate: int, channels: int) -> bytes:
    """Wrap provider PCM16 bytes in a WAV container browsers can play."""
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(channels)
        wav.setsampwidth(_PCM16_SAMPLE_WIDTH)
        wav.setframerate(sample_rate)
        wav.writeframes(audio)
    return buffer.getvalue()


@router.post("/tts")
async def text_to_speech(payload: TTSRequest) -> Response:
    """Synthesize ``text`` to audio using the active TTS provider."""
    try:
        audio, content_type = await synthesize_speech(
            payload.text,
            voice=payload.voice,
            response_format=payload.format,
            language=payload.language,
        )
    except ValueError as exc:  # missing/invalid configuration
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except VoiceProviderError as exc:
        logger.warning("TTS provider error: %s", exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    pcm_info = _parse_pcm_content_type(content_type)
    if pcm_info:
        sample_rate, channels = pcm_info
        audio = _pcm16_to_wav(audio, sample_rate=sample_rate, channels=channels)
        content_type = "audio/wav"
    return Response(
        content=audio,
        media_type=content_type,
        headers={"Cache-Control": "no-store"},
    )


@router.post("/tts/stream")
async def stream_text_to_speech(payload: TTSRequest) -> StreamingResponse:
    """Stream local PCM16 speech as soon as Piper finishes each sentence."""
    try:
        audio = await stream_speech(
            payload.text,
            voice=payload.voice,
            language=payload.language,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except VoiceProviderError as exc:
        logger.warning("Streaming TTS provider error: %s", exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    return StreamingResponse(
        audio.chunks,
        media_type=audio.content_type,
        headers={
            "Cache-Control": "no-store",
            "X-Accel-Buffering": "no",
            "X-Audio-Sample-Rate": str(audio.sample_rate),
            "X-Audio-Channels": str(audio.channels),
            "X-Audio-Sample-Width": str(audio.sample_width),
        },
    )


@router.post("/stt")
async def speech_to_text(
    file: UploadFile = File(...),
    language: str | None = Form(default=None),
) -> dict[str, str]:
    """Transcribe an uploaded audio clip using the active STT provider."""
    audio = await file.read()
    if not audio:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty audio upload.")
    if len(audio) > _MAX_AUDIO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Audio exceeds the 25 MB limit.",
        )
    try:
        text = await transcribe_audio(
            audio,
            filename=file.filename or "audio.webm",
            content_type=file.content_type or "application/octet-stream",
            language=language,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except VoiceProviderError as exc:
        logger.warning("STT provider error: %s", exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    return {"text": text}


def _resolve_active_llm_audio_capability() -> tuple[bool, str, str, str, str]:
    """Inspect the active LLM profile/model and return audio-routing info.

    Returns ``(supports_audio, model, api_key, base_url, binding)``. When
    ``supports_audio`` is False the caller should fall back to STT.
    """
    from deeptutor.services.config.provider_runtime import resolve_llm_runtime_config
    from deeptutor.services.llm.capabilities import supports_audio as _supports_audio

    config = resolve_llm_runtime_config()
    binding = config.binding or "openai"
    can_audio = bool(_supports_audio(binding, config.model))
    return can_audio, config.model, config.api_key, config.base_url or "", binding


@router.post("/voice/chat")
async def voice_chat(
    file: UploadFile = File(...),
    prompt: str = Form(default=""),
    language: str | None = Form(default=None),
) -> dict[str, str]:
    """Send a voice clip to the active LLM.

    When the active LLM model advertises ``supports_audio`` (Gemma 4 E4B IT
    on DeepInfra), the audio is forwarded directly as an ``input_audio``
    content part — the model transcribes and reasons in one pass, no
    separate STT step needed.

    When the active LLM does *not* support audio, the clip is transcribed
    via the active STT provider and the transcript is returned. The caller
    can then send the transcript through the normal chat pipeline.

    The optional ``prompt`` is prepended to the audio (e.g. "Transcribe and
    answer this question:"). When falling back to STT, the prompt is
    ignored and only the transcript is returned.

    Returns ``{"mode": "direct" | "stt", "text": <response or transcript>}``.
    """
    audio = await file.read()
    if not audio:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty audio upload.")
    if len(audio) > _MAX_VOICE_CHAT_AUDIO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Audio exceeds the 10 MB limit for voice chat.",
        )

    content_type = (file.content_type or "").lower()
    can_audio, model, api_key, base_url, binding = _resolve_active_llm_audio_capability()

    # Direct-audio path: forward to the LLM as input_audio.
    if can_audio and content_type in _DIRECT_AUDIO_MIME_TYPES:
        try:
            response_text = await _send_audio_to_llm(
                audio=audio,
                mime_type=content_type,
                prompt=prompt,
                model=model,
                api_key=api_key,
                base_url=base_url,
            )
        except Exception as exc:
            logger.warning("Direct-audio LLM call failed: %s — falling back to STT", exc)
            # Fall through to STT path below.
            can_audio = False

    if not can_audio or content_type not in _DIRECT_AUDIO_MIME_TYPES:
        # STT fallback: transcribe and return the transcript.
        try:
            transcript = await transcribe_audio(
                audio,
                filename=file.filename or "audio.webm",
                content_type=content_type or "application/octet-stream",
                language=language,
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
            ) from exc
        except VoiceProviderError as exc:
            logger.warning("STT provider error: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)
            ) from exc
        return {"mode": "stt", "text": transcript}

    return {"mode": "direct", "text": response_text}


async def _send_audio_to_llm(
    *,
    audio: bytes,
    mime_type: str,
    prompt: str,
    model: str,
    api_key: str,
    base_url: str,
) -> str:
    """Forward an audio clip to the active LLM as an ``input_audio`` part.

    Uses the OpenAI-compatible chat completions API directly (no agent loop,
    no tools) — this is a single-turn voice query. The caller is expected to
    feed the response back into the chat pipeline if further turns are needed.
    """
    import httpx

    audio_format = _DIRECT_AUDIO_FORMAT_BY_MIME.get(mime_type, "wav")
    audio_b64 = _b64.b64encode(audio).decode("ascii")

    user_content: list[dict] = []
    if prompt:
        user_content.append({"type": "text", "text": prompt})
    user_content.append(
        {
            "type": "input_audio",
            "input_audio": {"data": audio_b64, "format": audio_format},
        }
    )

    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are DeepTutor, a helpful learning companion. The user "
                    "has sent a voice message. Transcribe it if needed, then "
                    "answer or respond helpfully."
                ),
            },
            {"role": "user", "content": user_content},
        ],
        "stream": False,
    }

    url = base_url.rstrip("/") + "/chat/completions"
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            url,
            json=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )
        resp.raise_for_status()
        data = resp.json()

    choices = data.get("choices") or []
    if not choices:
        return ""
    message = choices[0].get("message") or {}
    return str(message.get("content") or "")
