"use client";

import Link from "next/link";
import {
  BookOpen,
  Check,
  ClipboardCheck,
  GraduationCap,
  MessageCircleQuestion,
  Presentation,
  Settings,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

type CourseMaterial = { name: string };

type WelcomeAction = {
  label: string;
  description: string;
  prompt: string;
  icon: LucideIcon;
};

const ACTIONS: WelcomeAction[] = [
  {
    label: "Explain a topic",
    description: "Understand it in simple steps with an example.",
    prompt: "Explain this topic simply, step by step: ",
    icon: MessageCircleQuestion,
  },
  {
    label: "Teach on board",
    description: "Use equations or a diagram when they help.",
    prompt: "Teach this on the board, one step at a time: ",
    icon: Presentation,
  },
  {
    label: "Practice for exam",
    description: "Ask one question at a time and check my answer.",
    prompt: "Quiz me on this topic one question at a time: ",
    icon: ClipboardCheck,
  },
  {
    label: "Ask from my book",
    description: "Answer from the selected course material with pages.",
    prompt: "Answer this from my selected course material and cite the page: ",
    icon: BookOpen,
  },
];

export default function StudentTutorWelcome({
  materials,
  selectedMaterials,
  onToggleMaterial,
  onPrompt,
}: {
  materials: CourseMaterial[];
  selectedMaterials: string[];
  onToggleMaterial: (name: string) => void;
  onPrompt: (prompt: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <section className="mx-auto flex w-full max-w-[900px] flex-col px-4 pb-5 pt-3 sm:px-6">
      <div className="border-b border-[var(--border)] pb-5 text-center sm:text-left">
        <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--muted-foreground)]">
          <GraduationCap size={16} className="text-[var(--primary)]" />
          {t("Your university learning companion")}
        </div>
        <h1 className="font-serif text-[30px] font-semibold leading-tight text-[var(--foreground)] sm:text-[36px]">
          {t("Hello, what would you like to study today?")}
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-[15px] leading-relaxed text-[var(--muted-foreground)] sm:mx-0">
          {t(
            "Choose your course material, then ask naturally in Hindi, English or your regional language.",
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 py-5 sm:grid-cols-2">
        {ACTIONS.map(({ label, description, prompt, icon: Icon }, index) => (
          <button
            key={label}
            type="button"
            onClick={() => onPrompt(t(prompt))}
            className="group flex min-h-[94px] items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-left shadow-sm transition-colors hover:border-[var(--primary)]/45 hover:bg-[var(--accent)]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/30"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--primary)]">
              <Icon size={20} strokeWidth={1.8} />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-[15px] font-semibold text-[var(--foreground)]">
                <span className="text-[11px] font-bold text-[var(--muted-foreground)]">
                  {index + 1}
                </span>
                {t(label)}
              </span>
              <span className="mt-1 block text-[13px] leading-relaxed text-[var(--muted-foreground)]">
                {t(description)}
              </span>
            </span>
          </button>
        ))}
      </div>

      <CourseMaterialPicker
        materials={materials}
        selectedMaterials={selectedMaterials}
        onToggleMaterial={onToggleMaterial}
      />

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] sm:justify-start">
        <Link
          href="/book"
          className="inline-flex items-center gap-1.5 font-medium text-[var(--foreground)] hover:text-[var(--primary)]"
        >
          <BookOpen size={15} /> {t("My Courses")}
        </Link>
        <Link
          href="/knowledge"
          className="inline-flex items-center gap-1.5 font-medium text-[var(--foreground)] hover:text-[var(--primary)]"
        >
          <Upload size={15} /> {t("My Materials")}
        </Link>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 font-medium text-[var(--foreground)] hover:text-[var(--primary)]"
        >
          <Settings size={15} /> {t("Language & Settings")}
        </Link>
      </div>
    </section>
  );
}

function CourseMaterialPicker({
  materials,
  selectedMaterials,
  onToggleMaterial,
  compact = false,
}: {
  materials: CourseMaterial[];
  selectedMaterials: string[];
  onToggleMaterial: (name: string) => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();

  if (!materials.length) {
    if (compact) return null;
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] px-4 py-4 text-[13.5px] text-[var(--muted-foreground)]">
        <span>{t("No course material has been added yet.")}</span>{" "}
        <Link href="/knowledge" className="font-semibold text-[var(--primary)]">
          {t("Add a syllabus or book")}
        </Link>
      </div>
    );
  }

  return (
    <div
      className={
        compact
          ? "flex min-w-0 items-center gap-2 overflow-x-auto px-1 py-1 hide-scrollbar"
          : "rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
      }
    >
      <div
        className={
          compact
            ? "flex shrink-0 items-center gap-1.5 text-[12.5px] font-semibold text-[var(--muted-foreground)]"
            : "mb-3 flex items-start justify-between gap-3"
        }
      >
        <span className="inline-flex items-center gap-2">
          <BookOpen size={compact ? 15 : 18} className="text-[var(--primary)]" />
          {t(compact ? "Course" : "Choose course material")}
        </span>
        {!compact && (
          <span className="text-[12px] font-normal text-[var(--muted-foreground)]">
            {t("Drona will answer from the selected material.")}
          </span>
        )}
      </div>
      <div className={`flex gap-2 ${compact ? "" : "flex-wrap"}`}>
        {materials.slice(0, compact ? 6 : 8).map((material) => {
          const selected = selectedMaterials.includes(material.name);
          return (
            <button
              key={material.name}
              type="button"
              onClick={() => onToggleMaterial(material.name)}
              aria-pressed={selected}
              title={material.name}
              className={`inline-flex max-w-[240px] shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors ${
                selected
                  ? "border-[var(--primary)] bg-[var(--primary)]/[0.08] text-[var(--foreground)]"
                  : "border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {selected && <Check size={14} className="text-[var(--primary)]" />}
              <span className="truncate">{material.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StudentCourseStrip({
  materials,
  selectedMaterials,
  onToggleMaterial,
}: {
  materials: CourseMaterial[];
  selectedMaterials: string[];
  onToggleMaterial: (name: string) => void;
}) {
  return (
    <CourseMaterialPicker
      compact
      materials={materials}
      selectedMaterials={selectedMaterials}
      onToggleMaterial={onToggleMaterial}
    />
  );
}
