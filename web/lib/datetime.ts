export type Language = "en" | "zh" | "hi" | "bundeli" | "awadhi" | "bhojpuri";

export function getLocale(lang: Language): string {
  if (["hi", "bundeli", "awadhi", "bhojpuri"].includes(lang)) return "hi-IN";
  return "en-US";
}

export function formatDate(
  date: Date,
  lang: Language,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  },
): string {
  return new Intl.DateTimeFormat(getLocale(lang), options).format(date);
}

export function formatTime(
  date: Date,
  lang: Language,
  options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" },
): string {
  return new Intl.DateTimeFormat(getLocale(lang), options).format(date);
}
