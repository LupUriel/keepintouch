---
title: "Dossiers et apporteurs : journaliser les dossiers confiés et les recommandations, savoir qui apporte et qui remercier"
date: 2026-09-07
type: feat
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: note d'arbitrage du 2026-09-02 (chantier C1, arbitre « maintenant » en périmètre réduit) ; décisions utilisateur du 2026-09-07 — le dossier se journalise sur la fiche du CLIENT FINAL avec un lien vers l'apporteur ; un type « recommandation donnée » s'ajoute à « recommandation reçue » pour lire la réciprocité ; AUCUNE automatisation du passage Prospect → Client (la catégorie reste un geste manuel) ; pas de montant d'honoraires (secret professionnel, exports en clair). Plan relu par un panel adversarial de trois lentilles (données/fusion, produit, faisabilité/tests) : 45 constats, arbitrés et intégrés ci-dessous.
---

# Dossiers et apporteurs (v1.5.8 / kit-crm-v50)

Base : branche `feat/dossiers-apporteurs` posée sur la PR #16 (v1.5.7 / kit-crm-v49, `77eb435`).

## Goal Capsule

L'utilisateur est associé en droit du travail : son réseau sert à générer des dossiers. Vérifié sur pièces : une interaction ne porte que `{ iid, date, comment, type, awaitingResponse, retryPending }` (+ métadonnées d'invitation) ; les 15 types proposés ne comprennent ni « dossier » ni « recommandation » ; le seul indicateur commercial est le tableau Stats « Origines / apporteurs », qui compte des **fiches** par texte libre `origin`, jamais des dossiers. Il est donc impossible de répondre à « qui m'apporte des dossiers ? », « quel apporteur dois-je remercier ? » — l'information dort dans les commentaires libres.

Conséquences à ne pas introduire : un « dossier » n'est **pas** une prise de contact — il ne doit ni effacer une relance planifiée (`logInteraction` efface `followUpDate`/`awaitingUntil`), ni réinitialiser le cycle de rencontres (`lastRencontre` ne lit que `RENCONTRE_TYPES`), ni perturber les états « en attente » / « nouvel échange » (`latestInteraction` prend la dernière interaction **tous types**), ni servir d'accroche aux invitations (`accrocheFor`). Doctrine inchangée : tout local, aucun réseau ; aucune donnée sensible nouvelle (pas de montant).

## Vocabulaire

- **Type de suivi** : l'un des trois types `dossier`, `recommandation_recue`, `recommandation_donnee`. Tout le reste est un **échange** (les rencontres conviviales de `RENCONTRE_TYPES` en font partie).
- **Fiche liée** (`lieId`, `lieLabel`) : pour `dossier` et `recommandation_recue`, l'**apporteur** (qui vous a envoyé le client / la personne) ; pour `recommandation_donnee` saisie sur la fiche Y, le **destinataire** Z (la personne à qui vous avez recommandé Y). Libellé du champ : « APPORTEUR » / « RECOMMANDÉ À ».
- `lieLabel` = `displayName(fiche)` au moment de la saisie (reste lisible si la fiche disparaît).

## Requirements

### R1. Types

- `INTER_TYPES` (bloc Babel) reçoit, juste avant `{ value: "autre", … }` : `{ value: "dossier", label: "Dossier confié", icon: "📁" }`, `{ value: "recommandation_recue", label: "Recommandation reçue", icon: "🤝" }`, `{ value: "recommandation_donnee", label: "Recommandation donnée", icon: "➡️" }`. **Sans** propriété `suivi` : la seule source est `KIT_PURE.SUIVI_TYPES = ["dossier", "recommandation_recue", "recommandation_donnee"]` (exportée) et le bloc Babel n'emploie **que** `KIT_PURE.estSuivi(type)` (jamais `SUIVI_TYPES` directement). Ces types ne sont pas dans `RENCONTRE_TYPES`.

### R2. Un type de suivi n'est pas une prise de contact

