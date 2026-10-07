// Serveur MandelFlow : fichiers statiques + API de suggestions + collecte des métriques.
import { createServer } from "node:http";
import { readFile, appendFile, mkdir } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import * as ai from "./src/ai.js";
import * as demo from "./src/demo.js";
import { summarizeEvents } from "./src/metrics.js";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC = join(ROOT, "public");
const DATA = join(ROOT, "data");
const EVENTS_FILE = join(DATA, "events.ndjson");
const PORT = Number(process.env.PORT) || 3000;
const DEMO = process.env.MANDELFLOW_DEMO === "1" || !ai.hasCredentials();

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
};

const MAX_TEXT = 600;
const text = (v, max = MAX_TEXT) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const texts = (v) => (Array.isArray(v) ? v.map((s) => text(s, 120)).filter(Boolean).slice(0, 40) : []);

const routes = {
  "GET /api/config": async () => ({ mode: DEMO ? "demo" : "ai", model: DEMO ? null : ai.MODEL }),

  "POST /api/levers": async (body) => {
    const input = {
      goal: text(body.goal),
      context: text(body.context),
      selected: texts(body.selected),
      rejected: texts(body.rejected),
      count: Math.min(Math.max(Number(body.count) || 4, 1), 8),
    };
    if (!input.goal) throw new HttpError(400, "L'objectif principal est requis.");
    return DEMO ? demo.demoLevers(input) : ai.suggestLevers(input);
  },

  "POST /api/actions": async (body) => {
    const input = {
      goal: text(body.goal),
      context: text(body.context),
      lever: { title: text(body.lever?.title, 120), description: text(body.lever?.description, 200) },
      otherLevers: texts(body.otherLevers),
    };
    if (!input.goal || !input.lever.title) throw new HttpError(400, "Objectif et levier requis.");
    return DEMO ? demo.demoActions(input) : ai.suggestActions(input);
  },

  "POST /api/rephrase": async (body) => {
    const input = {
      goal: text(body.goal),
      lever: text(body.lever, 120),
      action: text(body.action, 200),
      mode: body.mode === "measurable" ? "measurable" : "simpler",
    };
    if (!input.action) throw new HttpError(400, "Action requise.");
    return DEMO ? demo.demoRephrase(input) : ai.rephraseAction(input);
  },

  // Événements anonymes pour les KPIs du MVP (complétion, durée, taux d'édition).
  "POST /api/events": async (body) => {
    const allowed = ["session_start", "levers_done", "grid_completed", "export"];
    if (!allowed.includes(body.type)) throw new HttpError(400, "Type d'événement inconnu.");
    const event = {
      type: body.type,
      session: text(body.session, 64),
      at: new Date().toISOString(),
      ...(typeof body.duration_ms === "number" && { duration_ms: body.duration_ms }),
      ...(typeof body.ai_items === "number" && { ai_items: body.ai_items }),
      ...(typeof body.edited_items === "number" && { edited_items: body.edited_items }),
      ...(body.format && { format: text(body.format, 20) }),
    };
    await mkdir(DATA, { recursive: true });
    await appendFile(EVENTS_FILE, JSON.stringify(event) + "\n");
    return { ok: true };
  },

  "GET /api/metrics": async () => {
    const raw = await readFile(EVENTS_FILE, "utf8").catch(() => "");
    const events = raw.split("\n").filter(Boolean).map((l) => JSON.parse(l));
    return summarizeEvents(events);
  },
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function readBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 64 * 1024) throw new HttpError(413, "Requête trop volumineuse.");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "JSON invalide.");
  }
}

function send(res, status, payload) {
  res.writeHead(status, { "Content-Type": TYPES[".json"], "Cache-Control": "no-store" });
  res.end(JSON.stringify(payload));
}

async function serveStatic(pathname, res) {
  const file = normalize(join(PUBLIC, pathname === "/" ? "index.html" : pathname));
  if (!file.startsWith(PUBLIC + sep)) return send(res, 403, { error: "Interdit" });
  try {
    const content = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" });
    res.end(content);
  } catch {
    send(res, 404, { error: "Introuvable" });
  }
}

function errorStatus(err) {
  if (err instanceof HttpError) return [err.status, err.message];
  if (err instanceof ai.AIError) return [502, err.message];
  if (err instanceof Anthropic.RateLimitError) return [429, "Trop de demandes simultanées, réessayez dans un instant."];
  if (err instanceof Anthropic.AuthenticationError) return [500, "Clé API Anthropic invalide côté serveur."];
  if (err instanceof Anthropic.APIConnectionError) return [503, "Service IA injoignable, réessayez."];
  if (err instanceof Anthropic.APIError) return [502, "Le service IA a renvoyé une erreur, réessayez."];
  return [500, "Erreur interne."];
}

export const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  const handler = routes[`${req.method} ${pathname}`];
  if (!handler) {
    if (req.method === "GET" && !pathname.startsWith("/api/")) return serveStatic(pathname, res);
    return send(res, 404, { error: "Route inconnue" });
  }
  try {
    const body = req.method === "POST" ? await readBody(req) : {};
    send(res, 200, await handler(body));
  } catch (err) {
    const [status, message] = errorStatus(err);
    if (status >= 500) console.error(`[${req.method} ${pathname}]`, err);
    send(res, status, { error: message });
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, () => {
    console.log(`MandelFlow → http://localhost:${PORT}  (mode ${DEMO ? "démo hors-ligne" : `IA, modèle ${ai.MODEL}`})`);
  });
}
