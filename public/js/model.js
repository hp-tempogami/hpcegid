// Fonctions pures sur l'état d'une matrice : utilisées par l'interface et par les tests.

export const LEVER_COUNT = 8;
export const ACTION_COUNT = 8;
export const PRIORITY_COUNT = 3;

// Position (0-8, lecture ligne par ligne) de chaque levier autour d'une case
// centrale : les 8 cases d'un bloc 3x3, centre (4) exclu.
export const RING = [0, 1, 2, 3, 5, 6, 7, 8];

export function uuid() {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function newState({ goal, context = "" }) {
  return {
    id: uuid(),
    created_at: new Date().toISOString(),
    started_at: Date.now(),
    completed_at: null,
    step: "levers",
    goal: goal.trim(),
    context: context.trim(),
    core_goal: "",
    proposals: [],
    rejected: [],
    levers: [],
    current: 0,
  };
}

export function makeLever(index, { title, description = "" }, fromAI = true) {
  return {
    id: `lever-${index + 1}`,
    title,
    description,
    ai_title: fromAI ? title : null,
    actions: [],
    done: false,
  };
}

export function makeActions(leverIndex, titles, fromAI = true) {
  return titles.slice(0, ACTION_COUNT).map((title, j) => ({
    id: `act-${leverIndex + 1}-${j + 1}`,
    title,
    ai_title: fromAI ? title : null,
    checked: true,
    is_priority: false,
  }));
}

// Renumérote les identifiants après suppression ou réorganisation des leviers.
export function renumber(levers) {
  levers.forEach((lever, i) => {
    lever.id = `lever-${i + 1}`;
    lever.actions.forEach((a, j) => (a.id = `act-${i + 1}-${j + 1}`));
  });
  return levers;
}

export const keptActions = (lever) => lever.actions.filter((a) => a.checked && a.title.trim());

export function priorities(state) {
  return state.levers.flatMap((lever) =>
    keptActions(lever)
      .filter((a) => a.is_priority)
      .map((a) => ({ lever: lever.title, action: a })),
  );
}

// Bascule une priorité ; refuse au-delà de PRIORITY_COUNT. Renvoie true si l'état a changé.
export function togglePriority(state, actionId) {
  const action = state.levers.flatMap((l) => l.actions).find((a) => a.id === actionId);
  if (!action) return false;
  if (!action.is_priority && priorities(state).length >= PRIORITY_COUNT) return false;
  action.is_priority = !action.is_priority;
  return true;
}

// Grille 9x9 organisée en 9 blocs 3x3. Le bloc central porte l'objectif et les
// 8 leviers ; le bloc RING[i] porte le levier i en son centre et ses actions autour.
export function gridBlocks(state) {
  const blocks = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => ({ kind: "empty", text: "" })));
  const center = blocks[4];
  center[4] = { kind: "core", text: state.core_goal || state.goal };
  state.levers.slice(0, LEVER_COUNT).forEach((lever, i) => {
    center[RING[i]] = { kind: "lever", text: lever.title, lever: i };
    const block = blocks[RING[i]];
    block[4] = { kind: "lever-center", text: lever.title, lever: i };
    const kept = keptActions(lever);
    RING.forEach((pos, j) => {
      const action = kept[j];
      block[pos] = action
        ? { kind: "action", text: action.title, lever: i, id: action.id, priority: action.is_priority }
        : { kind: "empty", text: "", lever: i, slot: j };
    });
  });
  return blocks;
}

// Statistiques d'appropriation : part des propositions IA retouchées à la main.
export function editStats(state) {
  let aiItems = 0;
  let edited = 0;
  for (const lever of state.levers) {
    if (lever.ai_title !== null) {
      aiItems++;
      if (lever.title.trim() !== lever.ai_title.trim()) edited++;
    }
    for (const a of keptActions(lever)) {
      if (a.ai_title !== null) {
        aiItems++;
        if (a.title.trim() !== a.ai_title.trim()) edited++;
      }
    }
  }
  return { ai_items: aiItems, edited_items: edited, rate: aiItems ? edited / aiItems : 0 };
}

// Document conforme au modèle de données du PRD (§4.1).
export function buildDocument(state) {
  return {
    mandelart_id: state.id,
    created_at: state.created_at,
    user_context: { main_goal: state.goal, context_text: state.context },
    central_matrix: {
      core_goal: state.core_goal || state.goal,
      levers: state.levers.map((lever) => ({
        id: lever.id,
        title: lever.title,
        description: lever.description,
        actions: keptActions(lever).map((a) => ({ id: a.id, title: a.title, is_priority: a.is_priority })),
      })),
    },
  };
}

export function toMarkdown(state) {
  const lines = [`# ${state.core_goal || state.goal}`, "", `**Objectif :** ${state.goal}`];
  if (state.context) lines.push(`**Contexte :** ${state.context}`);
  const top = priorities(state);
  if (top.length) {
    lines.push("", "## Mon lundi à 10h", "");
    top.forEach(({ lever, action }, i) => lines.push(`${i + 1}. ${action.title} _(${lever})_`));
  }
  state.levers.forEach((lever, i) => {
    lines.push("", `## ${i + 1}. ${lever.title}`);
    if (lever.description) lines.push(`_${lever.description}_`);
    lines.push("");
    keptActions(lever).forEach((a) => lines.push(`- [ ] ${a.title}${a.is_priority ? " ⭐" : ""}`));
  });
  return lines.join("\n") + "\n";
}
