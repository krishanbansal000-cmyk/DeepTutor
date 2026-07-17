export const EXPERIENCE_MODES = ["student", "teacher", "advanced"] as const;

export type ExperienceMode = (typeof EXPERIENCE_MODES)[number];

export type ChatSpaceItemKey =
  | "attach"
  | "knowledge"
  | "chat_history"
  | "my_agents"
  | "books"
  | "notebooks"
  | "question_bank"
  | "persona"
  | "memory";

const STUDENT_PRIMARY_NAV = new Set(["/home", "/book", "/space"]);
const TEACHER_PRIMARY_NAV = new Set([
  "/home",
  "/co-writer",
  "/book",
  "/space",
]);
const SIMPLE_SECONDARY_NAV = new Set(["/knowledge", "/settings"]);

const STUDENT_CAPABILITIES = new Set(["", "deep_question"]);
const TEACHER_CAPABILITIES = new Set(["", "deep_question", "deep_research"]);

const SIMPLE_SPACE_ITEMS = new Set<ChatSpaceItemKey>([
  "attach",
  "knowledge",
  "chat_history",
  "books",
  "notebooks",
  "question_bank",
]);

export function normalizeExperienceMode(value: unknown): ExperienceMode {
  return value === "teacher" || value === "advanced" ? value : "student";
}

export function isAdvancedExperience(mode: ExperienceMode): boolean {
  return mode === "advanced";
}

export function primaryNavVisible(
  mode: ExperienceMode,
  href: string,
): boolean {
  if (mode === "advanced") return true;
  return (mode === "teacher" ? TEACHER_PRIMARY_NAV : STUDENT_PRIMARY_NAV).has(
    href,
  );
}

export function secondaryNavVisible(
  mode: ExperienceMode,
  href: string,
): boolean {
  return mode === "advanced" || SIMPLE_SECONDARY_NAV.has(href);
}

export function capabilityVisible(
  mode: ExperienceMode,
  capability: string,
): boolean {
  if (mode === "advanced") return true;
  return (mode === "teacher" ? TEACHER_CAPABILITIES : STUDENT_CAPABILITIES).has(
    capability,
  );
}

export function chatSpaceItemVisible(
  mode: ExperienceMode,
  item: ChatSpaceItemKey,
): boolean {
  return mode === "advanced" || SIMPLE_SPACE_ITEMS.has(item);
}

export function settingsCategoryVisible(
  mode: ExperienceMode,
  categoryKey: string,
): boolean {
  return mode === "advanced" || categoryKey === "appearance";
}

export function knowledgeLabel(mode: ExperienceMode): string {
  if (mode === "student") return "My Materials";
  if (mode === "teacher") return "Course Library";
  return "Knowledge Center";
}

/**
 * Student-facing navigation uses familiar study language instead of exposing
 * DeepTutor's underlying workspace concepts. Routes stay unchanged so saved
 * links and the advanced experience continue to work.
 */
export function workspaceLabel(
  mode: ExperienceMode,
  href: string,
  fallback: string,
): string {
  if (mode !== "student") {
    return href === "/knowledge" ? knowledgeLabel(mode) : fallback;
  }

  const studentLabels: Record<string, string> = {
    "/home": "Ask Drona",
    "/book": "My Courses",
    "/space": "Practice & Progress",
    "/knowledge": "My Materials",
  };
  return studentLabels[href] ?? fallback;
}
