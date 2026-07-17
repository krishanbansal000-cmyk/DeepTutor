from __future__ import annotations

import pytest

from deeptutor.agents.chat.agentic_pipeline import AgenticChatPipeline
from deeptutor.services.config.loader import parse_language
from deeptutor.services.prompt.language import language_directive
from deeptutor.services.settings.interface_settings import _normalize_language


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("hinglish", "hi"),
        ("bundelkhandi", "bundeli"),
        ("Bundeli", "bundeli"),
        ("Awadhi", "awadhi"),
        ("Bhojpuri", "bhojpuri"),
    ],
)
def test_up_language_aliases_are_normalized(raw: str, expected: str) -> None:
    assert parse_language(raw) == expected
    assert _normalize_language(raw) == expected


@pytest.mark.parametrize("language", ["hi", "bundeli", "awadhi", "bhojpuri"])
def test_up_language_directives_preserve_technical_english(language: str) -> None:
    directive = language_directive(language)
    assert "programming syntax" in directive
    assert "English" in directive
    assert "Socratic hints" in directive


@pytest.mark.parametrize("language", ["bundeli", "awadhi", "bhojpuri"])
def test_chat_pipeline_keeps_selected_regional_language(
    language: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    class FakeRegistry:
        pass

    monkeypatch.setattr(
        "deeptutor.agents.chat.agentic_pipeline.get_tool_registry",
        lambda: FakeRegistry(),
    )
    monkeypatch.setattr(
        "deeptutor.agents.chat.agentic_pipeline.get_llm_config",
        lambda: type(
            "Config",
            (),
            {
                "binding": "openai",
                "model": "test-model",
                "api_key": "test-key",
                "base_url": "https://example.test/v1",
            },
        )(),
    )

    assert AgenticChatPipeline(language=language).language == language
