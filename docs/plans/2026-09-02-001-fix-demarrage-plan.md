---
title: "Démarrage rapide : compilation allégée, écran d'attente, hors-ligne immédiat, CSP sans unsafe-eval, xlsx à jour et deux correctifs"
date: 2026-09-02
type: fix
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: note d'arbitrage du 2026-09-02 (chantier A, séquence A → F → B1 → C1 retenue par l'utilisateur)
---

# Démarrage rapide et correctifs de fond (v1.5.6 / kit-crm-v48)

## Goal Capsule

Mesuré le 2026-09-02 dans Chrome sur le PC de l'utilisateur (12 cœurs) : **8 à 12 s d'écran blanc à chaque ouverture**, parce que la balise `<script type="text/babel" data-type="module">` (index.html:842) ne porte pas de `data-presets` — @babel/standalone 7.29.7 applique alors `["react", ["env", {modules:false}]]` sans cibles, soit une transpilation ES5 complète de ~300 Ko de JSX (avec source map inline ≈ 0,94 Mo injectés). Avec `data-presets="react"`, la compilation passe de ≈ 10 s à ≈ 1,2-1,4 s et le premier rendu à ≈ 2 s (gain ≈ 8×, reproduit par un réfutateur indépendant). Le bloc n'utilise ni `import/export`, ni classes, ni `?.`/`??`/`=>`/gabarits ; il contient 8 `async function`, 3 `const` et 107 déstructurations — toutes natives sur Chrome/Edge/Samsung Internet (Chromium).

Pendant la compilation, la page ne montre qu'un `<div id="root"></div>` vide (les « Chargement… » sont rendus par React, donc après), et l'enregistrement du service worker vit dans le bloc JSX derrière un écouteur `load` : hors-ligne et détection de mise à jour ne démarrent qu'après la compilation.

Trois compléments vérifiés sur pièces, sans effet fonctionnel visible : la CSP autorise `'unsafe-eval'` alors qu'aucun code (app + 6 bibliothèques) ne l'exige (reproduit : app, ExcelJS, XLSX, Babel et MSAL fonctionnent sans, zéro violation) ; `lib/xlsx.full.min.js` est SheetJS CE 0.18.5, concerné par CVE-2023-30533 (pollution de prototype via fichier forgé, CVSS 7.8) et CVE-2024-22363 (ReDoS, CVSS 7.5), sur le seul chemin d'import de fichiers tiers, correctif 0.20.3 disponible uniquement sur cdn.sheetjs.com ; deux bogues d'une ligne : à l'import Excel, les catégories nouvelles sont perdues (fermeture de rendu figée : `addCategory` puis `save({categories: categories})` réécrit l'ancienne liste — simulé), et les répartitions Stats « Par catégorie » / « Par priorité » comptent les fiches archivées alors que tout le reste part de `activeContacts`.

Doctrine inchangée : aucun appel réseau nouveau, aucune donnée ne sort, CSP resserrée (retrait d'une autorisation, aucun ajout d'hôte).

## Requirements

