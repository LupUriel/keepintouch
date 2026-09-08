---
title: "Activité de l'entreprise : champ libre prérempli par le libellé NAF 2025 renvoyé par l'annuaire SIRENE, modifiable à la main"
date: 2026-09-08
type: feat
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: réflexion « prétextes » du 8 septembre 2026 (chantier C3) — les conventions collectives restent saisies à la main (décision utilisateur) ; l'activité réelle de l'entreprise doit pouvoir être décrite sur chaque fiche portant une entreprise, préremplie par le libellé du code NAF et modifiable à la main ; elle servira au ciblage des actualités. Décision utilisateur du 8 septembre (après-midi) : partir de la **NAF 2025** (en vigueur en janvier 2027 ; la NAF rév. 2 l'est jusqu'à fin 2026), un seul fichier INSEE ; l'ancien code est mémorisé sans libellé. Doctrine : aucun nouvel appel réseau (les deux codes sont déjà dans la réponse SIRENE interrogée pour l'effectif) ; table des libellés embarquée, hors ligne. Plan relu par un panel de deux lentilles (produit ; données/faisabilité) : 34 constats intégrés.
---

# Activité de l'entreprise (v1.5.10 / kit-crm-v52)

Base : `main` = `04b73ab` (v1.5.9). Branche `feat/activite-naf`.

## Goal Capsule

Vérifié sur pièces : l'application interroge déjà `recherche-entreprises.api.gouv.fr` (SIRENE) pour l'effectif ; la réponse contient `activite_principale` (NAF rév. 2, ex. « 53.10Z »), `activite_principale_naf25` (NAF 2025, ex. « 53.10Y ») et `section_activite_principale`, mais `effectifPatch` (≈ 2526) n'en garde que la tranche d'effectif. Le champ `sector` est la **convention collective de branche** (« CCN DE BRANCHE ») : il ne doit pas être confondu avec l'activité. Ce chantier ajoute un champ **Activité de l'entreprise** (texte libre), mémorise les deux codes NAF, préremplit l'activité par le libellé NAF 2025 quand elle est vide ou n'a pas été retouchée, embarque la table des 747 libellés NAF 2025 (fichier INSEE « Structure NAF 2025 », mis à jour le 4 octobre 2024, déjà téléchargé dans `data/source/`), et rend l'activité visible sur la fiche, dans la liste des candidats SIRENE, dans l'onglet Entreprises et à l'export. Aucune donnée personnelle nouvelle.

## Requirements

### R1. Table des libellés NAF 2025 embarquée

