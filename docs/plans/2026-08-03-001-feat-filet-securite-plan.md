---
title: Filet de sécurité des données — sauvegarde continue, instantanés, alerte d'échec
date: 2026-08-03
type: feat
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: ce-plan-bootstrap
---

# Filet de sécurité des données

## Goal Capsule

Toutes les données (contacts, historique, réglages) vivent dans un seul `localStorage` : profil navigateur purgé, téléphone perdu ou quota dépassé = perte totale et **silencieuse** de tout ce qui date d'après le dernier export manuel. État vérifié (backlog 2026-08-01, coordonnées **main**) : `downloadJSON` l.579 est le seul export (aucun `showSaveFilePicker`, aucun `navigator.share` dans l'app) ; `save()` avale les échecs d'écriture (`catch { /* silent */ }` l.1323) ; le miroir IndexedDB ne stocke qu'une clé `data` (idbSet l.735). Le chantier ajoute trois protections : sauvegarde **continue** vers un fichier suivi sur PC (idéalement dans OneDrive), **instantanés quotidiens roulants** restaurables sur tous appareils, et **alerte visible** en cas d'échec d'écriture. Aucun serveur tiers, aucune dépendance Entra/Graph.

## Product Contract

### Requirements

- **R1** — Tout échec d'écriture `localStorage` du chemin par défaut de `save()` déclenche une bannière visible et persistante (« Vos dernières modifications n'ont pas pu être enregistrées — exportez une sauvegarde ») au lieu d'être avalé.
- **R2** — Un **instantané quotidien** des données est conservé en IndexedDB (au premier enregistrement du jour), **14 emplacements roulants** (le plus ancien est purgé). Fonctionne PC et Android, sans geste utilisateur.
- **R3** — Le panneau Sauvegarde offre « **Restaurer une version** » : liste des instantanés (date + nombre de contacts), restauration via le **flux de restauration existant** (même dialogue de fusion que l'import JSON — jamais d'écrasement aveugle).
- **R4** — Sur PC (Chrome/Edge), l'utilisateur peut choisir **une fois** un fichier de sauvegarde (conseillé : dossier OneDrive) ; l'app y réécrit ensuite le JSON complet **à chaque enregistrement**, silencieusement. Le lien vers le fichier est mémorisé (IndexedDB, local à l'appareil, jamais dans `data` ni les sauvegardes). S'il devient invalide (fichier déplacé, permission retirée), bannière + retour au mode manuel.
- **R5** — Sur Android, le bouton d'export propose le **partage natif** (`navigator.share` avec fichier — vers OneDrive/mail en un geste) quand disponible, sinon téléchargement classique (repli systématique).
- **R6** — Un court encart « Synchroniser mes deux appareils » dans le panneau Sauvegarde explique le circuit : PC = fichier suivi OneDrive ; Android = partage de la sauvegarde puis fusion à l'import.
- **R7** — Aucune dépendance Entra/Graph ; toutes les API sont des API navigateur locales ; comportement inchangé quand une API manque (détection de capacité, jamais d'erreur bloquante).

### Acceptance Examples

- **AE1** — Quota localStorage saturé (simulable) : la bannière apparaît ; elle disparaît après un enregistrement réussi.
- **AE2** — 16 jours d'utilisation simulés : 14 instantanés maximum, les deux plus anciens purgés, un seul instantané par jour.
- **AE3** — « Restaurer une version » sur l'instantané d'avant-hier : le dialogue de fusion s'ouvre (mêmes garanties que l'import JSON) ; annuler ne change rien.
- **AE4** — PC : après choix du fichier, chaque modification réécrit le fichier (vérifiable en l'ouvrant) ; supprimer le fichier → bannière au prochain enregistrement, l'app continue de fonctionner.
- **AE5** — Android : « Partager la sauvegarde » ouvre la feuille de partage système avec le fichier JSON ; sur navigateur sans partage de fichiers, téléchargement classique.
- **AE6** — Aucune clé nouvelle dans `data`, l'export JSON est inchangé octet pour octet (mêmes champs qu'avant).

### Key Decisions

- **D1** *(session-settled: user-directed)* — Chantier choisi le 2026-08-03 (« Il y avait un chantier sécurité que tu pouvais réaliser non ? »), depuis le backlog vérifié.
- **D2** — Le fichier suivi est **réécrit en entier** à chaque enregistrement (pas de journal incrémental) — simplicité et lisibilité du fichier par l'utilisateur ; volume faible (< 1 Mo).
- **D3** — La restauration d'instantané passe par le **flux de fusion existant**, jamais par remplacement direct — cohérence avec l'import JSON et protection contre le mauvais clic.
- **D4** — 14 instantanés quotidiens, non réglable en v1 (évolution à l'usage).

## Planning Contract

### Key Technical Decisions

- **KTD1 — Logique pure testable.** `KIT_PURE.snapshotPlan(existingDates, todayISO, max)` → `{ shouldWrite, drop }` : décide si un instantané doit être écrit aujourd'hui et lesquels purger (tri lexicographique des dates ISO, garde `max-1` + celui du jour). Cas KIT_TESTS **insérés au milieu du bloc** (zone d'append réservée à d'autres branches). Ajout à la ligne d'export `return {...}` de KIT_PURE : micro-conflit assumé (résolution = union, rodée).
- **KTD2 — Stockage des instantanés.** Même base IndexedDB (`kit-crm-db`, store `kv`), clés `snap:<AAAA-MM-JJ>`, valeur = chaîne JSON complète des données. Écriture au premier `save()` réussi du jour (après le `setItem`), asynchrone, jamais bloquante ; échec d'instantané silencieux (le filet ne doit pas casser l'enregistrement). Il faut ajouter un `idbKeys()`/`idbDelete(key)` génériques à côté d'`idbGet`/`idbSet` existants.
- **KTD3 — Bannière d'échec.** Le `catch` silencieux de `save()` (l.1323 main) alimente un indicateur module (ex. `window.KIT_SAVE_ALERT = true` + événement), consommé par un état React affiché en bandeau rouge fixe en haut de l'app ; remis à zéro sur enregistrement réussi. **Ne pas étendre `save()` au-delà de sa ligne de fermeture** (le `useEffect` immédiatement après est modifié par la branche rappels).
- **KTD4 — Fichier suivi PC (File System Access).** Détection `"showSaveFilePicker" in window`. Choix du fichier = geste utilisateur dans le panneau Sauvegarde (« Suivre un fichier de sauvegarde ») ; handle persisté en IndexedDB (clé `backupHandle`) — local à l'appareil, hors `data`, hors export (R4/AE6). À chaque enregistrement réussi : réécriture asynchrone en file (une écriture à la fois, la dernière gagne) via `createWritable`. `queryPermission`/`requestPermission` **uniquement sur geste utilisateur** ; en tâche de fond, un refus/échec lève la bannière (message dédié « le fichier suivi n'est plus accessible ») et désactive le suivi jusqu'à re-choix.
- **KTD5 — Partage Android.** `navigator.canShare && navigator.canShare({ files: [f] })` avec `new File([json], nom, { type: "application/json" })` ; bouton « Partager la sauvegarde » à côté de l'export existant ; repli = `downloadJSON` actuel. Ne remplace PAS le bouton existant.
- **KTD6 — Restauration d'instantané.** Réutiliser le chemin de l'import JSON existant (`handleRestoreJSON`/fusion) en lui passant le contenu de l'instantané — même dialogue, mêmes règles (`mergeData`). Aucune modification de `mergeData`.
- **KTD7 — Versions.** `APP_VERSION "1.4.3"`, `CACHE_NAME "kit-crm-v39"` (v36/v37/v38 réservés par durcissements/rappels/anniversaires — saut volontaire, résolution de conflit = valeur la plus haute).
- **KTD8 — Zones interdites.** Ne pas toucher : module KIT_AGENDA, `fetchCandidateDates`/`restoreInvite`, sous-section « Connecter mon agenda » des réglages, `<head>` (CSP), fin du bloc KIT_TESTS, `mergeData`, `pendingInvites`.

