// MandelFlow — interface en 3 étapes : Amorce → Sélection guidée → Restitution & export.
import {
  LEVER_COUNT,
  PRIORITY_COUNT,
  newState,
  makeLever,
  makeActions,
  renumber,
  keptActions,
  priorities,
  togglePriority,
  gridBlocks,
  editStats,
  buildDocument,
  toMarkdown,
} from "./model.js";

const STORAGE_KEY = "mandelflow:v1";
const app = document.getElementById("app");
const toastEl = document.getElementById("toast");

let state = load();
let busy = false; // une requête de leviers est en cours
const actionRequests = new Map(); // préchargement des micro-actions par levier
const failedActions = new Set(); // leviers dont la génération a échoué (pas de relance automatique)

// ---------- utilitaires ----------

const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved?.id ? saved : null;
  } catch {
    return null;
  }
}

function save() {
  try {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* stockage indisponible : l'app fonctionne sans reprise de session */
  }
}

let toastTimer;
function toast(message, kind = "info") {
  toastEl.textContent = message;
  toastEl.dataset.kind = kind;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3200);
}

async function api(path, body) {
  const res = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}

function track(type, extra = {}) {
  if (!state) return;
  fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, session: state.id, ...extra }),
    keepalive: true,
  }).catch(() => {});
}

function setStep(step) {
  state.step = step;
  save();
  render();
  app.focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
}

// Champs éditables en un clic : Entrée valide, Échap annule.
function editable(el, onCommit) {
  const original = el.textContent;
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      el.blur();
    } else if (e.key === "Escape") {
      el.textContent = original;
      el.blur();
    }
  });
  el.addEventListener("blur", () => {
    const value = el.textContent.replace(/\s+/g, " ").trim();
    if (value !== original.trim()) onCommit(value);
  });
}

// ---------- rendu ----------

function render() {
  const step = state?.step ?? "start";
  document.querySelectorAll(".steps li").forEach((li) => {
    const order = ["start", "levers", "actions", "grid"];
    li.classList.toggle("active", li.dataset.step === step);
    li.classList.toggle("done", order.indexOf(li.dataset.step) < order.indexOf(step));
  });
  document.getElementById("restart").hidden = !state;
  ({ start: renderStart, levers: renderLevers, actions: renderActions, grid: renderGrid })[step]();
}

// Étape 1 — L'Amorce
function renderStart() {
  app.innerHTML = `
    <section class="view view-start">
      <h1>Quel est votre objectif majeur&nbsp;?</h1>
      <p class="lead">Une ambition, une phrase. MandelFlow la décompose avec vous en 8 leviers et 64 micro-actions.</p>
      <form id="start-form" class="start-form" autocomplete="off">
        <div class="search">
          <input id="goal" name="goal" required maxlength="200"
            placeholder="ex. Accéder au COMEX d'ici 12 mois" aria-label="Objectif principal">
        </div>
        <details class="context">
          <summary>Préciser le contexte (optionnel)</summary>
          <textarea id="context" name="context" rows="3" maxlength="500"
            placeholder="Votre rôle, l'horizon temporel, les principaux freins…"></textarea>
        </details>
        <button class="btn btn-primary btn-lg" type="submit">Lancer la réflexion</button>
      </form>
      <div class="examples" aria-label="Exemples">
        ${["Accéder au COMEX d'ici 12 mois", "Réussir ma reconversion vers le conseil", "Doubler le CA de ma business unit"]
          .map((ex) => `<button type="button" class="chip" data-example="${esc(ex)}">${esc(ex)}</button>`)
          .join("")}
      </div>
    </section>`;
  const goal = app.querySelector("#goal");
  goal.focus();
  app.querySelectorAll("[data-example]").forEach((b) =>
    b.addEventListener("click", () => {
      goal.value = b.dataset.example;
      goal.focus();
    }),
  );
  app.querySelector("#start-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const value = goal.value.trim();
    if (!value) return goal.focus();
    state = newState({ goal: value, context: app.querySelector("#context").value });
    save();
    track("session_start");
    setStep("levers");
    fetchLevers();
  });
}

