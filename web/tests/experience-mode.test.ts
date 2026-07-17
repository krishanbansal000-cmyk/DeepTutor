import test from "node:test";
import assert from "node:assert/strict";

import {
  capabilityVisible,
  chatSpaceItemVisible,
  knowledgeLabel,
  normalizeExperienceMode,
  primaryNavVisible,
  secondaryNavVisible,
  settingsCategoryVisible,
} from "../lib/experience-mode";

test("student is the safe default experience", () => {
  assert.equal(normalizeExperienceMode(undefined), "student");
  assert.equal(normalizeExperienceMode("unknown"), "student");
  assert.equal(normalizeExperienceMode("teacher"), "teacher");
  assert.equal(normalizeExperienceMode("advanced"), "advanced");
});

test("student mode keeps learning and personal-material surfaces", () => {
  assert.equal(primaryNavVisible("student", "/home"), true);
  assert.equal(primaryNavVisible("student", "/book"), true);
  assert.equal(primaryNavVisible("student", "/partners"), false);
  assert.equal(secondaryNavVisible("student", "/knowledge"), true);
  assert.equal(secondaryNavVisible("student", "/memory"), false);
  assert.equal(knowledgeLabel("student"), "My Materials");
});

test("student mode offers normal chat and quizzes only", () => {
  assert.equal(capabilityVisible("student", ""), true);
  assert.equal(capabilityVisible("student", "deep_question"), true);
  assert.equal(capabilityVisible("student", "deep_research"), false);
  assert.equal(capabilityVisible("student", "visualize"), false);
});

test("teacher mode adds course authoring and research", () => {
  assert.equal(primaryNavVisible("teacher", "/co-writer"), true);
  assert.equal(primaryNavVisible("teacher", "/my-agents"), false);
  assert.equal(capabilityVisible("teacher", "deep_research"), true);
  assert.equal(knowledgeLabel("teacher"), "Course Library");
});

test("simple modes keep files and study references but hide technical context", () => {
  assert.equal(chatSpaceItemVisible("student", "attach"), true);
  assert.equal(chatSpaceItemVisible("student", "books"), true);
  assert.equal(chatSpaceItemVisible("student", "memory"), false);
  assert.equal(chatSpaceItemVisible("teacher", "my_agents"), false);
  assert.equal(settingsCategoryVisible("student", "appearance"), true);
  assert.equal(settingsCategoryVisible("student", "models"), false);
});

test("advanced mode preserves every existing surface", () => {
  assert.equal(primaryNavVisible("advanced", "/my-agents"), true);
  assert.equal(secondaryNavVisible("advanced", "/memory"), true);
  assert.equal(capabilityVisible("advanced", "visualize"), true);
  assert.equal(chatSpaceItemVisible("advanced", "memory"), true);
  assert.equal(settingsCategoryVisible("advanced", "models"), true);
  assert.equal(knowledgeLabel("advanced"), "Knowledge Center");
});