- **Source** (AC-U0, faite) : `data/source/Structure_NAF_2025_Maj_2024-10-04.xlsx` (INSEE, 88 187 octets, licence ouverte, notice `data/source/LISEZMOI.txt`). Feuille « NAF 2025 » : colonne A = code NACE rév. 2.1, colonne B = code sous-classe NAF 2025 (`NN.NNL`, ex. « 01.11Y »), colonne C = intitulé ; 1 241 lignes dont **747 sous-classes** (première « 01.11Y » Culture de céréales…, dernière « 99.00Y »). Les autres feuilles (Sections, Divisions, Groupes, Classes) ne sont pas utilisées.
- `scripts/build-naf.js` (Node, **aucune dépendance npm**) : lit le classeur avec la bibliothèque déjà embarquée `lib/xlsx.full.min.js` (`var XLSX = require(path.join(racine, "lib", "xlsx.full.min.js")); var wb = XLSX.read(fs.readFileSync(source), { type: "buffer" });` — ne pas utiliser `XLSX.readFile`), feuille « NAF 2025 », retient chaque ligne dont la colonne B matche `/^\d{2}\.\d{2}[A-Z]$/`, libellé = colonne C nettoyée (`trim`, espaces multiples réduits, apostrophe typographique « ’ » conservée telle quelle). Erreur (code de sortie 1) si le nombre de codes ≠ 747, si un libellé est vide, ou si un libellé contient `�`. Sortie **déterministe** : codes triés, `JSON.stringify(libelles, null, 2)`, fins de ligne `\n`, UTF-8 sans BOM, aucun `Date` (la chaîne `version` est fixe : « NAF 2025 — INSEE, Structure NAF 2025 Maj 2024-10-04 »). Rejouer le script ne produit aucun diff.
- Fichier généré `data/naf-2025.js` (script plain ES5) : `var KIT_NAF = { version: "NAF 2025 — INSEE, Structure NAF 2025 Maj 2024-10-04", nomenclature: "NAF 2025", libelles: { "01.11Y": "Culture de céréales, à l’exception du riz, de légumineuses et de graines oléagineuses", … } };`. `.gitattributes` : ajouter `data/*.js text eol=lf`.
- Chargement : balise `<script src="./data/naf-2025.js"></script>` insérée juste après `<script src="./lib/exceljs.min.js">` et avant le `<script>` inline de `KIT_PURE`, pour que `KIT_NAF` existe avant tout code inline. `sw.js` : `"./data/naf-2025.js"` ajouté à `PRECACHE_URLS`. Test « précache : chaque bibliothèque chargée par le document est précachée » (≈ 757) : motif `/<script src="(\.\/lib\/[^"]+)"/g` → `/<script src="(\.\/(?:lib|data)\/[^"]+)"/g`. CSP `script-src 'self'` déjà suffisante ; `check-lib-hashes` (portée `lib/`) inchangé ; `.nojekyll` présent.
- Runner : `scripts/kit-tests-node.js` ignore les `<script src>` ; ajouter, avant la boucle d'évaluation des scripts inline, `vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "data", "naf-2025.js"), "utf8"), sandbox, { filename: "naf-2025.js" });` (lecture stricte : fichier absent = porte rouge). Les tests de la table **n'ont pas de garde `typeof KIT_NAF`**.
- `KIT_PURE.libelleNaf(code, table)` → `table.libelles[codeNormalise]` ou `""`. Normalisation : `String(code || "").toUpperCase().replace(/\s+/g, "")`, insertion du point après deux chiffres si absent (`"5310Y"` → `"53.10Y"`) ; `table` absente ou sans `libelles` → `""`. Le bloc Babel appelle toujours `KIT_PURE.libelleNaf(code, typeof KIT_NAF !== "undefined" ? KIT_NAF : null)`.
- Tests purs de la table : 747 entrées ; `/^Culture de céréales/.test(KIT_NAF.libelles["01.11Y"])` ; `KIT_NAF.libelles["53.10Y"]` non vide et contient « poste » ; `KIT_NAF.libelles["62.10Y"]` défini (programmation informatique dans la NAF 2025 — vérifier le code exact dans la table générée et l'utiliser) ; tous les codes matchent `/^\d{2}\.\d{2}[A-Z]$/` ; aucun libellé vide ni contenant `�` ; `libelleNaf("5310y", KIT_NAF) === KIT_NAF.libelles["53.10Y"]` ; `libelleNaf("53.10Y", null) === ""`.

### R2. Champs de la fiche et capture

- Nouveaux champs : `activite` (texte libre ≤ 200 caractères), `nafCode` (code NAF 2025, ex. « 53.10Y », ou `""`), `nafLibelle` (libellé au moment de la capture, ou `""`), `nafRev2Code` (code NAF rév. 2, ex. « 53.10Z », ou `""` — utile sur les documents jusqu'à fin 2026), `nafSource` (`"api"` ou `""`), `nafDate` (jour ISO ou `""`).
- `MERGE_FIELDS` : ajouter les six champs. `contactHaystack` (dans `KIT_PURE`) : ajouter `c.activite`, `c.nafCode`, `c.nafLibelle`. `updContact` : ajouter `var nafFields = ["nafCode", "nafLibelle", "nafRev2Code", "nafSource", "nafDate"];` traité comme `effectifFields` (horodatage groupé : si l'un est écrit, tous reçoivent `now`) ; `activite` reste hors groupe (champ manuel, dernier écrit gagne). `migrateData`, `mergeData`, `revenirAVersion`, import JSON : **rien à faire** (ils itèrent `MERGE_FIELDS`).
- `KIT_PURE.patchActivite(contact, candidate, table, todayISO)` → objet patch : `nafCode` = code normalisé de `candidate.activite_principale_naf25` (ou `""`), `nafRev2Code` = code normalisé de `candidate.activite_principale` (ou `""`), `nafLibelle = libelleNaf(nafCode, table)`, `nafSource = "api"`, `nafDate = todayISO` ; **`activite` = `nafLibelle`** seulement si `nafLibelle` est non vide **et** (`contact.activite` vide **ou** strictement égale à `contact.nafLibelle` — libellé automatique jamais retouché) ; sinon `activite` absent du patch. Si les deux codes sont vides → `{}`. `contact` peut être `undefined` (→ traité comme `{}`).
- Câblage : `effectifPatch(candidate, cible)` fusionne `KIT_PURE.patchActivite(cible || {}, candidate, typeof KIT_NAF !== "undefined" ? KIT_NAF : null, todayStr())`. Le second argument est **la fiche cible relue dans la liste de travail courante** : `chooseEffectif` passe `contact` ; `refreshEffectif` passe `c` ; propagation (≈ 2663) `working.filter(function (x) { return x.id === id; })[0]` ; lot (≈ 2775, 2790) `working.filter(function (x) { return x.id === target.id; })[0]`. Aucun appel à un seul argument ne subsiste (hors définition). `effectifsSecondaires` : inchangé (aucune activité propagée).
- Message après choix d'un candidat (≈ 2667) : en tête des messages, `patch.activite ? "Activité préremplie : « " + patch.activite + " »." : (contact && contact.activite ? "Activité conservée (votre saisie)." : "")`. Confirmation d'« Actualiser » sur saisie manuelle d'effectif (≈ 2701) : « Cette actualisation remplacera l'effectif saisi manuellement (l'activité que vous avez saisie est conservée). Continuer ? ». Panneau ⋯ › « Taille des entreprises » (≈ 5008) : sous la phrase d'introduction, « Ces actions mémorisent aussi le code d'activité NAF et préremplissent l'activité des fiches où elle est vide. » ; compte rendu (≈ 5014) : `report.activites` (nombre de fiches où `activite` a été écrite) → « Activité préremplie sur N fiche(s). »
- Liste des candidats du modal « Rattacher l'entreprise » (≈ 3995-3997) : sous la ligne effectif, même style (`color: "#475569", fontSize: 12`), `"Activité : " + libelle` si `KIT_PURE.libelleNaf(candidate.activite_principale_naf25, table)` est non vide.

### R3. Formulaire de fiche

- Dans le bloc `!fInTransition`, en `React.createElement` comme le bloc voisin, **ligne pleine largeur** (`marginBottom: 16`) insérée entre la grille FONCTION/ENTREPRISE et « LIEU D'EXERCICE », label et input strictement identiques à ceux de LIEU D'EXERCICE : label « ACTIVITÉ DE L'ENTREPRISE », état `fAct` (chaîne), `maxLength={200}`, placeholder « Ex: études cliniques pour l'industrie pharmaceutique ». La variable de la fiche éditée s'appelle `existing`.
- Sous le champ, ligne d'aide (style « Cycle : » : `fontSize: 11.5, color: "#6E6A64"`) : « Ce que fait l'entreprise, pour cibler vos actualités. La convention collective se choisit plus bas (CCN de branche). » Puis, si `existing && existing.nafCode` : ligne « NAF 2025 <code> — <nafLibelle> (SIRENE, <fmtDate(existing.nafDate)>) » suivie, si `existing.nafRev2Code`, de « · ancien code <nafRev2Code> » ; et, si `existing.nafLibelle` non vide **et** `fAct !== existing.nafLibelle`, un bouton texte « Reprendre le libellé officiel » (style « + Nouvelle catégorie » : `background: "none", border: "none", color: abl, fontSize: 12, cursor: "pointer", fontFamily: ff`) qui fait `setFAct(existing.nafLibelle)`.
- `initForm` (≈ 3127) : `setFAct(existing ? (existing.activite || "") : "")` ; `submitForm` : `activite: fAct.trim().slice(0, 200)` ; `addContact` (≈ 2479) : `activite: payload.activite || ""` ; `pickCompany` (≈ 4211-4230) : `var act = consensus(function (c) { return c.activite; }); if (act && !fAct.trim()) setFAct(act);`. Les codes NAF ne sont pas saisissables à la main.

### R4. Fiche (détail)

- Nouvelle carte, même motif que « LIEU DE RENCONTRE » / « CCN DE BRANCHE » (`padding: 14, background: "#F6F5F2", borderRadius: 8`), insérée **juste avant** la carte « EFFECTIF ENTREPRISE », rendue si `c.company` : titre « ACTIVITÉ DE L'ENTREPRISE » ; texte `c.activite || "Activité non renseignée"` (14 px ; gris `#94A3B8` si non renseignée) ; si `c.nafLibelle && c.nafLibelle !== c.activite`, ligne 11,5 px `#6E6A64` : « NAF 2025 <nafCode> — <nafLibelle> » ; si `c.nafRev2Code`, même ligne : « · ancien code <nafRev2Code> » ; si `!c.nafCode`, ligne 11,5 px : `c.effectifSiren ? "« Actualiser » l'effectif récupère le code NAF." : "« Rechercher l'effectif » la préremplit."`. Aucune pastille, aucun `title`.
- Onglet « Entreprises » (≈ 4815) : sous « N fiche(s) », la première activité non vide du groupe en 12 px `#86837C`, une ligne avec ellipse.

### R5. Export et import Excel

- Export : deux colonnes en fin de ligne (après « Nb interactions ») : « Activité », « Code NAF 2025 » ; `EXPORT_COLW` : ajouter `40, 12` en fin ; `EXPORT_DATE_COLS` inchangé.
- Import : `iAct = findCol(hd, ["activite"])` (`stripAccents` rend « Activité » équivalent ; pas d'autre mot-clé, pour ne pas capter « entreprise ») → `activite: ((iAct >= 0 ? vals[iAct] : "") || "").slice(0, 200)` ; les codes NAF ne sont pas importés.

### R6. Versions et documentation

- `APP_VERSION = "1.5.10"`, `CACHE_NAME = "kit-crm-v52"`, regex du test « version applicative du document » (`1\.5\.10`, `kit-crm-v52`).
- `LISEZMOI.txt`, nouvelle section après « ## Taille des entreprises » et avant « ## Procédures collectives » (≤ 95 colonnes, sans « archivez ») :

```
## Activité de l'entreprise

Chaque fiche portant une entreprise peut décrire son activité réelle : champ « Activité de
l'entreprise » du formulaire (texte libre). Quand vous utilisez « Rechercher l'effectif » ou
« Actualiser » sur une fiche, ou « Compléter / Mettre à jour les effectifs » dans ⋯ › Taille des
entreprises, le code d'activité NAF de l'entreprise (dit code APE, attribué par l'INSEE) est
mémorisé et son libellé officiel prérempli dans le champ s'il était vide. Pour vos fiches déjà
rattachées, une seule passe « Mettre à jour les effectifs » suffit.
Une activité que vous avez saisie n'est jamais écrasée ; le bouton « Reprendre le libellé
officiel » remet le libellé INSEE. Le libellé officiel est parfois générique ou abrégé
(« n.c.a. » = non classé ailleurs) : remplacez-le par ce que fait réellement l'entreprise, en
quelques mots.
Les libellés sont ceux de la NAF 2025, qui entre en vigueur en janvier 2027 ; l'ancien code
(NAF rév. 2, lisible sur les documents jusqu'à fin 2026) est mémorisé et affiché à côté.
La convention collective de branche reste un choix manuel : les données en ligne sont
déclaratives et souvent inexactes.
Pour cibler un envoi, tapez un mot de l'activité dans la case « Rechercher… » du tableau de
bord (ex. « pharma ») : les fiches correspondantes s'affichent.
Rien de nouveau ne sort de l'application : les codes NAF sont déjà dans la réponse SIRENE
interrogée pour l'effectif, et la table des libellés (INSEE) est embarquée.
```

- `docs/RECETTE.md` : sous-titre « ## Activité de l'entreprise (v1.5.10) » après « ## Lignes spécifiques de la version » et avant la section v1.5.9, avec les cases AE1-AE6.

### R7. Tests

- Purs (AC-U1) : `libelleNaf` (normalisation « 5310y », code absent, table nulle) ; `patchActivite` (préremplissage si vide ; préremplissage si `activite === nafLibelle` précédent ; non-écrasement si saisie différente ; codes vides → `{}` ; `contact` indéfini ; `nafRev2Code` ; `nafDate`) ; table `KIT_NAF` (R1) ; `contactHaystack` inclut `activite`, `nafCode`, `nafLibelle`.
- Câblage (AC-U2/AC-U3, convention ancres + littéraux concaténés) : `MERGE_FIELDS` contient les six champs ; `updContact` contient `"nafFields"` et `nafFields.forEach(function (key) { fu[key] = now; })` ; `effectifPatch` appelle `KIT_PURE.patchActivite(` et aucun `effectifPatch(candidate)` / `effectifPatch(match)` à un seul argument ne subsiste hors définition ; `addContact` contient `"activite: payload." + "activite"` ; formulaire : « ACTIVITÉ DE L'" + "ENTREPRISE », « Reprendre le libellé " + "officiel », « CCN de " + "branche) » ; détail : « Activité non " + "renseignée », « NAF 2025 » ; modal candidats : `"Activité : "` dans `renderEffectifModal` ; Entreprises : `c.activite` dans `renderEntreprises` (ou la fonction réelle) ; export : « Code NAF " + "2025 » après « Nb " + "interactions » ; import : `"activite"` dans la liste `findCol` de `processImportRows` ; panneau : « Activité préremplie sur » ; document : `<script src="./data/` + `naf-2025.js">` avant `KIT_PURE` ; `sw.js` : `"./data/naf-2025.js"` dans `PRECACHE_URLS` ; docs : « ## Activité de l'" + "entreprise » ; test de version.

## Acceptance Examples

- AE1. Fiche « Société X » (activité vide) : « Rechercher l'effectif » → la liste des candidats affiche « Activité : … » sous chaque entreprise → choisir → message « Activité préremplie : « … » » → la carte ACTIVITÉ DE L'ENTREPRISE affiche le libellé, la ligne « NAF 2025 <code> — … · ancien code <code> » n'apparaît pas (libellé identique) ; dans « Modifier », le champ contient le libellé et la ligne « NAF 2025 … (SIRENE, <date>) ».
- AE2. Même fiche : remplacer l'activité par « Études cliniques (CRO) », puis « Actualiser » : l'activité saisie est conservée (message « Activité conservée (votre saisie). »), la carte affiche « Études cliniques (CRO) » et, dessous, « NAF 2025 <code> — <libellé officiel> » ; « Reprendre le libellé officiel » remet le libellé.
- AE3. Fiche préremplie jamais retouchée, rattachée ensuite à une autre entreprise : l'activité suit le nouveau libellé.
- AE4. ⋯ › Taille des entreprises › « Mettre à jour les effectifs » sur données synthétiques : compte rendu « Activité préremplie sur N fiche(s). » ; une fiche à activité saisie n'est pas modifiée.
- AE5. Hors ligne : la fiche affiche toujours activité et libellé ; « À propos » affiche v1.5.10 · kit-crm-v52 ; export : colonnes « Activité », « Code NAF 2025 » en fin de ligne ; import d'un fichier avec colonne « Activité » → champ rempli ; « Entreprises » montre l'activité sous chaque société ; la recherche « pharma » trouve les fiches.
- AE6. Samsung : la carte ACTIVITÉ DE L'ENTREPRISE et la ligne NAF s'affichent sans infobulle ; le formulaire montre le champ en pleine largeur sous FONCTION/ENTREPRISE.
- AE7. Fusion PC ↔ Android : l'activité saisie sur un appareil apparaît sur l'autre.

## Implementation Units

### AC-U0. Fichier source INSEE (orchestrateur — fait)
- `data/source/Structure_NAF_2025_Maj_2024-10-04.xlsx` + `data/source/LISEZMOI.txt` (URL, date, licence, empreinte SHA-256), `.gitattributes`.

### AC-U1. Table, script de génération, moteur pur, runner (Codex)
- **Files :** `scripts/build-naf.js` (nouveau), `data/naf-2025.js` (généré), `scripts/kit-tests-node.js` (chargement de la table), `index.html` (`KIT_PURE` : `libelleNaf`, `patchActivite`, `contactHaystack` ; `KIT_TESTS` : cas purs ; balise `<script src>` ; test 757), `sw.js` (`PRECACHE_URLS` seulement).
- **Verification :** `node scripts/build-naf.js` puis `node scripts/run-gates.js` → 0 échec ; `node scripts/build-naf.js` rejoué → `git diff --quiet data/naf-2025.js`.

### AC-U2. Données, capture, formulaire, fiche, modal, Entreprises (Codex)
- **Files :** `index.html` (bloc Babel + tests de câblage).
- **Approach :** R2 (hors export), R3, R4 + câblages correspondants de R7.
- **Verification :** `node scripts/run-gates.js` → 0 échec.

### AC-U3. Export/import, versions, documentation (Codex)
- **Files :** `index.html` (export/import, test de version, tests de câblage), `sw.js` (`CACHE_NAME`), `LISEZMOI.txt`, `docs/RECETTE.md`.
- **Approach :** R5, R6 + câblages de R7.
- **Verification :** `node scripts/run-gates.js` → 0 échec (smoke et recette AE1-AE7 par l'orchestrateur).

## Definition of Done

AC-U0 committé, trois commits Codex (+ correctifs de revue), `run-gates --with-smoke` vert, revue croisée trois voies (accent : non-écrasement d'une saisie manuelle, cible correcte dans les appels groupés, horodatage groupé des champs NAF, table complète et précachée, hors ligne), PR vers `main`, recette utilisateur, fusion = v1.5.10.

## Consigné

- NAF rév. 2 : code mémorisé sans libellé ; affichage « ancien code » à retirer après fin 2026.
- La convention collective n'est jamais préremplie ni suggérée.
- Le rapport de fusion liste les noms techniques des champs modifiés (motif existant) : inchangé.
- Filtre par activité dans l'onglet Entreprises : reporté (la recherche plein texte couvre l'usage).
