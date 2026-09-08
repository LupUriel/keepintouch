---
title: "Recommandations vues du contact : apporteurs fondés sur les recommandations reçues d'eux, noms visibles et cliquables, Stats allégées"
date: 2026-09-08
type: feat
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: retours utilisateur du 2026-09-08 après recette de la v1.5.8 (chantier C1) — l'utilisateur n'enregistrera PAS de « dossier confié » (le passage en catégorie Client vaut dossier) ; il lit les recommandations « vues du contact » ; la fiche de la personne recommandée doit dire « recommandé(e) par X » ; il veut voir LESQUELLES (noms cliquables) ; le tableau « Origines des fiches » est inutile ; « Apporteurs » doit se fonder sur les recommandations que les contacts lui font. Cinq points proposés le 2026-09-08 et acceptés (« Ok pour le C1 bis »). Plan relu par un panel de deux lentilles (produit ; données/tests) : 29 constats intégrés. Libellés à la première personne adoptés (annoncés à l'utilisateur, sans objection).
---

# Recommandations vues du contact (v1.5.9 / kit-crm-v51)

Base : `main` = `2569f68` (v1.5.8, PR #17 fusionnée le 2026-09-07). Branche `feat/recos-contact`.

## Goal Capsule

La v1.5.8 a construit les recommandations « vues de vous » : le type se note sur la fiche de la personne recommandée. L'utilisateur les lit « vues du contact » : sur la fiche de Jean DUPONT, une recommandation signifie que Jean lui a recommandé quelqu'un. Conséquences constatées en recette : la fiche de la personne recommandée affiche « 1 recommandation donnée » (contresens), le bloc « Apporteurs » reste vide (il ne compte que les dossiers et les recommandations reçues au sens ancien), et les compteurs sans noms deviendront illisibles avec le temps. Ce chantier renverse la sémantique, nomme les boutons à la première personne pour supprimer toute ambiguïté (comme « Je l'ai contacté »), affiche les noms, refonde « Apporteurs », retire le bouton « Dossier confié » et le tableau « Origines des fiches ». Aucun réseau, aucune donnée nouvelle ; doctrine inchangée.

## Vocabulaire (définitif)

- **« M'a recommandé quelqu'un »** (`recommandation_donnee`, icône 🤝) : saisie sur la fiche X de l'**apporteur** — X vous a recommandé quelqu'un. Fiche liée (`lieId`/`lieLabel`, optionnelle) = la **personne recommandée**. Libellé du champ : « PERSONNE RECOMMANDÉE (par ce contact) ».
- **« Je lui ai recommandé quelqu'un »** (`recommandation_recue`, icône ➡️) : saisie sur la fiche X du contact **à qui vous avez recommandé quelqu'un**. Fiche liée = la personne que vous lui avez recommandée. Libellé du champ : « PERSONNE RECOMMANDÉE (par vous) ».
- Les valeurs `recommandation_donnee` / `recommandation_recue` sont conservées (compatibilité des données) ; seuls les libellés, icônes et sens changent. Les icônes sont **inversées** par rapport à la v1.5.8 (🤝 = l'apporteur).
- **Dossier confié** (`dossier`) : bouton retiré du modal ; le type reste compris partout (historique « via … », `estSuivi`, export, filtres, édition avec libellé de champ « APPORTEUR ») pour les entrées existantes ; il n'alimente plus les statistiques ni la fiche.
- **Échange** : toute interaction hors types de suivi (inchangé). `SUIVI_TYPES` inchangé.
- Les recommandations saisies en v1.5.8 (une ou deux) sont **à ressaisir** par l'utilisateur dans le nouveau sens (✕ puis nouvelle saisie sur la fiche de l'apporteur) ; aucune conversion automatique.
- **Nom courant** d'une fiche : `(((c.firstName || "") + " " + (c.lastName || "").toUpperCase()).trim()) || c.name || "(sans nom)"`.

## Requirements

### R1. Moteur pur (`KIT_PURE`, exporté, testé)

Conventions communes : dates comparées via `String(x.date || "")` ; tris par date décroissante **stables** (à date égale, ordre du tableau d'origine) ; toutes les fiches sont parcourues, **archivées comprises** ; `existe` = une fiche de `contacts` porte cet id (une fiche archivée existe) ; pour un élément lié : `label` = nom courant de la fiche `lieId` si `existe`, sinon `lieLabel` (chaîne éventuellement vide) ; `lieLabel` conservé tel quel dans l'objet.

- `apporteurs(contacts, todayISO)` **redéfini** : une ligne par fiche X portant ≥ 1 `recommandation_donnee` : `{ id, label, archivee, recommandations, derniereRecoISO, dernierEchangeISO, joursDepuisEchange, aRemercier, recommandes }`. `label` = nom courant de X ; `archivee = !!X.archived` ; `recommandations` = nombre de `recommandation_donnee` sur X ; `derniereRecoISO` = plus grande date non vide (ou `null` si toutes vides) ; `dernierEchangeISO` = date de `derniereInteractionHorsSuivi(X.interactions)` (`String(d.date || "") || null`) ; `joursDepuisEchange` = `null` si pas d'échange, sinon `Math.round((Date.UTC(aaaa, mm-1, jj de todayISO) - Date.UTC(… de dernierEchangeISO)) / 86400000)` ; `aRemercier = dernierEchangeISO === null || (derniereRecoISO !== null && dernierEchangeISO < derniereRecoISO)` (un échange le jour même vaut remerciement) ; `recommandes` = `[{ iid, date, lieId, lieLabel, existe, label }]`, une entrée par `recommandation_donnee` (même sans fiche liée : `lieId: ""`, `existe: false`), triées par date décroissante. Tri des lignes : `aRemercier` vrai d'abord, puis `recommandations` décroissant, puis `label` (`<`/`>`), puis `id`. Les anciens champs (`existe`, `dossiers`, `recommandationsRecues`, `dernierDossierISO`) disparaissent.
- `statsRecommandations(contacts, todayISO, jours)` : `{ recuesDApporteurs, donneesParVous, apporteursActifs }`. `duree = typeof jours === "number" && isFinite(jours) && jours > 0 ? jours : 365` ; `debutISO = addDaysISO(todayISO, -duree)` ; retenue si `typeof x.date === "string"`, `/^\d{4}-\d{2}-\d{2}$/.test(x.date)`, `debutISO <= x.date && x.date <= todayISO`. `recuesDApporteurs` = nb de `recommandation_donnee` retenues (toutes fiches) ; `donneesParVous` = nb de `recommandation_recue` retenues ; `apporteursActifs` = nb de fiches distinctes ayant ≥ 1 `recommandation_donnee` retenue.
- `liensFiche(contact, contacts)` : `{ recoDonnees, recommandePar, recoRecues, recommandeA }` :
  - `recoDonnees` = `[{ iid, date, lieId, lieLabel, existe, label }]` pour les `recommandation_donnee` **sur** `contact` (X vous a recommandé ces personnes), tri date décroissante ;
  - `recoRecues` = même forme pour les `recommandation_recue` **sur** `contact` (vous lui avez recommandé ces personnes) ;
  - `recommandePar` = `[{ id, label, archivee, date, n }]`, **une entrée par autre fiche Y** (dédoublonnée) portant ≥ 1 `recommandation_donnee` avec `lieId === contact.id` (Y a recommandé ce contact) ; `date` = la plus récente, `n` = leur nombre ; tri par `date` décroissante puis `label` puis `id` ;
  - `recommandeA` = même forme pour les autres fiches Y portant une `recommandation_recue` avec `lieId === contact.id` (vous avez recommandé ce contact à Y) ;
  - `contact` sans `id` chaîne non vide → `recommandePar` et `recommandeA` vides.
- **RC-U1 conserve** `statsDossiers`, `reciprocite`, `apporteurDepuisOrigine`, leur export et leurs cas (leurs appelants Babel existent encore) ; **RC-U2b les retire** (fonctions + export + cas). Aucun alias, aucune structure vide. `estSuivi`, `derniereInteractionHorsSuivi`, `pluriel`, `patchInteraction` inchangés.

### R2. Modal « Enregistrer un contact » / « Modifier l'interaction »

- `INTER_TYPES` : `{ value: "recommandation_donnee", label: "M'a recommandé quelqu'un", icon: "🤝" }`, `{ value: "recommandation_recue", label: "Je lui ai recommandé quelqu'un", icon: "➡️" }` ; l'entrée `dossier` (libellé, icône) est conservée pour l'historique.
- Rangée du modal : libellé « RECOMMANDATIONS » (remplace « SUIVI DU RÉSEAU ») ; boutons `INTER_TYPES.filter(function (t) { return KIT_PURE.estSuivi(t.value) && t.value !== "dossier"; })` — ordre : « M'a recommandé quelqu'un » puis « Je lui ai recommandé quelqu'un ». Première rangée inchangée (`!t.legacy && !KIT_PURE.estSuivi(t.value)`).
- Libellé du champ fiche liée : `logType === "dossier" ? "APPORTEUR" : logType === "recommandation_donnee" ? "PERSONNE RECOMMANDÉE (par ce contact)" : "PERSONNE RECOMMANDÉE (par vous)"`. Aide : « Laissez vide si cette personne n'a pas de fiche : la recommandation est comptée sans nom, rattachable plus tard avec ✏. » Erreur : « Choisissez une fiche dans la liste, ou videz le champ. »
- Pré-sélection depuis l'origine **supprimée** (bloc `if (t.value === "dossier" && !editIid && !logLieId) { … apporteurDepuisOrigine … }`). En édition d'un `dossier` existant, aucun bouton de la rangée n'est actif : accepté et consigné. Le reste (autocomplétion `suggestionsLie`, adoption d'une suggestion unique, `logLieInitial`, cases masquées, défilement) est inchangé.

### R3. Fiche contact (`renderDetail`)

- `var liens = KIT_PURE.liensFiche(c, contacts);` ; la ligne « Dossiers : » est remplacée par jusqu'à **quatre `<p>`** à la même place (après « Origine : », avant les notes), dans cet ordre, chacun rendu seulement si sa liste n'est pas vide, `style={{ margin: "12px 0 0", fontSize: 12.5, color: "#64748B" }}` :
  1. « Vous a recommandé : » + noms de `recoDonnees` (clé `iid`) ;
  2. « Recommandé(e) par : » + noms de `recommandePar` (clé `id`) ;
  3. « Vous lui avez recommandé : » + noms de `recoRecues` (clé `iid`) ;
  4. « Recommandé(e) à : » + noms de `recommandeA` (clé `id`).
- Rendu d'un nom : si la fiche existe → `<span onClick={ouvrir} style={{ color: "#235C68", textDecoration: "underline", cursor: "pointer", fontWeight: 600 }}>{label}</span>` (`ouvrir` = `setSelId(id); setView("contact");`) ; sinon `<span style={{ color: "#1B1B24", fontWeight: 600 }}>{label || "une personne sans fiche"}</span>` ; suffixes en `color: "#64748B", fontWeight: 400` : « (fiche supprimée) » si `lieId` non vide et `!existe`, « (archivée) » si la fiche existe et `archived`. Séparateur « · ». Au plus **5 noms** par ligne ; au-delà, « … et N autres » en bouton texte souligné (motif « Voir les autres copies ») qui déplie la ligne : état `var [liensDeplies, setLiensDeplies] = useState(null)`, déplié si `liensDeplies === c.id` (pas de remise à zéro nécessaire).
- Historique : sous le libellé d'une interaction de suivi, si `x.lieId || x.lieLabel` : `(x.type === "dossier" ? "via " : "→ ") + nom` où nom = nom courant si la fiche existe, sinon `x.lieLabel`, + « (fiche supprimée) » si `x.lieId` non vide et fiche absente. Pastille inchangée.

### R4. Stats

- Bloc **« Origines des fiches »** supprimé (IIFE, titre, sous-titre, tableau). Champ « ORIGINE DE LA FICHE », ligne « Origine : », colonne Excel « Origine » : conservés.
- En tête de `renderStats` : `var sr = KIT_PURE.statsRecommandations(contacts, todayStr(), 365); var lignesApporteurs = KIT_PURE.apporteurs(contacts, todayStr());`.
- Bloc **« Apporteurs »** (premier bloc, toujours rendu, `overflowX: "auto"`, grille et `minWidth: 560` inchangés) : par ligne `a.label + (a.archivee ? " (archivée)" : "")` cliquable ; `pluriel(a.recommandations, "recommandation", "recommandations")` ; `a.derniereRecoISO ? "dernière recommandation le " + fmtDate(a.derniereRecoISO) : ""` ; `a.dernierEchangeISO ? "dernier échange " + fmtAgo(a.dernierEchangeISO).toLowerCase() : "aucun échange enregistré"` ; pastille « à remercier » (`title = "aucun échange depuis la recommandation du " + fmtDate(a.derniereRecoISO)`). Sous chaque ligne, 12 px `#64748B` : `a.recommandes.map(function (r) { return r.label || "une personne sans fiche"; }).join(" · ")`. Vide : « Aucune recommandation enregistrée pour l'instant. Sur la fiche de la personne qui vous a recommandé quelqu'un : « Je l'ai contacté » → « M'a recommandé quelqu'un ». »
- Tuile (4ᵉ, même gabarit) **« Recommandations reçues (12 mois) »** remplace « Dossiers (12 mois) » : chiffre `String(sr.recuesDApporteurs)` ; légende `pluriel(sr.donneesParVous, "donnée par vous", "données par vous") + " · " + pluriel(sr.apporteursActifs, "apporteur actif", "apporteurs actifs")`.
- « Interactions / mois » inchangé.

### R5. Récapitulatif hebdomadaire

- Item : `a.label + " — " + pluriel(a.recommandations, "recommandation", "recommandations") + " · " + (a.dernierEchangeISO ? "dernier échange " + fmtAgo(a.dernierEchangeISO).toLowerCase() : "aucun échange enregistré")` ; filtre `a.aRemercier` ; titre, rang, plafond, `recapTotal` inchangés.

### R6. Versions et documentation

- `APP_VERSION = "1.5.9"`, `CACHE_NAME = "kit-crm-v51"`, regex du test « version applicative du document ».
- `LISEZMOI.txt` : la section « ## Dossiers et apporteurs » est **remplacée** par (≤ 95 colonnes, sans « archivez ») :

```
## Recommandations et apporteurs

Quand un contact vous recommande quelqu'un, notez-le sur la fiche DE CE CONTACT (pas sur celle
de la personne recommandée) : « Je l'ai contacté », rangée « Recommandations »,
« M'a recommandé quelqu'un », puis choisissez la personne recommandée parmi vos fiches
(laissez vide si elle n'en a pas ; vous pourrez la rattacher plus tard avec ✏ dans
l'historique). La fiche du contact affiche alors « Vous a recommandé : … » avec les noms ;
la fiche de la personne recommandée affiche « Recommandé(e) par : … ». Les noms soulignés
ouvrent la fiche.
Quand c'est VOUS qui recommandez quelqu'un à un contact, notez « Je lui ai recommandé
quelqu'un » sur la fiche de ce contact, en indiquant qui.

Ces deux types ne comptent pas comme une prise de contact : ils n'effacent pas une relance,
ne remettent pas le cycle de rencontres à zéro, ne servent pas d'accroche aux invitations et
ne changent pas la catégorie de la fiche (passer une fiche en Client reste votre geste, et
vaut dossier : le bouton « Dossier confié » a été retiré ; les dossiers déjà notés restent
visibles dans l'historique mais ne sont plus comptés).

Dans Stats, le bloc « Apporteurs » liste les contacts qui vous ont recommandé quelqu'un, avec
les noms ; la marque « à remercier » signale un apporteur avec qui vous n'avez eu aucun
échange depuis sa dernière recommandation — un appel, un mail ou un déjeuner enregistré sur
la fiche de l'apporteur la fait disparaître. Le récapitulatif du lundi les rappelle.
Le champ « Origine de la fiche » reste libre et ne sert qu'à dire par où la fiche est entrée.

Les recommandations saisies avant cette version étaient notées dans l'autre sens :
supprimez-les (✕ dans l'historique) et ressaisissez-les sur la fiche de l'apporteur.
Mettez à jour les deux appareils : un appareil resté en version précédente lirait les
nouvelles recommandations à l'envers.
La catégorie « Avocat / EC » (avocats et experts-comptables) est disponible dans vos catégories.
Une interaction modifiée après une synchronisation ne se propage pas encore à l'autre appareil.
```

- `docs/RECETTE.md` : le sous-titre « ## Dossiers et apporteurs (v1.5.8) » devient « ## Recommandations et apporteurs (v1.5.9) » ; ses cases sont remplacées par : AE1, AE2, AE3, AE4 ci-dessous, la case « Avocat / EC » **conservée**, et « [ ] Données réelles : supprimer puis ressaisir les recommandations de la v1.5.8 sur la fiche de l'apporteur ; la fiche de la personne recommandée affiche « Recommandé(e) par : … » ». Le bloc « Récupération au démarrage » reste intact.

### R7. Tests (bloc `KIT_TESTS`) — convention inchangée (ancres + littéraux concaténés)

- **RC-U1 (purs)** : réécrire « suivi : apporteurs agrégés et à remercier » et « suivi : apporteurs — tri, fiche supprimée, fiche archivée, recommandation seule » (mêmes noms) selon la nouvelle définition : ligne par fiche apporteur ; `recommandations`, `derniereRecoISO` ; `recommandes` triés, `existe`/`label` (nom courant si la fiche existe, `lieLabel` sinon, `""` sans fiche) ; `aRemercier` vrai sans échange, faux avec échange le jour même, vrai si dernier échange antérieur, faux si échange postérieur ; un `dossier` ou une `recommandation_recue` sur une fiche ne créent pas de ligne ; `recommandation_donnee` avec `lieId: ""` crée une ligne ; `lieId` orphelin → `existe: false` ; fiche archivée → `archivee: true` ; tri complet vérifié par `lignes.map(id).join(",")`. Réécrire la partie `apporteurs` de « suivi : correctifs apporteurs et réciprocité » (les assertions `reciprocite` y restent jusqu'à RC-U2b). Nouveaux cas : « suivi : statistiques des recommandations » (bornes incluses, veille exclue, futur exclu, défaut 365, `jours = 0` → 365, archivées comptées, `apporteursActifs` distincts) ; « suivi : liens d'une fiche » (jeu de 4 fiches : les quatre listes, dédoublonnage de `recommandePar` avec `n`, `existe` faux pour un `lieId` orphelin, fiche archivée incluse avec `archivee: true`, fiche sans id → listes « autres » vides, `label` = nom courant).
- **RC-U2a (câblage)** : mettre à jour — jamais supprimer sans remplacement équivalent — les cas existants : « câblage suivi : types dans INTER_TYPES » (inchangé), « câblage suivi : modal » (« SUIVI DU " + "RÉSEAU » → « RECOMMANDATIONS », « RECOMMANDÉ " + "À » → « PERSONNE RECOMMANDÉE (par " + "vous) », retirer « KIT_PURE.apporteur" + "DepuisOrigine( » de la liste des présences), « câblage suivi : modal et récapitulatif renforcés » (retirer l'assertion `t.value === "dossier" && !editIid && !logLieId` ; ajouter l'**absence** de `"KIT_PURE.apporteur" + "DepuisOrigine("` dans la tranche modal ; ajouter la présence de `'&& t.value !== "' + 'dossier"'`), « câblage suivi : fiche — ligne Dossiers et historique via » (→ « KIT_PURE." + "liensFiche(c, contacts) », les quatre libellés, `'"via "'`, `'"→ "'`, « (fiche " + "supprimée) »), « câblage suivi : détails renforcés » (assertions `rec.*` remplacées par l'ordre « Vous a " + "recommandé : » < « Recommandé(e) " + "par : » < « Vous lui avez " + "recommandé : » < « Recommandé(e) " + "à : » dans `renderDetail` ; assertions `sd.*`/`statsDossiers` remplacées par « String(sr." + "recuesDApporteurs) » < « sr.donneesParVous, "donnée par vous" » < « sr.apporteursActifs, "apporteur actif" » dans `renderStats`), « câblage suivi : Stats — dossiers et apporteurs » (→ « KIT_PURE.stats" + "Recommandations( », « Recommandations reçues (12 " + "mois) », « Aucune recommandation " + "enregistrée », « dernière recommandation " + "le », **absence** de « Origines des " + "fiches » et de « stats" + "Dossiers( » dans la tranche `renderStats` bornée par `renderNav`), « câblage suivi : Stats — apporteurs sans débordement » (borne `overflow < indexOf("Interactions / " + "mois")`). Nouveaux : ordre des deux boutons de la rangée (« M'a recommandé " + "quelqu'un » avant « Je lui ai recommandé " + "quelqu'un » dans la tranche `INTER_TYPES` — et icônes 🤝/➡️ dans cet ordre) ; item du récap contient « recommandation", "recommandations » et « aucun échange " + "enregistré ».
- **RC-U2b** : test « version applicative du document » (1.5.9 / kit-crm-v51) ; « câblage suivi : documentation » réécrit (« ## Recommandations et " + "apporteurs », « Recommandé(e) " + "par », « Recommandations et apporteurs (v1.5." + "9) », « M'a recommandé " + "quelqu'un ») ; retrait des cas `statsDossiers` (« suivi : statistiques des dossiers sur 12 mois »), `reciprocite` (« suivi : réciprocité par fiche » + assertions dans « correctifs »), `apporteurDepuisOrigine` (« suivi : apporteur depuis l'origine » et « … — libellé court ») ; nouveau test « KIT_PURE : fonctions retirées » : tranche `"var KIT_PURE"` → `"var KIT_TESTS"` ne contient ni « stats" + "Dossiers », ni « recipro" + "cite », ni « apporteurDepuis" + "Origine ». Le test documentaire existant (absence de « archivez ») reste vert.

## Acceptance Examples

- AE1. Fiche de Jean DUPONT (apporteur) : « Je l'ai contacté » → « M'a recommandé quelqu'un » → PERSONNE RECOMMANDÉE (par ce contact) « Claire CLIENT » → confirmer. Fiche Jean : « Vous a recommandé : Claire CLIENT » (souligné, clic → fiche Claire) ; fiche Claire : « Recommandé(e) par : Jean DUPONT » ; historique Jean : « 🤝 M'a recommandé quelqu'un · <date> » puis « → Claire CLIENT » ; Stats › Apporteurs : « Jean DUPONT — 1 recommandation — dernière recommandation le <date> — aucun échange enregistré (ou dernier échange …) — à remercier », sous-ligne « Claire CLIENT » ; récap : « Jean DUPONT — 1 recommandation · … ». Un « Appel avec échange » sur la fiche de Jean à une date ≥ celle de la recommandation lève la marque et retire la ligne du récap. Relance planifiée et état d'attente de Jean inchangés.
- AE2. Fiche de Marie MARTIN : « Je lui ai recommandé quelqu'un » → PERSONNE RECOMMANDÉE (par vous) « Paul BERNARD ». Fiche Marie : « Vous lui avez recommandé : Paul BERNARD » ; fiche Paul : « Recommandé(e) à : Marie MARTIN » ; tuile « Recommandations reçues (12 mois) » = 1 (AE1), légende « 1 donnée par vous · 1 apporteur actif » ; Marie n'est pas dans « Apporteurs ».
- AE3. Le modal ne propose plus « Dossier confié » ; une interaction `dossier` existante reste « Dossier confié · via … » et son édition affiche le champ « APPORTEUR » ; Stats ne montre plus « Origines des fiches » ; « À propos » affiche v1.5.9 · kit-crm-v51.
- AE4. « M'a recommandé quelqu'un » sans fiche liée : fiche de l'apporteur « Vous a recommandé : une personne sans fiche » ; ligne Apporteurs présente avec sous-ligne « une personne sans fiche » ; ✏ sur l'interaction permet de rattacher une fiche ensuite.
- AE5. Export Excel, fusion, accroche, états d'attente : inchangés par rapport à la v1.5.8.
- AE6. Six recommandations données par un même apporteur : la fiche affiche cinq noms puis « … et 1 autre » ; le clic déplie.

## Implementation Units

### RC-U1. Moteur pur et tests (Codex)
- **Files :** `index.html` — blocs `KIT_PURE` (fonctions, export) et `KIT_TESTS` (cas purs).
- **Approach :** ajouter `statsRecommandations`, `liensFiche` ; redéfinir `apporteurs` ; réécrire/ajouter les cas purs de R7 ; **conserver** `statsDossiers`, `reciprocite`, `apporteurDepuisOrigine` et leurs cas. Aucune modification du bloc Babel.
- **Verification :** `node scripts/run-gates.js` → 0 échec. Entre U1 et U2a l'application reste exécutable (le bloc Apporteurs lit des champs devenus absents : `fmtDate(undefined)`/`fmtAgo(null)` rendent « Jamais », sans exception).

### RC-U2a. Câblage : types, modal, fiche, Stats, récap + tests de câblage (Codex)
- **Files :** `index.html` — bloc Babel + tests de câblage.
- **Approach :** R2, R3, R4, R5 + mises à jour et ajouts de câblage de R7.
- **Verification :** `node scripts/run-gates.js` → 0 échec.

### RC-U2b. Retrait des fonctions obsolètes, versions, documentation (Codex)
- **Files :** `index.html` (`KIT_PURE`, `KIT_TESTS`, `APP_VERSION`), `sw.js`, `LISEZMOI.txt`, `docs/RECETTE.md`.
- **Approach :** retrait de `statsDossiers`, `reciprocite`, `apporteurDepuisOrigine` (fonctions, export, cas) ; R6 ; tests de R7 (RC-U2b).
- **Verification :** `node scripts/run-gates.js` → 0 échec (smoke et recette AE1-AE6 par l'orchestrateur).

## Definition of Done

Trois commits Codex (+ correctifs de revue par Codex si nécessaire), `run-gates --with-smoke` vert, revue croisée trois voies (accent : sens des quatre listes et des deux boutons, entrées `dossier` existantes, tests de câblage mis à jour sans affaiblissement), PR vers `main`, recette utilisateur, fusion = v1.5.9.

## Consigné

- Convention « aujourd'hui » en UTC (inchangée). Interaction modifiée après fusion non propagée (B2). Export Excel sans colonnes recommandations. Les entrées `dossier` existantes restent visibles mais ne comptent nulle part ; leur édition n'a pas de bouton de type actif.
