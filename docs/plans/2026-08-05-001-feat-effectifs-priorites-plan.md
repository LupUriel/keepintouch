---
title: Hiérarchie par effectifs — départage des priorités par la taille d'entreprise
date: 2026-08-05
type: feat
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: ce-plan-bootstrap
---

# Hiérarchie par effectifs — Plan

## Goal Capsule

À urgence égale dans les listes « À suivre », départager les contacts par la **taille de leur entreprise** : tranche d'effectifs du répertoire SIRENE récupérée à la demande via l'**API Recherche d'entreprises** (`recherche-entreprises.api.gouv.fr` — publique, sans clé, CORS ouvert **vérifié empiriquement le 2026-08-05** : `Access-Control-Allow-Origin: *`), ou **saisie manuelle protégée** quand l'utilisateur a mieux. Requête limitée à la dénomination (jamais le contact). Aucune dépendance Entra/Graph ; aucun serveur tiers autre que l'API publique, sur geste explicite uniquement.

---

## Product Contract

### Requirements

- **R1** — À urgence égale (même critère principal de tri), les listes « À suivre » classent les plus grandes tranches d'effectifs d'abord ; les contacts **sans effectif connu** (pas d'entreprise, tranche non renseignée « NN », jamais rattaché) passent **après** ceux dont la taille est connue.
- **R2** — Rattachement : recherche par dénomination → l'utilisateur **choisit l'entité** dans une courte liste (nom complet, SIREN, code postal + commune, tranche + année) ; l'app mémorise localement tranche, année, SIREN, source et date.
- **R3** — Trois gestes, tous explicites : bouton « Rechercher l'effectif » sur la fiche ; action groupée « Compléter les effectifs » (entreprises non rattachées — **aperçu de toutes les dénominations avant envoi**, validation obligatoire) ; action « Mettre à jour les effectifs » (re-interrogation par SIREN mémorisé — plus d'ambiguïté d'homonymes, même aperçu préalable).
- **R4** — Saisie manuelle : effectif précis **ou** tranche ; l'app dérive la tranche pour le tri ; source marquée « manuel ».
- **R5** — Protection du manuel : la mise à jour groupée **ignore les valeurs manuelles par défaut** (remplacées seulement sur inclusion explicite) ; le rafraîchissement depuis la fiche **demande confirmation** avant d'écraser une valeur manuelle.
- **R6** — Affichage : tranche en libellé lisible (ex. « 50-99 sal. ») sur les lignes « À suivre » et la fiche ; la fiche montre aussi l'année de validité et la source (SIRENE ou manuel).
- **R7** — Sobriété réseau et RGPD : la requête ne contient que la dénomination (ou le SIREN) — jamais le nom du contact ni aucune coordonnée ; **jamais d'appel automatique en arrière-plan** ; hors ligne, les gestes sont proprement indisponibles ; respect de la limite documentée de 7 requêtes/seconde (appels séquentiels espacés en lot, arrêt propre sur HTTP 429 / `Retry-After`).
- **R8** — Les champs effectif sont des **champs de fiche à part entière** : exportés dans les sauvegardes JSON et fusionnés entre appareils par champ (le plus récent gagne), comme le reste.

### Acceptance Examples

- **AE1** — Deux contacts de même priorité et même retard, tranches 51 (2000-4999) et 21 (50-99) : le 51 s'affiche au-dessus.
- **AE2** — Recherche « TEREOS » : liste de candidats (ex. TEREOS FRANCE, SIREN 533247979, 77230 Moussy-le-Vieux, tranche 51, année 2023) ; après choix, la fiche affiche « 2000-4999 sal. (SIRENE 2023) ».
- **AE3** — Saisie manuelle « 340 » : tranche dérivée 32 (250-499), utilisée pour le tri ; une mise à jour groupée lancée ensuite **ne la touche pas** par défaut.
- **AE4** — « Mettre à jour les effectifs » : l'aperçu liste les entreprises qui seront re-interrogées (par SIREN) ; les valeurs manuelles n'y figurent que si la case d'inclusion explicite est cochée.
- **AE5** — Tranche « NN » ou absente au répertoire : la fiche affiche « effectif non renseigné », le contact reste classé avec les inconnus.
- **AE6** — Hors ligne : les boutons de recherche/mise à jour sont désactivés avec un message clair ; aucun plantage.

### Key Decisions

- **D1** *(session-settled: user-directed — choisie contre Pappers : gratuite, sans clé, destinataire public)* — Source = API Recherche d'entreprises (DINUM). Governs R2, R7.
- **D2** *(session-settled: user-directed — posture RGPD)* — Récupération toujours déclenchée par l'utilisateur, jamais en arrière-plan. Governs R3, R7.
- **D3** *(session-settled: user-directed — contre « tri seul » et « tri+badge+filtre »)* — Tri + badge, pas de filtre par taille. Governs R1, R6.
- **D4** *(session-settled: user-directed)* — Plus grand = plus haut ; inconnus après les connus, à urgence égale. Governs R1.
- **D5** *(session-settled: user-directed)* — Saisie manuelle possible et **protégée** contre l'écrasement sans accord. Governs R4, R5.
- **D6** *(session-settled: user-approved — confirmé à la synthèse de plan)* — L'effectif est un champ de fiche exporté/fusionné comme les autres. Governs R8.

---

## Planning Contract

### Key Technical Decisions

- **KTD1 — Champs de contact.** `effectifTranche` (code INSEE, ex. "21"), `effectifAnnee`, `effectifSiren`, `effectifSource` ("api" | "manuel"), `effectifDate` (date de récupération/saisie), `effectifPrecis` (nombre, optionnel, saisie manuelle). Tous ajoutés à `MERGE_FIELDS` (fusion par champ via `fieldsUpdatedAt`, mécanique existante — `mergeData` lui-même n'est PAS modifié). **Deux règles d'écriture impératives** : (a) toute écriture effectif — fiche ET lot — passe par `updContact` (bouclé par id en lot) ou tamponne explicitement `fieldsUpdatedAt` pour chaque champ touché, sinon la fusion inter-appareils (R8) échoue silencieusement ; (b) **groupe atomique** : toute écriture (api ou manuel) pose/efface les SIX champs ensemble avec le même horodatage, pour que la fusion par champ ne puisse pas composer un état incohérent (tranche manuelle étiquetée SIRENE, SIREN résiduel). Limite résiduelle assumée et documentée au LISEZMOI : un rafraîchissement API plus récent sur un autre appareil peut supplanter une saisie manuelle à la fusion (R5 protège les gestes locaux ; le rapport de fusion existant signale les conflits de champ).
- **KTD2 — Moteur pur dans KIT_PURE** (micro-conflit assumé sur la ligne d'export `return {...}`, résolution = union, rodée) : `trancheRank(code)` (ordre des codes INSEE 00 &lt; 01 &lt; 02 &lt; 03 &lt; 11 &lt; 12 &lt; 21 &lt; 22 &lt; 31 &lt; 32 &lt; 41 &lt; 42 &lt; 51 &lt; 52 &lt; 53 ; "NN"/absent/inconnu → -1), `trancheLabel(code)` (libellés « 50-99 sal. »…), `trancheFromCount(n)` (dérivation manuel→code, bornes INSEE), `effectifTieBreak(a, b)` (comparateur secondaire : rang décroissant, inconnus derniers, stable à égalité). Cas KIT_TESTS **au milieu du bloc** (jamais en fin).
- **KTD3 — Tri.** Le tie-break s'applique en **second critère** dans les tris existants des listes « À suivre » (`rencontreList`, `followUpList`, `awaitingList`, `retryList`) — le critère principal de chaque liste reste inchangé (insertion type `criterePrincipal || effectifTieBreak(a, b)` : les critères existants sont des différences entières, 0 exact à l'égalité).
- **KTD4 — Appels API.** `GET https://recherche-entreprises.api.gouv.fr/search?q=<dénomination encodée>&per_page=10` (rattachement) et `?q=<siren>` (mise à jour). **Impératifs techniques** : `q = encodeURIComponent(dénomination)` (les « & », « # », « + » sont banals dans les raisons sociales — sans encodage, résultats faux et rattachement erroné silencieux ; patron existant `buildMailto`) ; `fetch(url, { referrerPolicy: "no-referrer", credentials: "omit" })` pour verrouiller « rien d'autre ne part ». Contrat vérifié le 2026-08-05 : sans authentification, CORS `*`, 7 req/s max par IP, HTTP 429 + `Retry-After` au-delà. En lot : appels **séquentiels** espacés d'environ 250 ms, arrêt propre au premier 429, compteur de progression visible ; **reprise** = relancer le lot en sautant les contacts dont `effectifDate` ≥ début du lot (sinon on re-consomme le quota). Erreur immédiate alors que l'app est en ligne → message distinct « requête bloquée — vérifier la politique de sécurité » (ne pas la déguiser en panne réseau).
- **KTD5 — CSP.** `main` n'a pas encore de méta CSP ; la branche durcissements (en attente de fusion) en ajoute une avec `connect-src` restreint (vérifié : sans l'API gouv). À la fusion des deux branches, ajouter `https://recherche-entreprises.api.gouv.fr` au `connect-src`. **Garde-fou automatique** : un cas KIT_TESTS statique vérifie que SI une méta CSP existe dans `index.html`, ALORS son `connect-src` contient `recherche-entreprises.api.gouv.fr` — le test échoue à la fusion fautive au lieu d'une casse silencieuse en production (complété par le message runtime distinct de KTD4).
- **KTD6 — UI.** Modal de rattachement (liste de candidats, choix au tap) ; bloc effectif sur la fiche (badge, année, source, boutons « Rechercher » / « Saisir » / « Actualiser ») ; les actions groupées vivent dans un petit panneau dédié du tableau de bord (zone sûre — ne PAS toucher la sous-section « Connecter mon agenda » des réglages). Emplacement fin laissé à l'implémentation.
- **KTD7 — Versions.** `APP_VERSION "1.4.5"`, `CACHE_NAME "kit-crm-v41"` (v36-v40 pris ou réservés par les branches précédentes).
- **KTD8 — Interdits.** Module KIT_AGENDA, `fetchCandidateDates`/`restoreInvite`, cœur de `mergeData`, `pendingInvites`, fin du bloc KIT_TESTS, `<head>` (hors coordination CSP de KTD5).

### Scope Boundaries (non-objectifs)

Pas de filtre par taille ; pas d'autres données entreprise (finances, dirigeants, actes) ; pas de Pappers ; la cadence des cycles de relance ne change pas (la priorité garde la main, l'effectif ne joue que sur l'ordre d'affichage) ; pas de re-interrogation automatique périodique.

### System-Wide Impact

- `data`/export : six nouveaux champs de fiche (KTD1) transportés par l'export JSON et la fusion existante — aucun changement de `mergeData`.
- Recherche : `contactHaystack` (branche fluidité, PR #6) n'inclut pas ces champs — pas de collision ; un ajout éventuel du libellé de tranche à la recherche est différé.
- Branches en attente : conflits connus et triviaux (ligne d'export KIT_PURE = union ; versions = valeur la plus haute ; insertions KIT_TESTS en blocs disjoints) + la coordination CSP de KTD5.

---

## Implementation Units

### U1. Moteur pur, rattachement API, tri et badge (taille M)

- **Goal** : R1, R2, R3 (geste fiche « Rechercher l'effectif »), R6 (badge lignes), R7 (unitaire) — un contact peut être rattaché à son entreprise et les listes départagent par taille.
- **Requirements** : R1, R2, R3 (geste fiche uniquement — les gestes groupés sont en U2), R6, R7 ; D1, D3, D4 ; KTD1-KTD4, KTD6 (modal + badge). Le modal de candidats affiche aussi l'**état administratif** (badge « cessée » pour une entité radiée — l'API le retourne).
- **Execution note** : partir des tests qui échouent sur `trancheRank`/`trancheFromCount`/`effectifTieBreak`, puis implémenter.
- **Files** : `index.html` (KIT_PURE + export ; KIT_TESTS milieu de bloc ; champs KTD1 dans `MERGE_FIELDS` ; fonction d'appel API + modal de rattachement + bouton fiche ; tie-break dans les quatre tris ; badge lignes + fiche).
- **Patterns to follow** : modal léger type `renderLogModal` ; appels réseau avec délai limite type Graph (timeout, erreurs réseau → message, hors-ligne détecté) ; badges de lignes type « Aujourd'hui ! ».
- **Test scenarios** : ordre complet des codes INSEE ; NN/absent → -1 ; libellés exacts par code ; dérivation aux bornes (0, 1, 2, 3, 5, 6, 9, 10, 19, 20, 49, 50, 99, 100, 199, 200, 249, 250, 499, 500, 999, 1000, 1999, 2000, 4999, 5000, 9999, 10000) ; tie-break : connu &gt; inconnu, 51 &gt; 21, égalité stable ; Covers AE1, AE5.
- **Verification** : 4 portes (Babel, runner node, empreintes lib, `node --check sw.js`) ; contrôle visuel du rattachement réel sur 2-3 entreprises (AE2).

### U2. Saisie manuelle protégée, actions groupées, versions (taille M)

- **Goal** : R3, R4, R5, R8 + KTD7 ; LISEZMOI.
- **Requirements** : R3 (gestes groupés), R4, R5, R8 ; D2, D5, D6 ; KTD4 (lot), KTD6 (panneau), KTD7.
- **Dependencies** : U1.
- **Règle de rattachement en lot (mode dénomination)** : le lot ne rattache JAMAIS seul — auto-rattachement uniquement si l'API retourne un résultat unique ET une correspondance exacte de dénomination ; sinon l'entreprise est marquée « ambiguë, à choisir » et passe par le modal de R2 (jamais de premier-résultat silencieux — un annuaire d'avocat regorge d'homonymes type « CABINET MARTIN »). En mise à jour par SIREN : zéro résultat ou entité cessée → **conserver l'ancienne valeur, ne PAS rafraîchir `effectifDate`**, et lister le cas dans le récapitulatif de fin de lot.
- **Files** : `index.html` (saisie manuelle sur la fiche ; logique de lot pure `bulkEffectifTargets(contacts, includeManual)` → cibles avec exclusion des manuels par défaut, exportée et testée ; panneau actions groupées avec aperçu/validation/progression/throttle/429 ; confirmation d'écrasement fiche), `sw.js` (CACHE_NAME), `LISEZMOI.txt` (section « Taille des entreprises » : gestes, source publique, requête limitée à la dénomination).
- **Test scenarios** : `bulkEffectifTargets` — manuels exclus par défaut, inclus sur option ; entreprises sans dénomination ignorées ; déjà rattachés → mode SIREN ; non rattachés → mode dénomination ; résultats multiples ou dénomination non exacte → AUCUNE écriture, marqué « ambiguë » ; reprise post-429 → contacts avec `effectifDate` ≥ début du lot sautés ; dénomination avec « & » et « # » correctement encodée ; garde CSP statique (si méta CSP présente → `connect-src` contient le domaine API) ; groupe atomique (écriture manuel pose/efface les six champs, même horodatage) ; dérivation manuel→tranche (Covers AE3) ; Covers AE4.
- **Verification** : 4 portes + contrôle visuel (saisie manuelle, lot avec aperçu, hors-ligne AE6, protection AE3/AE4).

---

## Verification Contract

À chaque unité : `node /root/ce-work/check-babel.js && node scripts/kit-tests-node.js && node /root/ce-work/check-lib-hashes.js && node --check sw.js` — tous les cas verts, 0 échec. Avant PR : contrôle visuel sur localhost (rattachement réel, lot, hors-ligne) — l'API étant publique et sans clé, le test réel est possible immédiatement.

## Definition of Done

- R1-R8 couverts, AE1-AE6 rejouables ; portes vertes sur les deux unités ; revue de code (personas + passe croisée) avant PR.
- LISEZMOI à jour ; `APP_VERSION` 1.4.5 / `kit-crm-v41` ; note de coordination CSP (KTD5) reprise dans la description de la PR.
- PR `feat/effectifs-priorites` → `main` ; checkout de retour sur `feat/rappels-effectifs` en fin de chantier.
- **Tout le run contrôleur dans un seul démarrage WSL** (leçon st_dev).
