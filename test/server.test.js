import { test, before, after } from "node:test";
import assert from "node:assert/strict";

process.env.MANDELFLOW_DEMO = "1";
const { server } = await import("../server.js");
let base;

before(async () => {
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const post = (path, body) =>
  fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("configuration en mode démo", async () => {
  assert.deepEqual(await (await fetch(base + "/api/config")).json(), { mode: "demo", model: null });
});

test("parcours API complet", async () => {
  const levers = await (await post("/api/levers", { goal: "Accéder au COMEX d'ici 12 mois" })).json();
  assert.equal(levers.levers.length, 4);
  assert.ok(levers.core_goal);
  const actions = await (await post("/api/actions", { goal: "x", lever: levers.levers[0] })).json();
  assert.equal(actions.actions.length, 8);
  const r = await (await post("/api/rephrase", { goal: "x", lever: "y", action: "Lire un livre", mode: "measurable" })).json();
  assert.ok(r.action);
});

test("validation des entrées", async () => {
  assert.equal((await post("/api/levers", {})).status, 400);
  assert.equal((await post("/api/events", { type: "hack" })).status, 400);
  const bad = await fetch(base + "/api/levers", { method: "POST", body: "{nope" });
  assert.equal(bad.status, 400);
});

test("fichiers statiques et protection contre la traversée", async () => {
  const home = await fetch(base + "/");
  assert.equal(home.status, 200);
  assert.match(await home.text(), /MandelFlow/);
  assert.equal((await fetch(base + "/js/model.js")).status, 200);
  assert.notEqual((await fetch(base + "/..%2fpackage.json")).status, 200);
});
