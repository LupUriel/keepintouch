# Recette après fusion (2 minutes, PC puis Android)

- [ ] Dans ⋯ > À propos, la version affichée est bien vN · build vNN (sinon : rechargement forcé, puis recommencer)
- [ ] ⋯ > À propos affiche “Espace de stockage utilisé : X %”
- [ ] ⋯ > Sauvegarde > Restaurer une version liste “état au début du … · N contact(s)” avec un seul bouton « Revenir à cette version »
- [ ] Rouvrir l'app : le bandeau « Recharger » est proposé puis disparaît après rechargement
- [ ] Ouvrir une fiche
- [ ] Journaliser une interaction puis la supprimer
- [ ] Vérifier qu'aucune bannière rouge d'erreur d'enregistrement n'apparaît
- [ ] « Sauvegarder JSON » produit un fichier
- [ ] Hors ligne (mode avion), l'app s'ouvre

## Lignes spécifiques de la version

## Activité de l'entreprise (v1.5.10)

- [ ] Fiche à activité vide : « Rechercher l'effectif » → la liste affiche « Activité : … » sous chaque candidat → choix → message « Activité préremplie : « … » » → la carte ACTIVITÉ DE L'ENTREPRISE affiche le libellé ; dans « Modifier », le champ contient le libellé et la ligne « NAF 2025 … (SIRENE, <date>) »
- [ ] Remplacer l'activité par « Études cliniques (CRO) » puis « Actualiser » : l'activité saisie est conservée, la carte affiche la saisie puis « NAF 2025 … — libellé officiel · ancien code … » ; « Reprendre le libellé officiel » remet le libellé. (Le message « Activité conservée (votre saisie). » s'affiche lors du choix d'un candidat par « Rechercher l'effectif », pas sur « Actualiser ».)
- [ ] Fiche préremplie jamais retouchée, rattachée ensuite à une autre entreprise : l'activité suit le nouveau libellé, à condition qu'aucune propagation manuelle ne l'ait alignée entre-temps
- [ ] ⋯ › Taille des entreprises › « Mettre à jour les effectifs » (données synthétiques) : compte rendu « Activité préremplie sur N fiche(s). » ; une fiche à activité saisie n'est pas modifiée
- [ ] Hors ligne : la fiche affiche activité et libellé ; « À propos » affiche v1.5.11 · kit-crm-v53 ; export Excel : colonnes « Activité » et « Code NAF 2025 » en fin de ligne ; import d'un fichier avec colonne « Activité » → champ rempli ; « Entreprises » montre l'activité sous chaque société ; la recherche « pharma » trouve les fiches
- [ ] Samsung : la carte ACTIVITÉ DE L'ENTREPRISE et la ligne NAF s'affichent sans infobulle ; le formulaire montre le champ en pleine largeur sous FONCTION/ENTREPRISE
- [ ] Synchroniser PC ↔ Samsung : l'activité saisie sur un appareil apparaît sur l'autre
- [ ] Trois fiches « LA POSTE », deux sans activité : le formulaire annonce « Activité partagée avec 2 autres fiches de « LA POSTE » » ; saisir « Distribution du courrier et colis » puis Enregistrer : aucune question, les deux autres fiches affichent la même activité ; modifier une deuxième fois : aucune question non plus
- [ ] Une quatrième fiche saisie « SAINT-GOBAIN » et une cinquième saisie « SAINT GOBAIN » sont reconnues comme la même entreprise ; celle qui porte « Logistique (saisi) » est nommée dans la question ; Annuler la laisse intacte et aligne les fiches vides ; refaire et répondre OK la remplace ; l'onglet Entreprises continue d'afficher deux lignes
- [ ] Vider l'activité sur une fiche dont les sœurs en ont une : la question apparaît ; Annuler conserve toutes les activités des sœurs, y compris celles issues du libellé officiel
- [ ] Fiche sans entreprise : aucune ligne « Activité partagée avec … », aucune propagation
- [ ] Cocher « En transition » après avoir saisi une activité, puis Enregistrer : aucune question
- [ ] Fiche préremplie par SIRENE puis alignée par propagation : « Actualiser » conserve l'activité propagée et n'y remet pas le libellé officiel
- [ ] Sur l'entreprise la plus fournie du carnet réel, modifier l'activité et enregistrer : le retour à la fiche reste immédiat et aucune bannière rouge d'erreur d'enregistrement n'apparaît

**Activité partagée (v1.5.11)**

- [ ] Une fiche archivée de la même entreprise : la ligne annonce « (dont 1 fiche archivée) », et elle l'annonce encore quand la fiche archivée porte déjà la même activité
- [ ] Deux fiches « MARTIN CONSEIL » rattachées à deux SIREN différents : la ligne n'en compte pas l'autre, et l'enregistrement ne la touche pas
- [ ] Trois fiches « INDÉPENDANT » sans activité : la ligne annonce « Activité partagée avec 2 autres fiches de « INDÉPENDANT » » avant tout enregistrement — c'est la garde contre les dénominations fourre-tout
- [ ] Une fiche sœur « En transition » n'est ni comptée dans la ligne, ni nommée dans la question, ni modifiée
- [ ] Après un enregistrement qui recopie, la fiche affiche « Activité recopiée sur N autres fiches de « X ». » pendant dix secondes ; répondre Annuler à la question affiche « N fiche(s) inchangée(s). »

## Recommandations et apporteurs (v1.5.9)

- [ ] Fiche d'un apporteur (données synthétiques) : « Je l'ai contacté » → « M'a recommandé quelqu'un » → personne recommandée choisie : la fiche affiche « Vous a recommandé : <nom> » (souligné, clic → fiche), la fiche de la personne recommandée affiche « Recommandé(e) par : <apporteur> », l'historique « → <nom> » ; relance planifiée et état d'attente de l'apporteur inchangés
- [ ] Stats > Apporteurs : l'apporteur apparaît avec ses recommandations nommées et « à remercier » ; un « Appel avec échange » sur SA fiche à une date ≥ celle de la recommandation lève la marque ; le récapitulatif suit
- [ ] « Je lui ai recommandé quelqu'un » sur une fiche : « Vous lui avez recommandé : <nom> » ; sur la fiche de la personne : « Recommandé(e) à : <contact> » ; tuile « Recommandations reçues (12 mois) » avec légende « … donnée par vous · … apporteur actif »
- [ ] Le modal ne propose plus « Dossier confié » ; un dossier déjà saisi reste « Dossier confié · via … » ; Stats n'affiche plus « Origines des fiches » ; « À propos » affiche v1.5.9 · kit-crm-v51
- [ ] Recommandation sans fiche liée : « Vous a recommandé : une personne sans fiche » ; ✏ permet de rattacher une fiche ensuite
- [ ] Le formulaire d'une fiche propose la catégorie « Avocat / EC » (PC et Samsung), sans doublon après synchronisation
- [ ] Données réelles : supprimer puis ressaisir les recommandations de la v1.5.8 sur la fiche de l'apporteur ; la fiche de la personne recommandée affiche « Recommandé(e) par : … »
- [ ] Six recommandations d'un même apporteur : la fiche affiche cinq noms puis « … et 1 autre » ; le clic déplie
- [ ] ✏ sur un « Dossier confié » déjà saisi : le champ s'intitule « APPORTEUR », aucun bouton de type n'est actif

## Récupération au démarrage (procédure de test, données synthétiques uniquement)

- [ ] AE4 — Dans la console, exécuter `indexedDB.open("kit-crm-db", 1)` puis, dans `onsuccess`, `db.transaction("kv", "readwrite").objectStore("kv").put({ contacts: [{ id: "t1", name: "Test Un", category: "Client", interactions: [] }, { id: "t2", name: "Test Deux", category: "Client", interactions: [] }, { id: "t3", name: "Test Trois", category: "Client", interactions: [] }], categories: ["Client", "Prospect"], deletedContacts: [], deletedInteractions: [], savedAt: "2026-09-01T10:00:00.000Z" }, "data")`. Exécuter ensuite `localStorage.removeItem("kit-crm-v5")`, puis recharger : l'écran « Vos données locales sont absentes ou illisibles » est attendu. Avant de cliquer, vérifier que `localStorage.getItem("kit-crm-v5") === null`.
- [ ] AE5 — À jouer juste après AE4 (un miroir doit exister) : exécuter `localStorage.setItem("kit-crm-v5", "{corrompu")`, puis recharger. Vérifier ensuite qu'une clé `quarantaine:*` existe dans IndexedDB. Jouée isolément sur un profil vierge, aucun écran n'apparaît : base vide et clé `quarantaine:*` seulement.
- [ ] AE6 — Effacer les données du site, puis recharger : l'écran de mot de passe habituel est attendu.
- [ ] AE12 — Cas (b) : après « Continuer sans restaurer », Verrouiller puis déverrouiller → le miroir IndexedDB n'a pas été écrasé (vérifier dans la console que la clé `data` contient toujours la copie la plus récente).

Résultat : validé le … sur PC / Android
