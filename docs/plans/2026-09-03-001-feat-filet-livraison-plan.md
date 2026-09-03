---
title: "Filet de livraison : portes versionnées, smoke navigateur automatisé, contrôle GitHub bloquant, recette tracée et ménage du dépôt"
date: 2026-09-03
type: feat
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: note d'arbitrage du 2026-09-02 (chantier F) ; décisions utilisateur du 2026-09-03 — contrôle GitHub BLOQUANT avec le propriétaire en contournement ; fichier .nojekyll ; spike Entra archivé par tag puis branche supprimée
---

# Filet de livraison (aucun changement de version applicative)

## Goal Capsule

Le protocole exige quatre portes vertes avant chaque intégration (compilation Babel hôte, KIT_TESTS, empreintes `lib/`, `node --check sw.js`) et un smoke dans un vrai navigateur, mais : seule `scripts/kit-tests-node.js` est versionnée — `check-babel.js` et `check-lib-hashes.js` ne vivent que dans la VM WSL de l'orchestrateur (`/root/ce-work`, dépendants de `process.cwd()`) ; aucun contrôle ne tourne automatiquement (pas de `.github/workflows`, aucune règle sur `main`, 0 tag pour 13 versions livrées) ; le smoke navigateur est un geste manuel (`KIT_TESTS.run()` en console) sans artefact ; `check-babel.js` compile avec `presets: ["react"]`, ce qui correspond désormais au navigateur (PR #14). Le dépôt garde un vestige Netlify (`_redirects`), 13 branches fusionnées et la branche `feat/rappels-effectifs` qui porte encore les scopes d'écriture Microsoft abandonnés le 2026-08-06. GitHub Pages passe par un build Jekyll (les plans `docs/plans/*.md` sont rendus en pages HTML ; une balise Liquid mal formée casserait un déploiement).

Spike du 2026-09-03 (vérifié) : Chrome 152 et Edge 152 pilotés en `--headless=new` via le protocole DevTools avec le **WebSocket natif de Node 24** (aucune dépendance) exécutent l'application servie en local, rendent l'écran de mot de passe, enregistrent le service worker et retournent `KIT_TESTS.run()` = 0 échec en ~10 s ; `--dump-dom` seul rend aussi la page (2 s) mais ne peut pas exécuter les tests.

Ce chantier ne modifie ni `index.html`, ni `sw.js`, ni `lib/` : **pas de bump de version** ; il n'entre donc pas en conflit avec la PR #14 (v1.5.6).

## Requirements

