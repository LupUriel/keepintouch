---
title: "Récapitulatif hebdomadaire local (pop-up de première ouverture de semaine)"
date: 2026-08-06
type: feat
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: ce-brainstorm
supersedes: "2026-07-31-001-feat-rappels-effectifs-plan.md (U2 spike permissions, U3 agenda, U4 courriels, U5-U6 dans leur forme Outlook — pivot produit du 2026-08-06)"
---

# Récapitulatif hebdomadaire local

## Goal Capsule

À la première ouverture de l'application dans une semaine civile, une fenêtre s'ouvre et liste les actions prioritaires (relances planifiées, en attente, à recontacter, rencontres à programmer, vœux imminents). Tout est local : zéro autorisation Microsoft, zéro donnée sortante. Ce chantier remplace les courriels différés du plan rappels (pivot produit du 2026-08-06) ; l'écriture d'agenda Outlook est mise de côté, réactivable plus tard.

## Product Contract

### Summary

L'utilisateur veut un point d'entrée hebdomadaire proactif sur ses priorités sans dépendre d'autorisations Microsoft. Le pop-up reprend le contenu des quatre listes « À suivre » (déjà triées par urgence puis effectifs) et les vœux de la semaine, une fois par semaine civile et par appareil, avec un accès direct à la vue « À suivre ».

### Key Decisions

