"use client";

import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  useSettings,
  type UiSettings,
} from "@/components/settings/SettingsContext";

type UserLanguage = Exclude<UiSettings["language"], "zh">;

const USER_LANGUAGES: Array<{
  id: UserLanguage;
  labelKey: string;
}> = [
  { id: "en", labelKey: "language.english" },
  { id: "hi", labelKey: "language.hindi" },
  { id: "bundeli", labelKey: "language.bundeli" },
  { id: "awadhi", labelKey: "language.awadhi" },
  { id: "bhojpuri", labelKey: "language.bhojpuri" },
];

export function LanguageButtons() {
  const { t } = useTranslation();
  const { language, updateLanguage } = useSettings();

  return (
    <div
      className="flex flex-wrap gap-0.5 rounded-lg bg-[var(--muted)] p-0.5"
      role="group"
      aria-label={t("Interface language")}
    >
      {USER_LANGUAGES.map(({ id, labelKey }) => {
        const selected = language === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => void updateLanguage(id)}
            aria-pressed={selected}
            className={`rounded-md px-2.5 py-1 text-[12px] transition-all ${
              selected
                ? "bg-[var(--card)] font-medium text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {t(labelKey)}
          </button>
        );
      })}
    </div>
  );
}

export default function UserLanguageSelector() {
  const { t } = useTranslation();

  return (
    <section className="mt-4 rounded-2xl border border-[var(--border)]/70 bg-[var(--card)] p-5">
      <div className="flex items-start gap-3">
        <Languages
          size={18}
          strokeWidth={1.7}
          className="mt-0.5 shrink-0 text-[var(--primary)]"
        />
        <div className="min-w-0">
          <h2 className="text-[15.5px] font-medium tracking-tight text-[var(--foreground)]">
            {t("User language")}
          </h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--muted-foreground)]">
            {t(
              "Choose the interface and tutor response language. Code and technical terms stay in English.",
            )}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <LanguageButtons />
      </div>
    </section>
  );
}