- R1. `scripts/check-babel.js` : compile le bloc `<script type="text/babel" …>` d'`index.html` avec `lib/babel.min.js` du dépôt, options alignées sur le navigateur (`presets: ["react"]`, plugins `transform-class-properties`, `transform-object-rest-spread`, `transform-flow-strip-types`, `sourceType: "module"`), chemins relatifs à `__dirname` (exécutable depuis n'importe quel répertoire courant), sortie `BABEL_OK` / `ECHEC BABEL: …`, code 1 en échec.
- R2. `scripts/check-lib-hashes.js` : pour chaque ligne de `lib/VERSIONS.txt` (`fichier | paquet@version | sha256:…`), recalcule le sha256 du fichier et compare ; signale les fichiers de `lib/*.js` absents de `VERSIONS.txt` ; sortie `LIB_HASHES_OK (n fichiers)`, code 1 en écart.
- R3. `scripts/run-gates.js` : enchaîne dans l'ordre check-babel → kit-tests-node → check-lib-hashes → `node --check sw.js`, s'arrête au premier échec (code 1), affiche un résumé d'une ligne par porte avec durée ; option `--with-smoke` qui enchaîne ensuite `scripts/smoke-navigateur.js`. Aucune dépendance npm.
- R4. `scripts/serve-app.js` : serveur statique du dépôt (types MIME html/js/json/png/txt/webmanifest, `Cache-Control: no-store`), port par argument ou `0` = port libre, écrit `PORT=<n>` sur stdout au démarrage ; utilisable seul (`node scripts/serve-app.js 8000`) pour le smoke manuel du protocole.
- R5. `scripts/smoke-navigateur.js` : (a) exige Node ≥ 22 (WebSocket natif), sinon message explicite et code 2 ; (b) trouve le navigateur : variable `KIT_BROWSER`, sinon chemins Windows usuels de Chrome et Edge, sinon `google-chrome`, `google-chrome-stable`, `chromium`, `chromium-browser`, `msedge` sur le PATH ; sinon code 2 ; (c) démarre `serve-app.js` sur un port libre, lance le navigateur en `--headless=new --disable-gpu --no-first-run --no-default-browser-check --remote-debugging-port=<libre> --user-data-dir=<profil temporaire vide>` ; (d) se connecte en WebSocket à la page (`/json/version`, `/json/list`), `Page.enable`, `Page.navigate`, attend `Page.loadEventFired` (délai maximal 90 s) ; (e) évalue dans la page : présence de `input[type=password]`, `#root` ne contient plus `kit-boot` (si présent dans la source), `KIT_TESTS.run()` → nombre d'échecs et nombre de cas OK, durée de l'écouteur DOMContentLoaded, `APP_VERSION` du document, nombre d'enregistrements de service worker après 2 s ; (f) capte les exceptions non interceptées (`Runtime.exceptionThrown`) et les erreurs console ; (g) écrit un rapport JSON sur stdout et un verdict `SMOKE_OK` / `SMOKE_ECHEC` ; code 1 si : échec KIT_TESTS, mot de passe absent, exception non interceptée, ou `SyntaxError` ; code 0 sinon ; (h) tue toujours le navigateur et le serveur, supprime le profil temporaire, même en erreur ; (i) option `--url <http://…>` pour viser un serveur déjà lancé (ex. localhost:8000).
- R6. `.github/workflows/portes.yml` : déclenché sur `pull_request` (vers `main`) et `push` sur `main` ; un job **`portes`** (ubuntu-latest, `actions/checkout` épinglé au SHA `fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09` (v5), `actions/setup-node` épinglé au SHA `a0853c24544627f65ddf259abe73b1d18a591444` (v5) avec `node-version: 22`, puis `node scripts/run-gates.js`) ; un job **`smoke`** (mêmes actions, `KIT_BROWSER: google-chrome`, `node scripts/smoke-navigateur.js`) ; `permissions: contents: read` ; `concurrency` par référence. Le nom des jobs est exactement `portes` et `smoke` (ce sont les contextes exigés par la règle de branche).
- R7. Fichier vide `.nojekyll` à la racine ; suppression de `_redirects` ; `LISEZMOI.txt` : retirer la ligne Netlify devenue inutile, ajouter une section « Pour les développeurs » (5 à 8 lignes : runner, `run-gates.js`, `smoke-navigateur.js`, contrôle GitHub bloquant, tags de version) et, dans « Mettre à jour l'application », une étape 4 « Vérifier dans ⋯ > À propos que la version affichée est bien la nouvelle » (déjà présente : la conserver).
- R8. `docs/RECETTE.md` : checklist générique à dérouler après chaque fusion, toujours la même, commençant par « Vérifier dans À propos que la version affichée est vN · build vNN », puis PC et Android : rouvrir, bandeau « Recharger », ouvrir une fiche, journaliser une interaction, aucune bannière d'erreur, « Sauvegarder JSON » fonctionne ; suivie d'un emplacement pour les lignes spécifiques de la PR.
- R9. Hors Codex, par l'orchestrateur, **après fusion de la PR #14 puis de cette PR** : règle de branche (ruleset) sur `main` — PR obligatoire, contrôle `portes` requis (puis `smoke` après deux exécutions vertes consécutives), propriétaire en contournement ; réglage « supprimer automatiquement les branches fusionnées » ; tags annotés `v1.5.5` (e5c9ba2) et `v1.5.6` (commit de fusion de #14) ; tag `archive/spike-entra-2026-08-06` sur `feat/rappels-effectifs` puis suppression de la branche (locale et distante) ; suppression des 13 branches fusionnées ; mise à jour du dossier de passation (§2 points 6, 8, 9 ; §5) et vérification que `…/docs/plans/*.md` est servi en texte brut et `…/_redirects` absent.

## Acceptance Examples

