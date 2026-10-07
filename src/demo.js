// Moteur de démonstration hors-ligne : utilisé quand aucune clé API n'est
// configurée. Bibliothèque générique de leviers orthogonaux et de micro-actions
// binaires, pour pouvoir parcourir le flux complet sans appel IA.

export const LIBRARY = [
  {
    title: "Communication exécutive",
    description: "Adopter un style concis et orienté décision",
    actions: [
      "Préparer 3 messages clés avant chaque réunion de direction",
      "Prendre la parole dans les 5 premières minutes",
      "Résumer chaque e-mail important en 3 lignes maximum",
      "Commencer chaque présentation par la recommandation",
      "Répéter à voix haute chaque intervention importante",
      "Supprimer une slide de chaque présentation avant envoi",
      "Demander un feedback sur ma clarté après chaque comité",
      "Conclure chaque réunion par une décision écrite",
    ],
  },
  {
    title: "Réseau stratégique",
    description: "Cultiver les relations qui comptent pour l'objectif",
    actions: [
      "Lister 10 personnes clés pour mon objectif",
      "Proposer un café à une personne clé chaque semaine",
      "Relancer chaque nouveau contact sous 48 h",
      "Partager un article utile à un contact chaque vendredi",
      "Participer à un événement professionnel par mois",
      "Mettre à jour ma carte relationnelle chaque mois",
      "Présenter deux personnes de mon réseau chaque mois",
      "Remercier par écrit une personne aidante chaque semaine",
    ],
  },
  {
    title: "Visibilité interne",
    description: "Rendre ses contributions lisibles par les décideurs",
    actions: [
      "Envoyer un point d'avancement hebdomadaire à mon N+1",
      "Présenter un résultat chiffré en comité chaque mois",
      "Publier une synthèse de projet sur l'intranet chaque trimestre",
      "Proposer d'animer une réunion transverse ce mois-ci",
      "Citer nominativement l'équipe à chaque succès partagé",
      "Préparer un pitch de 60 secondes sur mes priorités",
      "Demander 15 minutes à un dirigeant chaque mois",
      "Documenter chaque victoire dans un journal hebdomadaire",
    ],
  },
  {
    title: "Expertise métier",
    description: "Approfondir les compétences qui font la différence",
    actions: [
      "Bloquer 2 heures d'apprentissage chaque semaine",
      "Lire un chapitre d'ouvrage de référence chaque soir",
      "Suivre une formation certifiante ce trimestre",
      "Écrire une note de synthèse après chaque lecture",
      "Identifier 3 compétences manquantes dans ma fiche cible",
      "Demander un mentorat sur une compétence clé",
      "Appliquer une technique apprise dans la semaine",
      "Écouter un podcast métier pendant chaque trajet",
    ],
  },
  {
    title: "Vision business",
    description: "Comprendre et parler le langage du P&L",
    actions: [
      "Lire le reporting financier mensuel en entier",
      "Calculer l'impact chiffré de chaque projet proposé",
      "Déjeuner avec le DAF une fois par trimestre",
      "Analyser un concurrent en 1 page chaque mois",
      "Relier chaque initiative à un KPI de l'entreprise",
      "Rédiger une note stratégique d'une page par trimestre",
      "Poser une question business en chaque comité",
      "Suivre 3 indicateurs clés dans un tableau hebdomadaire",
    ],
  },
  {
    title: "Leadership d'équipe",
    description: "Faire grandir l'équipe et déléguer davantage",
    actions: [
      "Tenir un one-to-one de 30 minutes chaque semaine",
      "Déléguer une décision nouvelle chaque semaine",
      "Formuler un feedback positif précis chaque jour",
      "Rédiger un plan de développement par collaborateur",
      "Identifier et préparer mon successeur potentiel",
      "Clarifier les priorités de l'équipe chaque lundi",
      "Organiser une rétrospective d'équipe chaque mois",
      "Poser une question ouverte avant chaque arbitrage",
    ],
  },
  {
    title: "Production à impact",
    description: "Concentrer son temps sur les livrables décisifs",
    actions: [
      "Définir mes 3 priorités chaque lundi à 9h",
      "Bloquer 2 créneaux de travail profond par semaine",
      "Livrer un résultat visible chaque vendredi",
      "Refuser une réunion sans ordre du jour par semaine",
      "Mesurer l'avancement de mon projet phare chaque semaine",
      "Terminer une tâche avant d'en commencer une autre",
      "Revoir mon agenda chaque vendredi pour la semaine suivante",
      "Supprimer une tâche à faible valeur chaque semaine",
    ],
  },
  {
    title: "Posture & présence",
    description: "Incarner le niveau de responsabilité visé",
    actions: [
      "Arriver 5 minutes avant chaque réunion importante",
      "Formuler une position claire à chaque arbitrage",
      "Préparer une réponse aux 3 objections probables",
      "Observer un dirigeant modèle et noter 1 pratique",
      "Respirer 1 minute avant chaque prise de parole",
      "Assumer publiquement une erreur dans les 24 h",
      "Demander un feedback sur ma posture chaque mois",
      "Adapter ma tenue au niveau du comité visé",
    ],
  },
  {
    title: "Énergie & santé",
    description: "Préserver la capacité à tenir dans la durée",
    actions: [
      "Dormir 7 heures au moins 5 nuits par semaine",
      "Marcher 30 minutes chaque jour",
      "Faire 3 séances de sport par semaine",
      "Couper les écrans 1 heure avant le coucher",
      "Prendre une vraie pause déjeuner sans écran",
      "Boire 1,5 litre d'eau chaque jour",
      "Planifier une demi-journée sans réunion par semaine",
      "Noter mon niveau d'énergie chaque soir",
    ],
  },
  {
    title: "Outils & méthodes",
    description: "S'équiper pour gagner en efficacité",
    actions: [
      "Automatiser une tâche répétitive chaque mois",
      "Vider ma boîte mail à zéro chaque vendredi",
      "Utiliser un modèle unique pour mes comptes rendus",
      "Tester un outil d'IA sur une tâche par semaine",
      "Centraliser mes notes dans un seul outil",
      "Créer une checklist pour chaque processus récurrent",
      "Planifier mes tâches la veille au soir",
      "Archiver les dossiers terminés chaque fin de mois",
    ],
  },
  {
    title: "Marque personnelle",
    description: "Construire une réputation externe cohérente",
    actions: [
      "Publier un post LinkedIn de fond chaque semaine",
      "Commenter 3 publications de mon secteur chaque jour",
      "Mettre à jour mon profil LinkedIn ce mois-ci",
      "Proposer une intervention à une conférence ce trimestre",
      "Rédiger un article d'expertise chaque mois",
      "Définir 3 thèmes sur lesquels je prends la parole",
      "Répondre à toutes les sollicitations presse sous 48 h",
      "Recenser mes 5 réalisations les plus marquantes",
    ],
  },
  {
    title: "Sponsors & alliés",
    description: "Obtenir des soutiens actifs au plus haut niveau",
    actions: [
      "Identifier 2 sponsors potentiels au COMEX",
      "Exprimer explicitement mon ambition à mon N+1",
      "Demander un conseil à un sponsor chaque mois",
      "Proposer mon aide sur une priorité d'un sponsor",
      "Partager mes résultats avec mes alliés chaque trimestre",
      "Cartographier les influenceurs de chaque décision clé",
      "Préparer mon entretien annuel 1 mois à l'avance",
      "Remercier mon sponsor après chaque soutien reçu",
    ],
  },
  {
    title: "Innovation & initiative",
    description: "Proposer des idées qui créent de la valeur",
    actions: [
      "Noter une idée d'amélioration chaque jour",
      "Présenter une proposition chiffrée chaque trimestre",
      "Lancer un pilote à petite échelle ce trimestre",
      "Consacrer 1 heure par semaine à la veille",
      "Rencontrer un client chaque mois",
      "Organiser un atelier d'idéation avec l'équipe",
      "Tester une idée en moins de 2 semaines",
      "Partager un apprentissage d'échec chaque mois",
    ],
  },
  {
    title: "Gestion du temps",
    description: "Reprendre le contrôle de son agenda",
    actions: [
      "Bloquer mes priorités dans l'agenda chaque lundi",
      "Limiter les réunions à 30 minutes par défaut",
      "Consulter mes e-mails 3 fois par jour seulement",
      "Dire non à une sollicitation non prioritaire par jour",
      "Mesurer mon temps par activité pendant une semaine",
      "Regrouper les appels sur un créneau fixe",
      "Terminer la journée par 10 minutes de planification",
      "Réserver une heure sans interruption chaque matin",
    ],
  },
  {
    title: "Influence transverse",
    description: "Faire avancer les sujets sans autorité directe",
    actions: [
      "Rencontrer un pair d'une autre direction chaque semaine",
      "Co-construire un projet avec une autre équipe",
      "Préparer chaque demande avec le bénéfice pour l'autre",
      "Identifier les enjeux des 5 directeurs clés",
      "Proposer un point mensuel avec les fonctions support",
      "Formaliser chaque accord par un e-mail récapitulatif",
      "Solliciter un avis avant chaque proposition importante",
      "Rendre un service à un pair chaque semaine",
    ],
  },
  {
    title: "Résilience & recul",
    description: "Garder la clarté sous pression",
    actions: [
      "Écrire 3 apprentissages chaque vendredi",
      "Méditer 10 minutes chaque matin",
      "Relire mes objectifs chaque dimanche soir",
      "Parler à un pair de confiance chaque mois",
      "Attendre 24 h avant toute réponse sous émotion",
      "Célébrer une petite victoire chaque semaine",
      "Faire un bilan trimestriel écrit de ma progression",
      "Prendre une journée de déconnexion chaque mois",
    ],
  },
];

