import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const chatPage = readFileSync(
  path.join(process.cwd(), "app/(workspace)/home/[[...sessionId]]/page.tsx"),
  "utf8",
);
const composer = readFileSync(
  path.join(process.cwd(), "components/chat/home/ChatComposer.tsx"),
  "utf8",
);

test("Ask Drona keeps the compact chat landing instead of a student dashboard", () => {
  assert.doesNotMatch(chatPage, /StudentTutorWelcome|StudentCourseStrip/);
  assert.match(chatPage, /t\(welcomeGreeting\)/);
});

test("students select course material from the compact composer", () => {
  assert.match(composer, /knowledgeBases\.length > 0/);
  assert.doesNotMatch(
    composer,
    /experienceMode !== "student" && knowledgeBases\.length > 0/,
  );
});

test("Drona Tutor remains a selectable student mode", () => {
  assert.match(composer, /capabilityLabel\(/);
  assert.match(composer, /onSetCapMenuOpen/);
  assert.doesNotMatch(
    composer,
    /experienceMode === "student" \? \(\s*<div[^>]*>\s*<GraduationCap/,
  );
});

test("Classroom reuses chat and opens completed answers on the teaching board", () => {
  assert.match(chatPage, /value: "classroom"/);
  assert.match(chatPage, /runtimeCapabilityValue\(cap\.value\)/);
  assert.match(chatPage, /classroomTurnPendingRef/);
  assert.match(composer, /autoOpenKey=\{boardAutoOpenKey\}/);
});
