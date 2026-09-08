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

## Recommandations et apporteurs (v1.5.9)

- [ ] Fiche d'un apporteur (données synthétiques) : « Je l'ai contacté » → « M'a recommandé quelqu'un » → personne recommandée choisie : la fiche affiche « Vous a recommandé : <nom> » (souligné, clic → fiche), la fiche de la personne recommandée affiche « Recommandé(e) par : <apporteur> », l'historique « → <nom> » ; relance planifiée et état d'attente de l'apporteur inchangés
- [ ] Stats > Apporteurs : l'apporteur apparaît avec ses recommandations nommées et « à remercier » ; un « Appel avec échange » sur SA fiche à une date ≥ celle de la recommandation lève la marque ; le récapitulatif suit
- [ ] « Je lui ai recommandé quelqu'un » sur une fiche : « Vous lui avez recommandé : <nom> » ; sur la fiche de la personne : « Recommandé(e) à : <contact> » ; tuile « Recommandations reçues (12 mois) » avec légende « … donnée par vous · … apporteur actif »
- [ ] Le modal ne propose plus « Dossier confié » ; un dossier déjà saisi reste « Dossier confié · via … » ; Stats n'affiche plus « Origines des fiches » ; « À propos » affiche v1.5.9 · kit-crm-v51
- [ ] Recommandation sans fiche liée : « Vous a recommandé : une personne sans fiche » ; ✏ permet de rattacher une fiche ensuite
- [ ] Le formulaire d'une fiche propose la catégorie « Avocat / EC » (PC et Samsung), sans doublon après synchronisation
- [ ] Données réelles : supprimer puis ressaisir les recommandations de la v1.5.8 sur la fiche de l'apporteur ; la fiche de la personne recommandée affiche « Recommandé(e) par : … »

## Récupération au démarrage (procédure de test, données synthétiques uniquement)

- [ ] AE4 — Dans la console, exécuter `indexedDB.open("kit-crm-db", 1)` puis, dans `onsuccess`, `db.transaction("kv", "readwrite").objectStore("kv").put({ contacts: [{ id: "t1", name: "Test Un", category: "Client", interactions: [] }, { id: "t2", name: "Test Deux", category: "Client", interactions: [] }, { id: "t3", name: "Test Trois", category: "Client", interactions: [] }], categories: ["Client", "Prospect"], deletedContacts: [], deletedInteractions: [], savedAt: "2026-09-01T10:00:00.000Z" }, "data")`. Exécuter ensuite `localStorage.removeItem("kit-crm-v5")`, puis recharger : l'écran « Vos données locales sont absentes ou illisibles » est attendu. Avant de cliquer, vérifier que `localStorage.getItem("kit-crm-v5") === null`.
- [ ] AE5 — À jouer juste après AE4 (un miroir doit exister) : exécuter `localStorage.setItem("kit-crm-v5", "{corrompu")`, puis recharger. Vérifier ensuite qu'une clé `quarantaine:*` existe dans IndexedDB. Jouée isolément sur un profil vierge, aucun écran n'apparaît : base vide et clé `quarantaine:*` seulement.
- [ ] AE6 — Effacer les données du site, puis recharger : l'écran de mot de passe habituel est attendu.
- [ ] AE12 — Cas (b) : après « Continuer sans restaurer », Verrouiller puis déverrouiller → le miroir IndexedDB n'a pas été écrasé (vérifier dans la console que la clé `data` contient toujours la copie la plus récente).

Résultat : validé le … sur PC / Android
