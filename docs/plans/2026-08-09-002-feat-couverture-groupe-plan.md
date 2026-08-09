---
title: "Couverture groupe : propagation du rattachement et SIREN multiples par fiche"
date: 2026-08-09
type: feat
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: ce-brainstorm
---

# Couverture groupe

## Goal Capsule

Deux demandes utilisateur du 2026-08-09 (après la PR #11, base de cette branche) : (1) **propager** un rattachement SIRENE à toutes les fiches de la même entreprise (éviter de répéter l'opération) ; (2) rattacher des **SIREN supplémentaires** à une fiche (groupes : l'utilisateur intervient pour plusieurs entreprises via un même interlocuteur) — la **couverture cumulée** en salariés devient la mesure de priorité, le lot « Mettre à jour » et l'alerte BODACC couvrent toutes les entreprises rattachées. v1.5.4/kit-crm-v46.

## Product Contract

### Key Decisions

- KD1 (session-settled: user-directed) — Le rattachement principal se propage aux fiches de même dénomination ; protections intactes : source « manuel » jamais écrasée, fiche rattachée à un AUTRE SIREN signalée, jamais écrasée.
- KD2 (session-settled: user-directed) — Entreprises supplémentaires par fiche (périmètre d'intervention réel) ; **propres à chaque fiche** — pas de propagation des secondaires.
- KD3 (session-settled: user-approved) — La priorité se mesure à la **couverture cumulée** : somme prudente (nombre précis saisi, sinon **bas de fourchette** de la tranche INSEE), reconvertie en tranche équivalente officielle pour l'affichage et le départage. Fiche sans aucun rattachement ni saisie → « inconnue » (passe après, comme aujourd'hui).
- KD4 — BODACC : l'état de procédure d'une fiche = le **pire état** parmi toutes ses entreprises rattachées (en-cours > clôturée > aucune), évalué en une passe (fiche ou lot) qui interroge chaque SIREN puis écrit UNE fois.
- KD5 — La propagation est un geste de fiche (rattachement choisi ou confirmé par l'utilisateur) ; les lots gardent leur logique cible par cible (pas de propagation en cours de lot — les cibles sont figées à l'aperçu).

### Requirements

- R1. Choisir une entreprise dans le modal de rattachement écrit la fiche visée ET toutes les fiches de même dénomination non protégées ; message « Rattaché aussi à N autres fiches » (+ mention des protégées).
- R2. La fiche offre « Ajouter une entreprise » : recherche identique (filtre postal, classement), le choix s'ajoute aux entreprises supplémentaires (dénomination, SIREN, tranche, année, date) ; liste visible avec retrait unitaire ; doublons refusés (y compris le SIREN principal).
- R3. Les listes « À suivre » départagent par la tranche de couverture cumulée ; badge « {tranche} (groupe) » quand des secondaires existent.
- R4. « Mettre à jour les effectifs » actualise le principal ET chaque secondaire (cibles par SIREN, espacement 250 ms conservé) ; introuvable/cessée → valeur conservée (principal) / entrée conservée avec note (secondaire).
- R5. La passe BODACC (fiche et lot) interroge tous les SIREN de la fiche et écrit l'état combiné KD4 ; échecs partiels signalés sans faire perdre les réponses obtenues (état combiné sur ce qui a répondu, fiche marquée à revérifier dans le compte rendu).
- R6. `effectifsSecondaires` est un champ de fiche (tableau) : sauvegardé, exporté JSON, fusionné (MERGE_FIELDS, horodatage de champ).
- R7. Versions v1.5.4/kit-crm-v46 (regex du test version mises à jour).

### Acceptance Examples

- AE1. Trois fiches « ACME CONSEIL » ; rattachement depuis l'une → les trois portent le SIREN ; la quatrième (effectif manuel) est intacte et signalée.
- AE2. Fiche avec employeur 50-99 sal. + deux secondaires (200-249, 1000-1999) → couverture 50+200+1000=1250 → badge « 1000-1999 sal. (groupe) », classée au-dessus d'un contact 500-999 seul.
- AE3. « Mettre à jour » → les trois entreprises de la fiche AE2 actualisées (trois requêtes espacées).
- AE4. Une secondaire du groupe entre en redressement → badge ⚠ sur la fiche (état combiné), section du compte rendu et du récap.
- AE5. Retrait d'une secondaire → couverture et badge recalculés immédiatement.
- AE6. Fusion inter-appareils : les secondaires suivent l'horodatage du champ (dernière modification gagne).

### Scope Boundaries

- Pas de propagation des secondaires (KD2) ni de propagation pendant les lots (KD5).
- Pas de détection automatique de groupe (liens capitalistiques) — l'utilisateur choisit ses entreprises.
- Pas de stockage des procédures par entreprise : un seul état combiné par fiche (KD4).

## Planning Contract

### Key Technical Decisions

- KTD1 — Bornes basses officielles : `trancheBorneBasse(code)` — {"00":0,"01":1,"02":3,"03":6,"11":10,"12":20,"21":50,"22":100,"31":200,"32":250,"41":500,"42":1000,"51":2000,"52":5000,"53":10000}, invalide/NN → 0.
- KTD2 — `couvertureTotale(contact)` : (effectifPrecis entier ≥ 0 sinon borneBasse(effectifTranche)) + Σ secondaires (precis entier ≥ 0 sinon borneBasse(tranche)). `couvertureTranche(contact)` : « NN » si aucune donnée (tranche principale invalide ET secondaires vides ET pas de precis), sinon `trancheFromCount(couvertureTotale)`. `effectifTieBreak(a, b)` réécrit sur `trancheRank(couvertureTranche(...))` — les cas de test existants restent verts par construction (fiche mono-entreprise ⇒ tranche équivalente = tranche saisie, borne basse ∈ sa propre tranche).
- KTD3 — `propagationCibles(contacts, sourceId, denomination, siren)` pure → { aRattacher: [ids], protegees: [labels manuels], autres: [labels autre SIREN] } ; critères : denominationMatch sur company, id ≠ source, source ≠ "manuel", effectifSiren vide ou égal.
- KTD4 — `secondairesAjoute(secondaires, entree, sirenPrincipal)` (refus doublon et principal, remplacement par SIREN, copie non mutante) et `secondairesRetire(secondaires, siren)` ; entrée = { siren, denomination, tranche, annee, precis: null, date }.
- KTD5 — `procedureCombine(etats)` pure : liste d'états ("aucune"|"cloturee"|"en-cours" + annonce associée) → le pire (en-cours > cloturee > aucune), annonce du pire retenue ; utilisée par la passe BODACC multi-SIREN (fiche : séquentiel espacé 250 ms sur [principal].concat(secondaires) ; lot : idem au sein du créneau BODACC de la cible ; écriture UNIQUE via updContact ; réponses partielles → combinaison de ce qui a répondu + fiche listée « à revérifier »).
- KTD6 — Champ `effectifsSecondaires` (tableau) ajouté à MERGE_FIELDS (fusion par champ horodaté, motif keyDates/tags) ; PAS dans le groupe atomique effectif* (le principal garde ses six champs).
- KTD7 — Lot « update » : `bulkEffectifTargets` émet, par fiche rattachée, la cible principale (mode "siren") + une cible par secondaire (mode "secondaire", cle = siren de la secondaire) ; la mise à jour d'une secondaire remplace son entrée dans le tableau (denominationMatch non requis : le SIREN est univoque). Versions v1.5.4/kit-crm-v46 + regex test.

## Implementation Units

### CG-U1. Moteur pur couverture et propagation

- **Goal :** les fonctions pures KTD1-KTD5 rejoignent `KIT_PURE` avec leurs tests.
- **Files :** `index.html`.
- **Test scenarios :** bornes basses exactes (15 codes + NN/invalide → 0) ; couverture AE2 (50+200+1000=1250 → "42") ; precis prioritaire sur borne ; fiche vide → "NN" ; tie-break : groupe 1250 bat mono 500-999, cas existants inchangés (51 vs 21, inconnu dernier) ; propagationCibles : matché/protégé manuel/autre SIREN/source exclue, accents-tirets ; secondairesAjoute : ajout, remplacement même SIREN, refus principal, non-mutation ; secondairesRetire ; procedureCombine : pire état, annonce du pire, liste vide → "aucune".
- **Verification :** runner 0 échec.

### CG-U2. Propagation, fiche groupe, lot et BODACC multi-SIREN

- **Goal :** tout est branché ; versions montées.
- **Dependencies :** CG-U1.
- **Files :** `index.html`, `sw.js`, `LISEZMOI.txt`.
- **Approach :** chooseEffectif : après l'écriture de la fiche source, propagation (KTD3) en une passe d'updContact successifs sur `working`, message ; « Ajouter une entreprise » : réutilise le modal de recherche (drapeau `secondaire: true` dans effectifModal ; le choix appelle secondairesAjoute via updContact) ; section fiche « Entreprises du groupe » (liste + ✕ + bouton) sous le bloc effectif ; badge couverture (couvertureTranche + « (groupe) » si secondaires) sur fiche et lignes des 4 listes ; bulkEffectifTargets KTD7 + runBulkEffectifs (cible secondaire = update de l'entrée ; BODACC de la cible = passe multi-SIREN KTD5 UNE fois par fiche — sur la cible principale seulement, pas répétée pour chaque secondaire) ; verifyBodacc multi-SIREN (KTD5) ; MERGE_FIELDS + effectifsSecondaires ; versions + regex + LISEZMOI (courte mise à jour des sections Taille des entreprises et Procédures collectives).
- **Test scenarios :** câblage document réel (propagationCibles appelé dans chooseEffectif ; effectifsSecondaires dans MERGE_FIELDS ; « (groupe) » présent ; procedureCombine appelé) ; version 1.5.4/v46 ; suite intacte.
- **Verification :** runner 0 échec ; Babel ; sw.js ; smoke navigateur.

## Verification Contract

Portes habituelles ; smoke localhost (couverture calculée, section groupe rendue) ; checklist PR : AE1-AE6 en réel.

## Definition of Done

PR vers `main` (ouverte après fusion de la #11 dont cette branche dépend), revue croisée 3 voies, constats corrigés. Fusion = déploiement v1.5.4.
