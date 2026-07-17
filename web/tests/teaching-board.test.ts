import test from "node:test";
import assert from "node:assert/strict";

import {
  boardSpeechText,
  boardTitleFromMarkdown,
  lessonStepsFromMarkdown,
} from "../lib/teaching-board";

test("teaching board turns lesson paragraphs into progressive steps", () => {
  assert.deepEqual(
    lessonStepsFromMarkdown(
      "# Compiler\n\nA compiler translates source code.\n\n## Example\n\n`gcc main.c`",
    ),
    [
      "# Compiler",
      "A compiler translates source code.",
      "## Example",
      "`gcc main.c`",
    ],
  );
});

test("teaching board keeps fenced code together", () => {
  const steps = lessonStepsFromMarkdown(
    "Try this:\n\n```python\nprint('one')\n\nprint('two')\n```\n\nThen explain it.",
  );
  assert.equal(steps.length, 3);
  assert.match(steps[1], /print\('one'\)[\s\S]*print\('two'\)/);
});

test("teaching board derives readable titles and speech", () => {
  assert.equal(boardTitleFromMarkdown("## **Pointers**\n\nDetails"), "Pointers");
  assert.equal(
    boardSpeechText("Read [the chapter](https://example.test) and **compare** it."),
    "Read the chapter and compare it.",
  );
});

test("teaching board groups very long answers into at most ten steps", () => {
  const lesson = Array.from({ length: 24 }, (_, index) => `Part ${index + 1}`).join(
    "\n\n",
  );
  const steps = lessonStepsFromMarkdown(lesson);
  assert.ok(steps.length <= 10);
  assert.match(steps[0], /Part 1/);
  assert.match(steps.at(-1) ?? "", /Part 24/);
});
