---
title: "Affinage des recherches d'effectifs par l'adresse (filtre postal envoyé, classement local)"
date: 2026-08-07
type: feat
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: ce-brainstorm
---

# Affinage des recherches d'effectifs par l'adresse

## Goal Capsule

Les recherches d'effectifs (fiche et lot « Compléter ») souffrent des homonymes (« CABINET MARTIN » = 1 840 entreprises). Deux leviers, vérifiés empiriquement le 2026-08-07 : (1) le **filtre structuré `code_postal`** de l'API Recherche d'entreprises (1 840 → 70) — seule donnée supplémentaire envoyée, un code postal à 5 chiffres extrait de l'adresse du contact ; (2) le **classement local des candidates par similarité d'adresse** — l'adresse complète du contact sert à trier la liste **sans jamais quitter l'appareil**. v1.5.1/kit-crm-v43.

## Product Contract

### Key Decisions

- KD1 (session-settled: user-directed) — Affiner par l'adresse stockée dans KIT. Alternative envisagée par l'utilisateur puis écartée sur preuve : envoyer l'adresse complète (RGPD zone grise pour les indépendants domiciliés + **zéro résultat** démontré : SIRENE exige tous les mots ; la normalisation à l'envoi resterait fragile et exigerait un second service externe).
- KD2 (session-settled: user-approved) — Minimisation : seuls dénomination + code postal (5 chiffres) partent. L'adresse complète n'est utilisée qu'en local pour classer.
- KD3 — Le filtre ne doit jamais faire perdre un résultat : zéro résultat avec filtre → repli automatique sans filtre, signalé. Bouton « Élargir la recherche » toujours disponible quand un filtre est appliqué (adresse d'agence, déménagement).
- KD4 — Le lot « Mettre à jour » (par SIREN) ne change pas. Le lot « Compléter » (par dénomination) profite du filtre ; sa règle d'auto-rattachement reste inchangée (résultat unique + correspondance exacte + état actif).

### Requirements

- R1. Sur la fiche, « Rechercher l'effectif » filtre par le code postal du contact quand l'adresse (ou le lieu de travail) en contient un ; mention visible « affiné par {cp} » ; bouton « Élargir la recherche » ; zéro résultat filtré → relance automatique sans filtre avec message.
- R2. La liste des candidates est classée par similarité entre l'adresse KIT et l'adresse des candidates (siège + établissements correspondants), calculée localement.
- R3. Le lot « Compléter les effectifs » filtre chaque requête par le code postal du contact quand disponible ; zéro résultat filtré → une relance sans filtre pour la cible ; règles d'auto-rattachement inchangées.
- R4. Aucune donnée nouvelle ne part hors dénomination + code postal ; `referrerPolicy`/`credentials` inchangés ; jamais d'appel automatique en arrière-plan.
- R5. Versions v1.5.1/kit-crm-v43 (le test « version applicative du document » qui épingle 1.5.0/v42 est mis à jour en conséquence).

### Acceptance Examples

- AE1. Contact « Cabinet Martin », adresse « … 73000 Chambéry » → recherche filtrée 73000, mention « affiné par 73000 », le Cabinet Martin de Chambéry en tête.
- AE2. Adresse sans code postal → recherche inchangée (pas de mention, pas de bouton Élargir).
- AE3. Code postal obsolète (entreprise déménagée) → zéro résultat filtré → repli automatique élargi, message explicite.
- AE4. Deux homonymes dans le même code postal → celui dont l'adresse de rue recoupe l'adresse KIT est classé premier.
- AE5. Lot « Compléter » sur des homonymes → nettement plus d'auto-rattachements uniques, zéro rattachement erroné (règles inchangées).

### Scope Boundaries

- Pas d'appel à la Base Adresse Nationale ni à aucun autre service ; pas d'envoi de l'adresse complète, de la ville en clair, ni du nom du contact.
- Pas de refonte du modal ni des règles d'auto-rattachement.

## Planning Contract

### Key Technical Decisions

- KTD1 — `effectifSearchUrl(denomination, codePostal)` : second argument optionnel ; `&code_postal={cp}` ajouté seulement si `/^\d{5}$/` ; rétro-compatible (appels à 1 argument inchangés).
- KTD2 — Extraction : `KIT_PURE.extractPostal(c.address) || KIT_PURE.extractPostal(c.workLocation)` (motif existant, index.html:118).
- KTD3 — Similarité locale pure : normalisation façon `denominationMatch` (minuscules, accents retirés, tirets→espaces), tokens ≥ 2 caractères ; score = tokens communs, bonus +2 si un numéro (token numérique) est commun ; adresse candidate = `siege.adresse` et chaque `matching_etablissements[].adresse` (le score retenu est le maximum). `rankEffectifCandidates(results, adresseKit)` : copie triée décroissante, stable (ordre API préservé à égalité — l'API classe déjà par pertinence), entrée non mutée, adresse KIT vide → copie à l'identique.
- KTD4 — Fiche : `effectifModal` porte le `cp` appliqué ; « Élargir » relance sans filtre (garde de séquence existante réutilisée) ; repli automatique : si résultats filtrés vides, une relance sans filtre dans la même chaîne (une seule fois), message dédié.
- KTD5 — Lot : `bulkEffectifTargets` ajoute `cp` aux cibles mode dénomination (extraction KTD2) ; `runBulkEffectifs` utilise `effectifSearchUrl(cle, cp)` ; zéro résultat filtré → une relance sans filtre pour la cible avant décision ; espacement 250 ms conservé entre cibles.
- KTD6 — Versions : `APP_VERSION` 1.5.1, `CACHE_NAME` kit-crm-v43, regex du test version mises à jour (1.5.1 / v43). Conflit connu avec feat/durcissements : versions = plus haute, export KIT_PURE = union.

## Implementation Units

### EA-U1. Moteur pur : URL filtrée, similarité, classement

- **Goal :** les fonctions pures de l'affinage rejoignent `KIT_PURE` avec leurs tests.
- **Files :** `index.html`.
- **Approach :** étendre `effectifSearchUrl` (KTD1) ; ajouter `adresseSimilarity(adresseKit, adresseApi)` et `rankEffectifCandidates(results, adresseKit)` (KTD3) ; export en union.
- **Test scenarios :** URL : 1 arg inchangé (test existant intact) ; cp valide ajouté ; cp invalide ("7500", "ABCDE", null) ignoré. Similarité : tokens communs comptés ; bonus numéro de rue ; accents/tirets/casse neutralisés ; entrées vides → 0. Classement : le bon homonyme remonte (AE4 en pur) ; stabilité à égalité ; entrée non mutée ; adresse vide → ordre API préservé ; candidates sans `siege.adresse` tolérées (score 0) ; `matching_etablissements` pris en compte (max).
- **Verification :** `node scripts/kit-tests-node.js` 0 échec.

### EA-U2. Fiche, lot, versions

- **Goal :** l'affinage est branché sur la fiche et le lot, avec mention, élargissement et replis.
- **Dependencies :** EA-U1.
- **Files :** `index.html`, `sw.js`, `LISEZMOI.txt`.
- **Approach :** fiche `openEffectifSearch` (index.html:1918-1951) : cp KTD2, URL filtrée, tri par `rankEffectifCandidates` avant `setEffectifResults`, état `cp` dans `effectifModal`, mention + bouton « Élargir » dans `renderEffectifModal` (index.html:3188+), repli auto KTD4 ; lot (index.html:2021-2060 + `bulkEffectifTargets` index.html:318) : KTD5 ; `openBulkAmbiguous` : tri identique ; versions + LISEZMOI (courte mise à jour de la section « Taille des entreprises ») ; test version mis à jour (KTD6).
- **Test scenarios :** semis/tri purs déjà couverts en EA-U1 ; cibles de lot portent `cp` (cas pur sur `bulkEffectifTargets` : adresse avec cp → cible avec cp ; sans adresse → cible sans cp ; les exclusions existantes intactes) ; test version 1.5.1/v43 ; suite existante intacte.
- **Verification :** `KIT_TESTS.run()` 0 échec ; Babel ; `node --check sw.js` ; smoke navigateur.

## Verification Contract

Portes habituelles (Babel, runner node, empreintes lib/, sw.js) sur l'arbre final ; smoke localhost (modal avec mention et classement) ; checklist PR utilisateur : AE1-AE5 en réel.

## Definition of Done

PR vers `main` avec revue croisée (correctness + testing + passe adversariale Codex), constats corrigés. Fusion = déploiement v1.5.1.
