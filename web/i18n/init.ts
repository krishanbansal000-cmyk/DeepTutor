import i18n, { type Resource } from "i18next";
import { initReactI18next } from "react-i18next";

import enApp from "@/locales/en/app.json";

export type AppLanguage =
  | "en"
  | "zh"
  | "hi"
  | "bundeli"
  | "awadhi"
  | "bhojpuri";

const regionalLanguages = new Set<AppLanguage>([
  "hi",
  "bundeli",
  "awadhi",
  "bhojpuri",
]);

const UP_APP_NAME = "Drona";

function applyVisibleBrand<T>(value: T): T {
  if (typeof value === "string") {
    return value.replaceAll("DeepTutor", UP_APP_NAME) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => applyVisibleBrand(item)) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, applyVisibleBrand(item)]),
    ) as T;
  }
  return value;
}

export function normalizeLanguage(lang: unknown): AppLanguage {
  if (!lang) return "en";
  const s = String(lang).toLowerCase();
  if (s === "hi" || s === "hindi" || s === "hinglish") return "hi";
  if (s === "bundeli" || s === "bundelkhandi") return "bundeli";
  if (s === "awadhi") return "awadhi";
  if (s === "bhojpuri") return "bhojpuri";
  return "en";
}

let _initialized = false;

export function initI18n(language?: unknown) {
  if (_initialized) return i18n;

  const resources: Resource = {
    en: { app: applyVisibleBrand(enApp) },
  };

  i18n.use(initReactI18next).init({
    resources,
    lng: normalizeLanguage(language),
    fallbackLng: "en",
    // Use a single default namespace to keep lookups simple.
    // We intentionally keep keySeparator disabled so keys like "Generating..." remain valid.
    defaultNS: "app",
    ns: ["app"],
    keySeparator: false,
    interpolation: {
      escapeValue: false,
    },
    returnEmptyString: false,
    returnNull: false,
  });

  _initialized = true;
  return i18n;
}

export async function ensureLanguage(language: AppLanguage) {
  if (i18n.hasResourceBundle(language, "app")) return;
  if (regionalLanguages.has(language)) {
    const hiApp = (await import("@/locales/hi/app.json")).default;
    i18n.addResourceBundle(
      language,
      "app",
      applyVisibleBrand(hiApp),
      true,
      true,
    );
  }
}