### Scope Boundaries (non-objectifs)

- Pas de chiffrement des sauvegardes (évolution possible, hors v1).
- Pas de synchronisation automatique bidirectionnelle entre appareils (le circuit reste export/fusion).
- Pas d'envoi réseau, pas de stockage cloud direct (le fichier suivi est un fichier local ; OneDrive le synchronise lui-même).
- Pas de réglage du nombre d'instantanés (D4).

### System-Wide Impact

- IndexedDB : nouvelles clés `snap:*` et `backupHandle` dans le store existant — le service worker ne lit que la clé `data` (sw.js l.146), aucune interaction.
- `data`/export JSON : inchangés (AE6) ; fusion inter-appareils non affectée.
- Branches en attente : conflits limités aux lignes de version + ligne d'export KIT_PURE (résolutions triviales connues).

## Implementation Units

### U1. Instantanés roulants, restauration et bannière (taille M)

- **Goal** : R1, R2, R3 — filet local complet sur tous appareils.
- **Execution note** : partir des tests qui échouent sur `snapshotPlan` (rotation, un-par-jour, purge au-delà de 14), puis implémenter.
- **Files** : `index.html` uniquement (KIT_PURE + export ; helpers idb ; `save()` : hook instantané + indicateur d'échec ; panneau Sauvegarde : liste « Restaurer une version » ; bandeau React ; KIT_TESTS milieu de bloc).
- **Patterns to follow** : `idbGet`/`idbSet` existants (l.735 main) ; style des blocs du panneau Sauvegarde (l.3427+ main) ; restauration = chemin de l'import JSON existant.
- **Test scenarios** : `snapshotPlan` — premier du jour → shouldWrite ; déjà écrit aujourd'hui → non ; 14 existants + nouveau jour → drop du plus ancien ; 16 existants (données héritées) → drop des 3 plus anciens ; tri lexicographique correct ; `max` respecté.
- **Verification** : 4 portes (Babel, runner node, empreintes lib, `node --check sw.js`) ; contrôle visuel bannière + liste.

### U2. Fichier suivi PC, partage Android, encart et versions (taille M)

- **Goal** : R4, R5, R6, R7 + KTD7 ; LISEZMOI (section « Protéger ses données » : fichier suivi OneDrive, partage Android, restaurer une version).
- **Files** : `index.html` (bloc fichier suivi dans le panneau Sauvegarde ; file d'écriture asynchrone ; bouton Partager ; encart pédagogique ; `APP_VERSION`), `sw.js` (`CACHE_NAME`), `LISEZMOI.txt`.
- **Patterns to follow** : détection de capacité comme ailleurs dans l'app (jamais d'exception bloquante) ; messages d'état du panneau agenda comme gabarit de ton.
- **Test scenarios** : la partie pure éventuelle (ex. décision de repli partage/téléchargement à partir de capacités booléennes) en KIT_TESTS ; le reste est du contrôle visuel (File System Access et share ne sont pas testables dans le runner).
- **Verification** : 4 portes + contrôle visuel PC (choix du fichier, réécriture, fichier supprimé → bannière) et repli sans API.

## Verification Contract

À chaque unité : `node /root/ce-work/check-babel.js && node scripts/kit-tests-node.js && node /root/ce-work/check-lib-hashes.js && node --check sw.js` — tous les cas verts, 0 échec. Contrôle visuel du panneau Sauvegarde sur localhost avant PR.

## Definition of Done

- R1-R7 couverts, AE1-AE6 rejouables à la main.
- Portes vertes sur les deux unités ; revue de code (personas + passe croisée) avant PR.
- LISEZMOI à jour, `APP_VERSION` 1.4.3 / `kit-crm-v39`.
- Aucune zone interdite de KTD8 modifiée ; `data`/export inchangés (AE6).
- PR `feat/filet-securite` → `main` ; le checkout revient sur `feat/rappels-effectifs` en fin de chantier.
- **Contrainte d'exécution : tout le run contrôleur (init → intégrations → verify-run) dans un seul démarrage WSL** (leçon kit-anniv : l'identité de montage épinglée change à chaque redémarrage).
