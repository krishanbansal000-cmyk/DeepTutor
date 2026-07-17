import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const settingsHub = readFileSync(
  path.join(process.cwd(), "components/settings/SettingsHub.tsx"),
  "utf8",
);
const appearancePage = readFileSync(
  path.join(process.cwd(), "app/(utility)/settings/appearance/page.tsx"),
  "utf8",
);
const experienceSelector = readFileSync(
  path.join(process.cwd(), "components/settings/ExperienceModeSelector.tsx"),
  "utf8",
);

test("experience selector lives on the Settings landing page", () => {
  assert.match(settingsHub, /<ExperienceModeSelector \/>/);
  assert.doesNotMatch(appearancePage, /ExperienceModeSelector|Experience mode/);
});

test("user language is directly available on the Settings landing page", () => {
  assert.match(settingsHub, /<UserLanguageSelector \/>/);
  assert.match(appearancePage, /<LanguageButtons \/>/);
  assert.doesNotMatch(appearancePage, /language\.chinese|\["en", "zh"/);
});

test("experience choices keep the student, teacher, and advanced names", () => {
  assert.match(experienceSelector, /label: t\("Student"\)/);
  assert.match(experienceSelector, /label: t\("Teacher"\)/);
  assert.match(experienceSelector, /label: t\("Advanced"\)/);
  assert.doesNotMatch(experienceSelector, /label: t\("Simple"\)/);
});