- AE1. `node scripts/run-gates.js` depuis la racine ET depuis un autre répertoire → 4 lignes `OK` + code 0 sur la branche ; avec un test KIT_TESTS volontairement cassé (copie hors dépôt) → code 1 dès la porte 2.
- AE2. `node scripts/smoke-navigateur.js` sur le PC (Chrome puis Edge via `KIT_BROWSER`) → `SMOKE_OK`, rapport JSON avec `failures: 0`, `ok >= 138`, `password: true`, `swRegistrations >= 1`, en moins de 60 s ; avec `--url http://localhost:8000` sur le serveur déjà lancé → même verdict.
- AE3. PR ouverte → les deux jobs `portes` et `smoke` apparaissent et passent au vert sur GitHub.
- AE4. Après fusion : `https://lupuriel.github.io/keepintouch/docs/plans/2026-09-03-001-feat-filet-livraison-plan.md` répond 200 en texte brut ; `…/_redirects` répond 404 ; l'application se charge normalement.
- AE5. Après activation de la règle : une PR dont `portes` est rouge a son bouton « Merge » grisé pour un contributeur ordinaire ; le propriétaire voit l'option de contournement.

## Implementation Units

### FL-U1. Portes versionnées (Codex)

- **Files :** `scripts/check-babel.js`, `scripts/check-lib-hashes.js`, `scripts/run-gates.js` (nouveaux).
- **Approach :** R1-R3. Node pur, ES5 (`var`/`function`), chemins via `path.join(__dirname, "..")`. `run-gates.js` lance chaque porte par `child_process.spawnSync(process.execPath, [...], { stdio: "inherit" })` et mesure la durée.
- **Verification :** AE1 (exécution depuis deux répertoires ; mutation sur copie hors dépôt).

### FL-U2. Smoke navigateur automatisé (Codex)

- **Files :** `scripts/serve-app.js`, `scripts/smoke-navigateur.js` (nouveaux).
- **Approach :** R4-R5. Modèle : le spike fourni dans le paquet (WebSocket natif, `/json/version`, `/json/list`, `Page.navigate`, `Runtime.evaluate` avec `returnByValue`). Nettoyage garanti par `try/finally` + gestionnaires `exit`/`SIGINT`.
- **Verification :** AE2 sur Chrome et Edge du PC ; `run-gates.js --with-smoke`.

### FL-U3. Contrôle GitHub, Pages sans Jekyll, guide et recette (Codex)

- **Files :** `.github/workflows/portes.yml`, `.nojekyll`, `_redirects` (suppression), `LISEZMOI.txt`, `docs/RECETTE.md`.
- **Approach :** R6-R8. YAML minimal, actions épinglées par SHA, `node-version: 22`.
- **Verification :** `node -e` de validation YAML impossible sans dépendance → relecture ; AE3 après ouverture de la PR (premier run réel).

### FL-U4. Règle de branche, tags et ménage (orchestrateur, hors Codex, après fusion)

- **Approach :** R9 via `gh api` (ruleset, réglage du dépôt), `git tag -a` + `git push --tags`, suppressions de branches ; addendum du dossier de passation.
- **Verification :** AE4, AE5 ; `gh api repos/…/rulesets` liste la règle active.

## Definition of Done

Trois commits Codex sur `feat/filet-livraison` (+ `fix(review)` éventuel), quatre portes vertes via `node scripts/run-gates.js --with-smoke` sur le commit final (les portes hors dépôt de WSL restent utilisables en secours), revue croisée à trois voies, PR vers `main` avec la checklist `docs/RECETTE.md` + lignes spécifiques (dont AE3/AE4). Après fusion des PR #14 puis #F : FL-U4 par l'orchestrateur, règle de branche activée, contrôle `smoke` ajouté aux contrôles requis après deux runs verts.

## Risques consignés

- Le premier run GitHub Actions est le seul test réel du workflow ; un échec d'environnement (Chrome absent du runner, version de Node) se corrige par un commit de suivi avant fusion.
- La règle bloquante empêche aussi les pushes directs sur `main` : toute livraison passe par PR — c'est déjà la pratique ; le propriétaire garde un contournement pour l'urgence.
- `.nojekyll` rend servis les fichiers commençant par `_` et `.` (`.gitattributes`, anodin ; `_redirects` est supprimé dans le même chantier) et casse les URL `…/docs/plans/*.html` (aucun lien connu).
- Le smoke headless ne couvre ni Android ni le flux Microsoft : la recette utilisateur reste nécessaire.
