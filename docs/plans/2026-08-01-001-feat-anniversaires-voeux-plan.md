---
title: Anniversaires et vœux — correctif du jour J et vœux actionnables
date: 2026-08-01
type: feat
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: ce-plan-bootstrap
---

# Anniversaires et vœux — correctif du jour J et vœux actionnables

## Goal Capsule

Deux volets sur les blocs « Anniversaires à venir (30j) » et « Dates clés à venir (30j) » de la vue « À suivre » :

1. **Correctif d'un bug confirmé** : le calcul des échéances annuelles compare la date reconstruite à `new Date()` **avec l'heure courante** (index.html, `upcomingKDs` l.2366-2379 et `upcomingBdays` l.2381-2393 sur main). Conséquence : le jour J, dès ~02:00 (parse UTC de `new Date("AAAA-MM-JJ")`), l'échéance bascule à l'année suivante et la ligne **disparaît précisément le jour de l'anniversaire**. « Aujourd'hui ! » ne s'affiche en réalité que la veille.
2. **Vœux actionnables** : ces deux blocs sont purement informatifs (aucun bouton, contrairement aux autres blocs de la vue). Ajouter un bouton par ligne qui compose un message de vœux prérempli (canal choisi selon les coordonnées, registre tu/vous de la fiche), modifiable avant envoi, puis journalise l'interaction.

Origine : backlog vérifié du 2026-08-01 (analyse multi-agents, chaque affirmation vérifiée ligne à ligne contre main). Chantier choisi par l'utilisateur le 2026-08-01, en parallèle du chantier « rappels effectifs » en pause (attente d'autorisations Entra). **Aucune dépendance à Outlook/Graph/Entra.**

## Product Contract

### Requirements

