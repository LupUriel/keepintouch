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

## Dossiers et apporteurs (v1.5.8)

- [ ] Sur une fiche cliente (données synthétiques), « Je l'ai contacté » → « Dossier confié » avec un apporteur : l'historique affiche « via <apporteur> », la relance planifiée et l'état « en attente » de la fiche sont conservés, « Dernière rencontre » inchangée
- [ ] Stats > Apporteurs : l'apporteur apparaît avec « à remercier » ; un « Appel avec échange » enregistré sur SA fiche à une date ≥ celle du dossier fait disparaître la marque ; la section « Apporteurs à remercier » du récapitulatif suit
- [ ] Dans le modal, taper le début du nom de l'apporteur sans cliquer la suggestion puis « Confirmer » : si une seule fiche correspond elle est retenue, sinon le message « Choisissez une fiche dans la liste… » s'affiche et rien n'est enregistré

## Récupération au démarrage (procédure de test, données synthétiques uniquement)

- [ ] AE4 — Dans la console, exécuter `indexedDB.open("kit-crm-db", 1)` puis, dans `onsuccess`, `db.transaction("kv", "readwrite").objectStore("kv").put({ contacts: [{ id: "t1", name: "Test Un", category: "Client", interactions: [] }, { id: "t2", name: "Test Deux", category: "Client", interactions: [] }, { id: "t3", name: "Test Trois", category: "Client", interactions: [] }], categories: ["Client", "Prospect"], deletedContacts: [], deletedInteractions: [], savedAt: "2026-09-01T10:00:00.000Z" }, "data")`. Exécuter ensuite `localStorage.removeItem("kit-crm-v5")`, puis recharger : l'écran « Vos données locales sont absentes ou illisibles » est attendu. Avant de cliquer, vérifier que `localStorage.getItem("kit-crm-v5") === null`.
- [ ] AE5 — À jouer juste après AE4 (un miroir doit exister) : exécuter `localStorage.setItem("kit-crm-v5", "{corrompu")`, puis recharger. Vérifier ensuite qu'une clé `quarantaine:*` existe dans IndexedDB. Jouée isolément sur un profil vierge, aucun écran n'apparaît : base vide et clé `quarantaine:*` seulement.
- [ ] AE6 — Effacer les données du site, puis recharger : l'écran de mot de passe habituel est attendu.
- [ ] AE12 — Cas (b) : après « Continuer sans restaurer », Verrouiller puis déverrouiller → le miroir IndexedDB n'a pas été écrasé (vérifier dans la console que la clé `data` contient toujours la copie la plus récente).

Résultat : validé le … sur PC / Android
