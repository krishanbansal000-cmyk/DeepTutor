from __future__ import annotations

from types import SimpleNamespace

import pytest

from deeptutor.agents.chat.agentic_pipeline import AgenticChatPipeline
from deeptutor.agents.chat.chat_agent import ChatAgent
from deeptutor.agents.chat.prompt_blocks import ChatPromptAssembler


@pytest.fixture(autouse=True)
def _fake_llm_config(monkeypatch: pytest.MonkeyPatch) -> None:
    cfg = SimpleNamespace(
        binding="openai",
        model="gpt-test",
        api_key="sk-test",
        base_url="https://example.test/v1",
        api_version=None,
    )
    monkeypatch.setattr(
        "deeptutor.agents.chat.agentic_pipeline.get_llm_config",
        lambda: cfg,
    )
    monkeypatch.setattr("deeptutor.agents.base_agent.get_llm_config", lambda: cfg)


def test_agentic_chat_final_prompt_uses_selected_language(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class FakeRegistry:
        def build_prompt_text(self, *_args, **_kwargs) -> str:
            return "- tool"

    monkeypatch.setattr(
        "deeptutor.agents.chat.agentic_pipeline.get_tool_registry",
        lambda: FakeRegistry(),
    )

    from deeptutor.core.context import UnifiedContext

    ctx = UnifiedContext()
    hi_prompt = AgenticChatPipeline(language="hi")._build_system_prompt([], ctx)
    legacy_prompt = AgenticChatPipeline(language="zh")._build_system_prompt([], ctx)
    en_prompt = AgenticChatPipeline(language="en")._build_system_prompt([], ctx)

    # Prompt blocks are phase-specific, but the shared language directive
    # still runs at the end, so per-language imperatives must surface.
    assert "सभी learner-facing explanations" in hi_prompt
    assert "Write ALL reader-facing text" in en_prompt
    # The Drona chat flow intentionally sends the retired Chinese setting to
    # English instead of loading a Chinese prompt bundle.
    assert "Write ALL reader-facing text" in legacy_prompt
    assert "You are DeepTutor" in en_prompt


def test_mastery_plugin_system_prompt_uses_localized_fallback(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class FakeRegistry:
        def build_prompt_text(self, *_args, **_kwargs) -> str:
            return "- tool"

    monkeypatch.setattr(
        "deeptutor.agents.chat.agentic_pipeline.get_tool_registry",
        lambda: FakeRegistry(),
    )

    from deeptutor.core.context import UnifiedContext

    ctx = UnifiedContext(metadata={"mastery_mode": True, "mastery_path_id": "p1"})
    hi_prompt = AgenticChatPipeline(language="hi")._build_system_prompt([], ctx)
    en_prompt = AgenticChatPipeline(language="en")._build_system_prompt([], ctx)

    assert "## mastery_tutor" in hi_prompt
    assert "Mastery Tutor mode" in hi_prompt
    assert "सभी learner-facing explanations" in hi_prompt
    assert "## mastery_tutor" in en_prompt
    assert "Mastery Tutor mode" in en_prompt


def test_legacy_chat_agent_system_prompt_uses_selected_language() -> None:
    hi_messages = ChatAgent(language="hi", config={}).build_messages(
        message="Gradient descent समझाइए",
        history=[],
    )
    legacy_messages = ChatAgent(language="zh", config={}).build_messages(
        message="Explain gradient descent",
        history=[],
    )
    en_messages = ChatAgent(language="en", config={}).build_messages(
        message="Explain gradient descent",
        history=[],
    )

    assert "You are DeepTutor" in hi_messages[0]["content"]
    assert "सभी learner-facing explanations" in hi_messages[0]["content"]
    assert "Write ALL reader-facing text" in legacy_messages[0]["content"]
    assert "You are DeepTutor" in en_messages[0]["content"]
    assert "Write ALL reader-facing text" in en_messages[0]["content"]


def test_prompt_blocks_include_localized_optional_context() -> None:
    from deeptutor.core.context import UnifiedContext

    prompts = {
        "general": "General",
        "runtime_policy": "Policy",
        "loop": {
            "system": "Loop",
            "user": "Learner: {user_message}",
            "finish_exhausted": "The budget is exhausted; answer directly.",
        },
    }
    ctx = UnifiedContext(
        user_message="प्रकाश संश्लेषण समझाइए",
        persona_context="Use Socratic questions",
        memory_context="The learner likes examples",
    )
    assembler = ChatPromptAssembler(prompts=prompts, language="hi")

    blocks = assembler.blocks(context=ctx, tool_manifest="", workspace_note="Workspace ready")

    names = [block.name for block in blocks]
    assert names[:3] == ["general", "runtime_policy", "loop"]
    assert "persona_style" in names
    assert "memory" in names
    assert "workspace" in names
    assert assembler.user_message(context=ctx) == "Learner: प्रकाश संश्लेषण समझाइए"
    assert (
        assembler.finish_exhausted_instruction()
        == "The budget is exhausted; answer directly."
    )
