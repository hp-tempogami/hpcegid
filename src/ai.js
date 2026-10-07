// Moteur IA : appels à Claude contraints par les règles Mandel-art (PRD §4.2).
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

export const MODEL = process.env.MANDELFLOW_MODEL || "claude-opus-5-5";

// Règles méthodologiques partagées par toutes les requêtes.
const SYSTEM = `Tu es MandelFlow, un coach méthodologique expert de la méthode Mandel-art (grille 9x9 d'Ohtani).
Tu aides des dirigeants, managers et entrepreneurs à décomposer un objectif ambitieux en 8 leviers, puis chaque levier en 8 micro-actions quotidiennes.

Règles impératives :
1. Équilibre & étanchéité : les 8 leviers couvrent des dimensions strictement distinctes (ex. compétences, réseau, visibilité, production, posture, outils, santé/énergie, apprentissage). Aucun doublon sémantique, aucun recouvrement entre leviers.
2. Actionnabilité binaire : chaque micro-action est un comportement vérifiable par Oui/Non (« Préparer 3 points synthétiques avant chaque comité »). Interdits : concepts flous (« Être plus confiant », « Améliorer sa communication »).
3. Contrôle direct 100 % : uniquement des actions sous la responsabilité directe de l'utilisateur, jamais dépendantes de la décision d'autrui (« Obtenir une promotion » est interdit, « Demander un feedback à mon N+1 chaque vendredi » est valide).
4. Concision : titres de levier de 2 à 4 mots ; micro-actions de 10 mots maximum, commençant par un verbe à l'infinitif, avec une fréquence ou une quantité quand c'est pertinent.
5. Langue : français, ton professionnel et direct. Pas d'emoji.`;

const LeverBatch = z.object({
  core_goal: z.string().describe("Objectif central reformulé en 2 à 5 mots, pour la case centrale"),
  levers: z
    .array(
      z.object({
        title: z.string().describe("Titre du levier, 2 à 4 mots"),
        description: z.string().describe("Une phrase courte (max 12 mots) qui précise le levier"),
      }),
    )
    .describe("Exactement le nombre de leviers demandé"),
});

const ActionList = z.object({
  actions: z.array(z.string()).describe("Exactement 8 micro-actions, 10 mots maximum chacune"),
});

const Rephrased = z.object({ action: z.string() });

let client;
function getClient() {
  client ??= new Anthropic();
  return client;
}

export function hasCredentials() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_PROFILE);
}

async function ask(schema, prompt, effort) {
  const response = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    output_config: { effort, format: betaZodOutputFormat(schema) },
    messages: [{ role: "user", content: prompt }],
  });
  if (response.stop_reason === "refusal") {
    throw new AIError("La demande a été déclinée par le modèle. Reformulez votre objectif.");
  }
  if (!response.parsed_output) {
    throw new AIError("Réponse IA inexploitable, merci de réessayer.");
  }
  return response.parsed_output;
}

export class AIError extends Error {}

function contextBlock({ goal, context }) {
  let text = `Objectif principal : « ${goal} »`;
  if (context) text += `\nContexte et contraintes : ${context}`;
  return text;
}

function list(items) {
  return items.length ? items.map((t) => `- ${t}`).join("\n") : "(aucun)";
}

export async function suggestLevers({ goal, context, selected = [], rejected = [], count = 4 }) {
  const prompt = `${contextBlock({ goal, context })}

Leviers déjà retenus par l'utilisateur :
${list(selected)}

Leviers déjà proposés et écartés (ne pas reproposer, ni leurs synonymes) :
${list(rejected)}

Propose exactement ${count} nouveaux leviers stratégiques, orthogonaux entre eux et avec les leviers déjà retenus, qui couvrent des dimensions encore non traitées.`;
  const out = await ask(LeverBatch, prompt, "medium");
  return { core_goal: out.core_goal, levers: out.levers.slice(0, count) };
}

export async function suggestActions({ goal, context, lever, otherLevers = [] }) {
  const prompt = `${contextBlock({ goal, context })}

Levier à décliner : « ${lever.title} »${lever.description ? ` — ${lever.description}` : ""}

Autres leviers de la grille (ne pas empiéter sur eux) :
${list(otherLevers)}

Propose exactement 8 micro-actions concrètes, binaires (faites / pas faites), sous contrôle direct de l'utilisateur, pour activer ce levier. Elles doivent être réalisables dès lundi matin.`;
  const out = await ask(ActionList, prompt, "medium");
  return { actions: out.actions.slice(0, 8) };
}

const MODES = {
  simpler: "Rends-la plus simple et plus facile à démarrer (plus petite, moins de friction).",
  measurable: "Rends-la plus mesurable : ajoute une quantité, une fréquence ou une échéance explicite.",
};

export async function rephraseAction({ goal, lever, action, mode }) {
  const instruction = MODES[mode];
  if (!instruction) throw new AIError(`Mode de reformulation inconnu : ${mode}`);
  const prompt = `Objectif principal : « ${goal} »
Levier : « ${lever} »
Micro-action actuelle : « ${action} »

${instruction} Garde 10 mots maximum et le respect des règles. Renvoie une seule micro-action.`;
  return ask(Rephrased, prompt, "low");
}