// Étape 2A — Choix des 8 leviers
async function fetchLevers({ reload = false } = {}) {
  if (busy) return;
  if (reload) state.rejected.push(...state.proposals.map((p) => p.title));
  state.proposals = [];
  busy = true;
  render();
  try {
    const data = await api("/api/levers", {
      goal: state.goal,
      context: state.context,
      selected: state.levers.map((l) => l.title),
      // Un levier retouché ne doit pas revenir sous son intitulé d'origine.
      rejected: [...state.rejected, ...state.levers.filter((l) => l.ai_title && l.ai_title !== l.title).map((l) => l.ai_title)],
      count: 4,
    });
    if (!state.core_goal) state.core_goal = data.core_goal;
    state.proposals = data.levers.map((l) => ({ ...l, ai_title: l.title }));
  } catch (err) {
    toast(err.message, "error");
  } finally {
    busy = false;
    save();
    if (state.step === "levers") render();
  }
}

function selectLever(index) {
  if (state.levers.length >= LEVER_COUNT) return;
  const [p] = state.proposals.splice(index, 1);
  const lever = makeLever(state.levers.length, p);
  lever.ai_title = p.ai_title ?? null;
  state.levers.push(lever);
  save();
  if (!state.proposals.length && state.levers.length < LEVER_COUNT) fetchLevers();
  else render();
}