- (a) `logInteraction` : `var suivi = KIT_PURE.estSuivi(type);` juste après la construction de `patch` ; `if (!suivi && c.followUpDate) { patch.followUpDate = ""; patch.followUpNote = ""; }` ; `if (!suivi && c.awaitingUntil && !(meta && meta.invitation)) patch.awaitingUntil = "";` (le traitement de `snoozedUntil` est déjà limité à `RENCONTRE_TYPES` : inchangé).
- (b) `latestInteraction(c)` devient `return KIT_PURE.derniereInteractionHorsSuivi(c.interactions);` — les états « en attente » et « nouvel échange » (`isAwaiting`, `daysAwaiting`, `isRetry`, `daysRetry`, et tout ce qui en découle : `awaitingActive`, statuts, notifications, listes, cartes, `invitationAwaiting`) sont calculés sur le dernier **échange**.
- (c) `lastRencontre` inchangé.
- (d) Export Excel « Dernier contact » : à la ligne `else { if (!lastContactInt || x.date > lastContactInt.date) lastContactInt = x; }`, remplacer `else {` par `else if (!KIT_PURE.estSuivi(x.type)) {`. En-têtes, `EXPORT_DATE_COLS`, « Nb interactions » (compte tout) inchangés.
- (e) Modal : `var suiviModal = KIT_PURE.estSuivi(logType);` en tête de `renderLogModal` ; les deux `<label>` « En attente d'un retour » et « Tentative de nouvel échange » sont rendus dans `{suiviModal ? null : (<React.Fragment>…</React.Fragment>)}` ; le clic sur un type fait `if (KIT_PURE.estSuivi(t.value)) { setLogAwait(false); setLogRetry(false); }` ; à la confirmation (création et édition) : `var awaiting = suiviModal ? false : !!logAwait; var retry = suiviModal ? false : !!logRetry;`.
- (f) Accroche d'invitation : au point d'appel `KIT_PURE.accrocheFor(c.interactions || [], RENCONTRE_TYPES)`, passer `(c.interactions || []).filter(function (x) { return !KIT_PURE.estSuivi(x.type); })`.
- (g) Graphique Stats « Interactions / mois » : ne compte pas les types de suivi (`if (x.date && x.date.indexOf(mKey) === 0 && !KIT_PURE.estSuivi(x.type)) mCount++;`).
- (h) Recherche plein texte : la branche qui teste `x.comment` des interactions teste aussi `x.lieLabel` (`(x.lieLabel && norm(x.lieLabel).indexOf(q) >= 0)`).

### R3. Modal « Enregistrer un contact » / « Modifier l'interaction » (même modal, `editIid`)