- KD1 (session-settled: user-directed) — Remplacement des courriels différés par un pop-up à la première ouverture de la semaine civile. Alternative rejetée : conserver Mail.Send (l'utilisateur préfère écrire lui-même ses messages, parfois personnalisés).
- KD2 (session-settled: user-directed) — Abandon des deux autorisations Entra ; écriture d'agenda « à voir plus tard ». La demande au prestataire IT est annulée. Alternative rejetée : garder Calendars.ReadWrite seul.
- KD3 (session-settled: user-approved) — Les notifications téléphone locales existantes (service worker, « N à suivre ») continuent inchangées ; le pop-up s'y ajoute, il ne les remplace pas.
- KD4 — Marqueur « déjà vu cette semaine » par appareil (localStorage), jamais dans les données fusionnées ni les sauvegardes. Un second appareil remontre le récapitulatif : accepté (rappel utile, coût nul). Acquittement à la fermeture : tant que l'utilisateur n'a pas fermé le pop-up, une réouverture le remontre.
- KD5 — Pas de pop-up quand il n'y a rien à faire (toutes listes vides) ; dans ce cas le marqueur n'est pas écrit, pour que le récapitulatif puisse encore surgir plus tard dans la semaine si des échéances apparaissent (import, fusion).
- KD6 — Case « Récapitulatif hebdomadaire à l'ouverture » dans les réglages (activée par défaut) : coût d'entretien minime, protège contre la lassitude.

### Requirements

- R1. À la première ouverture de l'app dans une semaine civile (lundi-dimanche, heure locale), si au moins une action est en attente, un pop-up liste les priorités de la semaine.
- R2. Le contenu reprend l'ordre et le tri existants des quatre listes « À suivre » (critère principal puis effectifs), plafonné par section avec mention « et N autres ».
- R3. Les anniversaires et dates clés tombant sous 7 jours apparaissent dans une section « Vœux à prévoir ».
- R4. Un bouton ouvre la vue « À suivre » ; un bouton ferme. La fermeture vaut acquittement pour la semaine sur cet appareil.
- R5. Aucune donnée ne quitte l'appareil ; aucune autorisation nouvelle ; le marqueur ne pollue ni les données, ni les sauvegardes, ni la fusion.
- R6. Le pop-up peut être désactivé dans les réglages ; ce choix se synchronise comme les autres réglages.
- R7. L'app reste inchangée pour le reste : navigation, notifications locales, badge.

### Acceptance Examples

- AE1. Lundi 8h, première ouverture de la semaine, 3 relances en attente → pop-up avec la section « Relances en attente » (3 noms), bouton « Voir À suivre » fonctionne.
- AE2. Même journée, deuxième ouverture après fermeture du pop-up → pas de pop-up.
- AE3. Semaine suivante, première ouverture → pop-up de nouveau.
- AE4. Aucune action en attente → pas de pop-up ; des relances apparaissent mercredi (import) → le pop-up surgit à l'ouverture suivante.
- AE5. Réglage décoché → jamais de pop-up, tout le reste intact.
- AE6. Anniversaire dans 3 jours → section « Vœux à prévoir » le mentionne.

### Scope Boundaries

- Pas d'écriture d'agenda Outlook, pas de courriel — définitivement hors de ce chantier (l'agenda reste réactivable via l'ancien plan si l'utilisateur le demande).
- Pas de réglage d'heure ni de « silence jusqu'au » : la cadence est structurelle (une fois par semaine) ; la case des réglages suffit.
- Pas de navigation par contact depuis le pop-up (les noms sont informatifs ; l'accès se fait par « Voir À suivre »).

## Planning Contract

### Key Technical Decisions

- KTD1 — Clé de semaine ISO-8601 pure (`weekKey("YYYY-MM-DD") → "GGGG-Www"`, lundi premier jour, année-semaine correcte aux frontières décembre/janvier), calculée sur la date locale de l'appareil. Testée sur les cas limites classiques (2024-12-30 → 2025-W01, 2027-01-01 → 2026-W53).
- KTD2 — Le pop-up est rendu dans `App` et réutilise les quatre listes déjà calculées au rendu (index.html:2950-2979) et `upcomingBdays`/`upcomingKDs` (index.html:2981-3001) — aucun recalcul, aucun risque de divergence de tri.
- KTD3 — Marqueur `localStorage["kitRecapSemaine"]` = clé de semaine acquittée, écrit à la fermeture du pop-up uniquement (KD4/KD5). Intouché par la purge MSAL (`shouldPurgeMsalKey` ne vise que les clés msal), absent des exports/sauvegardes (qui ne sérialisent que `data`).
- KTD4 — `settings.recapHebdo` (booléen, défaut `true`) semé dans `defaultSettings()` (index.html:705) et `migrateData` (index.html:731) sans toucher `updatedAt` (semis idempotent, motif exclusions) ; fusionné comme le reste des réglages.
- KTD5 — Plafonnement pur `recapSections(sections, max)` : entrée = sections déjà ordonnées `[ { titre, items: [texte…] } ]`, sortie = sections non vides plafonnées à `max` items avec compteur « et N autres » ; la mise en forme des libellés (jours d'attente, échéances) reste dans `App` qui dispose des aides locales.
- KTD6 — Versions : `APP_VERSION` → `1.5.0`, `CACHE_NAME` → `kit-crm-v42` (même commit, motif habituel). Conflits connus avec les branches en attente : export `KIT_PURE` = union, versions = valeur la plus haute.

### System-Wide Impact

- Le rendu du pop-up dépend de `authed` + données chargées : condition rendue seulement quand `data` est prêt (après l'effet de chargement, index.html:1569) — jamais pendant l'écran de mot de passe.
- z-index 1250 : au-dessus des modales courantes (1000-1200), sous le verrou de lot effectifs (1300).
- `KIT_TESTS` : nouveaux cas purs (weekKey, recapSections, décision d'affichage) dans la suite existante ; le runner `scripts/kit-tests-node.js` est inchangé.

## Implementation Units

### P-U1. Moteur pur : clé de semaine, décision, plafonnement

- **Goal :** les trois fonctions pures du récapitulatif rejoignent `KIT_PURE` avec leurs tests.
- **Requirements :** R1, R2 (plafonnement), R5 ; KTD1, KTD5.
- **Files :** `index.html` (bloc script pur + `KIT_TESTS`).
- **Approach :** `weekKey(ymd)` (ISO-8601, arithmétique pure sur Y/M/D, pas de Date UTC piégeuse) ; `recapDue(storedKey, currentKey, totalItems)` → booléen (clé différente ET total > 0) ; `recapSections(sections, max)` (KTD5). Export via la ligne d'union `KIT_PURE`.
- **Test scenarios :** weekKey : lundi/dimanche même semaine ; frontières d'année (2024-12-30 → "2025-W01", 2027-01-01 → "2026-W53", 2026-01-01 → "2026-W01") ; padding ("W05") ; entrée invalide → null. recapDue : clé identique → false ; différente + 0 item → false ; différente + items → true ; storedKey null (premier lancement) → true. recapSections : plafonnement + « et N autres » ; sections vides éliminées ; max ≥ taille → inchangé ; entrée vide → [].
- **Verification :** `KIT_TESTS.run()` 0 échec (node scripts/kit-tests-node.js).

### P-U2. Pop-up, marqueur, réglages, version

- **Goal :** le récapitulatif apparaît à la première ouverture de la semaine, s'acquitte à la fermeture, se désactive dans les réglages.
- **Requirements :** R1-R7 ; KTD2, KTD3, KTD4, KTD6 ; AE1-AE6.
- **Dependencies :** P-U1.
- **Files :** `index.html`, `sw.js`, `LISEZMOI.txt`.
- **Approach :**
  1. État `recapFerme` (useState, false) ; condition de rendu dans `App` : données chargées, `settings.recapHebdo !== false`, `!recapFerme`, `KIT_PURE.recapDue(localStorage.getItem("kitRecapSemaine"), KIT_PURE.weekKey(dateLocaleDuJour), total)` avec total = somme des quatre listes + vœux ≤ 7 jours.
  2. Sections construites dans `App` depuis les listes existantes (libellés courts : « échéance {date} », « en attente depuis N j », « dernier échange il y a N j », « à programmer », « {occasion} dans N j ») puis passées à `recapSections(…, 5)`.
  3. Modal motif existant (overlay fixe, clic extérieur = fermer, styles bd/ac/ff, zIndex 1250) ; titre « Votre semaine — actions prioritaires » ; boutons « Voir À suivre » (setTab("week") + fermeture) et « Fermer ». Toute fermeture écrit `localStorage["kitRecapSemaine"] = clé courante` et `setRecapFerme(true)`.
  4. Réglages : case « Récapitulatif hebdomadaire à l'ouverture » dans le bloc réglages existant ; écriture par le chemin habituel des settings (updatedAt global).
  5. `defaultSettings`/`migrateData` : semis `recapHebdo: true` idempotent. `APP_VERSION` 1.5.0, `CACHE_NAME` kit-crm-v42, LISEZMOI : courte section « Récapitulatif hebdomadaire ».
- **Patterns to follow :** modal vœux (index.html:3187-3210) ; semis de réglages (migrateData, index.html:731-760) ; bloc réglages existant (index.html:4016+).
- **Test scenarios :** semis migrateData (réglages sans `recapHebdo` → semé true sans bump d'updatedAt ; déjà présent → intact) ; comportement pur de la condition via `recapDue` (P-U1) ; garde : `settings.recapHebdo === false` → jamais rendu (testable en pur si la condition est extraite en fonction pure, sinon constat de revue) ; LISEZMOI mis à jour ; versions cohérentes (APP_VERSION/CACHE_NAME).
- **Verification :** `KIT_TESTS.run()` 0 échec ; compilation Babel OK ; `node --check sw.js` ; smoke localhost : pop-up au premier chargement, absent au rechargement après fermeture, absent une fois décoché.

## Verification Contract

- Suite complète `KIT_TESTS` 0 échec sur l'arbre final (runner node, document réel exposé).
- Babel compile, `node --check sw.js`, empreintes lib/ intactes.
- Smoke navigateur : AE1, AE2, AE5 constatés sur localhost:8000.
- Checklist PR (utilisateur) : AE1-AE6 en conditions réelles, PC + téléphone.

## Definition of Done

PR ouverte vers `main` avec revue croisée (correctness + testing + passe adversariale Codex indépendante), constats corrigés, corps de PR avec checklist réelle. Fusion par l'utilisateur = déploiement v1.5.0.
