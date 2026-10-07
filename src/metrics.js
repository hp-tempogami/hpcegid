// Agrégation des KPIs du MVP (PRD §5.2) à partir du journal d'événements.
export const TARGETS = { completion_rate: 0.65, median_duration_min: 8, edit_rate: [0.15, 0.3] };

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function summarizeEvents(events) {
  const started = new Set(events.filter((e) => e.type === "session_start").map((e) => e.session));
  const completed = events.filter((e) => e.type === "grid_completed");
  const completedSessions = new Set(completed.map((e) => e.session));
  const durations = completed.map((e) => e.duration_ms).filter((d) => typeof d === "number");
  // Taux d'édition : dernier relevé connu par session (complétion puis exports,
  // qui intègrent les retouches faites dans la grille).
  const latest = new Map();
  for (const e of events) {
    if ((e.type === "grid_completed" || e.type === "export") && typeof e.ai_items === "number") latest.set(e.session, e);
  }
  const aiItems = [...latest.values()].reduce((n, e) => n + e.ai_items, 0);
  const edited = [...latest.values()].reduce((n, e) => n + (e.edited_items || 0), 0);
  const medianMs = median(durations);
  return {
    sessions_started: started.size,
    grids_completed: completedSessions.size,
    completion_rate: started.size ? completedSessions.size / started.size : null,
    median_duration_min: medianMs === null ? null : Math.round((medianMs / 60000) * 10) / 10,
    edit_rate: aiItems ? edited / aiItems : null,
    exports: events.filter((e) => e.type === "export").length,
    targets: TARGETS,
  };
}