function renderLevers() {
  const n = state.levers.length;
  const full = n >= LEVER_COUNT;
  app.innerHTML = `
    <section class="view view-levers">
      <div class="progress">
        <span class="progress-label"><strong>${n} levier${n > 1 ? "s" : ""}</strong> sur ${LEVER_COUNT} sélectionnés</span>
        <span class="progress-bar"><span style="width:${(n / LEVER_COUNT) * 100}%"></span></span>
      </div>
      <p class="eyebrow">Objectif</p>
      <h1 class="goal-title">${esc(state.goal)}</h1>
      ${
        full
          ? `<div class="done-panel">
               <p>Vos 8 leviers sont prêts. Vous pouvez encore ajuster leurs intitulés ci-dessous.</p>
               <button class="btn btn-primary btn-lg" id="to-actions">Passer aux micro-actions →</button>
             </div>`
          : `<p class="hint">Cliquez sur une carte pour la retenir. Cliquez sur son titre pour l'ajuster.</p>
             <div class="cards" aria-busy="${busy}">
               ${
                 busy
                   ? Array.from({ length: 4 }, () => `<div class="card skeleton"><span></span><span></span></div>`).join("")
                   : state.proposals
                       .map(
                         (p, i) => `
                   <article class="card" data-i="${i}" tabindex="0" role="button" aria-label="Retenir ${esc(p.title)}">
                     <h3 class="card-title" contenteditable="plaintext-only" spellcheck="false">${esc(p.title)}</h3>
                     <p class="card-desc">${esc(p.description)}</p>
                     <span class="card-cta">+ Retenir</span>
                   </article>`,
                       )
                       .join("")
               }
             </div>
             <div class="row">
               <button class="btn" id="reload" ${busy ? "disabled" : ""}>↻ Recharger d'autres idées</button>
               <button class="btn btn-ghost" id="custom" ${busy ? "disabled" : ""}>+ Ajouter mon propre levier</button>
             </div>`
      }
      <div class="reserve">
        <p class="eyebrow">Réserve de leviers</p>
        ${
          n
            ? `<ol class="reserve-list">${state.levers
                .map(
                  (l, i) => `<li><span class="reserve-title" contenteditable="plaintext-only" data-i="${i}" spellcheck="false">${esc(l.title)}</span>
                    <button class="icon-btn" data-remove="${i}" aria-label="Retirer ${esc(l.title)}">×</button></li>`,
                )
                .join("")}</ol>`
            : `<p class="muted">Aucun levier retenu pour l'instant.</p>`
        }
      </div>
    </section>`;

  app.querySelectorAll(".card[data-i]").forEach((card) => {
    const i = Number(card.dataset.i);
    const title = card.querySelector(".card-title");
    editable(title, (value) => {
      if (value) state.proposals[i].title = value;
      save();
    });
    title.addEventListener("click", (e) => e.stopPropagation());
    card.addEventListener("click", () => selectLever(i));
    card.addEventListener("keydown", (e) => {
      if (e.target === card && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        selectLever(i);
      }
    });
  });
  app.querySelectorAll(".reserve-title").forEach((el) =>
    editable(el, (value) => {
      const lever = state.levers[Number(el.dataset.i)];
      if (value) lever.title = value;
      else el.textContent = lever.title;
      save();
    }),
  );
  app.querySelectorAll("[data-remove]").forEach((b) =>
    b.addEventListener("click", () => {
      const [removed] = state.levers.splice(Number(b.dataset.remove), 1);
      state.rejected.push(removed.title);
      renumber(state.levers);
      save();
      if (!state.proposals.length && !busy) fetchLevers();
      else render();
    }),
  );
  app.querySelector("#reload")?.addEventListener("click", () => fetchLevers({ reload: true }));
  app.querySelector("#custom")?.addEventListener("click", () => {
    const title = prompt("Intitulé de votre levier (2 à 4 mots) :")?.trim();
    if (!title) return;
    state.levers.push(makeLever(state.levers.length, { title }, false));
    save();
    render();
  });
  app.querySelector("#to-actions")?.addEventListener("click", () => {
    state.current = 0;
    track("levers_done", { duration_ms: Date.now() - state.started_at });
    setStep("actions");
  });
}

// Étape 2B — Validation des micro-actions, levier par levier
function requestActions(i) {
  const lever = state.levers[i];
  if (!lever || lever.actions.length || actionRequests.has(lever.id)) return actionRequests.get(lever?.id);
  const p = api("/api/actions", {
    goal: state.goal,
    context: state.context,
    lever: { title: lever.title, description: lever.description },
    otherLevers: state.levers.filter((_, k) => k !== i).map((l) => l.title),
  })
    .then((data) => {
      // Le levier a pu être renommé ou rempli entre-temps : on ne remplit qu'un bloc vide.
      if (!lever.actions.length) lever.actions = makeActions(i, data.actions);
      save();
    })
    .finally(() => actionRequests.delete(lever.id));
  actionRequests.set(lever.id, p);
  return p;
}

async function ensureActions(i) {
  failedActions.delete(state.levers[i].id);
  try {
    await requestActions(i);
  } catch (err) {
    failedActions.add(state.levers[i].id);
    toast(err.message, "error");
  }
  if (state.step === "actions" && state.current === i) render();
  // Précharge le levier suivant pour supprimer l'attente au clic « Valider ».
  requestActions(i + 1)?.catch(() => {});
}

function renderActions() {
  const i = state.current;
  const lever = state.levers[i];
  const loading = !lever.actions.length;
  const failed = loading && failedActions.has(lever.id) && !actionRequests.has(lever.id);
  if (failed) {
    /* l'utilisateur relance via le bouton « Réessayer » */
  } else if (loading && !actionRequests.has(lever.id)) ensureActions(i);
  else if (loading) actionRequests.get(lever.id).finally(() => state.current === i && render());
  else requestActions(i + 1)?.catch(() => {});

  const checked = lever.actions.filter((a) => a.checked).length;
  app.innerHTML = `
    <section class="view view-actions">
      <div class="progress">
        <span class="progress-label">Levier <strong>${i + 1}</strong> sur ${state.levers.length}</span>
        <span class="progress-bar"><span style="width:${(i / state.levers.length) * 100}%"></span></span>
      </div>
      <p class="eyebrow">${esc(state.core_goal || state.goal)}</p>
      <h1 class="lever-title">${esc(lever.title)}</h1>
      ${lever.description ? `<p class="lead">${esc(lever.description)}</p>` : ""}
      ${
        failed
          ? `<div class="done-panel"><p>Les propositions n'ont pas pu être générées.</p>
               <button class="btn btn-primary" id="retry">Réessayer</button></div>`
          : loading
          ? `<ul class="actions" aria-busy="true">${Array.from({ length: 8 }, () => `<li class="action skeleton"><span></span></li>`).join("")}</ul>`
          : `<ul class="actions">
              ${lever.actions
                .map(
                  (a, j) => `
                <li class="action ${a.checked ? "" : "unchecked"}" data-j="${j}">
                  <input type="checkbox" ${a.checked ? "checked" : ""} aria-label="Garder cette action">
                  <span class="action-text" contenteditable="plaintext-only" spellcheck="false">${esc(a.title)}</span>
                  <span class="action-tools">
                    <button class="btn-mini" data-mode="simpler" title="Rendre plus simple">Plus simple</button>
                    <button class="btn-mini" data-mode="measurable" title="Rendre plus mesurable">Plus mesurable</button>
                  </span>
                </li>`,
                )
                .join("")}
            </ul>
            <p class="muted small">${checked} action${checked > 1 ? "s" : ""} retenue${checked > 1 ? "s" : ""} · les actions décochées laisseront une case libre dans la grille.</p>`
      }
      <div class="row row-between">
        <button class="btn btn-ghost" id="prev">← ${i ? "Levier précédent" : "Retour aux leviers"}</button>
        <div class="row">
          <button class="btn" id="regen" ${loading ? "disabled" : ""}>↻ Autres propositions</button>
          <button class="btn btn-primary" id="next" ${loading ? "disabled" : ""}>
            ${i + 1 < state.levers.length ? "Valider ce bloc et passer au suivant →" : "Valider et voir ma matrice →"}
          </button>
        </div>
      </div>
    </section>`;

  app.querySelectorAll(".action[data-j]").forEach((row) => {
    const a = lever.actions[Number(row.dataset.j)];
    row.querySelector("input").addEventListener("change", (e) => {
      a.checked = e.target.checked;
      if (!a.checked) a.is_priority = false;
      save();
      render();
    });
    editable(row.querySelector(".action-text"), (value) => {
      a.title = value;
      if (!value) a.checked = false;
      save();
      render();
    });
    row.querySelectorAll("[data-mode]").forEach((b) =>
      b.addEventListener("click", async () => {
        row.classList.add("working");
        row.querySelectorAll("button").forEach((x) => (x.disabled = true));
        try {
          const data = await api("/api/rephrase", { goal: state.goal, lever: lever.title, action: a.title, mode: b.dataset.mode });
          a.title = data.action;
          a.checked = true;
          save();
        } catch (err) {
          toast(err.message, "error");
        }
        if (state.step === "actions" && state.current === i) render();
      }),
    );
  });
  app.querySelector("#prev").addEventListener("click", () => {
    if (i) {
      state.current--;
      setStep("actions");
    } else setStep("levers");
  });
  app.querySelector("#retry")?.addEventListener("click", () => {
    ensureActions(i);
    render();
  });
  app.querySelector("#regen")?.addEventListener("click", () => {
    lever.actions = [];
    save();
    render();
  });
  app.querySelector("#next")?.addEventListener("click", () => {
    lever.done = true;
    if (i + 1 < state.levers.length) {
      state.current++;
      setStep("actions");
    } else {
      if (!state.completed_at) {
        state.completed_at = Date.now();
        track("grid_completed", { duration_ms: state.completed_at - state.started_at, ...statsPayload() });
      }
      setStep("grid");
    }
  });
}

const statsPayload = () => {
  const { ai_items, edited_items } = editStats(state);
  return { ai_items, edited_items };
};

// Étape 3 — Restitution & export
function renderGrid() {
  const blocks = gridBlocks(state);
  const top = priorities(state);
  const minutes = state.completed_at ? Math.max(1, Math.round((state.completed_at - state.started_at) / 60000)) : null;
  app.innerHTML = `
    <section class="view view-grid">
      <div class="grid-head">
        <div>
          <p class="eyebrow">Votre matrice Mandel-art${minutes ? ` · construite en ${minutes} min` : ""}</p>
          <h1 class="goal-title">${esc(state.goal)}</h1>
          <p class="muted small no-print">Cliquez sur une case pour la modifier. Cliquez sur ☆ pour choisir vos ${PRIORITY_COUNT} actions prioritaires.</p>
        </div>
        <div class="exports no-print">
          <button class="btn" id="copy-md">Copier en Markdown</button>
          <button class="btn" id="pdf">Exporter en PDF (A4)</button>
          <button class="btn btn-ghost" id="json">JSON</button>
        </div>
      </div>

      <div class="mandala-wrap"><div class="mandala" role="grid" aria-label="Matrice 9 par 9">
        ${blocks
          .map(
            (block, b) => `
          <div class="block ${b === 4 ? "block-core" : ""}" role="rowgroup">
            ${block
              .map(
                (cell) => `
              <div class="cell cell-${cell.kind} ${cell.priority ? "is-priority" : ""}" role="gridcell"
                ${cell.lever !== undefined ? `data-lever="${cell.lever}"` : ""} ${cell.id ? `data-id="${cell.id}"` : ""}>
                <span class="cell-text" ${cell.kind === "empty" && cell.lever === undefined ? "" : 'contenteditable="plaintext-only"'} spellcheck="false">${esc(cell.text)}</span>
                ${
                  cell.kind === "action"
                    ? `<button class="star no-print" aria-pressed="${cell.priority}" aria-label="Marquer comme prioritaire">${cell.priority ? "★" : "☆"}</button>`
                    : ""
                }
              </div>`,
              )
              .join("")}
          </div>`,
          )
          .join("")}
      </div></div>

      <aside class="monday">
        <h2>Mon lundi à 10h <span class="muted">${top.length}/${PRIORITY_COUNT}</span></h2>
        <ol>
          ${Array.from({ length: PRIORITY_COUNT }, (_, k) => {
            const p = top[k];
            return p
              ? `<li><span>${esc(p.action.title)}</span><small>${esc(p.lever)}</small></li>`
              : `<li class="placeholder no-print">Choisissez une action prioritaire dans la grille (☆)</li>`;
          }).join("")}
        </ol>
      </aside>
    </section>`;

  app.querySelectorAll(".cell").forEach((cellEl) => {
    const text = cellEl.querySelector(".cell-text[contenteditable]");
    if (!text) return;
    const leverIndex = cellEl.dataset.lever === undefined ? null : Number(cellEl.dataset.lever);
    editable(text, (value) => {
      if (cellEl.classList.contains("cell-core")) {
        state.core_goal = value || state.goal;
      } else if (cellEl.classList.contains("cell-lever") || cellEl.classList.contains("cell-lever-center")) {
        if (value) state.levers[leverIndex].title = value;
      } else if (cellEl.dataset.id) {
        const action = state.levers[leverIndex].actions.find((a) => a.id === cellEl.dataset.id);
        action.title = value;
        if (!value) action.is_priority = false;
      } else if (value) {
        // Case libre : nouvelle action saisie par l'utilisateur.
        const lever = state.levers[leverIndex];
        const [action] = makeActions(leverIndex, [value], false);
        action.id = `act-${leverIndex + 1}-${lever.actions.length + 1}`;
        lever.actions.push(action);
      }
      save();
      render();
    });
  });
  app.querySelectorAll(".star").forEach((star) =>
    star.addEventListener("click", () => {
      if (!togglePriority(state, star.closest(".cell").dataset.id)) {
        toast(`Vous avez déjà choisi ${PRIORITY_COUNT} priorités. Retirez-en une d'abord.`);
        return;
      }
      save();
      render();
    }),
  );
  app.querySelector("#copy-md").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(toMarkdown(state));
      toast("Plan copié — collez-le dans Notion, Apple Notes ou Slack.", "success");
    } catch {
      download(`${slug()}.md`, toMarkdown(state), "text/markdown");
      toast("Copie bloquée par le navigateur : fichier Markdown téléchargé.");
    }
    track("export", { format: "markdown", ...statsPayload() });
  });
  app.querySelector("#pdf").addEventListener("click", () => {
    track("export", { format: "pdf", ...statsPayload() });
    window.print();
  });
  app.querySelector("#json").addEventListener("click", () => {
    download(`${slug()}.json`, JSON.stringify(buildDocument(state), null, 2), "application/json");
    track("export", { format: "json", ...statsPayload() });
  });
}

function slug() {
  const base = (state.core_goal || state.goal)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `mandelflow-${base || "matrice"}`;
}

function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- démarrage ----------

document.getElementById("restart").addEventListener("click", () => {
  if (!confirm("Recommencer une nouvelle matrice ? La matrice actuelle sera effacée.")) return;
  state = null;
  actionRequests.clear();
  save();
  render();
});

api("/api/config")
  .then((cfg) => {
    if (cfg.mode === "demo") {
      const badge = document.getElementById("mode-badge");
      badge.textContent = "Mode démo";
      badge.title = "Aucune clé API configurée : propositions issues d'une bibliothèque générique.";
      badge.hidden = false;
    }
  })
  .catch(() => {});

render();
// Reprise d'une session interrompue pendant le chargement des leviers.
if (state?.step === "levers" && !state.proposals.length && state.levers.length < LEVER_COUNT) fetchLevers();
