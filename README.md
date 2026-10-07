# MandelFlow

Coach méthodologique guidé par l'IA pour passer d'un objectif ambitieux à une matrice **Mandel-art 9x9** complète (1 objectif → 8 leviers → 64 micro-actions), sans jamais faire face à une grille de 81 cases vide.

## Démarrage

```bash
npm install
export ANTHROPIC_API_KEY=sk-ant-...   # facultatif : sans clé, l'app tourne en mode démo
npm start                              # http://localhost:3000
npm test
```

Node 20 ou plus récent est requis.

| Variable | Rôle | Défaut |
|---|---|---|
| `ANTHROPIC_API_KEY` | Clé API Claude. Absente → mode démo. | — |
| `MANDELFLOW_MODEL` | Modèle utilisé | `claude-opus-5-5` |
| `MANDELFLOW_DEMO=1` | Force le mode démo (bibliothèque générique, sans appel IA) | — |
| `PORT` | Port HTTP | `3000` |

## Parcours (PRD §3)

1. **L'Amorce** : un champ unique pour l'objectif, plus un contexte facultatif masqué par défaut.
2. **La sélection guidée**
   - *Phase A* : les leviers arrivent par lots de 4 cartes. Un clic retient une carte, « Recharger d'autres idées » propose un nouveau lot, un clic sur le titre permet de le modifier. Un compteur indique « x leviers sur 8 sélectionnés ».
   - *Phase B* : les leviers sont traités un par un, avec 8 micro-actions cochées par défaut. On peut décocher, modifier le texte, demander « Plus simple » ou « Plus mesurable », puis valider le bloc. Les micro-actions du levier suivant sont préchargées pour éviter l'attente.
3. **Restitution** : la grille 9x9 aérée s'affiche, avec un zoom au survol de chaque bloc 3x3 et l'édition de n'importe quelle case en un clic. On sélectionne ★ les 3 actions de **« Mon lundi à 10h »**.
   - Exports : **Markdown** (copié dans le presse-papiers), **PDF A4** (feuille de style d'impression, une page) et **JSON** (modèle de données §4.1).

La session est sauvegardée dans le navigateur (`localStorage`) : un rechargement de page reprend là où l'utilisateur s'était arrêté.

## Moteur IA (PRD §4.2)

`src/ai.js` appelle Claude avec des **sorties structurées** (schémas Zod) et un prompt système qui impose les règles de la méthode :
orthogonalité des 8 leviers, actionnabilité binaire (Oui/Non), contrôle direct à 100 % par l'utilisateur et micro-actions de 10 mots maximum.
Les leviers déjà retenus ou écartés sont renvoyés à chaque lot pour éviter les doublons sémantiques. Le paramètre `fallbacks: "default"` est activé : si le modèle décline une requête, l'API la relance automatiquement sur un modèle de repli.

## Métriques (PRD §5.2)

Le client envoie des événements anonymes (`session_start`, `levers_done`, `grid_completed`, `export`) vers `data/events.ndjson`.
`GET /api/metrics` renvoie les KPIs du MVP :

- **taux de complétion** : sessions qui atteignent la grille ÷ sessions démarrées (cible > 65 %) ;
- **durée médiane de création** (cible < 8 min) ;
- **taux d'édition manuelle** : propositions IA retouchées ÷ propositions IA conservées (cible 15–30 %).

## Structure

```
server.js            serveur HTTP (statique + API)
src/ai.js            appels Claude et règles méthodologiques
src/demo.js          moteur hors-ligne (mode démo)
src/metrics.js       agrégation des KPIs
public/index.html    shell de l'application
public/styles.css    styles écran + impression A4
public/js/app.js     interface en 3 étapes
public/js/model.js   logique pure : grille, priorités, exports, statistiques
test/                tests (node:test)
```

## API

| Méthode | Route | Corps | Réponse |
|---|---|---|---|
| GET | `/api/config` | — | `{ mode: "ai" \| "demo", model }` |
| POST | `/api/levers` | `{ goal, context?, selected[], rejected[], count? }` | `{ core_goal, levers: [{ title, description }] }` |
| POST | `/api/actions` | `{ goal, context?, lever: { title, description }, otherLevers[] }` | `{ actions: string[8] }` |
| POST | `/api/rephrase` | `{ goal, lever, action, mode: "simpler" \| "measurable" }` | `{ action }` |
| POST | `/api/events` | `{ type, session, duration_ms?, ai_items?, edited_items?, format? }` | `{ ok }` |
| GET | `/api/metrics` | — | KPIs agrégés |