- Conteneur : ajouter `maxHeight: "84vh", overflowY: "auto"` (comme le modal d'invitation) : sur 360 × 740 px, type « Dossier confié » choisi, le bouton de confirmation reste atteignable en faisant défiler.
- Types : première rangée `INTER_TYPES.filter(function (t) { return !t.legacy && !KIT_PURE.estSuivi(t.value); })` sous « TYPE D'INTERACTION » ; seconde rangée `INTER_TYPES.filter(function (t) { return KIT_PURE.estSuivi(t.value); })` sous un libellé « SUIVI DU RÉSEAU » (même style de libellé), même rendu de bouton, même état `logType`.
- Ordre des champs : types → (si `suiviModal`) champ fiche liée → DATE → COMMENTAIRE → cases (masquées si `suiviModal`).
- Champ fiche liée : libellé « APPORTEUR » (dossier, recommandation reçue) ou « RECOMMANDÉ À » (recommandation donnée). Autocomplétion reprenant le motif du champ « Entreprise » du formulaire (`compSugg` : `<input>` + liste `position: absolute`, `maxHeight: 210`, `overflowY: "auto"`, choix au `onMouseDown`) : état `logLieQuery` ; suggestions = `activeContacts` hors fiche courante dont `norm(displayName(x) + " " + (x.company || ""))` contient `norm(logLieQuery)`, triées par `sortName`, 8 au plus, affichées « Prénom NOM — Entreprise » ; le choix fixe `logLieId = x.id`, `logLieLabel = displayName(x)`, vide `logLieQuery`. Quand `logLieId` est renseigné, le champ affiche une pastille « Prénom NOM  ✕ » (✕ remet `logLieId`/`logLieLabel` à `""`). Aide sous le champ : « Laissez vide si la personne n'est pas dans votre réseau. »
- États `logLieId`, `logLieLabel`, `logLieQuery` (chaînes, `""` par défaut) : `openLogModal` et `closeLogModal` les remettent à `""` ; `openEditInteraction` charge `entry.lieId || ""` et `entry.lieLabel || ""`. Choisir un type hors suivi remet les trois à `""`.
- Pré-sélection (création seulement, jamais en édition) : au clic sur « Dossier confié » quand `logLieId` est vide, `var pre = KIT_PURE.apporteurDepuisOrigine(c.origin, candidats)` où `candidats = activeContacts.filter(x => x.id !== c.id).map(x => ({ id: x.id, label: displayName(x), libelles: [displayName(x), contactLabel(x), x.name, x.lastName] }))` ; si `pre` → `setLogLieId(pre.id); setLogLieLabel(pre.label)`. Reste modifiable.
- Confirmation : `var lie = suiviModal && logLieId ? { lieId: logLieId, lieLabel: logLieLabel } : { lieId: "", lieLabel: "" };` — création : `logInteraction(logId, logCmt, logDate, logType, awaiting, retry, suiviModal && logLieId ? lie : undefined)` (7ᵉ argument `meta`, aucune nouvelle position) ; édition : `updateInteraction(logId, editIid, Object.assign({ comment, date, type, awaitingResponse: awaiting, retryPending: retry }, lie))` — un passage vers un type hors suivi efface le lien ; une édition qui ne touche que le commentaire conserve le lien (hydraté à l'ouverture).
- `KIT_PURE.patchInteraction` : liste blanche `["comment", "date", "type", "awaitingResponse", "retryPending", "lieId", "lieLabel"]`.
- Aucun champ montant.

### R4. Moteur pur (`KIT_PURE`, exporté, testé) — signatures définitives

- `SUIVI_TYPES` (tableau) ; `estSuivi(type)` → `SUIVI_TYPES.indexOf(type) >= 0` (`false` pour `undefined`).
- `derniereInteractionHorsSuivi(interactions)` → `null` si absent/vide/sans candidate ; parcours dans l'ordre du tableau, remplacement seulement si `String(x.date || "") > String(best.date || "")` (à date égale, la première rencontrée gagne, comme aujourd'hui) ; une entrée sans `type` est un échange.
- `apporteurDepuisOrigine(origin, candidats)` → l'objet candidat `{ id, label }` si `norm(origin)` (longueur ≥ 3) égale `norm(l)` pour l'un de ses `libelles` (chaînes non vides ; un libellé de moins de 3 caractères est ignoré) et qu'**exactement un** candidat correspond ; `null` sinon. Normalisation : `normalizedText` (déjà dans `KIT_PURE` : minuscules, accents retirés, tirets → espaces, espaces réduits) — pas `norm`, qui vit dans le bloc Babel.
- `statsDossiers(contacts, todayISO, jours)` → `{ dossiers, recommandationsRecues, recommandationsDonnees, contactsAvecDossier }` (entiers). `jours` = 365 si absent/non fini/≤ 0 ; `debutISO = addDaysISO(todayISO, -jours)` ; retenue si `x.date` a la forme `AAAA-MM-JJ` et `debutISO <= x.date && x.date <= todayISO` (bornes incluses, comparaison de chaînes ; dates futures exclues). **Toutes** les fiches, archivées comprises (un dossier reste un dossier). `contactsAvecDossier` = nombre de fiches ayant ≥ 1 `dossier` dans la fenêtre.
- `apporteurs(contacts, todayISO)` → lignes `{ id, label, existe, archivee, dossiers, recommandationsRecues, dernierDossierISO, dernierEchangeISO, joursDepuisEchange, aRemercier }`, une par valeur distincte de `lieId` non vide portée par un `dossier` ou une `recommandation_recue` (toutes fiches, archivées comprises, tout l'historique, sans fenêtre). `existe` = une fiche de `contacts` porte cet id ; `archivee` = cette fiche existe et `archived` vrai ; `label` = nom courant de la fiche si elle existe (`((c.firstName || "") + " " + (c.lastName || "").toUpperCase()).trim() || c.name || ""`), sinon le `lieLabel` de l'interaction la plus récente qui la référence, sinon `""` ; `dernierDossierISO` = max des dates des `dossier` (ou `null` si 0 dossier) ; `dernierEchangeISO` = max des dates des interactions **hors suivi** de la fiche apporteur (`null` si aucune ou fiche absente) ; `joursDepuisEchange` = `null` si pas d'échange, sinon jours entiers entre `dernierEchangeISO` et `todayISO` (`Date.UTC`, arrondi) ; `aRemercier = dossiers > 0 && (dernierEchangeISO === null || dernierEchangeISO < dernierDossierISO)` (un échange le jour même du dossier — le déjeuner où il a été confié — vaut remerciement ; un appel ou un mail le lendemain aussi). Tri : `aRemercier` vrai d'abord, puis `dossiers` décroissant, puis `label` par `<`/`>`, puis `id`.
- `reciprocite(contact, contacts)` → `{ dossiersRecus, dossiersApportes, recoRecuesDeLui, recoDonneesParMoi }` : `dossiersRecus` = nb de `dossier` sur `contact` ; `dossiersApportes` = nb de `dossier` sur les **autres** fiches avec `lieId === contact.id` ; `recoRecuesDeLui` = nb de `recommandation_recue` sur les autres fiches avec `lieId === contact.id` ; `recoDonneesParMoi` = nb de `recommandation_donnee` sur `contact` + nb de `recommandation_donnee` sur les autres fiches avec `lieId === contact.id` (les deux sont des services rendus impliquant cette personne). Toutes fiches, archivées comprises.
- `pluriel(n, singulier, plurielForme)` → `String(n) + " " + (n > 1 ? plurielForme : singulier)` (pas de « (s) » dans la fonctionnalité).

### R5. Fiche contact

- Sous la ligne « Origine : » de `renderDetail`, une ligne du même style, rendue seulement si un compteur > 0 : « Dossiers : » suivi des segments non nuls séparés par « · » — `pluriel(dossiersRecus, "confié", "confiés")`, `pluriel(dossiersApportes, "apporté", "apportés")`, `pluriel(recoDonneesParMoi, "recommandation donnée", "recommandations données")`, `pluriel(recoRecuesDeLui, "recommandation reçue", "recommandations reçues")`. Pas de badge dans l'en-tête (déjà saturé).
- Historique : pour une interaction de suivi, pastille fond `#EFE9EE`, bordure `#D7CAD4` ; sous le libellé, si `x.lieId` ou `x.lieLabel` : `(x.type === "recommandation_donnee" ? "→ " : "via ") + (x.lieLabel || "") + (contacts.some(k => k.id === x.lieId) ? "" : " (fiche supprimée)")` ; rien si les deux sont vides.

### R6. Stats

- En tête de `renderStats` : `var sd = KIT_PURE.statsDossiers(contacts, todayStr(), 365); var lignesApporteurs = KIT_PURE.apporteurs(contacts, todayStr());`.
- (a) Une tuile « Dossiers (12 mois) » ajoutée aux tuiles existantes : chiffre = `sd.dossiers` ; légende 12 px = `pluriel(sd.recommandationsRecues, "recommandation reçue", "recommandations reçues") + " · " + pluriel(sd.recommandationsDonnees, "donnée", "données")`.
- (b) Bloc **« Apporteurs »**, premier bloc sous le titre « Statistiques », dans **son propre** IIFE, toujours rendu : tableau avec par ligne `label` (+ « (archivée) » si `archivee`, + « (fiche supprimée) » si `!existe`), cliquable vers la fiche seulement si `existe` ; `pluriel(dossiers, "dossier", "dossiers")` (ou, si 0 dossier, `pluriel(recommandationsRecues, "recommandation reçue", "recommandations reçues")`) ; « dernier dossier <date fr> » ; « dernier échange » + `fmtAgo(dernierEchangeISO).toLowerCase()` (rend « jamais ») ; marque ambrée « à remercier » quand `aRemercier`, avec info-bulle « aucun échange depuis le dossier du <date> ». Si aucune ligne : « Aucun dossier journalisé pour l'instant. Sur la fiche du client (créez-la d'abord si besoin), « Je l'ai contacté » → « Dossier confié » → indiquez l'apporteur. »
- (c) Le tableau existant devient « Origines des fiches » avec un sous-titre 12 px « Par où la fiche est entrée dans votre réseau — les dossiers se lisent dans « Apporteurs ». » ; le libellé du formulaire « ORIGINE / APPORTEUR » devient « ORIGINE DE LA FICHE » (placeholder inchangé) ; colonne Excel « Origine » et ligne « Origine : » inchangées.
- Le test de câblage Stats existant lit 12 000 caractères après `function renderStats(` : élargir la fenêtre dans le même commit si les ancres « Par catégorie » / « Par priorité » sortent de la tranche.

### R7. Récapitulatif hebdomadaire

- `var aRemercier = KIT_PURE.apporteurs(contacts, todayStr()).filter(function (a) { return a.aRemercier; });` ; `recapTotal += aRemercier.length` (choix assumé : tant qu'un apporteur est à remercier, le récap s'ouvre le lundi) ; section `{ titre: "Apporteurs à remercier", items: aRemercier.map(a => a.label + " — " + KIT_PURE.pluriel(a.dossiers, "dossier", "dossiers") + " · dernier échange " + fmtAgo(a.dernierEchangeISO).toLowerCase()) }` insérée **après** « Rencontres à programmer » et avant « Vœux à prévoir », plafonnée à 5 comme les autres.

### R8. Compatibilité et limites consignées

- Fusion `mergeData` inchangée : une interaction **créée** avec son lien traverse l'union par `iid` (l'objet entier est poussé) et sa suppression se propage par tombe. **Limite préexistante** : une interaction **modifiée** après une fusion (commentaire, type ou lien) ne se propage pas à l'autre appareil (pas d'horodatage par interaction ; la version locale gagne) — à traiter dans le chantier B2 ; indiqué dans le LISEZMOI.
- Compatibilité descendante : un appareil resté en v1.5.7 qui reçoit un « dossier » par fusion l'affiche « Interaction » et peut voir disparaître un état « en attente » ; aucune perte de données. LISEZMOI : « Mettez à jour les deux appareils avant la première synchronisation contenant des dossiers. »
- Excel : l'export/import Excel ne transporte pas les dossiers (l'import ne recrée que « Dernière rencontre » et « Dernier contact ») ; seuls le fichier JSON / la fusion les portent.
- Les dossiers antérieurs au chantier n'existent pas : les statistiques partent de zéro ; ressaisie manuelle possible avec date rétroactive.

