import test from "node:test";
import assert from "node:assert/strict";

import {
  capabilityVisible,
  capabilityDescription,
  capabilityLabel,
  chatSpaceItemVisible,
  knowledgeLabel,
  normalizeExperienceMode,
  primaryNavVisible,
  runtimeCapabilityValue,
  secondaryNavVisible,
  settingsCategoryVisible,
  workspaceLabel,
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
  assert.equal(workspaceLabel("student", "/home", "Home"), "Ask Drona");
  assert.equal(workspaceLabel("student", "/book", "Book"), "My Courses");
  assert.equal(
    workspaceLabel("student", "/space", "Learning Spaces"),
    "Practice & Progress",
  );
});

test("student mode preserves learning capabilities and adds classroom", () => {
  assert.equal(capabilityVisible("student", ""), true);
  assert.equal(capabilityVisible("student", "classroom"), true);
  assert.equal(capabilityVisible("student", "deep_solve"), true);
  assert.equal(capabilityVisible("student", "deep_question"), true);
  assert.equal(capabilityVisible("student", "deep_research"), true);
  assert.equal(capabilityVisible("student", "visualize"), true);
  assert.equal(capabilityVisible("student", "mastery_path"), true);
  assert.equal(capabilityLabel("student", "", "Chat"), "Drona Tutor");
  assert.equal(capabilityLabel("student", "deep_question", "Quiz"), "Quiz");
  assert.equal(runtimeCapabilityValue("classroom"), "");
  assert.equal(runtimeCapabilityValue("visualize"), "visualize");
  assert.equal(
    capabilityDescription("student", "", "Flexible conversation"),
    "Ask naturally with course materials and tutor guidance",
  );
});

test("teacher mode adds course authoring and research", () => {
  assert.equal(primaryNavVisible("teacher", "/co-writer"), true);
  assert.equal(primaryNavVisible("teacher", "/space/questions"), true);
  assert.equal(primaryNavVisible("teacher", "/agents"), false);
  assert.equal(primaryNavVisible("teacher", "/partners"), false);
  assert.equal(capabilityVisible("teacher", "deep_research"), true);
  assert.equal(knowledgeLabel("teacher"), "Course Library");
  assert.equal(workspaceLabel("teacher", "/home", "Home"), "Home");
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
  assert.equal(primaryNavVisible("advanced", "/agents"), true);
  assert.equal(primaryNavVisible("advanced", "/partners"), true);
  assert.equal(secondaryNavVisible("advanced", "/memory"), true);
  assert.equal(capabilityVisible("advanced", "visualize"), true);
  assert.equal(chatSpaceItemVisible("advanced", "memory"), true);
  assert.equal(settingsCategoryVisible("advanced", "models"), true);
  assert.equal(knowledgeLabel("advanced"), "Knowledge Center");
});
