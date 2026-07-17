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

test("experience selector lives on the Settings landing page", () => {
  assert.match(settingsHub, /<ExperienceModeSelector \/>/);
  assert.doesNotMatch(appearancePage, /ExperienceModeSelector|Experience mode/);
});