const norm = (s) => s.trim().toLowerCase();

// Retire l'échéance (« d'ici 12 mois », « en 2027 »…) pour la case centrale.
function shortGoal(goal) {
  const core = goal.replace(/[«»"]/g, "").trim().split(/\s+(?:d'ici|dans les?|en|avant|sous)\s+/i)[0];
  return core.split(/\s+/).slice(0, 6).join(" ");
}

export function demoLevers({ goal, selected = [], rejected = [], count = 4 }) {
  const excluded = new Set([...selected, ...rejected].map(norm));
  let pool = LIBRARY.filter((l) => !excluded.has(norm(l.title)));
  // Si tout a été proposé, on recycle les leviers écartés (jamais les retenus).
  if (pool.length < count) {
    const kept = new Set(selected.map(norm));
    pool = LIBRARY.filter((l) => !kept.has(norm(l.title)));
  }
  return {
    core_goal: shortGoal(goal),
    levers: pool.slice(0, count).map(({ title, description }) => ({ title, description })),
  };
}

const GENERIC_ACTIONS = [
  "Définir un indicateur de progrès pour ce levier",
  "Bloquer 30 minutes dédiées chaque semaine",
  "Noter chaque vendredi une avancée concrète",
  "Demander un feedback ciblé à un pair ce mois-ci",
  "Identifier une personne inspirante sur ce sujet",
  "Lire une ressource de référence ce mois-ci",
  "Fixer une première action réalisable lundi",
  "Faire un bilan écrit à la fin du mois",
];

export function demoActions({ lever }) {
  const match = LIBRARY.find((l) => norm(lever.title).includes(norm(l.title)));
  return { actions: (match ? match.actions : GENERIC_ACTIONS).slice(0, 8) };
}

export function demoRephrase({ action, mode }) {
  if (mode === "measurable") {
    return { action: /\d/.test(action) ? `${action} (suivi chaque vendredi)` : `${action}, 2 fois par semaine` };
  }
  // « Plus simple » : on garde le cœur de l'action, sans ses compléments.
  const core = action.split(/\s+(?:avant|après|pendant|dans|sur|chaque|en|par|sous|à)\s+/)[0];
  return { action: core.split(/\s+/).length >= 3 && core !== action ? core : `Commencer petit : ${action.toLowerCase()}` };
}
