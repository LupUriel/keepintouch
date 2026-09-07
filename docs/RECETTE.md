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

## Récupération au démarrage (procédure de test, données synthétiques uniquement)

- [ ] AE4 — Dans la console, exécuter `indexedDB.open("kit-crm-db", 1)` puis, dans `onsuccess`, `db.transaction("kv", "readwrite").objectStore("kv").put({ contacts: [{ id: "t1", name: "Test Un", interactions: [] }, { id: "t2", name: "Test Deux", interactions: [] }, { id: "t3", name: "Test Trois", interactions: [] }], categories: ["Client", "Prospect"], deletedContacts: [], deletedInteractions: [], savedAt: "2026-09-01T10:00:00.000Z" }, "data")`. Exécuter ensuite `localStorage.removeItem("kit-crm-v5")`, puis recharger : l'écran « Vos données locales sont absentes ou illisibles » est attendu. Avant de cliquer, vérifier que `localStorage.getItem("kit-crm-v5") === null`.
- [ ] AE5 — Exécuter `localStorage.setItem("kit-crm-v5", "{corrompu")`, puis recharger. Vérifier ensuite qu'une clé `quarantaine:*` existe dans IndexedDB.
- [ ] AE6 — Effacer les données du site, puis recharger : l'écran de mot de passe habituel est attendu.

Résultat : validé le … sur PC / Android
