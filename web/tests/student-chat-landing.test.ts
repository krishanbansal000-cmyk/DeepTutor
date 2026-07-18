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
const classroom = readFileSync(
  path.join(process.cwd(), "components/student/ClassroomWorkspace.tsx"),
  "utf8",
);
const teachingBoard = readFileSync(
  path.join(process.cwd(), "components/student/TeachingBoard.tsx"),
  "utf8",
);
const pcmStreamPlayer = readFileSync(
  path.join(process.cwd(), "lib/pcm-stream-player.ts"),
  "utf8",
);
const serviceConfigEditor = readFileSync(
  path.join(process.cwd(), "components/settings/ServiceConfigEditor.tsx"),
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

test("Classroom reuses chat and renders answers inside the teaching board", () => {
  assert.match(chatPage, /value: "classroom"/);
  assert.match(chatPage, /runtimeCapabilityValue\(cap\.value\)/);
  assert.match(chatPage, /<ClassroomWorkspace/);
  assert.match(classroom, /<TeachingBoard/);
  assert.match(classroom, /extractAskUserPayload/);
  assert.match(classroom, /<AskUserOptions/);
  assert.match(classroom, /checkpointPending=/);
  assert.match(classroom, /supplementary=/);
  assert.match(classroom, /isStreaming \? \(/);
  assert.match(teachingBoard, /embedded/);
  assert.match(teachingBoard, /overflow-x-hidden/);
  assert.match(teachingBoard, /ref=\{boardScrollRef\}/);
  assert.match(teachingBoard, /content=\{currentStep\}/);
  assert.match(teachingBoard, /checkpointPending/);
  assert.match(chatPage, /classroom_mode: true/);
  assert.match(chatPage, /onSubmitUserReply=\{submitUserReply\}/);
  assert.doesNotMatch(teachingBoard, /scrollIntoView/);
  assert.doesNotMatch(teachingBoard, /steps\.slice\(0, current \+ 1\)/);
  assert.doesNotMatch(classroom, /autoOpen/);
});

test("Classroom streams local Piper speech in the selected app language", () => {
  assert.match(teachingBoard, /\/api\/v1\/voice\/tts\/stream/);
  assert.match(teachingBoard, /i18n\.resolvedLanguage/);
  assert.match(teachingBoard, /playPcm16Stream/);
  assert.match(pcmStreamPlayer, /response\.body\.getReader\(\)/);
  assert.match(pcmStreamPlayer, /X-Audio-Sample-Rate/);
  assert.match(pcmStreamPlayer, /createBufferSource\(\)/);
  assert.match(serviceConfigEditor, /providerValue === "piper"/);
});
