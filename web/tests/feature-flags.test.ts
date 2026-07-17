import test from "node:test";
import assert from "node:assert/strict";

import {
  FEATURE_KEYS,
  isFeatureEnabled,
} from "../lib/feature-flags";

test("raw chat logs are hidden by default", () => {
  assert.equal(isFeatureEnabled(FEATURE_KEYS.CHAT_RAW_LOGS), false);
});