### R9. Versions

Trois modifications, en DA-U2b seulement : `APP_VERSION = "1.5.8"` (index.html), `CACHE_NAME = "kit-crm-v50"` (sw.js), test « version applicative du document » → `/var APP_VERSION = ["']1\.5\.8["']/` et `/var CACHE_NAME = ["']kit-crm-v50["']/`. Aucune autre occurrence (LISEZMOI, RECETTE, manifest, footer dérivé).

### R10. Tests (bloc `KIT_TESTS`, exécutés par `node scripts/run-gates.js`)

- **Purs (DA-U1)** : `estSuivi` (3 vrais, `"dejeuner"`/`undefined` faux) ; `derniereInteractionHorsSuivi` (ignore un dossier plus récent ; `null` si vide ou que des dossiers ; égalité de date → première) ; `apporteurDepuisOrigine` (« Me Dupont » vs « Jean DUPONT » → null ; « DUPONT » avec une seule fiche Dupont → id ; deux Dupont → null ; origine vide → null) ; `statsDossiers` (borne basse incluse, veille exclue, date future exclue, défaut 365, fiche archivée comptée, compte des trois types, `contactsAvecDossier`) ; `apporteurs` (agrégation par `lieId` sur deux fiches clientes ; `aRemercier` vrai sans échange, faux avec déjeuner le jour même, faux avec appel le lendemain, vrai si le dernier échange précède le dernier dossier ; tri ; fiche supprimée → `existe: false`, label = `lieLabel` ; fiche archivée → `archivee: true`, label = nom courant ; reco reçue sans dossier → `aRemercier: false`) ; `reciprocite` (les quatre compteurs sur un jeu de 3 fiches) ; `pluriel` ; `patchInteraction` applique `lieId`/`lieLabel` et les conserve quand le patch ne les contient pas.
- **Câblage (DA-U2a/U2b)**, convention : découpe par ancres + `indexOf` ordonné + littéraux concaténés, jamais `indexOf` du document entier d'un littéral présent dans le test :
  - `INTER_TYPES` : tranche `"var INTER_" + "TYPES = ["` → `"var RENCONTRE_" + "TYPES"` ; chaque valeur de `KIT_PURE.SUIVI_TYPES` présente comme `'value: "' + v + '"'` et avant `'value: "autre"'` ; la tranche ne contient pas `"suivi:"`.
  - `logInteraction` : tranche `"function log" + "Interaction("` → `"function update" + "Interaction("` ; `indexOf("var suivi = KIT_PURE.estSuivi(type)")` < `indexOf("if (!suivi && c.followUpDate)")` < `indexOf("if (!suivi && c.awaitingUntil")`.
  - `latestInteraction` : tranche `"function latest" + "Interaction("` → `"function is" + "Awaiting("` contient `"KIT_PURE.derniereInteractionHorsSuivi("`.
  - Modal : tranche `"function render" + "LogModal("` → `"function render" + "VoeuxModal("` ; `indexOf("var suiviModal = KIT_PURE.estSuivi(logType)")` < `indexOf("En attente d'un retour")` ; contient `"suiviModal ? false : !!logAwait"`, `"suiviModal ? false : !!logRetry"`, `"SUIVI DU RÉSEAU"`, `'maxHeight: "84vh"'`, `"KIT_PURE.apporteurDepuisOrigine("`.
  - Export : tranche `"function export" + "Excel("` → 1 200 caractères après `"var rows ="` contient `"else if (!KIT_PURE.estSuivi(x.type))"`.
  - Accroche : la ligne d'appel contient `"KIT_PURE.accrocheFor((c.interactions || []).filter("` (ou motif équivalent fixé par Codex et cité dans le test).
  - Stats : tranche `"function render" + "Stats("` contient `"KIT_PURE.statsDossiers("`, `"KIT_PURE.apporteurs("`, `"Dossiers (12 mois)"`, `"Origines des fiches"`, et `"Apporteurs"` avant `"Origines des fiches"`.
  - Récap : tranche `"KIT_PURE.recap" + "Sections(["` → `"], 5);"` contient `"Apporteurs à " + "remercier"` après `"Rencontres à " + "programmer"`.
  - Docs : `KIT_SOURCE_DOCS` contient « Dossiers et apporteurs » et « Dossier confié » ; le test documentaire existant (absence de « archivez », présence des textes du filet de données) reste vert.

