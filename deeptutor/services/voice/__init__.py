"""Voice services — text-to-speech and speech-to-text.

Public facade used by the API router and the config test runner. Config is
resolved from the model catalog (``services.tts`` / ``services.stt``) exactly
like embedding/LLM, so voice providers are configured through the same
Settings catalog UI.
"""

from __future__ import annotations

import asyncio
from typing import Any

from deeptutor.services.voice.adapters import get_stt_adapter, get_tts_adapter
from deeptutor.services.voice.base import TTSStream, VoiceProviderError, strip_markdown_for_speech
from deeptutor.services.voice.config import STTConfig, TTSConfig


async def synthesize_speech(
    text: str,
    *,
    catalog: dict[str, Any] | None = None,
    voice: str | None = None,
    response_format: str | None = None,
    language: str | None = None,
    strip_markdown: bool = True,
) -> tuple[bytes, str]:
    """Synthesize ``text`` using the active TTS catalog selection.

    Returns ``(audio_bytes, content_type)``. ``voice`` / ``response_format``
    override the catalog defaults for this call.
    """
    from deeptutor.services.config.provider_runtime import resolve_tts_runtime_config

    config = resolve_tts_runtime_config(catalog=catalog)
    if voice:
        config.voice = voice
    if response_format:
        config.response_format = response_format
    if language:
        config.language = language
    prepared = (
        strip_markdown_for_speech(text, max_chars=config.max_input_chars)
        if strip_markdown
        else text.strip()
    )
    if not prepared:
        raise VoiceProviderError("Nothing to speak after cleaning the text.")
    adapter = get_tts_adapter(config.adapter)
    return await adapter.synthesize(prepared, config)


async def stream_speech(
    text: str,
    *,
    catalog: dict[str, Any] | None = None,
    voice: str | None = None,
    language: str | None = None,
    strip_markdown: bool = True,
) -> TTSStream:
    """Prepare a raw PCM speech stream using the active local TTS adapter."""
    from deeptutor.services.config.provider_runtime import resolve_tts_runtime_config

    config = resolve_tts_runtime_config(catalog=catalog)
    if voice:
        config.voice = voice
    if language:
        config.language = language
    prepared = (
        strip_markdown_for_speech(text, max_chars=config.max_input_chars)
        if strip_markdown
        else text.strip()
    )
    if not prepared:
        raise VoiceProviderError("Nothing to speak after cleaning the text.")
    adapter = get_tts_adapter(config.adapter)
    # Voice loading and ONNX session creation are synchronous. Keep them off
    # the API event loop; StreamingResponse iterates the returned sync generator
    # in Starlette's worker pool as chunks become available.
    return await asyncio.to_thread(adapter.prepare_stream, prepared, config)


async def transcribe_audio(
    audio: bytes,
    *,
    catalog: dict[str, Any] | None = None,
    filename: str = "audio.webm",
    content_type: str = "application/octet-stream",
    language: str | None = None,
) -> str:
    """Transcribe ``audio`` using the active STT catalog selection."""
    from deeptutor.services.config.provider_runtime import resolve_stt_runtime_config

    config = resolve_stt_runtime_config(catalog=catalog)
    if language:
        config.language = language
    adapter = get_stt_adapter(config.adapter)
    return await adapter.transcribe(audio, config, filename=filename, content_type=content_type)


__all__ = [
    "VoiceProviderError",
    "TTSConfig",
    "STTConfig",
    "synthesize_speech",
    "stream_speech",
    "transcribe_audio",
    "strip_markdown_for_speech",
]
