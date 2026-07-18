import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const chatMessages = readFileSync(
  path.join(process.cwd(), "components/chat/home/ChatMessages.tsx"),
  "utf8",
);

test("sources render below the assistant explanation", () => {
  const responseIndex = chatMessages.indexOf("<AssistantMessage");
  const sourceIndex = chatMessages.indexOf("<ChatSourceCitations", responseIndex);

  assert.ok(responseIndex >= 0, "expected an assistant response component");
  assert.ok(sourceIndex >= 0, "expected a source citation component");
  assert.ok(sourceIndex > responseIndex, "sources should follow the answer");
  assert.doesNotMatch(
    chatMessages.slice(sourceIndex - 80, sourceIndex),
    /msgDone\s*&&/,
    "sources should appear while the answer is still streaming",
  );
});
