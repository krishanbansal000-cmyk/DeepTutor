"use client";

import { GraduationCap, School, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useSettings } from "@/components/settings/SettingsContext";

export default function ExperienceModeSelector() {
  const { t } = useTranslation();
  const { experienceMode, updateExperienceMode } = useSettings();

  const modes = [
    {
      id: "student" as const,
      label: t("Student"),
      description: t(
        "Chat, quizzes, learning spaces, books, and personal study-material uploads.",
      ),
      icon: GraduationCap,
    },
    {
      id: "teacher" as const,
      label: t("Teacher"),
      description: t(
        "Student features plus course writing and research tools.",
      ),
      icon: School,
    },
    {
      id: "advanced" as const,
      label: t("Advanced"),
      description: t(
        "Show every engine, agent, memory, model, and developer control.",
      ),
      icon: SlidersHorizontal,
    },
  ];

  return (
    <section className="rounded-2xl border border-[var(--border)]/70 bg-[var(--card)] p-5">
      <div>
        <h2 className="text-[15.5px] font-medium tracking-tight text-[var(--foreground)]">
          {t("Experience mode")}
        </h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--muted-foreground)]">
          {t(
            "Choose how much of Drona's interface is visible. No data or capabilities are deleted.",
          )}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {modes.map(({ id, label, description, icon: Icon }) => {
          const selected = experienceMode === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => void updateExperienceMode(id)}
              aria-pressed={selected}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                selected
                  ? "border-[var(--primary)] bg-[var(--primary)]/[0.06]"
                  : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--foreground)]/20"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon
                  className={
                    selected
                      ? "h-4 w-4 text-[var(--primary)]"
                      : "h-4 w-4 text-[var(--muted-foreground)]"
                  }
                />
                <span className="text-[13.5px] font-medium text-[var(--foreground)]">
                  {label}
                </span>
                {id === "student" && (
                  <span className="ml-auto rounded-full bg-[var(--muted)] px-1.5 py-0.5 text-[9.5px] text-[var(--muted-foreground)]">
                    {t("Default")}
                  </span>
                )}
              </div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-[var(--muted-foreground)]">
                {description}
              </p>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-[11.5px] text-[var(--muted-foreground)]">
        {t(
          "Student mode includes personal material uploads. Experience mode controls presentation, not account permissions.",
        )}
      </p>
    </section>
  );
}