- **R1** — Le jour J, les lignes anniversaires **restent affichées toute la journée** avec « Aujourd'hui ! », quelle que soit l'heure (calcul à minuit, indépendant de l'heure courante).
- **R2** — Les dates clés affichent aussi « Aujourd'hui ! » le jour J (aujourd'hui : « dans 0j »), même correctif de calcul.
- **R3** — Chaque ligne des deux blocs porte un bouton « Vœux » ouvrant un aperçu prérempli et modifiable ; le canal est proposé selon les coordonnées : mail si email, sinon WhatsApp si mobile français, sinon SMS (mobile) ou copie presse-papiers (PC). Registre tu/vous de la fiche respecté.
- **R4** — Quatre modèles de vœux par défaut (anniversaire tu/vous, date clé tu/vous), modifiables dans le panneau MODÈLES DE MESSAGE, avec variable `{occasion}` ; les utilisateurs **existants** les reçoivent par migration (le bloc actuel `migrateData` l.592 ne pose les modèles par défaut que si `data.templates` n'est pas un tableau).
- **R5** — La journalisation se fait sur confirmation légère « C'est envoyé » dans l'aperçu : interaction type `email`/`sms` (via `canalToInteractionType`), commentaire « Vœux — {occasion} », sans marquer d'attente de réponse, **sans réinitialiser le cycle de rencontre** (jamais un type de `RENCONTRE_TYPES`).
- **R6** — Aucune dépendance Entra/Graph ; les liens `mailto:`/`wa.me`/`sms:` fonctionnent hors connexion Microsoft.

### Acceptance Examples

- **AE1** — Anniversaire du contact = aujourd'hui, il est 15h : la ligne est visible avec « Aujourd'hui ! ». (Comportement actuel : ligne absente.)
- **AE2** — Date clé demain : « dans 1j » ; le jour J : « Aujourd'hui ! ».
- **AE3** — Contact avec email, registre `tu`, anniversaire aujourd'hui : bouton Vœux → aperçu « Salut {prenom}… joyeux anniversaire » → Envoyer ouvre le mailto → « C'est envoyé » journalise une interaction type `email` datée d'aujourd'hui, commentaire « Vœux — ton anniversaire ».
- **AE4** — Contact sans email avec un 06 : le canal proposé est WhatsApp.
- **AE5** — Anniversaire au 29/02, année non bissextile : l'occurrence calculée tombe au 1er mars (comportement JS de `new Date(y,1,29)`, assumé et testé), pas de plantage, pas de doublon.
- **AE6** — Aperçu fermé sans « C'est envoyé » : aucune interaction journalisée.

### Key Decisions

- **D1** *(session-settled: user-directed)* — Chantier choisi le 2026-08-01 parmi le backlog vérifié (alternatives différées : filet de sécurité des données, lot fluidité quotidienne, machine à prétextes).
- **D2** — Les vœux sont un geste **one-shot sans suivi de réponse** : pas de `pendingInvite`, pas de confirmation éclair persistée. La journalisation passe par un bouton « C'est envoyé » dans l'aperçu ; fermer sans confirmer ne journalise rien. Évolution possible à l'usage.
- **D3** — Deux **familles** de modèles (anniversaire / date clé) × deux registres, partagées entre canaux : le même corps sert mail et texte ; l'objet ne sert qu'au mail.

## Planning Contract

### Key Technical Decisions

- **KTD1 — Calcul pur à minuit.** Nouvelle fonction `KIT_PURE.nextAnnualOccurrence(dateISO, todayISO)` → `{ date: "AAAA-MM-JJ", daysLeft }`. Reconstruction par composantes (`split("-")` + `Number`), jamais `new Date(chaîne)` ni l'heure courante ; année de `todayISO`, bascule à l'année suivante si l'occurrence est **strictement antérieure** au jour de `todayISO` ; `daysLeft` par différence `Date.UTC` à minuit. Le site d'appel (section Derived) passe `todayStr()`. 29/02 → 1er mars les années non bissextiles (testé).
- **KTD2 — Conflits maîtrisés avec `feat/rappels-effectifs`.** L'ajout d'exports à KIT_PURE crée un micro-conflit assumé sur la ligne unique `return {...}` (résolution = union, procédure rodée lors de la fusion des durcissements). Les cas KIT_TESTS sont **insérés au milieu du bloc** (après le cas « canaux invitation vers types non-rencontre », vers l.220 sur main), **pas en fin de bloc** (zone d'append de la branche rappels). Interdits : toucher au module KIT_AGENDA, à `fetchCandidateDates`/`restoreInvite`, à la sous-section « Connecter mon agenda » des réglages (l.3373-3393), au `<head>`.
- **KTD3 — Canal et journalisation.** Cascade de canal identique à `launchInvite` (l.1631-1660) : mail si `c.email` ; sinon WhatsApp si `inviteMobile(c)` ; sinon SMS sur mobile / copie presse-papiers sur PC. La partie décidable est extraite en pur : `KIT_PURE.voeuxCanalFor(email, mobile)` → `"mail" | "whatsapp" | "aucun"` (le choix SMS/copie reste au site d'appel selon l'appareil). Réutiliser `buildMailto`/`buildWa`/`buildSms` et `inviteMobile` existants. Journalisation via `logInteraction(contactId, "Vœux — " + occasion, todayStr(), KIT_PURE.canalToInteractionType(canal), false, false)` — type `email`/`sms`, jamais un type rencontre (pas de remise à zéro du cycle, cf. l.1506).
- **KTD4 — Modèles vœux à canal dédié.** Quatre modèles : `voeux-anniv-tu`, `voeux-anniv-vous`, `voeux-datecle-tu`, `voeux-datecle-vous`, avec `canal: "voeux"`, `famille: "anniversaire" | "datecle"`, `registre`, `objet` (mail seulement), `corps`, `nbDates: 0`, `updatedAt: TS_BASE`. Le canal `"voeux"` garantit que `selectedTemplate()` du geste d'invitation (filtre `mail`/`texte`, l.1605-1608) ne peut jamais les sélectionner. Panneau MODÈLES DE MESSAGE : élargir la condition d'affichage du champ objet (`t.canal === "mail"` → inclure `"voeux"`, l.3412) et masquer « Nombre de dates » pour les modèles vœux.
- **KTD5 — Migration idempotente.** Dans `migrateData`, après le bloc modèles existant (l.592-597) : si aucun modèle `canal === "voeux"` n'existe, appendre les 4 modèles par défaut (`changed = true`). La fusion inter-appareils est déjà couverte (merge par id + plus récent `updatedAt`, l.680-687) : mêmes ids et même `TS_BASE` des deux côtés → déduplication propre.
- **KTD6 — Variable `{occasion}`.** Ajoutée à la liste blanche de `renderTemplate` (l.34 — ligne non touchée par la branche rappels, conflit nul). Valeur au site d'appel : anniversaire → « ton anniversaire » / « votre anniversaire » selon le registre du modèle ; date clé → le libellé `kd.label` tel quel. `{prenom}` déjà disponible.
- **KTD7 — Versions.** `APP_VERSION "1.4.2"`, `CACHE_NAME "kit-crm-v38"` : v36 et v37 sont réservés par les chantiers durcissements et rappels non encore fusionnés — on saute pour garantir l'unicité quel que soit l'ordre de fusion. Conflits triviaux attendus sur ces lignes (résolution : valeur la plus haute).

### Scope Boundaries (non-objectifs)

- Pas de notification automatique d'anniversaire (chantier « rappels effectifs », en pause).
- Pas de suivi de réponse aux vœux (D2), pas de `pendingInvite`.
- Pas de modification des champs de la fiche (anniversaire et dates clés existent déjà).
- Pas d'Outlook, pas de Graph, pas d'Entra.
- Pas d'extension de la fenêtre des 30 jours ni de réglage de fenêtre.

### System-Wide Impact

- `migrateData` : ajout de modèles pour les utilisateurs existants — idempotent, rejouable, transporté par l'export/restauration JSON (déjà génériques sur `templates`).
- Fusion inter-appareils : couverte par le merge de modèles existant (voir KTD5).
- Branche `feat/rappels-effectifs` : conflits limités et connus — ligne d'export KIT_PURE (union), lignes de version (valeur la plus haute), insertion des tests hors zone d'append.
- Service worker : bump `CACHE_NAME` force le rafraîchissement du cache à la mise à jour (mécanique existante).

## Implementation Units

### U1. Correctif jour J (taille S)

- **Goal** : les échéances annuelles se calculent à minuit ; les deux blocs affichent « Aujourd'hui ! » le jour J toute la journée ; `upcomingKDs` porte `contactId` et `date` (préparation de U2 — aujourd'hui seul `upcomingBdays` les porte, l.2375 vs l.2390).
- **Execution note** : partir d'un test qui échoue — le cas « jour J » sur `nextAnnualOccurrence` — puis corriger.
- **Files** : `index.html` (KIT_PURE : `nextAnnualOccurrence` + export ; section Derived : `upcomingKDs`/`upcomingBdays` l.2366-2393 ; bloc dates clés de `renderWeek` l.3134-3146 : libellé « Aujourd'hui ! » ; KIT_TESTS : insertion vers l.220).
- **Patterns to follow** : fonctions pures par composantes comme `dateParts`/`formatDateFr` (l.39-46) ; style des cas KIT_TESTS existants.
- **Test scenarios** : occurrence aujourd'hui → `daysLeft` 0 ; demain → 1 ; hier → année suivante (364/365) ; 29/02 en année non bissextile → 1er mars ; la fonction ne lit jamais l'heure (résultat identique quel que soit le moment de l'appel — testable en pur puisque `todayISO` est un paramètre) ; format de sortie stable.
- **Verification** : 4 portes (Babel, runner node, empreintes lib, `node --check sw.js`), tous les cas verts.

### U2. Vœux actionnables (taille M)

- **Goal** : boutons « Vœux » sur les deux blocs, aperçu modifiable, envoi par canal, modèles par défaut migrés et éditables, journalisation sur confirmation, LISEZMOI et versions.
- **Files** : `index.html` (modèles par défaut vœux + `migrateData` ; liste blanche `renderTemplate` ; `KIT_PURE.voeuxCanalFor` + export ; blocs de `renderWeek` l.3118-3146 : boutons ; nouveau petit modal vœux dans `App` — état local `{ contactId, occasion, famille }` ; panneau modèles l.3410-3415 : condition objet + masquage nbDates ; `APP_VERSION`), `sw.js` (`CACHE_NAME`), `LISEZMOI.txt` (courte section vœux).
- **Patterns to follow** : cascade de canal et construction de liens de `launchInvite` (l.1631-1660) ; journalisation automatique du geste d'invitation (l.1679) ; structure de modal existante (`renderLogModal` l.2486-2526 comme gabarit léger).
- **Contenu des modèles par défaut** (modifiables ensuite dans l'app) :
  - `voeux-anniv-tu` — objet « Joyeux anniversaire ! » ; corps : « Salut {prenom},\n\nJe pense bien à toi aujourd'hui : très joyeux anniversaire !\n\nAu plaisir de se voir bientôt,\n\nÀ très vite, »
  - `voeux-anniv-vous` — objet « Joyeux anniversaire ! » ; corps : « Chère/Cher {prenom},\n\nJe tenais à vous souhaiter un très joyeux anniversaire.\n\nAu plaisir de vous revoir prochainement,\n\nBien cordialement, »
  - `voeux-datecle-tu` — objet « {occasion} » ; corps : « Salut {prenom},\n\nJe pense bien à toi pour {occasion} !\n\nÀ très vite, »
  - `voeux-datecle-vous` — objet « {occasion} » ; corps : « Chère/Cher {prenom},\n\nJe tenais à vous adresser mes meilleures pensées à l'occasion de {occasion}.\n\nBien cordialement, »
- **Test scenarios** : rendu d'un modèle vœux avec `{occasion}` et `{prenom}` ; `{occasion}` selon registre (tu → « ton anniversaire », vous → « votre anniversaire ») ; `voeuxCanalFor` (email → mail ; pas d'email + 06 → whatsapp ; rien → aucun) ; migration : les 4 modèles apparaissent une seule fois même après double passage (idempotence) ; un modèle vœux n'est jamais retourné par `selectedTemplate()` du geste.
- **Verification** : 4 portes vertes + contrôle visuel navigateur (aperçu, lien mailto, journalisation, panneau modèles).

## Verification Contract

À chaque unité : `node /root/ce-work/check-babel.js && node scripts/kit-tests-node.js && node /root/ce-work/check-lib-hashes.js && node --check sw.js` — tous les cas verts, 0 échec. Contrôle visuel de la vue « À suivre » et du panneau modèles sur localhost avant PR.

## Definition of Done

- R1-R6 couverts, AE1-AE6 rejouables à la main.
- Portes vertes sur les deux unités ; revue de code (personas + passe croisée) avant PR.
- LISEZMOI à jour, `APP_VERSION` 1.4.2 / `kit-crm-v38`.
- Aucune dépendance Entra introduite ; aucune zone interdite de KTD2 modifiée.
- PR `feat/anniversaires-voeux` → `main` ; le checkout revient sur `feat/rappels-effectifs` en fin de chantier (le serveur local sert la branche du spike en attente).