### R11. Documentation

- `LISEZMOI.txt`, section « ## Dossiers et apporteurs » après « ## Vos données » (sans le mot « archivez ») :

```
## Dossiers et apporteurs

Un dossier se note sur la fiche du CLIENT, pas sur celle de la personne qui vous l'a envoyé :
ouvrez la fiche du client, « Je l'ai contacté », choisissez « Dossier confié » (rangée « Suivi
du réseau »), puis indiquez l'apporteur dans le champ APPORTEUR (une fiche de votre réseau ;
laissez vide s'il n'y est pas).
« Recommandation reçue » se note de la même façon, sur la fiche de la personne recommandée
(créez-la d'abord si elle n'existe pas). « Recommandation donnée » se note sur la fiche de la
personne que vous avez recommandée, en indiquant à qui (champ RECOMMANDÉ À).
Ces trois types ne comptent pas comme une prise de contact : ils n'effacent pas une relance,
ne remettent pas le cycle de rencontres à zéro, ne servent pas d'accroche aux invitations et
ne changent pas la catégorie de la fiche (passer une fiche de Prospect à Client reste votre
geste, par « Modifier »).
Dans Stats, le bloc « Apporteurs » montre qui vous apporte des dossiers ; la marque
« à remercier » signale un apporteur avec qui vous n'avez eu aucun échange depuis son dernier
dossier — un appel, un mail ou un déjeuner enregistré sur SA fiche la fait disparaître.
Le champ « Origine de la fiche » reste libre et ne sert qu'à dire par où la fiche est entrée.
Mettez à jour les deux appareils avant la première synchronisation contenant des dossiers.
Une interaction modifiée après une synchronisation (commentaire, type, apporteur) ne se
propage pas encore à l'autre appareil : ressaisissez-la ou attendez la prochaine version.
```

