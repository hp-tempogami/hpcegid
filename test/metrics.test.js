import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeEvents } from "../src/metrics.js";

test("KPIs : complétion, durée médiane, taux d'édition", () => {
  const m = summarizeEvents([
    { type: "session_start", session: "a" },
    { type: "session_start", session: "b" },
    { type: "grid_completed", session: "a", duration_ms: 6 * 60000, ai_items: 72, edited_items: 10 },
    { type: "export", session: "a", format: "pdf", ai_items: 72, edited_items: 18 },
  ]);
  assert.equal(m.completion_rate, 0.5);
  assert.equal(m.median_duration_min, 6);
  assert.equal(m.edit_rate, 0.25);
  assert.equal(m.exports, 1);
});
