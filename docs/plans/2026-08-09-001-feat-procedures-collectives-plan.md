---
title: "Alerte procédures collectives (BODACC par SIREN) et panneau effectifs à la demande"
date: 2026-08-09
type: feat
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: ce-brainstorm
---

# Alerte procédures collectives et panneau effectifs à la demande

## Goal Capsule

Deux demandes utilisateur du 2026-08-09 : (1) être prévenu quand une entreprise rattachée fait l'objet d'une **procédure collective** (enjeu facturation : sauvegarde, redressement, liquidation) — source : **BODACC**, API publique d'État vérifiée empiriquement (sans clé, CORS `*`, recherche par SIREN, jugements structurés nature/date/tribunal/complément) ; (2) le panneau « Taille des entreprises » du tableau de bord ne s'affiche plus que **à la demande**, via une entrée du menu ⋯ (motif existant). v1.5.3/kit-crm-v45.

## Product Contract

### Key Decisions

- KD1 (session-settled: user-directed) — Alerte sur les procédures collectives uniquement (famille BODACC « Procédures collectives ») ; déclenchée par les gestes manuels existants, jamais en arrière-plan.
- KD2 (session-settled: user-approved) — Enveloppe RGPD inchangée : seul le **SIREN mémorisé** (donnée publique, déjà envoyée pour les effectifs) part vers le BODACC ; `referrerPolicy: no-referrer`, `credentials: omit`.
- KD3 — KIT affiche les **faits** (dernier jugement : nature, date, tribunal), pas une interprétation juridique. L'utilisateur est avocat : le badge signale, il n'analyse pas.
- KD4 — État d'alerte à trois niveaux : `en-cours` (dernier jugement d'ouverture sans clôture postérieure) → badge d'alerte visible ; `cloturee` (clôture postérieure à l'ouverture) → mention discrète sur la fiche seule ; `aucune` → rien.
- KD5 (session-settled: user-directed) — Le panneau « Taille des entreprises » disparaît du tableau de bord ; entrée « 🏢 Taille des entreprises » dans le menu ⋯ (motif showMeetingSettings/showBackup), non persisté (fermé à chaque chargement).

### Requirements

- R1. « Mettre à jour les effectifs » interroge AUSSI le BODACC pour chaque cible à SIREN mémorisé ; les procédures détectées alimentent la fiche et une section dédiée du compte rendu.
- R2. La fiche d'un contact à SIREN mémorisé offre « Vérifier au BODACC » (manuel) ; badge ⚠ visible si procédure en cours (nature + date + tribunal), mention discrète si clôturée.
- R3. Le récapitulatif hebdomadaire ajoute une section « ⚠ Procédures collectives » listant les contacts en `en-cours` (données déjà en fiche — aucun appel réseau au rendu).
- R4. Les six champs procédure sont des champs de fiche : sauvegardés, exportés, fusionnés par champ (groupe atomique, motif effectif*).
- R5. Le panneau effectifs n'apparaît que via le menu ⋯ ; toutes ses fonctions (lots, aperçu, compte rendu) inchangées.
- R6. CSP : `connect-src` étendu à `https://bodacc-datadila.opendatasoft.com` — verrouillé par la garde « document réel » (`cspDirectiveAllows`).
- R7. Versions v1.5.3/kit-crm-v45 (regex du test version mises à jour).

### Acceptance Examples

- AE1. Contact rattaché dont l'entreprise est en redressement → « Mettre à jour les effectifs » → badge ⚠ « Redressement judiciaire — 18/01/2026 — TAE Marseille » sur la fiche, section du compte rendu la liste.
- AE2. « Vérifier au BODACC » sur une fiche rattachée → même résultat sans lot.
- AE3. Entreprise sans aucune annonce → rien n'apparaît, compte rendu silencieux à son sujet.
- AE4. Procédure clôturée → mention discrète sur la fiche, PAS de badge d'alerte ni de ligne au récap.
- AE5. Récap hebdomadaire : le contact AE1 apparaît sous « ⚠ Procédures collectives ».
- AE6. Tableau de bord : plus de panneau permanent ; menu ⋯ → « Taille des entreprises » → panneau affiché, lots fonctionnels.

### Scope Boundaries

- Pas de surveillance continue ni d'appel automatique (y compris au rendu du récap : il lit les champs de fiche).
- Pas d'autres familles BODACC (ventes, radiations, comptes annuels…) ni d'interprétation de la situation juridique.
- Contacts sans SIREN mémorisé : hors périmètre BODACC (le rattachement est le prérequis).

## Planning Contract

### Key Technical Decisions