- `docs/RECETTE.md` : sous-titre « ## Dossiers et apporteurs (v1.5.8) » avec deux cases (AE1 ; AE2), **sans supprimer** le bloc « Récupération au démarrage ».

## Acceptance Examples

- AE1. Fiche « Client X » (avec une relance planifiée et un état « en attente » issu d'un e-mail) : « Je l'ai contacté » → « Dossier confié » → APPORTEUR « Me DUPONT » (fiche existante) → confirmer. Historique de X : « 📁 Dossier confié · via Jean DUPONT » ; la relance planifiée est conservée ; l'état « en attente » est inchangé ; « Dernière rencontre » inchangée.
- AE2. Stats : tuile « Dossiers (12 mois) » = 1 ; bloc « Apporteurs » : « Jean DUPONT — 1 dossier — dernier dossier <date> — dernier échange <jamais / il y a N j> » marqué « à remercier » ; après un « Appel avec échange » (ou un « Déjeuner ✓ ») enregistré **sur la fiche de Jean DUPONT** à une date ≥ celle du dossier, la marque disparaît.
- AE3. Fiche de Jean DUPONT : ligne « Dossiers : 1 apporté » ; fiche X : « Dossiers : 1 confié ».
- AE4. « Recommandation donnée » sur la fiche Y, RECOMMANDÉ À « Z » : historique Y « ➡️ Recommandation donnée → Z » ; fiche Y « Dossiers : 1 recommandation donnée » ; fiche Z « Dossiers : 1 recommandation donnée » ; tuile « Dossiers (12 mois) » légende « 0 recommandation reçue · 1 donnée ».
- AE5. Récap hebdo : section « Apporteurs à remercier » liste Jean DUPONT tant qu'aucun échange n'a suivi le dossier ; elle disparaît après l'échange d'AE2.
- AE6. Export Excel : la colonne « Dernier contact » d'une fiche dont la dernière interaction est un dossier affiche le dernier **échange** réel (et « Type de contact » le type de cet échange).
- AE7. Fusion PC ↔ Android : un dossier **créé avec son apporteur** sur le PC apparaît sur Android avec « via … » après « Importer / fusionner » ; supprimé sur le PC, il disparaît sur Android à la fusion suivante.
- AE8. Modifier une interaction « Dossier confié » (changer le commentaire seulement) : l'apporteur est conservé ; changer son type en « E-mail » : le lien disparaît, les cases attente/relance réapparaissent.
- AE9. Fenêtre 360 × 740 px, type « Dossier confié » : le modal défile et le bouton de confirmation est atteignable.

## Implementation Units

### DA-U1. Moteur pur et tests (Codex)

- **Files :** `index.html` — blocs `KIT_PURE` (fonctions + export) et `KIT_TESTS` (cas purs).
- **Approach :** R4 en entier + `patchInteraction` étendu (R3 dernier point) + tests purs de R10. Aucune modification du bloc Babel.
- **Verification :** `node scripts/run-gates.js` → 0 échec.

### DA-U2a. Câblage cœur : types, cycle, modal, fiche, export (Codex)

- **Files :** `index.html` — bloc Babel uniquement (+ tests de câblage correspondants dans `KIT_TESTS`).
- **Approach :** R1, R2 (a-h), R3, R5 + tests de câblage `INTER_TYPES`, `logInteraction`, `latestInteraction`, modal, export, accroche.
- **Verification :** `node scripts/run-gates.js` → 0 échec.

### DA-U2b. Stats, récap, versions, documentation (Codex)

- **Files :** `index.html` (Stats, récap, test de version, test de câblage Stats élargi si besoin), `sw.js`, `LISEZMOI.txt`, `docs/RECETTE.md`.
- **Approach :** R6, R7, R9, R11 + tests de câblage Stats, récap, docs.
- **Verification :** `node scripts/run-gates.js` → 0 échec (le smoke navigateur et la recette AE1-AE9 sont exécutés par l'orchestrateur, hors Codex).

## Definition of Done

Trois commits Codex (+ une unité de correctifs de revue par Codex si nécessaire) sur `feat/dossiers-apporteurs`, `node scripts/run-gates.js --with-smoke` vert, revue croisée à trois voies (accent : états « en attente » / relances / accroche, édition d'une interaction de suivi, fusion), PR vers `feat/filet-donnees` puis retarget `main` après fusion de la PR #16, contrôles GitHub verts et checklist « À vérifier en réel ». Fusion par l'utilisateur = v1.5.8.

## Constats du panel écartés (avec motif)

- « Compter les dossiers dans Interactions / mois » (lentille données) : écarté au profit de la lentille produit — ce graphique mesure l'activité de réseau, un dossier n'est pas un échange ; « Nb interactions » (export) reste brut, consigné.
- « `aRemercier` sur les seules rencontres conviviales » (données, faisabilité) : écarté — un appel de remerciement suffit (produit) ; la règle « aucun échange depuis le dossier » est plus simple et supprime le paramètre `rencontreTypes`.
- « Exclure les dossiers des fiches archivées » (données, faisabilité) : écarté — archiver un client dont le dossier est clos est un geste normal et ne doit pas faire disparaître le dossier du compte de l'apporteur.
- « Ajouter un horodatage par interaction à `mergeData` » : reporté au chantier B2, limite consignée (R8, LISEZMOI).
- « Badges dans l'en-tête de la fiche » (plan initial) : remplacé par la ligne « Dossiers : » sous « Origine : » (produit).