- R1. La balise Babel porte `data-presets="react"` (attribut `data-type="module"` conservé). Aucun autre changement du bloc JSX n'est nécessaire à ce titre ; la source map inline est conservée (aide au débogage), le préréglage `env` disparaît.
- R2. Le document contient, dans `#root`, un contenu statique d'attente (nom de l'app + « Ouverture… ») visible avant toute compilation, remplacé par le premier rendu React ; un second message discret (« Si cet écran persiste, rechargez la page. ») n'apparaît qu'après 20 s (CSS seul, sans script).
- R3. L'enregistrement du service worker est déplacé dans un `<script>` classique ES5 placé **avant** `lib/babel.min.js`, déclenché sur `DOMContentLoaded` (son écouteur est posé avant celui de Babel, donc s'exécute avant la compilation). La logique existante est conservée à l'identique : `etaitControlee` lu au moment de l'enregistrement, `window.__kitMajPrete = true` puis `dispatchEvent(new Event("kit-sw-updated"))` sous la condition `w.state === "activated" && etaitControlee`, `updatefound`, `visibilitychange` → `reg.update()`. L'ancien bloc en fin de JSX est supprimé (aucun double enregistrement).
- R4. La CSP méta ne contient plus `'unsafe-eval'` ; `'unsafe-inline'` reste (structurel : scripts inline + injection Babel). Aucun hôte ajouté ni retiré.
- R5. `lib/xlsx.full.min.js` est SheetJS CE 0.20.3 (fichier officiel `https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js`), `lib/VERSIONS.txt` mis à jour (version + sha256), même nom de fichier (sw.js et balise inchangés). Les cinq appels utilisés (`XLSX.read`, `utils.sheet_to_json`, `utils.aoa_to_sheet`, `utils.book_new`/`book_append_sheet`, `writeFile`) restent compatibles (API stable 0.18 → 0.20).
- R6. Import Excel/CSV : les catégories nouvelles rencontrées pendant l'import sont accumulées et enregistrées **dans le même `save`** que les fiches (`categories: categories.concat(nouvelles)`), sans doublon même si plusieurs lignes portent la même catégorie nouvelle ; plus aucun appel à `addCategory` dans la boucle. La logique de fusion de listes est une fonction pure `KIT_PURE.categoriesApresImport(existantes, rencontrees)` (ordre conservé, déduplication exacte, valeurs vides ignorées) testée.
- R7. Stats : « Par catégorie » et « Par priorité » itèrent sur `activeContacts` (fiches non archivées), comme les autres mesures de la vue.
- R8. Versions : `APP_VERSION = "1.5.6"`, `CACHE_NAME = "kit-crm-v48"`, regex du test « version applicative du document » mises à jour dans le même commit.
- R9. Tests KIT_TESTS ajoutés **au milieu du bloc** (jamais en fin) : câblage de la balise Babel (`data-presets="react"`, tolérant à l'ordre des attributs) ; CSP du document réel : `KIT_PURE.cspDirectiveAllows(KIT_SOURCE_HTML, "script-src", "'unsafe-eval'") === false` et `'unsafe-inline'` toujours autorisé ; enregistrement du service worker situé avant la balise `text/babel` (comparaison d'index dans `KIT_SOURCE_HTML`) et absent du bloc JSX ; contenu d'attente statique présent (`Ouverture…`) ; `categoriesApresImport` (3 cas minimum : ajout, doublon, existant) et son câblage dans l'import ; `activeContacts` câblé dans les deux répartitions Stats. Les tests existants restent verts (138 → ≥ 145).

## Acceptance Examples

- AE1. PC de l'utilisateur, Chrome/Edge : `performance.getEntriesByType("navigation")[0]` → durée de l'écouteur `DOMContentLoaded` (compilation) < 2,5 s (contre 8-12 s avant) ; premier rendu React < 3 s.
- AE2. Ouverture à froid : le texte « Ouverture… » est visible immédiatement, puis remplacé par l'écran de mot de passe ; aucun message « Si cet écran persiste » n'apparaît quand la compilation réussit.
- AE3. Première installation (navigateur vierge, jamais contrôlé) : aucun bandeau « Nouvelle version disponible ». Mise à jour (page déjà contrôlée, nouveau sw.js) : le bandeau se propose — même comportement qu'en v1.5.5.
- AE4. Chargement + export Excel + import Excel : zéro événement `securitypolicyviolation`, zéro erreur console CSP.
- AE5. Import d'un classeur avec une catégorie inconnue « Confrère » sur deux lignes : après import, « Confrère » figure une seule fois dans la liste des catégories et est proposée dans le filtre et le formulaire.
- AE6. Une fiche archivée en catégorie « Client » : la répartition « Par catégorie » de Stats ne la compte pas (cohérence avec la tuile Contacts).
- AE7. Import d'un `.xlsx` et d'un `.csv` existants : mêmes fiches importées qu'avant la mise à jour de la bibliothèque ; export de repli SheetJS (ExcelJS forcé indisponible en console) produit un fichier ouvrable.

## Implementation Units

### DM-U1. Démarrage : préréglage Babel, écran d'attente, service worker avant Babel, CSP, versions (Codex)

