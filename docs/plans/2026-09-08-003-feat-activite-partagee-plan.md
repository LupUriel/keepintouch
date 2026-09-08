---
title: "Activité partagée par entreprise : modifier l'activité sur une fiche l'applique aux autres fiches de la même société"
date: 2026-09-08
type: feat
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: demande utilisateur du 2026-09-08 après recette de la v1.5.10 — « il faudrait, quand je modifie l'activité sur une fiche, que ça puisse le modifier dans toutes les autres fiches de la même entreprise ». L'activité décrit l'entreprise, pas la personne. Doctrine inchangée : tout local, aucun appel réseau nouveau, aucune donnée sensible. Plan relu par un panel adversarial de quatre lentilles (produit, moteur pur, câblage/régressions, tests/faisabilité) : 51 constats bruts, 20 retenus (4 P1, 11 P2, 5 P3) et intégrés ci-dessous, 15 écartés ou fusionnés sur pièces.
---

# Activité partagée par entreprise (v1.5.11 / kit-crm-v53)

Base : `main` = `519b40d` (v1.5.10, PR #19 fusionnée). Branche `feat/activite-partagee`. Base saine vérifiée : `node scripts/run-gates.js` → `GATES_OK (4 portes)` ; ni `ciblesActivite` ni « Activité partagée avec » n'existent dans `index.html` (aucune collision de nom ni de littéral).

## Goal Capsule

Vérifié sur pièces (v1.5.10) : le champ `activite` est stocké **par fiche**. Deux collègues d'une même société peuvent donc porter deux activités différentes, et corriger l'une n'affecte pas l'autre. La capture SIRENE propage déjà l'activité aux fiches sœurs (`propagationCibles` → `effectifPatch` → `patchActivite`), mais **la saisie manuelle ne propage rien** : `submitForm` appelle `updContact(existingId, payload)` sur la seule fiche éditée (index.html:3219-3222). L'application sait déjà rapprocher deux fiches d'une même société : `KIT_PURE.denominationMatch(a, b)` compare les dénominations normalisées (index.html:518), et `propagationCibles` s'en sert pour l'effectif en refusant d'écrire sur une fiche rattachée à un autre SIREN (index.html:529). Ce chantier applique la même logique à l'activité saisie à la main, **sans perte possible** : les fiches sans activité propre sont alignées d'office, celles qui portent une activité différente ne sont remplacées qu'après une question qui les nomme, vider le champ n'efface jamais rien sans question, et le formulaire annonce le nombre de fiches concernées **avant** l'enregistrement.

## Requirements

### R1. Moteur pur — `KIT_PURE.ciblesActivite(contacts, sourceId, denomination, activite, activiteAvant, siren)`

Retourne `{ aAligner: [{ id, label, archivee }], conflits: [{ id, label, archivee, activite }], identiques: <entier> }`.

Gardes, dans cet ordre :
- `var fiches = Array.isArray(contacts) ? contacts : [];`
- `denomination` vide après `normalizedText` → `{ aAligner: [], conflits: [], identiques: 0 }`. Cette garde suffit et rend inutile toute garde sur `company` ailleurs : `""`, `"   "`, `"-"`, `"?"` donnent tous une dénomination vide.
- Ignorer toute fiche telle que `!contact || typeof contact.id !== "string" || !contact.id`.
- N'exclure la fiche source que si `typeof sourceId === "string" && sourceId && contact.id === sourceId`.
- Ignorer toute fiche dont `denominationMatch(contact.company, denomination)` est faux.
- Ignorer entièrement toute fiche telle que `String(contact.effectifSiren || "")` et `String(siren || "")` soient tous deux non vides et différents (même règle que `propagationCibles`, index.html:529).

Classement, avec `var a = String(contact.activite || "").trim();`, `var n = String(activite || "").trim();`, `var officiel = String(contact.nafLibelle || "").trim();`, `var avant = String(activiteAvant || "").trim();` — quatre branches **exclusives**, évaluées dans cet ordre exact :

1. `a === n` → `identiques += 1` (rien à écrire) ;
2. `n === ""` → `conflits` — vider l'activité n'efface **jamais** celle d'une fiche sœur sans la question, pas même un libellé officiel INSEE ;
3. `a === ""` **ou** `(officiel !== "" && a === officiel)` **ou** `(avant !== "" && a === avant)` → `aAligner` ;
4. sinon → `conflits`.

Toutes les comparaisons portent sur les valeurs trimmées ci-dessus : ne jamais comparer `contact.activite` à `contact.nafLibelle` sur les valeurs brutes.

Justification du troisième cas de la branche 3 : sans lui, toute modification suivant la première propagation rouvrirait la question en nommant toutes les fiches déjà alignées (une sœur alignée porte l'ancienne valeur, non vide et différente de son `nafLibelle`). Risque résiduel accepté : une sœur que l'utilisateur aurait saisie indépendamment au même texte est réalignée sans question — elle était en accord, l'effet est nul.

`label = nomCourant(contact)` ; `archivee = !!contact.archived` ; `activite` (dans `conflits`) = l'activité stockée de la fiche.

Tri de chaque liste, comparateur identique à celui de `liensFiche` (index.html:513) :
`function (a, b) { if (a.label !== b.label) return a.label < b.label ? -1 : 1; if (a.id === b.id) return 0; return a.id < b.id ? -1 : 1; }`

Export : ajouter `ciblesActivite: ciblesActivite, ` dans la ligne `return { … }` de `KIT_PURE`.

### R2. Câblage — propagation à l'enregistrement du formulaire

`aAligner` et `conflits` sont des tableaux d'**objets** `{ id, label, archivee }` : ne jamais en passer un élément à `updContact` sans son `.id` (`updContact` compare `c.id !== id`, index.html:2537 ; passer l'objet est un no-op silencieux).

Remplacer `if (existingId) { updContact(existingId, payload); setView("contact"); } else { addContact(payload); }` (index.html:3219-3222) par exactement :

```js
if (existingId) {
  var avant = ficheCourante(existingId, contacts);
  var avantAct = String((avant && avant.activite) || "").trim();
  var changement = String(payload.activite || "").trim() !== avantAct;
  var memeEntreprise = KIT_PURE.denominationMatch(payload.company, (avant && avant.company) || "");
  var cibles = { aAligner: [], conflits: [], identiques: 0 };
  if (!fInTransition && changement && memeEntreprise) cibles = KIT_PURE.ciblesActivite(contacts, existingId, payload.company, payload.activite, avantAct, (avant && avant.effectifSiren) || "");
  var entreprise = String(payload.company || "").trim();
  var remplacer = false;
  if (cibles.conflits.length > 0) {
    var noms = cibles.conflits.slice(0, 5).map(function (x) { return x.label + (x.archivee ? " (archivée)" : ""); }).join(", ") + (cibles.conflits.length > 5 ? "…" : "");
    var combien = KIT_PURE.pluriel(cibles.conflits.length, "autre fiche de", "autres fiches de") + " « " + entreprise + " » " + (cibles.conflits.length > 1 ? "portent" : "porte");
    remplacer = confirm(payload.activite
      ? combien + " une activité différente : " + noms + ".\n\nRemplacer aussi leur activité par « " + payload.activite + " » ?\n\nOK : leur activité est remplacée. Annuler : elles gardent la leur.\nDans les deux cas votre fiche est enregistrée, et les fiches sans activité reçoivent la nouvelle."
      : combien + " une activité : " + noms + ".\n\nEffacer aussi leur activité ?\n\nOK : leur activité est effacée. Annuler : elles gardent la leur.\nDans les deux cas votre fiche est enregistrée sans activité.");
  }
  var ids = cibles.aAligner.concat(remplacer ? cibles.conflits : []).map(function (x) { return x.id; });
  var working = updContact(existingId, payload);
  ids.forEach(function (id) { working = updContact(id, { activite: payload.activite }, null, working); });
  setView("contact");
} else {
  addContact(payload);
}
```

- La condition complète de propagation est `!fInTransition && changement && memeEntreprise` : les champs ENTREPRISE et ACTIVITÉ ne sont pas rendus quand `fInTransition` est vrai (index.html:4321) et aucune question ne doit porter sur un champ invisible.
- `memeEntreprise` interdit la propagation quand la dénomination a changé dans la même sauvegarde ; `denominationMatch` (et non l'égalité stricte) est le bon comparateur : corriger « SAINT-GOBAIN » en « SAINT GOBAIN » reste la même entreprise.
- La lecture de comparaison et l'écriture partent de la même base : `ficheCourante(existingId, contacts)`, jamais `ficheCourante(existingId)`.
- Aucune autre donnée n'est propagée : ni `nafCode`, ni `nafLibelle`, ni l'effectif — le patch `{ activite: … }` ne contient aucune clé NAF, donc `nafWrite` reste faux (index.html:2544).
- La propagation déclenche N+1 enregistrements complets, une sérialisation du carnet par fiche écrite — exactement ce que fait déjà `chooseEffectif` (index.html:2705-2708). Coût consigné, **aucune refonte d'`updContact` dans ce chantier**.

### R3. Interface — annoncer la portée avant l'enregistrement

**INTERDICTION FORMELLE** d'ajouter un hook React (`useMemo`, `useRef`, `useState`, `useEffect`, `useCallback`) dans `renderForm()` ou dans une fonction appelée par elle : `renderForm()` est appelé conditionnellement (index.html:5392-5393) et `App` comporte des retours conditionnels avant sa définition (index.html:2471-2472) ; tout hook y provoque React error #310, exactement l'incident du commit `e91c7b2`. La ligne est calculée par des variables locales ordinaires.

Dans `renderForm()`, juste après le bloc `var existing = null; if (view === "editContact") { … }` (index.html:4289-4291), poser :

```js
var cActi = (existing && fCompany.trim()) ? KIT_PURE.ciblesActivite(contacts, existing.id, fCompany, fAct.trim().slice(0, 200), String((existing && existing.activite) || "").trim(), (existing && existing.effectifSiren) || "") : null;
var nActi = cActi ? cActi.aAligner.length + cActi.conflits.length + cActi.identiques : 0;
var nArchActi = cActi ? cActi.aAligner.concat(cActi.conflits).filter(function (x) { return x.archivee; }).length : 0;
```

`nActi` est le nombre de fiches sœurs : les trois compartiments **partitionnent** les fiches rapprochées, donc cette somme ne dépend pas de la valeur passée en quatrième argument — la ligne ne change pas quand l'utilisateur tape dans le champ ACTIVITÉ (`fAct` n'est passé que pour éviter un second parcours).

Insérer la ligne comme **quatrième et dernier** élément du bloc du champ, **après** le bouton « Reprendre le libellé officiel » (index.html:4346), de sorte que l'ordre soit : champ, ligne d'aide, ligne NAF, bouton, ligne « Activité partagée avec … ». Rendue seulement si `nActi > 0` :

```js
nActi > 0 ? React.createElement("p", { style: { fontSize: 11.5, color: "#6E6A64", margin: "5px 0 0" } },
  "Activité partagée avec " + KIT_PURE.pluriel(nActi, "autre fiche", "autres fiches") + " de « " + fCompany.trim() + " »"
  + (nArchActi ? " (dont " + KIT_PURE.pluriel(nArchActi, "fiche archivée", "fiches archivées") + ")" : "")
  + " : l'enregistrement la recopie sur celles qui n'ont pas d'activité, et vous demande avant de remplacer une activité différente.") : null
```

La ligne est rendue à l'intérieur du bloc `!fInTransition` (index.html:4321), donc absente d'une fiche en transition — cohérent avec R2.

### R4. Documentation et versions

- `APP_VERSION = "1.5.11"` (index.html:1246), `CACHE_NAME = "kit-crm-v53"` (sw.js:1) et les **deux** expressions régulières du test « version applicative du document » (index.html:747) changent dans le **même commit**.
- `LISEZMOI.txt` — **d'abord** remplacer la phrase de LISEZMOI.txt:162-163 par exactement :

```
Une activité que vous avez saisie n'est jamais écrasée par une mise à jour SIRENE ; seule une
modification que vous faites vous-même sur une autre fiche de la même entreprise peut la
remplacer, et l'application vous le demande alors. Le bouton « Reprendre le libellé officiel »
remet le libellé INSEE.
```

**puis** ajouter en fin de la section « ## Activité de l'entreprise » exactement :

```
L'activité décrit l'entreprise, pas la personne : quand vous la modifiez sur une fiche et que
vous enregistrez, elle est recopiée sur les autres fiches de la même entreprise (nom identique,
casse, accents et tirets ignorés ; le reste compte, « ORANGE » et « ORANGE SA » sont deux
entreprises). Les fiches sans activité, archivées comprises, sont alignées sans rien demander.
Celles qui portent déjà une activité différente ne sont remplacées qu'après une question qui
les nomme ; répondre Annuler leur laisse la leur et enregistre quand même votre fiche. Vider
le champ ne vide jamais les autres fiches sans cette question. Le formulaire indique, sous le
champ, combien de fiches partagent l'entreprise. Une fiche ainsi alignée porte désormais votre
texte : les mises à jour d'effectif ne la remplaceront plus par le libellé officiel.
```

Le mot « archivez » reste interdit (test index.html:912). La limite de 95 colonnes est une convention, non une porte : la respecter.

- `docs/RECETTE.md`, section « ## Activité de l'entreprise (v1.5.10) » : le titre **reste inchangé** — le test index.html:875 exige la chaîne « Activité de l'entreprise (v1.5.10) » dans la documentation ; le renommer met la porte `kit-tests-node.js` en échec. Dans la case docs/RECETTE.md:21, remplacer « affiche v1.5.10 · kit-crm-v52 » par « affiche v1.5.11 · kit-crm-v53 ». Compléter la case docs/RECETTE.md:19 par « … à condition qu'aucune propagation manuelle ne l'ait alignée entre-temps ». Ajouter à la fin de la section, mot pour mot :
  1. « Trois fiches « LA POSTE », deux sans activité : le formulaire annonce « Activité partagée avec 2 autres fiches de « LA POSTE » » ; saisir « Distribution du courrier et colis » puis Enregistrer : aucune question, les deux autres fiches affichent la même activité ; modifier une deuxième fois : aucune question non plus »
  2. « Une quatrième fiche saisie « SAINT-GOBAIN » et une cinquième saisie « SAINT GOBAIN » sont reconnues comme la même entreprise ; celle qui porte « Logistique (saisi) » est nommée dans la question ; Annuler la laisse intacte et aligne les fiches vides ; refaire et répondre OK la remplace ; l'onglet Entreprises continue d'afficher deux lignes »
  3. « Vider l'activité sur une fiche dont les sœurs en ont une : la question apparaît ; Annuler conserve toutes les activités des sœurs, y compris celles issues du libellé officiel »
  4. « Fiche sans entreprise : aucune ligne « Activité partagée avec … », aucune propagation »
  5. « Cocher « En transition » après avoir saisi une activité, puis Enregistrer : aucune question »
  6. « Fiche préremplie par SIRENE puis alignée par propagation : « Actualiser » conserve l'activité propagée et n'y remet pas le libellé officiel »
  7. « Sur l'entreprise la plus fournie du carnet réel, modifier l'activité et enregistrer : le retour à la fiche reste immédiat et aucune bannière rouge d'erreur d'enregistrement n'apparaît »

### R5. Tests

**Règle générale obligatoire** : tout test de câblage découpe d'abord une **tranche** du document entre deux ancres écrites en littéraux **concaténés**, puis n'assertit que dans cette tranche. Aucun `KIT_SOURCE_HTML.indexOf` sur un littéral que le test contient lui-même ; aucune assertion sur `KIT_SOURCE_HTML` entier. Motif : `KIT_SOURCE_HTML` est le fichier complet, tests compris (scripts/kit-tests-node.js:19), et le bloc `KIT_TESTS` (index.html:690-925) précède `submitForm` (index.html:3204).

Tranches à utiliser :
- `submitForm` : `var debut = KIT_SOURCE_HTML.indexOf("function submit" + "Form("), fin = KIT_SOURCE_HTML.indexOf("function export" + "Excel(", debut), t = KIT_SOURCE_HTML.slice(debut, fin); kitAssert(debut >= 0 && fin > debut, "ancres submitForm");` (vérifié : index.html:3204 et 3228).
- Formulaire : `var d = KIT_SOURCE_HTML.indexOf("ACTIVITÉ DE L'" + "ENTREPRISE"), f = KIT_SOURCE_HTML.slice(d, d + 3000);` — la première occurrence est le formulaire (index.html:4342), la carte de fiche est à index.html:4564.
- `renderForm` (absence de hook) : `var rf = KIT_SOURCE_HTML.slice(KIT_SOURCE_HTML.indexOf("function render" + "Form("), KIT_SOURCE_HTML.indexOf("function render" + "Detail("));`

**Assertions de câblage**, dans `t` sauf indication : ordre croissant des `indexOf` de `"if (existingId) {"`, `"var avant = ficheCourante(existingId, " + "contacts)"`, `"var changement ="`, `"KIT_PURE.cibles" + "Activite("`, `"updContact(existingId, payload)"`, `"ids.forEach("` ; présence de `"!fInTransition && changement && meme" + "Entreprise"`, `".trim() !== avant" + "Act"`, `"remplacer ? cibles.conflits : " + "[]"`, `"cibles.conflits.length > " + "0"`, `".map(function (x) { return x." + "id; })"` (situé **avant** `"ids.forEach("`), `"Remplacer aussi leur activité " + "par"`, `"Effacer aussi leur " + "activité ?"`, `"Annuler : elles gardent la " + "leur."`, `"Dans les deux cas votre fiche est " + "enregistrée"`, `"cibles.conflits.slice(0, " + "5)"`, `'" (archi' + 'vée)"'`. Dans `f` : `"Activité partagée " + "avec "`, `"vous demande avant de remplacer une activité " + "différente."`, `"KIT_PURE.cibles" + "Activite(contacts, existing.id, fCompany"`. Dans `rf` : `["use" + "Memo", "use" + "Ref", "use" + "State", "use" + "Effect", "use" + "Callback"]` tous à `-1` (vérifié : c'est déjà le cas aujourd'hui). Documentation : `KIT_SOURCE_DOCS` contient `"L'activité décrit l'entreprise, pas la " + "personne"` et `"jamais écrasée par une mise à jour " + "SIRENE"`.

**Cas purs** de `ciblesActivite` :
- `contacts` valant `null` puis `undefined` → `{ aAligner: [], conflits: [], identiques: 0 }` ; dénomination `""`, `"   "`, `"-"` → idem.
- Rapprochement insensible à la casse, aux accents et aux tirets (« LA POSTE » ≡ « la-poste ») ; « ORANGE » vs « ORANGE SA » → aucune cible ; « L'ORÉAL » vs « LOREAL » → aucune cible.
- Fiche source exclue ; fiche `{ company: "X", activite: "" }` **sans** `id` → absente des trois sorties, y compris quand `sourceId` est absent ; `sourceId` absent → aucune exclusion des fiches ayant un `id`.
- Fiche portant exactement la nouvelle activité → `identiques` (absente des deux listes) ; fiche vide → `aAligner` ; fiche dont `activite === nafLibelle` non vide → `aAligner` ; fiche portant `activiteAvant` (`activiteAvant = "Courrier"`, nouvelle activité « Courrier et colis ») → `aAligner` sans question, tandis qu'une sœur portant « Logistique (saisi) » → `conflits` avec son `activite`.
- Nouvelle activité vide (`""`) et sœur dont `activite === nafLibelle` non vide → `conflits.length === 1 && aAligner.length === 0 && identiques === 0` (aucun effacement sans question).
- Fiche archivée présente avec `archivee: true`.
- Sœur `{ effectifSiren: "987654321", activite: "" }` avec `siren = "123456789"` → absente des trois sorties ; la même sœur avec `siren = ""` → `aAligner`.
- Tri : deux sœurs de même `label` sortent dans l'ordre croissant de leur `id`.

## Acceptance Examples

Toutes les dénominations sont écrites en majuscules, le formulaire les forçant (index.html:4329).

- AE1. Trois fiches « LA POSTE », deux sans activité. Le formulaire annonce « Activité partagée avec 2 autres fiches de « LA POSTE » ». Saisir « Distribution du courrier et colis » puis Enregistrer : aucune question, les deux autres fiches affichent la même activité. Modifier une deuxième fois (« Courrier, colis et services financiers ») : aucune question non plus, les deux autres fiches suivent.
- AE2. Une quatrième fiche saisie « SAINT-GOBAIN » et une cinquième saisie « SAINT GOBAIN » sont bien reconnues comme la même entreprise ; celle qui porte « Logistique (saisi) » est nommée dans la question ; Annuler la laisse intacte et aligne les fiches vides ; OK la remplace.
- AE3. Modifier un autre champ que l'activité (fonction, téléphone) : aucune propagation, aucune question.
- AE4. Vider l'activité sur une fiche dont les sœurs en ont une : la question apparaît (elles sont « différentes »), y compris une fiche sœur dont l'activité est le libellé officiel INSEE ; Annuler les conserve toutes.
- AE5. Fiche sans entreprise : aucune propagation, aucune ligne « Activité partagée avec … ».
- AE6. Fusion PC ↔ Android : les activités alignées sur un appareil apparaissent sur l'autre (champ `activite` fusionnable, horodaté par `updContact`).
- AE7. Une fiche archivée de la même entreprise : la ligne indique « (dont 1 fiche archivée) », et après enregistrement l'activité y est bien appliquée.
- AE8. Saisir une activité puis cocher « En transition » avant d'enregistrer : aucune propagation, aucune question.
- AE9. Changer l'entreprise et l'activité dans la même sauvegarde : aucune question, aucune fiche de l'entreprise d'arrivée n'est modifiée ; réenregistrer ensuite sans toucher l'entreprise propage normalement.
- AE10. Deux fiches « MARTIN CONSEIL » rattachées à deux SIREN différents : modifier l'activité sur l'une ne touche pas l'autre et ne la nomme pas ; la ligne du formulaire ne la compte pas.
- AE11. Trois fiches portant l'entreprise « INDÉPENDANT », activité vide : le formulaire annonce « Activité partagée avec 2 autres fiches de « INDÉPENDANT » » avant l'enregistrement ; l'utilisateur peut renoncer.

## Implementation Units

### AP-U1. Moteur pur et tests (Codex)
- **Files :** `index.html` — bloc `KIT_PURE` (`ciblesActivite` + export) et bloc `KIT_TESTS` (cas purs de R5).
- **Insertion :** les cas purs vont immédiatement après `KIT_TESTS.add("effectifs égalité de dénomination", …)` (index.html:736).
- **Verification :** `node scripts/run-gates.js` → 0 échec.

### AP-U2. Câblage, interface, versions, documentation (Codex)
- **Files :** `index.html` (bloc Babel : `submitForm`, `renderForm` ; bloc `KIT_TESTS` : tests de câblage et test de version ; `APP_VERSION`), `sw.js`, `LISEZMOI.txt`, `docs/RECETTE.md`.
- **Approach :** R2, R3, R4 + assertions de câblage de R5.
- **Insertion :** les tests de câblage vont immédiatement après `KIT_TESTS.add("câblage activité : documentation", …)` (index.html:875). Cette unité modifie **seule** le test « version applicative du document » (index.html:747, les deux regex : `APP_VERSION` → `1\.5\.11`, `CACHE_NAME` → `kit-crm-v53`), `index.html:1246` et `sw.js:1` — dans un seul et même commit.
- **Verification :** `node scripts/run-gates.js` → 0 échec (smoke et recette AE1-AE11 par l'orchestrateur).

## Definition of Done

Deux commits Codex (+ correctifs de revue par Codex si nécessaire) ; `run-gates --with-smoke` vert **avec vérification explicite de `SMOKE_OK` et de `"authenticated":true`** dans la sortie ; **aucun hook React ajouté** : test de câblage vérifiant que la tranche `renderForm` → `renderDetail` ne contient ni `useMemo`, ni `useRef`, ni `useState`, ni `useEffect`, ni `useCallback` ; revue croisée trois voies (accent : aucune perte d'activité saisie, exclusion par SIREN, renommage d'entreprise, fiche en transition, fusion inter-appareils) ; PR vers `main` passée « prête » **seulement si aucun contrôle GitHub n'est en échec** ; recette utilisateur ; fusion = v1.5.11.

## Consigné

- **Création de fiche** : pas de propagation (le formulaire préremplit déjà l'activité par consensus des fiches sœurs via `pickCompany`).
- **Import CSV/Excel** : aucune propagation. La colonne « Activité » d'un fichier importé est écrite fiche par fiche (index.html:3725) ; seule la saisie manuelle dans le formulaire de modification propage.
- **Fiche en transition** : aucune propagation, aucune question, aucune ligne dans le formulaire.
- **Codes NAF non propagés** : ils dépendent du SIREN rattaché à chaque fiche ; seule l'activité, texte libre décrivant la société, est partagée.
- **Rapprochement par nom d'entreprise, mais jamais entre deux SIREN connus et distincts** : une fiche dont l'`effectifSiren` est renseigné et différent de celui de la fiche source n'entre dans aucune des trois listes — même règle que `propagationCibles` (index.html:529). Seules les fiches sans SIREN mémorisé, ou de même SIREN, sont concernées. Si un seul des deux SIREN est connu, la fiche est traitée normalement.
- **Renommer l'entreprise d'une fiche ne déclenche aucune propagation**, y compris quand l'entreprise **et** l'activité changent dans la même sauvegarde : le rapprochement exige `KIT_PURE.denominationMatch(payload.company, ancienne company)`. Rattacher une fiche sans entreprise à une entreprise existante ne propage donc rien non plus ; un second enregistrement propage.
- **Portée du rapprochement, dans les deux sens.** `denominationMatch` (index.html:518) ne normalise ni les formes juridiques, ni « & », ni les apostrophes : « ORANGE » et « ORANGE SA », « L'ORÉAL » et « LOREAL » ne sont **pas** rapprochés — aucune propagation et aucune ligne « Activité partagée avec … » n'apparaît alors. À l'inverse, une valeur d'entreprise fourre-tout (« INDÉPENDANT », « RETRAITÉ », « CABINET ») rapproche des personnes sans lien : la ligne du formulaire, qui annonce le nombre **avant** l'enregistrement, est la seule garde — c'est pourquoi elle est obligatoire. Enfin, le rapprochement de l'activité utilise `normalizedText` (tirets et espaces multiples réduits) et inclut les fiches archivées, alors que le compteur « N fiche(s) » des suggestions d'entreprise et le groupement de l'onglet Entreprises utilisent `norm` (index.html:1896, tirets conservés) et que Entreprises n'affiche que les fiches actives : les trois nombres peuvent différer, et « SAINT-GOBAIN » / « SAINT GOBAIN » font deux lignes dans Entreprises pour une seule entreprise ici. C'est voulu. **Ne modifier ni `norm`, ni le groupement de l'onglet Entreprises, ni le compteur des suggestions dans ce chantier.**
- **Effet assumé** : une fiche alignée par propagation porte désormais une activité différente de son `nafLibelle`. `KIT_PURE.patchActivite` (index.html:326) ne préremplit que les fiches à activité vide ou strictement égale au libellé officiel : les fiches alignées ne seront donc plus jamais repréremplies par SIRENE, même après un changement de code NAF. C'est le comportement voulu — l'activité partagée décidée par l'utilisateur prime sur le libellé INSEE.
- **N+1 enregistrements** par geste (une sérialisation du carnet par fiche écrite), motif déjà en production dans `chooseEffectif` : coût consigné, mesuré en recette, aucune refonte d'`updContact`.
- Convention « aujourd'hui » en UTC ; interaction modifiée après fusion non propagée (chantier B2).

## Propositions écartées par le panel (pour mémoire)

- Paramètre `differer` sur `updContact` pour n'écrire qu'une fois : rejeté (chemin d'écriture central de toutes les fiches, gain non mesuré, motif N+1 déjà en production).
- Ligne permanente dans la carte ACTIVITÉ de la fiche après coup : hors périmètre, le devoir d'avertir avant écriture est tenu par la ligne du formulaire.
- Rendre `identiques` une liste d'objets : inutile, une fiche `identiques` ne reçoit aucune écriture.
- Question obligatoire en cas de renommage : remplacée par la règle plus sûre « aucune propagation quand la dénomination a changé ».
- Prémisses fausses écartées après vérification : l'import Excel trime chaque cellule (index.html:3666) ; l'activité « `   ` » n'existe que dans un test pur ; aucun libellé NAF ne dépasse 200 caractères (152 au maximum) ; l'instantané quotidien et l'écriture du fichier suivi ne sont pas multipliés par N.
