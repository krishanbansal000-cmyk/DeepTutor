"""Shared language directives for prompt-driven LLM calls.

This helper centralizes the "stay in the requested language" instruction so
different modules can share the same behavior without depending on book-only
utilities.
"""

from __future__ import annotations

_LANGUAGE_LABELS: dict[str, str] = {
    "zh": "中文（简体）",
    "zh-cn": "中文（简体）",
    "zh-tw": "繁體中文",
    "en": "English",
    "hi": "Hindi / Hinglish (हिन्दी)",
    "bundeli": "Bundeli (बुन्देली)",
    "awadhi": "Awadhi (अवधी)",
    "bhojpuri": "Bhojpuri (भोजपुरी)",
    "ja": "日本語",
    "ko": "한국어",
    "es": "Español",
    "fr": "Français",
    "de": "Deutsch",
    "ru": "Русский",
    "pt": "Português",
    "it": "Italiano",
}


def normalize_language(language: str | None) -> str:
    return (language or "en").strip().lower() or "en"


def language_label(language: str | None) -> str:
    code = normalize_language(language)
    if code in _LANGUAGE_LABELS:
        return _LANGUAGE_LABELS[code]
    base = code.split("-", 1)[0]
    return _LANGUAGE_LABELS.get(base, language or "English")


def language_directive(language: str | None) -> str:
    """Return a strict reader-facing language instruction for prompts."""
    code = normalize_language(language)
    label = language_label(code)
    if code.startswith("zh"):
        return (
            "\n\n[语言要求 / Language] "
            f"请严格使用{label}撰写所有面向读者的文本（标题、正文、解释、提示、过渡句、"
            "题干、选项等），即使参考资料、JSON 字段名或英文术语出现在 prompt 中也"
            "不得切换语言；保留必要的专有名词原文（如人名、产品名、公式中的变量符号"
            f"等）即可，其余一律使用{label}。"
        )
    if code == "en":
        return (
            "\n\n[Language] Write ALL reader-facing text (titles, prose, "
            "explanations, hints, transitions, quiz stems, options, etc.) in "
            "English. Do NOT switch languages even if the source material, "
            "JSON keys, or examples in this prompt are in another language. "
            "Keep proper nouns (people, products, formula symbols) in their "
            "original form."
        )
    if code == "hi":
        return (
            "\n\n[भाषा / Language] सभी learner-facing explanations को सहज Hindi/Hinglish "
            "में लिखें। अवधारणाएँ मुख्यतः हिन्दी में समझाएँ, लेकिन programming syntax, code, "
            "API names, equations, units, scientific terminology, citations और proper nouns को "
            "उनके प्रचलित English रूप में ही रखें। Direct answer देने से पहले Socratic hints और "
            "guiding questions को प्राथमिकता दें।"
        )
    if code in {"bundeli", "awadhi", "bhojpuri"}:
        return (
            f"\n\n[भाषा / Language] सभी learner-facing explanations सहज {label} में लिखें। "
            "जहाँ किसी technical concept का regional-language शब्द अस्पष्ट हो, वहाँ सरल Hindi "
            "का सहारा लें; programming syntax, code, API names, equations, units, scientific "
            "terminology, citations और proper nouns को English में रखें। Direct answer देने से "
            "पहले Socratic hints और guiding questions को प्राथमिकता दें।"
        )
    return (
        f"\n\n[Language] Write ALL reader-facing text strictly in {label}. "
        "Do NOT switch languages even if the source material, JSON keys, or "
        "examples in this prompt are in a different language. Keep proper "
        "nouns (people, products, formula symbols) in their original form."
    )


def append_language_directive(system_prompt: str | None, language: str | None) -> str:
    """Append the language directive to an existing system prompt."""
    base = (system_prompt or "").rstrip()
    directive = language_directive(language).strip()
    if not base:
        return directive
    return f"{base}\n\n{directive}"


__all__ = [
    "append_language_directive",
    "language_directive",
    "language_label",
    "normalize_language",
]
