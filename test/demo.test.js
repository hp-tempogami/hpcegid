import { test } from "node:test";
import assert from "node:assert/strict";
import { LIBRARY, demoLevers, demoActions, demoRephrase } from "../src/demo.js";

test("la bibliothèque contient des leviers distincts de 8 actions courtes", () => {
  const titles = new Set(LIBRARY.map((l) => l.title.toLowerCase()));
  assert.equal(titles.size, LIBRARY.length);
  for (const lever of LIBRARY) {
    assert.equal(lever.actions.length, 8, lever.title);
    for (const a of lever.actions) assert.ok(a.split(/\s+/).length <= 10, a);
  }
});

test("les leviers retenus ou écartés ne sont jamais reproposés", () => {
  const first = demoLevers({ goal: "Accéder au COMEX", count: 4 });
  assert.equal(first.levers.length, 4);
  const titles = first.levers.map((l) => l.title);
  const next = demoLevers({ goal: "x", selected: titles.slice(0, 2), rejected: titles.slice(2), count: 4 });
  for (const l of next.levers) assert.ok(!titles.includes(l.title));
});

test("les leviers retenus restent exclus même quand la bibliothèque est épuisée", () => {
  const selected = LIBRARY.slice(0, 7).map((l) => l.title);
  const rejected = LIBRARY.slice(7).map((l) => l.title);
  const out = demoLevers({ goal: "x", selected, rejected, count: 4 });
  assert.equal(out.levers.length, 4);
  for (const l of out.levers) assert.ok(!selected.includes(l.title));
});

test("micro-actions et reformulations", () => {
  assert.equal(demoActions({ lever: { title: "Réseau stratégique" } }).actions.length, 8);
  assert.equal(demoActions({ lever: { title: "Levier inventé" } }).actions.length, 8);
  assert.match(demoRephrase({ action: "Lire un livre", mode: "measurable" }).action, /2 fois par semaine/);
  assert.equal(demoRephrase({ action: "Marcher 30 minutes chaque jour", mode: "simpler" }).action, "Marcher 30 minutes");
});