- **Files :** `index.html`, `sw.js`.
- **Approach :** R1 (attribut sur la balise ligne 842) ; R2 (contenu statique dans `#root` + règles CSS dans le `<style>` d'en-tête, incluant l'animation différée 20 s) ; R3 (nouveau `<script>` ES5 inséré avant `<script src="./lib/babel.min.js">`, reprenant le code actuel des lignes 4928-4948 sous `document.addEventListener("DOMContentLoaded", …)` — motifs textuels conservés pour le test 577 — et suppression de l'ancien bloc) ; R4 (méta CSP) ; R8 (versions + regex) ; tests R9 correspondants (balise, CSP, position du SW, écran d'attente, version).
- **Interdits :** ne pas toucher au bloc JSX au-delà de la suppression du bloc d'enregistrement SW ; ne pas modifier `lib/` ; aucune bibliothèque ou hôte ajouté.
- **Verification :** `node scripts/kit-tests-node.js` 0 échec ; compilation Babel hôte OK ; `node --check sw.js` ; smoke navigateur (AE1-AE4).

### DM-U2. Correctifs : catégories à l'import et répartitions Stats (Codex)

- **Files :** `index.html`.
- **Approach :** R6 — fonction pure `categoriesApresImport` dans `KIT_PURE` (exportée dans la ligne d'export, clé insérée à sa place alphabétique approximative), utilisée par `processImportRows` : accumulation des catégories rencontrées, test de nouveauté contre `categories.concat(nouvelles)`, `save({ contacts: …, categories: KIT_PURE.categoriesApresImport(categories, rencontrees) })` sur les deux branches d'enregistrement (3322 et 3327) ; suppression des appels `addCategory` dans la boucle (la fonction `addCategory` reste utilisée ailleurs). R7 — `activeContacts` dans les deux `filter` de renderStats (4469, 4486). Tests R9 : cas purs + regex de câblage.
- **Interdits :** ne pas modifier la logique de dédoublonnage des fiches ni les identifiants ; ne pas toucher aux autres vues.
- **Verification :** runner 0 échec ; smoke AE5-AE6 (fixture synthétique, jamais de données réelles).

### DM-U3. Bibliothèque xlsx 0.20.3 (orchestrateur, hors Codex)

- **Files :** `lib/xlsx.full.min.js`, `lib/VERSIONS.txt`.
- **Approach :** téléchargement du fichier officiel depuis cdn.sheetjs.com (étape de développement, aucune donnée de l'application n'est concernée), vérification de la bannière de version, calcul sha256, mise à jour de `VERSIONS.txt` ; porte `check-lib-hashes.js` verte ; `.gitattributes` (`lib/* -text`) déjà en place.
- **Verification :** porte empreintes ; smoke AE7.

## Definition of Done

Trois commits sur `fix/demarrage` (U1, U2, U3) + éventuel `fix(review)`. Quatre portes vertes (Babel hôte, KIT_TESTS runner, empreintes lib, `node --check sw.js`), smoke dans le vrai navigateur (KIT_TESTS.run() en console, AE1-AE7 hors AE3 mise à jour), revue croisée à trois voies (passe adversariale Codex indépendante + correctness + testing), constats fondés corrigés / écartés sur pièces, PR vers `main` avec checklist « À vérifier en réel » (dont AE3 sur PC et Samsung, et la mesure de temps d'ouverture). Fusion par l'utilisateur = déploiement v1.5.6 / kit-crm-v48.

## Risques consignés

- La suppression du préréglage `env` retire aussi le filet `regenerator` pour d'anciens navigateurs : sans conséquence pour Chrome/Edge/Samsung Internet ; documenté.
- Enregistrer le service worker avant `load` fait démarrer le précache (≈ 5,8 Mo) en parallèle de la première compilation à la toute première installation — effet à observer sur Android lors de la recette.
- Le flux Microsoft (redirection, iframe de renouvellement) n'est exercé par aucun agent : la recette CSP sans `unsafe-eval` inclut une connexion agenda par l'utilisateur lui-même.
- Le message « Si cet écran persiste » ne distingue pas une compilation lente d'un échec ; accepté (gain immédiat), diagnostic détaillé hors périmètre.
