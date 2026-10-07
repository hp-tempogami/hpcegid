import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newState, makeLever, makeActions, gridBlocks, togglePriority, priorities,
  editStats, buildDocument, toMarkdown, RING,
} from "../public/js/model.js";

function fullState() {
  const state = newState({ goal: "Accéder au COMEX dans les 12 mois", context: "Directeur Marketing" });
  state.core_goal = "Accéder au COMEX";
  for (let i = 0; i < 8; i++) {
    const lever = makeLever(i, { title: `Levier ${i + 1}`, description: "desc" });
    lever.actions = makeActions(i, Array.from({ length: 8 }, (_, j) => `Action ${i + 1}.${j + 1}`));
    state.levers.push(lever);
  }
  return state;
}

test("la grille place l'objectif au centre et chaque levier au centre de son bloc", () => {
  const blocks = gridBlocks(fullState());
  assert.equal(blocks[4][4].kind, "core");
  assert.equal(blocks[4][4].text, "Accéder au COMEX");
  RING.forEach((pos, i) => {
    assert.equal(blocks[4][pos].text, `Levier ${i + 1}`);
    assert.equal(blocks[pos][4].text, `Levier ${i + 1}`);
    assert.equal(blocks[pos][RING[0]].text, `Action ${i + 1}.1`);
  });
  const cells = blocks.flat();
  assert.equal(cells.length, 81);
  assert.equal(cells.filter((c) => c.kind === "action").length, 64);
});

test("une action décochée laisse une case libre", () => {
  const state = fullState();
  state.levers[0].actions[2].checked = false;
  const block = gridBlocks(state)[RING[0]];
  assert.equal(block.filter((c) => c.kind === "action").length, 7);
  assert.equal(block.filter((c) => c.kind === "empty").length, 1);
});

test("au plus 3 priorités", () => {
  const state = fullState();
  for (const id of ["act-1-1", "act-2-2", "act-3-3"]) assert.ok(togglePriority(state, id));
  assert.equal(togglePriority(state, "act-4-4"), false);
  assert.equal(priorities(state).length, 3);
  assert.ok(togglePriority(state, "act-1-1"));
  assert.ok(togglePriority(state, "act-4-4"));
});

test("taux d'édition des propositions IA", () => {
  const state = fullState();
  state.levers[0].title = "Communication exécutive";
  state.levers[1].actions[0].title = "Autre chose";
  state.levers.push({ ...makeLever(8, { title: "Perso" }, false), actions: [] });
  const stats = editStats(state);
  assert.equal(stats.ai_items, 8 + 64);
  assert.equal(stats.edited_items, 2);
});

test("le document respecte le modèle de données du PRD", () => {
  const state = fullState();
  togglePriority(state, "act-1-1");
  const doc = buildDocument(state);
  assert.equal(doc.mandelart_id, state.id);
  assert.equal(doc.user_context.main_goal, "Accéder au COMEX dans les 12 mois");
  assert.equal(doc.user_context.context_text, "Directeur Marketing");
  assert.equal(doc.central_matrix.core_goal, "Accéder au COMEX");
  assert.equal(doc.central_matrix.levers.length, 8);
  assert.deepEqual(doc.central_matrix.levers[0].actions[0], { id: "act-1-1", title: "Action 1.1", is_priority: true });
});

test("l'export Markdown liste les priorités puis les leviers", () => {
  const state = fullState();
  togglePriority(state, "act-2-3");
  const md = toMarkdown(state);
  assert.match(md, /^# Accéder au COMEX/);
  assert.match(md, /## Mon lundi à 10h\n\n1\. Action 2\.3 _\(Levier 2\)_/);
  assert.match(md, /## 8\. Levier 8/);
  assert.equal((md.match(/^- \[ \]/gm) || []).length, 64);
});
