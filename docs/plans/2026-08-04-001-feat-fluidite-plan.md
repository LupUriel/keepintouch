---
title: Lot fluidité quotidienne — quatre gestes plus rapides
date: 2026-08-04
type: feat
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: ce-plan-bootstrap
---

# Lot fluidité quotidienne

## Goal Capsule

Quatre frictions quotidiennes vérifiées contre le code (backlog du 2026-08-01, coordonnées **main**), quatre correctifs petits et sûrs, tous en zones non touchées par les branches en attente :

1. **Journalisation éclair** — enregistrer une rencontre tenue passe aujourd'hui par le modal complet (choix du type, confirmation). `logInteraction(id, comment, date, type, …)` est appelable directement (l.1497, défauts `date=todayStr()`), le pattern existe déjà (journalisation auto d'une invitation, l.1679).
2. **Relance en un tap** — les lignes « ⚠ Relances en attente » (l.3054-3069) et « 🔁 À recontacter » (l.3071-3087) n'offrent que « +14 j » : la relance oblige à passer par la fiche. Le bouton « Proposer une rencontre » existe sur les lignes « Rencontres à programmer » (l.3109, pattern `openInviteModal` + `stopPropagation`) — report explicite du plan du geste d'invitation (l.148).
3. **Recherche élargie** — le haystack (l.2314) se limite à nom/prénom/société/fonction/secteur/tags/notes : chercher un contact par email ou téléphone échoue **silencieusement** (l'utilisateur croit la fiche absente). Ni `email`, ni `phonePro`/`phonePerso`/`phone` (hérité), ni adresse, ni dates clés.
4. **Édition d'une interaction** — corriger une faute ou une mauvaise date impose de supprimer définitivement (« Cette action est irréversible », l.1516) puis tout retaper. Or la date des interactions pilote tout le cycle de relance.

**Aucune dépendance Entra/Graph.** App single-file locale (index.html), données localStorage.

## Product Contract

### Requirements

- **R1** — Sur chaque ligne « Rencontres à programmer » et sur la fiche contact, un bouton « Déjeuner ✓ » journalise en un tap une rencontre type `dejeuner` datée d'aujourd'hui (sans commentaire) — les effets de cycle existants s'appliquent (report levé, followUp effacé, l.1505-1509). Les autres types passent par le modal existant, inchangé.
- **R2** — Chaque ligne de « ⚠ Relances en attente » et « 🔁 À recontacter » porte le bouton « Proposer une rencontre » (pattern exact de l.3109). Aucune modification du moteur d'invitation.
- **R3** — La recherche trouve un contact par email, téléphone (`phonePro`, `phonePerso`, `phone` hérité — « 0612 » matche « 06 12 34 56 78 »), adresse, lieu d'exercice (`workLocation`), lieu de rencontre (`metAt`), origine, notes de relance (`nextAction`, `followUpNote`) et libellés de dates clés. La recherche par chiffres ignore le formatage.
- **R4** — Chaque entrée de l'historique d'une fiche porte un bouton ✏ qui rouvre le modal de journalisation prérempli (type, date, commentaire, drapeaux) et met à jour l'entrée **existante** en conservant son `iid` et ses métadonnées d'invitation (`invitation`/`meal`/`datesProposees`/`canal`, invisibles dans le modal), puis re-trie par date. Sémantique assumée : correction **locale à l'appareil** (la fusion inter-appareils par `iid` ne propage pas le contenu — documenté, pas de last-write-wins en v1).
- **R5** — Versions : `APP_VERSION` **1.4.4**, `CACHE_NAME` **kit-crm-v40** (v36-v39 réservés aux branches en attente — saut volontaire). LISEZMOI : deux phrases (journalisation éclair, édition d'une interaction).

### Acceptance Examples

- **AE1** — Tap « Déjeuner ✓ » sur une ligne « Rencontres à programmer » : interaction `dejeuner` du jour dans la fiche, la ligne sort de la liste (cycle réinitialisé), aucun modal.
- **AE2** — Ligne « Relances en attente » → « Proposer une rencontre » : le modal d'invitation s'ouvre pour ce contact (mode manuel si agenda non connecté).
- **AE3** — Recherche « 0612 » : trouve le contact dont `phonePerso` = « 06 12 34 56 78 » ; recherche d'un fragment d'email : trouve la fiche.
- **AE4** — ✏ sur une interaction : modal prérempli ; corriger la date ; l'entrée garde son `iid`, l'historique se re-trie ; les alertes de cycle reflètent la nouvelle date.
- **AE5** — ✏ sur une interaction d'invitation (avec métadonnées) : après correction du commentaire, `invitation`/`meal`/`datesProposees`/`canal` sont intacts.
- **AE6** — Fermer le modal d'édition sans confirmer : aucune modification ; le prochain « Enregistrer un contact » normal repart d'un état vierge (pas de fuite du mode édition).

### Key Decisions

- **D1** *(session-settled: user-directed)* — Chantier choisi le 2026-08-04 depuis le backlog vérifié (alternatives différées : machine à prétextes, corbeille).
- **D2** — Un seul type en un tap (`dejeuner`, le geste dominant) — pas de menu de types rapide en v1, évolution à l'usage.
- **D3** — L'édition est une correction locale : pas de propagation inter-appareils du contenu corrigé en v1 (pas de `updatedAt` par interaction ni de LWW dans `mergeData` — zone interdite).

## Planning Contract

### Key Technical Decisions

- **KTD1 — Un-tap** : nouveau handler `quickLogRencontre(contactId)` appelant `logInteraction(contactId, "", todayStr(), "dejeuner", false, false)` ; boutons avec `e.stopPropagation()` sur les lignes « Rencontres à programmer » (l.3090-3110) et dans la fiche (près de « Enregistrer », l.2979). Ne PAS réutiliser le bouton existant (le modal reste disponible).
- **KTD2 — Relance un tap** : dupliquer le bouton de l.3109 sur `awaitingList` (l.3054-3069) et `recontactList` (l.3071-3087). Le garde anti-double-invitation existant suffit (vérifié : pour un contact en relance, `invitationAwaiting` est null).
- **KTD3 — Recherche pure testable** : `KIT_PURE.contactHaystack(c)` → chaîne concaténant les champs actuels + nouveaux (R3), et `KIT_PURE.matchesDigits(query, fields)` (ou intégration au haystack : suite de chiffres normalisée) — exportées (micro-conflit d'export assumé, résolution union) et testées. Le site d'appel (l.2301-2319) applique `norm()` comme aujourd'hui ; détection « requête chiffres » (≥3 chiffres) → comparaison sur les numéros dépouillés (`replace(/\D/g,"")`). Les commentaires d'interactions restent couverts par le chemin existant (l.2488).
- **KTD4 — Édition** : fonction dédiée `updateInteraction(contactId, iid, patch)` (jamais `logInteraction` : effets de bord de cycle l.1505-1509 et `iid` régénéré) — patch de `comment`/`date`/`type`/drapeaux en préservant les autres clés, re-tri par date desc, `save()`. Modal : état `editIid` ; titre « Modifier l'interaction » en mode édition ; préremplissage depuis l'entrée ; remise à zéro d'`editIid` dans **tous** les chemins de fermeture (l.2492 et l.2520). Timeline (l.2992-3013) : bouton ✏ à côté de ✕, ciblage par `iid` (le ✕ existant par index reste inchangé). Drapeaux `awaiting`/`retry` du patch : appliqués comme dans la création (mêmes règles).
- **KTD5 — Interdits** : module KIT_AGENDA, `fetchCandidateDates`/`restoreInvite`, sous-section « Connecter mon agenda », `<head>`/CSP, fin du bloc KIT_TESTS, `mergeData`, `pendingInvites`, `selectedTemplate`.
- **KTD6 — Tests** : cas KIT_TESTS **au milieu du bloc** : haystack (chaque nouveau champ trouvable ; téléphone par chiffres avec/sans formatage ; champ absent → pas de plantage) ; si la logique de patch d'édition est extraite en pur (`KIT_PURE.patchInteraction(entry, patch)` : préservation `iid`+meta, application des champs), la tester aussi — recommandé.

### Scope Boundaries (non-objectifs)

Pas de menu multi-types un-tap ; pas de propagation inter-appareils des corrections ; pas de recherche floue/fautes de frappe ; pas de refonte du modal.

### System-Wide Impact

- `data` inchangé (aucun nouveau champ) ; export/fusion non affectés (l'édition conserve `iid` → pas de doublon à la fusion).
- Branches en attente : conflits limités à la ligne d'export KIT_PURE (union), lignes de version (valeur la plus haute), insertions KIT_TESTS (blocs disjoints).

## Implementation Units

### U1. Relance un tap + recherche élargie (taille S)

- **Goal** : R2, R3.
- **Execution note** : partir des tests qui échouent sur `contactHaystack`/la recherche par chiffres, puis implémenter.
- **Files** : `index.html` (KIT_PURE + export ; KIT_TESTS milieu de bloc ; section Derived l.2301-2319 ; blocs awaitingList/recontactList de renderWeek).
- **Verification** : 4 portes, tous les cas verts.

### U2. Journalisation éclair + édition d'interaction + versions (taille M)

- **Goal** : R1, R4, R5.
- **Files** : `index.html` (handler un-tap + boutons ; `updateInteraction` + KIT_PURE.patchInteraction si extrait ; modal logModal mode édition ; timeline ✏ ; `APP_VERSION`), `sw.js` (`CACHE_NAME`), `LISEZMOI.txt`.
- **Patterns to follow** : journalisation directe existante (l.1679) ; chips du modal (l.2497-2507) ; boutons de lignes (l.3109).
- **Verification** : 4 portes + contrôle visuel (un tap, édition, AE5/AE6).

## Verification Contract

À chaque unité : `node /root/ce-work/check-babel.js && node scripts/kit-tests-node.js && node /root/ce-work/check-lib-hashes.js && node --check sw.js` — 0 échec. Contrôle visuel avant PR.

## Definition of Done

- R1-R5 couverts, AE1-AE6 rejouables ; portes vertes ; revue (personas + passe croisée) ; LISEZMOI et versions à jour ; PR `feat/fluidite-quotidienne` → `main` ; checkout de retour sur `feat/rappels-effectifs`.
- **Tout le run contrôleur dans un seul démarrage WSL** (leçon st_dev).
