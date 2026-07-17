import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const chatMessages = readFileSync(
  path.join(process.cwd(), "components/chat/home/ChatMessages.tsx"),
  "utf8",
);

test("knowledge sources render before the assistant response", () => {
  const sourceIndex = chatMessages.indexOf("<ChatSourceCitations");
  const responseIndex = chatMessages.indexOf("<AssistantMessage", sourceIndex);

  assert.ok(sourceIndex >= 0, "expected a source citation component");
  assert.ok(responseIndex > sourceIndex, "sources should precede the answer");
  assert.doesNotMatch(
    chatMessages.slice(sourceIndex - 80, sourceIndex),
    /msgDone\s*&&/,
    "sources should appear while the answer is still streaming",
  );
});