- KTD1 — URL pure `bodaccSearchUrl(siren)` : `https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records?where=registre like "{siren}" and familleavis_lib="Procédures collectives"&order_by=dateparution desc&limit=10` (composants encodés via encodeURIComponent ; siren validé `/^\d{9}$/` sinon null).
- KTD2 — Parseur pur `parseBodaccProcedures(body)` : pour chaque record, `jugement` est une **chaîne JSON** → parse sous garde ; sortie normalisée `[ { nature, famille, date (jugement.date || dateparution), tribunal } ]`, ordre chronologique décroissant préservé ; records malformés ignorés.
- KTD3 — Décision pure `procedureEtatFrom(procedures)` : "aucune" si vide ; sinon repérer la plus récente **ouverture** (`/ouverture/i` sur nature ou famille "Jugement d'ouverture") ; s'il existe un jugement de **clôture** (`/clôture|cloture/i`) postérieur ou égal → "cloturee", sinon "en-cours" ; aucune ouverture trouvée mais des annonces → "cloturee" (trace factuelle sans alarme).
- KTD4 — Champs contact (groupe atomique, motif effectif*) : `procedureEtat` ("aucune"|"en-cours"|"cloturee"), `procedureNature`, `procedureDate`, `procedureTribunal`, `procedureCheckISO` (date du contrôle) — ajoutés à `MERGE_FIELDS`, écrits ensemble via `updContact` (les non pertinents à "" explicites).
- KTD5 — Réseau : enveloppe des appels effectifs réutilisée (AbortController 15 s, no-referrer, credentials omit) ; dans le lot, l'appel BODACC suit l'appel effectif de la même cible avec **250 ms d'espacement** (motif du repli élargi) ; échec BODACC → champs procédure non touchés, compte rendu le note (« BODACC injoignable pour N fiches »), le lot continue.
- KTD6 — Panneau effectifs : état `showEffectifsPanel` (useState false) ; entrée menu ⋯ sur le motif exact des entrées existantes (ferme les autres panneaux) ; le bloc du tableau de bord (index.html:4291-4300) devient conditionnel.
- KTD7 — CSP + garde : domaine BODACC ajouté au connect-src ; cas KIT_TESTS « document réel » étendu via `cspDirectiveAllows(KIT_SOURCE_HTML, "connect-src", "https://bodacc-datadila.opendatasoft.com")`. Versions 1.5.3/v45 + regex du test version.

## Implementation Units

### PC-U1. Moteur pur BODACC

- **Goal :** URL, parseur et décision d'état rejoignent `KIT_PURE` avec leurs tests.
- **Files :** `index.html`.
- **Approach :** KTD1 + KTD2 + KTD3 ; export en union.
- **Test scenarios :** URL : siren valide → where/order_by/limit exacts encodés ; siren invalide ("12345", "ABCDEFGHI", null) → null. Parseur : jugement chaîne JSON valide → nature/date/tribunal extraits ; jugement malformé ignoré sans jeter ; body vide/absent → []. Décision : vide → "aucune" ; ouverture seule → "en-cours" ; ouverture puis clôture → "cloturee" ; clôture antérieure à une nouvelle ouverture → "en-cours" ; annonces sans ouverture (avis de dépôt seul) → "cloturee".
- **Verification :** `node scripts/kit-tests-node.js` 0 échec.

### PC-U2. Fiche, lot, récap, menu, versions

- **Goal :** l'alerte est branchée partout et le panneau effectifs devient à la demande.
- **Dependencies :** PC-U1.
- **Files :** `index.html`, `sw.js`, `LISEZMOI.txt`.
- **Approach :** champs KTD4 (MERGE_FIELDS + patch atomique) ; fiche : badge/mention selon `procedureEtat` + bouton « Vérifier au BODACC » (contacts à effectifSiren ; garde de séquence effectifReqSeq, enveloppe KTD5) ; lot « update » : appel BODACC par cible après l'appel effectif (KTD5), écritures via updContact sur le `working` du lot, section compte rendu ; récap hebdo : section depuis les champs de fiche (R3) ; menu ⋯ + panneau conditionnel (KTD6) ; CSP + versions + LISEZMOI (KTD7).
- **Test scenarios :** cas purs déjà en PC-U1 ; MERGE_FIELDS contient les 5 champs (cas statique) ; test de câblage document réel (« Vérifier au BODACC » appelle bodaccSearchUrl ; le lot aussi) ; garde CSP BODACC document réel ; version 1.5.3/v45 ; suite existante intacte.
- **Verification :** runner 0 échec ; Babel ; `node --check sw.js` ; smoke navigateur.

## Verification Contract

Portes habituelles sur l'arbre final ; smoke localhost (menu ⋯ → panneau ; badge simulé) ; checklist PR utilisateur : AE1-AE6 en réel (dont un vrai SIREN en procédure si disponible dans son portefeuille, sinon le SIREN de test 919948430 constaté en redressement le 2026-08-09).

## Definition of Done

PR vers `main` avec revue croisée (correctness + testing + passe adversariale Codex), constats corrigés. Fusion = déploiement v1.5.3.
