---
title: Veille personnalisée par profil - Plan
type: feat
date: 2026-09-09
topic: veille-personnalisee
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-brainstorm
execution: code
---

# Veille personnalisée par profil - Plan

## Goal Capsule

**Objectif** — Permettre d'envoyer, à la demande, une actualité de droit social ciblée aux contacts désignés du carnet, sans que l'application appelle un modèle de langage ni qu'un élément nominatif quitte le poste par défaut. Le périmètre couvert est la chaîne complète d'un envoi : désignation des destinataires, export de profils, retour des projets rédigés, validation, ouverture du courriel. La rédaction elle-même se fait hors application et n'est pas spécifiée ici.

**Autorité produit** — Uriel SANSY. Les décisions de la section Key Decisions ont été prises en dialogue le 2026-09-09 et ne sont pas à rouvrir en planification.

**Blocages ouverts** — Aucun. Les trois questions ouvertes restantes se tranchent en planification.

**Conditions d'arrêt** — Arrêter et demander si : une exigence supposerait un appel réseau depuis l'application, un hook React devrait être posé hors de la tête du composant principal, une donnée nominative devrait sortir en mode restreint, ou une décision de la section Key Decisions devrait être contredite pour avancer.

**Profil d'exécution** — Unités livrées dans l'ordre du plan, une par commit, chacune vérifiée par les portes avant la suivante. Le code de production est écrit par Codex sur paquet borné ; l'orchestrateur inspecte, vérifie et committe. Fixtures synthétiques exclusivement.

**Propriété de la fin de chaîne** — L'orchestrateur ouvre la demande de fusion et ne la déclare prête qu'après des contrôles verts ; la fusion et la mise en production appartiennent à l'utilisateur.

**Révision** — Trois passes. Le contrat produit relu le 2026-09-09 par cinq lentilles indépendantes (58 constats graves, intégrés), puis cette révision vérifiée par quatre lentilles et leurs contradicteurs (64 constats, 14 confirmés, 50 réfutés). Le plan d'implémentation vérifié le 2026-09-11 par trois lentilles et leurs contradicteurs (46 constats, 9 confirmés, 29 réfutés), puis relu le même jour par sept relecteurs documentaires — cohérence, faisabilité, produit, conception, sécurité, périmètre, adversaire — dont 74 constats ; les corrections mécaniques et les incohérences nettes sont intégrées, les décisions restantes sont listées en Outstanding Questions. Les exigences ont été renumérotées lors de la première révision seulement.

**Préservation du contrat produit** — Restructuré, sans changement de portée : R27 confiait la date de veille aux champs de fiche synchronisés ; elle vit désormais comme entrée de suivi et se synchronise par le mécanisme des interactions. Le comportement observable est le même — la date se retrouve sur les deux appareils — mais la double représentation que le plan d'implémentation avait introduite est levée. Aucune autre exigence n'a changé de sens.

## Product Contract

### Summary

L'application apprend à préparer un envoi d'actualité : l'utilisateur coche dans les fiches qui doit recevoir, lance la préparation, et obtient un fichier de **profils** décrivant des situations d'entreprise sans nommer personne — les fiches dont les valeurs transmises coïncident partagent un seul profil, donc un seul texte. Les projets rédigés hors application reviennent par un fichier déposé dans l'outil, qui les présente profil par profil avec leurs destinataires ; chaque validation ouvre les courriels correspondants, que l'utilisateur envoie lui-même.

### Problem Frame

Le cabinet diffuse des lettres juridiques non personnalisées, et aucune source ne remonte à l'utilisateur ce qui concerne précisément les branches et les tailles d'entreprise de ses interlocuteurs. Écrire à chacun une actualité pertinente suppose de croiser sa convention collective, son effectif et son activité — un travail que le carnet permet mais que personne ne fait, faute d'outil.

Deux contraintes encadrent toute solution. D'abord la déontologie : le secret professionnel vise nommément le nom des clients (RIN art. 2.2) et le guide *Déontologie et intelligence artificielle* adopté par le CNB le 17 mars 2026 demande de ne transmettre à aucune IA générative une information couverte par ce secret. Ensuite la réidentification : le triplet branche + activité + effectif n'est pas un agrégat. Mesuré le 2026-09-09 sur l'API publique des entreprises, sans recours au carnet, le segment « métallurgie, 400 salariés, fabrication de câbles électriques » désigne **trois entreprises en France** ; le même exercice sur Syntec + 1 000-1 999 salariés en désigne 66, mais retombe à zéro ou une dès que l'activité fine est ajoutée. La précision qui rend le courriel utile est celle qui permet de retrouver l'entreprise.

### Key Decisions

- **Deux modes d'export, choisis à chaque lancement, jamais mémorisés** (session-settled: user-directed — choisi contre un mode unique : l'utilisateur peut recourir à un outil sous contrat professionnel, où le fournisseur n'accède pas aux données saisies ; le régime dépend du compte, pas de la marque). Gouverne R10, R12, R13, R14.
- **Le mode restreint est la position par défaut** (session-settled: user-approved). Resserrer plus tard ce qui sort ne coûte rien ; l'inverse est irréversible. Gouverne R10.
- **Les champs libres ne sortent dans aucun mode** (session-settled: user-directed — choisi contre un mode « vraiment tout »). Notes et commentaires d'interactions sont les seuls endroits où une confidence peut se loger sans que l'utilisateur puisse la relire avant chaque envoi. Gouverne R13.
- **La désignation vit dans la fiche** (session-settled: user-directed — choisi contre une sélection mémorisée au moment de l'envoi et contre une règle « tout le monde sauf exclusions »). Gouverne R1.
- **Une fiche inapte est écartée et signalée, jamais dégradée** (session-settled: user-directed). Rien de générique ne part sous couvert de veille ciblée. Gouverne R8.
- **Un envoi de veille ne compte pas comme un échange** (session-settled: user-directed). Sans quoi un envoi collectif viderait le tableau de bord de ses relances et l'outil cesserait de signaler les contacts réellement délaissés. Gouverne R25.
- **Le seuil d'effectif est une donnée saisie, jamais déduite** (session-settled: user-directed — proposé par l'utilisateur, choisi contre une déduction depuis l'effectif précis existant). Deux raisons. D'abord l'effectif INSEE et l'effectif de l'article L. 1111-2 du code du travail ne sont pas la même grandeur : temps partiels au prorata, contrats de remplacement écartés. Ensuite et surtout, **les règles de franchissement diffèrent selon le dispositif** — douze mois consécutifs pour la mise en place du comité social et économique (C. trav., art. L. 2311-2), cinq années civiles consécutives pour le décompte annuel de la sécurité sociale issu de la loi PACTE (CSS, art. L. 130-1) — de sorte qu'aucun calcul unique ne peut produire « le seuil franchi ». Seul l'utilisateur, qui a vu passer le CSE ou la BDESE, connaît le fait du franchissement pour le dispositif en cause. Gouverne R11, R27, R28.
- **L'unité de rédaction est le profil, pas la fiche.** Des fiches dont la branche, l'effectif, le seuil, l'activité transmise et le registre coïncident partagent un seul profil, donc un seul texte : soixante destinataires devraient se ramener à un nombre de textes nettement inférieur — l'ordre de grandeur d'une quinzaine est une hypothèse de travail, non une mesure : le regroupement dépend entièrement de la dispersion réelle du carnet, et la mesure de réidentification citée plus haut suggère au contraire des segments étroits. À mesurer au premier usage. Correction d'une incohérence relevée en relecture. Gouverne R9, R18, R20.
- **L'activité sort, mais seulement après relecture, une fois par entreprise** (session-settled: user-directed — choisi contre l'export du seul libellé officiel INSEE, contre un avertissement répété à chaque aperçu et contre une exclusion automatique dès que le texte diffère du libellé). C'est le champ qui rend le courriel pertinent et c'est une saisie libre : la relecture est payée une fois par société, la modification du texte la fait tomber. Gouverne R11, R11a.
- **Cocher et décocher depuis l'écran de préparation modifie la fiche** (session-settled: user-directed — choisi contre une exclusion valable pour le seul envoi et contre les deux mécanismes distingués à l'écran). Un seul concept de désignation, celui qui vit dans la fiche ; sauter quelqu'un pour une fois suppose de le recocher ensuite. Gouverne R2, R22.
- **Le courriel de veille n'est pas une offre de service au sens de l'article 10 du RIN : il ne porte aucune mention d'honoraires et l'application n'en contrôle aucune** (session-settled: user-directed — l'utilisateur, avocat, a qualifié l'acte ; choisi contre des mentions obligatoires contrôlées, contre des mentions réservées aux prospects et contre un simple rappel à l'écran). Le texte informe d'une actualité qui concerne l'entreprise du destinataire ; sa clôture a été délibérément décommercialisée lors de l'essai à blanc du 2026-09-08. Si le contenu venait à proposer une prestation, la qualification changerait et cette décision serait à rouvrir.
- **Le presse-papiers est le régime normal de sortie, pas l'exception.** Mesuré sur les courriels de l'essai à blanc : 1 878 et 1 786 caractères de lien pour un plafond de 1 800. Le plan cesse de présenter la bascule comme un cas de bord. Gouverne R23, R24.

### Requirements

**Désignation des destinataires**

- R1. Chaque fiche porte un marqueur « reçoit la veille », faux par défaut, modifiable dans le formulaire de fiche.
- R2. Le marqueur est visible et actionnable hors de la fiche : un filtre au tableau de bord isole les fiches désignées, et l'écran de préparation permet de cocher et décocher depuis la liste. La case de l'écran **est** celle de la fiche : la décocher retire durablement la personne des envois de veille, jusqu'à ce qu'elle soit recochée. Il n'existe pas d'exclusion valable pour un seul envoi. Sans quoi désigner soixante personnes supposerait d'ouvrir soixante formulaires.
- R3. Une fiche de catégorie « Avocat / EC » n'est jamais retenue, quel que soit son marqueur.
- R4. L'écran de préparation propose les catégories réellement présentes dans le carnet, y compris celles créées par l'utilisateur, et permet de retenir celles qu'il veut.
- R5. Une fiche archivée, une fiche « En transition » et une fiche sans adresse électronique ne sont jamais retenues. La fiche en transition est écartée parce que sa branche, son effectif et son activité décrivent un employeur que la personne a quitté.
- R6. Plusieurs fiches d'une même entreprise peuvent être désignées ; chacune reçoit son propre courriel.
- R7. Avant de produire quoi que ce soit, l'écran de préparation affiche la liste nominative des personnes à qui l'envoi s'adresse.
- R8. Une fiche désignée dont la branche ou l'effectif manquent est écartée de l'export ; l'écran la nomme et indique ce qui lui manque. Valent branche manquante le champ vide et le libellé « Autre » — convention non listée, on ne sait pas laquelle. Le libellé « Sans CCN » n'est **pas** une absence d'information mais une information : l'entreprise n'applique aucune convention collective ; la fiche est exportée et son profil le dit, l'actualité se limitant alors au socle commun du droit du travail (décision de l'utilisateur en recette de la v1.6.0, le 2026-09-11, corrigeant une erreur du plan qui confondait les deux cas). Le libellé « Établissement public » n'est pas une branche mais reste une information exploitable : la fiche est exportée, et son profil dit que l'entreprise relève d'un statut de droit public plutôt que d'une convention de branche.

**Le lancement**

- R9. Un lancement porte un identifiant propre et une date. Les fiches retenues sont regroupées en **profils distincts** : deux fiches partagent un profil quand coïncident les valeurs qui seront **effectivement transmises** — branche, effectif, seuil franchi, activité telle que R11a la calcule, et registre de politesse. Le regroupement porte sur les valeurs transmises, jamais sur les valeurs stockées : deux fiches dont l'activité saisie diffère mais dont aucune n'est relue partagent un profil si leur libellé officiel est le même, et deux fiches à l'activité identique dont une seule est relue n'en partagent pas.
- R10. L'écran de préparation demande le mode d'export à chaque lancement. Le mode restreint est présélectionné et le choix n'est jamais mémorisé d'un lancement à l'autre.
- R11. En mode restreint, un profil porte exactement : son numéro, la branche, l'effectif, le seuil franchi (R28), l'activité si elle a été relue (R11a), le registre de politesse, la date de la plus récente veille préparée parmi ses fiches, et le nombre de destinataires. Aucun élément nominatif n'y figure : ni nom, ni prénom, ni dénomination d'entreprise, ni adresse, ni courriel.
- R11a. L'activité, champ de saisie libre, ne figure au profil qu'après avoir été relue et marquée bonne à transmettre dans son état exact. La relecture porte sur le couple dénomination et texte : la valider une fois vaut pour toutes les fiches de cette entreprise portant ce texte, et toute modification ultérieure du texte la fait tomber. À défaut de relecture, le profil porte le libellé officiel INSEE lorsqu'il existe, et ne porte aucune ligne d'activité sinon ; la fiche reste exportée.
- R12. En mode étendu, le profil porte en outre, pour chaque destinataire, une liste **close** de cinq champs : prénom, nom, dénomination de l'entreprise, fonction, lieu d'exercice. Aucun autre champ de la fiche n'y figure. La catégorie et la date du dernier échange, d'abord inscrites ici, en ont été retirées à la demande de l'utilisateur en recette de la v1.6.0 (2026-09-11) : le texte étant rédigé par profil et non par personne, ni l'une ni l'autre ne sert à la rédaction, et la date du dernier échange est une trace de la relation avocat-contact — l'agenda de l'avocat relève du secret (RIN art. 2.2). La liste doit coïncider avec ce que l'écran annonce pour ce mode.
- R13. Ne sortent dans aucun mode : les notes, les commentaires d'interactions, le lieu de rencontre, la prochaine action, l'origine, la note de relance et les étiquettes — tous champs de saisie libre.
- R14. Un aperçu obligatoire affiche le contenu exact qui va sortir, ligne par ligne, avant que l'export soit produit, dans les deux modes.
- R15. L'application n'émet aucune requête réseau pour préparer, transmettre ou récupérer une veille. L'export est un fichier écrit localement.
- R16. Le lancement enregistre localement la correspondance entre chaque numéro de profil et les fiches qu'il désigne. Ce registre survit à la fermeture de l'application ; sans lui, aucun retour ne peut être rattaché à son destinataire.

**Retour et validation**

- R17. Le fichier de retour porte l'identifiant du lancement. L'application refuse, avec son motif, tout retour dont l'identifiant est absent ou illisible, et tout retour d'un lancement que **cet appareil** connaît et a clos. Lorsque l'identifiant est inconnu de cet appareil — dépôt sur l'autre poste — elle ne refuse pas : elle réapparie par description, per KTD2, et ne refuse que si ce réappariement échoue pour tous les profils. Un lancement est **clos** quand chacun de ses projets a été validé ou refusé ; un lancement interrompu reprend là où la validation s'était arrêtée, sans reproposer les projets traités.
- R18. Le fichier de retour est décrit dans le plan de réalisation : au minimum, l'identifiant du lancement, et pour chaque profil son numéro, sa description, un objet et un corps. Un fichier incomplet ou tronqué est refusé sans rien modifier. Un numéro de profil absent du lancement fait refuser le fichier lorsque le lancement est connu de cet appareil ; sur la voie par description, un profil qui ne trouve aucun destinataire est signalé seul, les autres restant validables.
- R19. Un projet est un modèle à trous pour le seul prénom : l'application le substitue au moment du rendu. Le registre n'est pas substituable — dans l'application, tutoiement et vouvoiement sont deux textes distincts, non deux formes d'un même texte — et c'est pourquoi il figure dans la clé de regroupement de R9 : chaque projet revient écrit d'emblée dans le registre de ses destinataires.
- R19a. Le registre de politesse d'une fiche est modifiable dans le formulaire de fiche. Aujourd'hui il n'est écrit que par la feuille d'invitation, et une fiche qui n'en a jamais reçu vaut « vous » pour un lecteur et « tu » pour un autre : la valeur par défaut devient le vouvoiement partout, y compris pour les fiches existantes dont le champ est vide.
- R20. La validation porte sur un projet, donc sur un profil : l'écran montre le texte une fois, avec la liste des destinataires qui le recevront, et l'utilisateur valide ou refuse l'ensemble. Refuser un projet n'empêche pas les autres.
- R20a. L'aptitude de chaque destinataire est réévaluée au moment de la validation, non à l'export : une fiche archivée, passée « En transition », privée de son adresse électronique ou dont le marqueur a été retiré entre-temps est écartée du projet et nommée à l'écran.
- R21. L'utilisateur peut corriger le texte d'un projet avant validation ; la correction vaut pour tous les destinataires de ce profil.
- R22. Aucune écriture automatique n'a lieu dans les fiches avant validation. Les deux gestes explicites de l'écran de préparation — cocher ou décocher une personne, marquer une activité relue — écrivent dans la fiche parce que l'utilisateur les demande, et sont les seules exceptions. Le registre du lancement (R16) et le journal (R26) ne sont pas des écritures dans les fiches.

**Envoi**

- R23. La validation prépare le courriel de chaque destinataire. Lorsque le lien de messagerie dépasse la limite technique — cas le plus fréquent pour un texte de veille — l'application copie le corps dans le presse-papiers, affiche l'objet à recopier, et le dit avant que l'utilisateur clique, non après.
- R24. L'application n'envoie jamais de courriel elle-même, et ne sait pas si un courriel a été envoyé. Tout libellé d'interface le dit ainsi : « préparé le », jamais « envoyé le ».
- R25. La date de veille d'une fiche appartient à la famille des entrées de suivi au sens de la décision du 2026-09-07 : elle n'entre dans aucun calcul de relance ni de statut. Ne bougent notamment pas du fait d'une veille : la relance planifiée et sa note, l'attente de retour, la mise en sommeil, la date de dernier contact de l'export Excel, et les statistiques d'interactions.

**Traces et synchronisation**

- R26. L'application tient un journal des lancements : identifiant, date, mode retenu, nombre de profils et de destinataires. Il est consultable, et permet de revoir ce qui a été préparé la fois précédente.
- R27. Trois clauses. (a) Le marqueur de R1, l'état de relecture de R11a, le registre de R19a et le seuil de R28 sont des champs de fiche synchronisés au même titre que les autres : dernière écriture datée gagne. La date de veille de R25 n'en est pas un — elle vit comme entrée de suivi et se synchronise par le mécanisme des interactions. (b) Le rapport de fusion ne nomme aujourd'hui que les champs venus de l'autre appareil ; il doit nommer aussi ceux où la valeur locale l'a emporté sur une valeur distante plus ancienne, faute de quoi un retrait de désignation écrasé reste invisible. (c) Le journal des lancements de R26 survit à la synchronisation et à la restauration d'une sauvegarde, sans être fusionné entre appareils : chacun garde le sien, ce que KTD2 rend acceptable.

**Seuil d'effectif au sens du droit du travail**

- R28. La fiche porte un champ « seuil franchi », renseigné à la main, à une seule valeur parmi : je ne sais pas (défaut), moins de 11, 11, 50, 300, 1 000. Il est distinct de l'effectif et n'est jamais déduit d'un nombre ni d'une réponse SIRENE. Sous le champ, une aide rappelle que l'effectif INSEE ne dit pas si un seuil est franchi et que les règles de décompte et de franchissement diffèrent selon les dispositifs, avec trois renvois cliquables vers Légifrance : décompte des effectifs (C. trav., art. L. 1111-2), comité social et économique (C. trav., art. L. 2311-2), décompte annuel de la sécurité sociale (CSS, art. L. 130-1). Ces liens ouvrent le navigateur sur un geste de l'utilisateur ; ils ne sont pas des appels réseau de l'application et ne fonctionnent pas hors ligne.
- R29. Le seuil est facultatif : son absence n'écarte pas la fiche au titre de R8. Quand il vaut « je ne sais pas », le profil dit que le seuil est inconnu plutôt que de laisser croire à un seuil non franchi.

### Flows

- F1. **Un envoi complet.** L'utilisateur ouvre l'écran de veille → retient les catégories → voit la liste nominative des destinataires et corrige les cases → lit la liste des fiches écartées et ce qui leur manque → choisit le mode, restreint par défaut → lit l'aperçu de ce qui va sortir → relit et marque les activités que l'aperçu signale → produit le fichier de profils → le confie à l'outil de rédaction, hors application → dépose le fichier de retour → parcourt les projets, un par profil, avec leurs destinataires → corrige s'il le souhaite → valide → les courriels se préparent un par un → il les envoie depuis sa messagerie.

### Acceptance Examples

- AE1. Douze fiches désignées se répartissant sur quatre couples branche × effectif × activité : l'export contient quatre profils, non douze, chacun indiquant son nombre de destinataires.
- AE2. Deux fiches désignées dans la même société, mêmes données : un seul profil, un seul texte, deux courriels portant chacun son prénom.
- AE3. Une fiche désignée sans convention collective : elle n'apparaît pas dans l'export, et l'écran la nomme en indiquant « convention collective manquante ». Idem pour une fiche sans adresse électronique, pour une fiche archivée et pour une fiche « En transition ».
- AE4. Une fiche « Avocat / EC » dont le marqueur a été coché par erreur : elle n'est jamais retenue.
- AE5. Mode étendu retenu : l'aperçu montre les champs nommés par R12 et rien d'autre — ni note, ni lieu de rencontre, ni prochaine action. Au lancement suivant, le mode est revenu à restreint sans intervention.
- AE6. Deux lancements successifs sans dépôt du premier retour : déposer ensuite le retour du premier est accepté et s'applique à ses propres destinataires. Redéposer le fichier d'un lancement **clos** est refusé avec son motif ; redéposer celui d'un lancement interrompu reprend sans reproposer les projets déjà traités.
- AE7. Application fermée puis rouverte entre l'export et le retour : les profils retrouvent leurs destinataires.
- AE8. Un profil dont toutes les fiches ont été supprimées depuis l'export : le projet est signalé comme sans destinataire, les autres restent validables.
- AE9. Après un envoi touchant quarante fiches dont douze portent une relance planifiée avec sa note : les douze relances et leurs notes sont intactes, le tableau de bord affiche les mêmes échéances qu'avant, et chaque fiche porte sa date de veille.
- AE10. Une fiche dont l'effectif INSEE est « 250-499 sal. » et dont le seuil franchi est renseigné à 50 : le profil transmet le seuil 50, non 300 ; une fiche de même tranche sans seuil renseigné transmet « seuil inconnu », et reste exportée.
- AE11. Marqueur décoché sur un appareil, puis fusion avec l’autre appareil qui le portait coché : la modification la plus récente l’emporte, et l’écart est nommé au rapport de fusion dans les deux sens — que la valeur retenue vienne de l’appareil local ou de l’autre.
- AE12. Projet dont le corps dépasse la limite du lien de messagerie : l'application l'annonce avant le clic, copie le corps et affiche l'objet à recopier.
- AE13. Une fiche dont l'activité saisie est « Filiale française de DUPONT SA, site de Roubaix », non relue : l'aperçu la propose à la relecture et, tant qu'elle n'est pas marquée, le profil porte le libellé officiel INSEE à sa place. Une fois marquée, elle sort ; corriger ensuite le texte d'un mot la fait retomber à relire.

### Scope Boundaries

Hors de ce plan, et volontairement :

- L'envoi automatique de courriels depuis l'application. Le geste final reste manuel.
- Tout appel à un modèle de langage depuis l'application, et tout appel réseau automatique.
- Le préremplissage ou la suggestion automatique des conventions collectives : décision antérieure, motivée par le caractère déclaratif et souvent inexact des sources.
- La lecture assistée de sites de presse professionnelle sous licence, écartée le 2026-09-08 au vu du fichier robots.txt et des conditions générales d'AEF Info.
- La fiche mensuelle « Ce qui change au 1er du mois en droit social » : sujet distinct, à traiter ensuite.
- Le rythme : aucun déclenchement périodique, l'envoi part quand l'utilisateur le demande.
- La méthode de rédaction — choix des sources, structure des briefs, ton des courriels — éprouvée par l'essai à blanc du 2026-09-08 et hors du périmètre applicatif.

### Outstanding Questions

- **Faut-il signaler les profils qui désignent trop peu d’entreprises ?** Le service statistique public ne diffuse pas une valeur portant sur moins de trois unités. L’application ne peut pas le mesurer elle-même sans un appel réseau que R15 interdit ; la mesure se ferait donc hors application, au moment de la rédaction, et le récapitulatif de retour signalerait les profils les plus étroits. À décider : garde-fou utile ou complexité inutile.
- **Où placer le champ « seuil franchi » de R28 ?** Le formulaire de fiche l'exposerait à chaque saisie ; le panneau « Taille des entreprises », où vit déjà l'effectif précis, le rangerait avec ses voisins mais le rendrait moins visible.


---

## Planning Contract

### Key Technical Decisions

- **KTD1. Livraison en deux versions utilisables.** v1.6.0 livre la préparation (couture de fiche, aptitude, regroupement, écran de préparation, fichier de profils) ; v1.6.1 livre le retour, la validation et l'ouverture des courriels. La première moitié sert déjà seule : l'utilisateur confie le fichier et recopie les textes à la main, comme lors de l'essai à blanc du 2026-09-08. D'un bloc, rien ne serait utilisable avant la fin. (session-settled: user-approved — chosen over une livraison unique : rien d'utilisable avant la fin.)
- **KTD2. Le retour se réapparie d'abord par mémoire, puis par calcul.** L'application retient la correspondance profil → fiches (R16) et s'en sert en priorité ; quand le lancement lui est inconnu — dépôt sur l'autre appareil — elle recalcule les profils depuis ses propres fiches et rapproche par description. La fusion inter-appareils ne transporte que six clés racine et écarte le reste en silence (c'est déjà le sort des invitations en attente) : étendre la fusion serait un chantier distinct et toucherait la partie la plus délicate de l'application. (session-settled: user-directed — chosen over le seul appareil d'origine, et contre l'extension de la fusion.) Gouverne R16, R17, R20a.
- **KTD3. La date de veille est une entrée de la famille « suivi » créée le 2026-09-07, et rien d'autre.** Elle n'est pas dupliquée en champ de fiche : une seule représentation, écrite en U11, lue partout ailleurs depuis les interactions. L'aveuglement du calcul de relance passe par une seule fonction (`derniereInteractionHorsSuivi`), donc R25 est presque gratuit — mais seulement pour ce que cette fonction couvre. Quatre effets restent à traiter explicitement : l'horodatage de fiche qui ressuscite à la fusion une fiche supprimée ailleurs, le compteur d'interactions de l'export Excel, la recherche plein texte qui balaie les commentaires, et les compteurs de notification du service worker. Gouverne R25.
- **KTD4. Le service worker doit apprendre à ignorer les entrées de suivi.** Il embarque sa propre copie de la logique de relance et, contrairement à l'application, ne filtre pas les suivis. L'écart existe déjà ; un envoi à soixante fiches le rendrait massif. Corrigé dans ce chantier bien qu'il lui préexiste.
- **KTD5. Le registre et le journal vivent dans une clé racine des données, sur le patron des invitations en attente.** `save()` fait un `Object.assign` qui ne retire jamais une clé racine : la persistance à la fermeture, dans la sauvegarde JSON et au retour de version est acquise sans code. La fusion ne la transporte pas — c'est précisément ce que KTD2 contourne.
- **KTD6. La colonne du marqueur s'ajoute en dernière position de l'export Excel.** Six tableaux de mise en forme sont indexés par position de colonne — largeurs, validations, colonnes de dates, de remplissage et de texte noir — et insérer ailleurs qu'en fin les décale tous. Attention au contresens : ce sont ces tableaux que la position finale protège, **pas** les contrôles automatiques, dont deux épinglent au contraire la fin des listes et devront donc être ré-épinglés (voir U7).
- **KTD7. Une validation portant sur plusieurs destinataires s'écrit en une seule fois, vérifiée.** Chaque écriture de fiche sérialise le carnet entier, écrit en synchrone et tente l'instantané du jour ; et hors option de vérification, l'écriture rend « vrai » même quand le quota l'a fait échouer. Le motif de la rafale d'écritures est déjà en production ailleurs et a été mesuré à plusieurs secondes sur un gros carnet.

### Constraints

- Fichier unique de 5 528 lignes ; le bloc Babel en occupe 63 % et coûtait 8,4 s de compilation au chargement lors de la mesure du 2026-09-02 — mesure à refaire avant de chiffrer le coût, le fichier ayant grossi depuis. Le chantier ajoute 700 à 1 000 lignes, dont 550 à 750 dans ce bloc : compter 9,7 à 10,5 s. Toute logique décidable va dans `KIT_PURE`, hors Babel.
- Aucun hook React hors de la tête de `App` (les retours conditionnels sont lignes 2524-2525). Les tests de câblage vérifient cette absence dans `renderForm` et `renderDetail` — pas ailleurs : les deux nouveaux écrans doivent recevoir la même garde.
- 51 tests de câblage lisent le document comme du texte. Trois littéraux positionnels dépendent de l'ordre des colonnes de l'export ; ajouter un type de suivi fait apparaître un bouton dans la modale d'interaction, ce qu'un test contrôle.
- La version est figée en quatre endroits qui doivent bouger ensemble, sinon les portes restent vertes et la nouveauté n'atteint personne, le service worker servant en cache d'abord.
- ES5 strict dans `KIT_PURE` et `KIT_TESTS` ; JSX + ES5 dans le bloc Babel ; aucune dépendance nouvelle ; aucune étape de construction.

### Sequencing

Deux étapes livrables, plus un socle commun. Le socle (U1 à U4) est prérequis des deux. L'étape 1 (U5 à U8) rend l'application utilisable pour préparer un envoi. L'étape 2 (U9 à U13, puis U15) ferme la boucle. U14 est transverse et peut partir avec l'une ou l'autre.

### Assumptions

- Le format du fichier de profils et du fichier de retour est un JSON dont la forme exacte est arrêtée en U3 puis figée par les tests purs de U9 ; il n'a pas à être lisible par un tiers autre que l'outil de rédaction.
- Le carnet réel comporte un nombre significatif de fiches sans convention collective : le premier envoi couvrira moins de monde que le nombre de fiches cochées. C'est le comportement voulu (R8), pas un défaut.
- Aucune mesure de réidentification n'est faite par l'application ; elle se fait à la rédaction, hors application.

---

## Implementation Units

### Unit Index

| U-ID | Titre | Fichiers principaux | Dépend de |
|---|---|---|---|
| U1 | Quatre champs de fiche et leur couture | `index.html` (KIT_PURE, App, formulaire, MERGE_FIELDS) | — |
| U2 | Moteur pur d'aptitude | `index.html` (KIT_PURE, KIT_TESTS) | U1 |
| U3 | Moteur pur de regroupement et de sérialisation | `index.html` (KIT_PURE, KIT_TESTS) | U1, U2 |
| U4 | Filtre « reçoit la veille » au tableau de bord | `index.html` (bloc Babel) | U1 |
| U5 | Relecture de l'activité dans le formulaire | `index.html` (submitForm, renderForm) | U1, U3 |
| U6 | Écran de préparation | `index.html` (bloc Babel, routeur, navigation) | U2, U3, U5 |
| U7 | Export Excel et import du marqueur | `index.html` (exportExcel, processImportRows) | U1 |
| U8 | Documentation et version v1.6.0 | `index.html`, `sw.js`, `LISEZMOI.txt`, `docs/RECETTE.md` | U6, U7 |
| U9 | Moteur pur de validation du retour | `index.html` (KIT_PURE, KIT_TESTS) | U3, U6 |
| U10 | Écran de retour et validation | `index.html` (bloc Babel, routeur) | U9 |
| U11 | Préparation des courriels et date de veille | `index.html` (bloc Babel, SUIVI_TYPES) | U10 |
| U12 | Service worker aveugle aux entrées de suivi | `sw.js`, `index.html` (test) | U11 |
| U13 | Journal des lancements et son panneau | `index.html` (bloc Babel) | U9 |
| U14 | Rapport de fusion dans les deux sens | `index.html` (mergeData, modal de rapport) | — |
| U15 | Documentation et version v1.6.1 | `index.html`, `sw.js`, `LISEZMOI.txt`, `docs/RECETTE.md` | U11, U13 |

### U1. Quatre champs de fiche et leur couture

**Goal** — Faire exister dans la fiche les quatre données que tout le reste consomme, et les faire circuler correctement.

**Requirements** — R1, R19a, R28, R29 (champ), R11a (champ d'état de relecture), R27 (première moitié). La date de veille n'est pas un champ de fiche : elle s'écrit en U11.

**Dependencies** — aucune.

**Files** — `index.html` : valeur initiale dans `addContact` (≈ 2565), états du formulaire en tête d'`App` (≈ 2211-2232), chargement dans `initForm` (≈ 3223), saisie dans `renderForm` (≈ 4367-4559), payload de `submitForm` (≈ 3256), `MERGE_FIELDS` (ligne 1301), migration des données existantes.

**Approach**

1. Ajouter les quatre champs : marqueur « reçoit la veille » (booléen, faux par défaut), seuil franchi (une valeur parmi six, « je ne sais pas » par défaut), état de relecture de l'activité (le texte exact validé, vide par défaut), et exposition du registre de politesse existant. **La date de veille n'est pas un champ de fiche** : elle s'écrit en U11 comme entrée de suivi, per KTD3, et la date que porte un profil se calcule depuis les interactions.
2. Le registre existe déjà comme champ synchronisé mais n'est écrit qu'après une invitation confirmée, et il est lu avec deux valeurs par défaut contradictoires à trente-sept lignes d'écart (≈ 3024 « vous », ≈ 3061 « tu »). Aligner les deux lecteurs sur le vouvoiement, per R19a.
3. Le seuil se saisit dans la modale « Saisir l'effectif » (≈ 4139), la seule qui porte un contexte de fiche et où vit déjà l'effectif précis ; le formulaire de fiche y renvoie. Le panneau « Taille des entreprises » est un écran global sans fiche courante : il ne convient pas.
4. Inscrire les trois champs nouveaux dans `MERGE_FIELDS` ; le registre y figure déjà.

**Patterns to follow** — la chaîne complète d'un champ existant, par exemple la relance planifiée et sa note ; pour le seuil, le champ d'effectif précis et son panneau.

**Test scenarios**

- Une fiche créée porte le marqueur à faux, le seuil à « je ne sais pas », l'état de relecture vide.
- Cocher le marqueur, enregistrer, rouvrir la fiche : la valeur est conservée.
- Le seuil accepte les six valeurs et rien d'autre.
- Une fiche existante sans registre est traitée comme vouvoyée par les deux lecteurs.
- Les trois champs nouveaux figurent dans la liste des champs synchronisés ; aucune date de veille n'y figure.

**Verification** — `node scripts/run-gates.js` vert ; les quatre champs présents dans une fiche enregistrée puis rechargée.

### U2. Moteur pur d'aptitude

**Goal** — Une seule fonction pure décide si une fiche est retenue pour un envoi, et pourquoi elle ne l'est pas.

**Requirements** — R3, R5, R8, R29.

**Dependencies** — U1.

**Files** — `index.html` : `KIT_PURE` (avant l'export ligne 718), `KIT_TESTS`.

**Approach** — La fonction prend une fiche et rend soit « retenue », soit un motif nommé parmi : catégorie exclue, archivée, en transition, sans adresse électronique, sans branche, sans effectif. **« Effectif » désigne ici la tranche INSEE de la fiche ; lorsqu'un nombre exact a été saisi à la main, il sert à déterminer la tranche, et c'est la tranche qui est transmise (U3).** La valeur sentinelle d'effectif inconnu vaut effectif manquant au sens de R8, au même titre qu'un champ vide. Deux libellés de la table des conventions valent absence de branche — « Autre » et « Sans CCN » — tandis que « Établissement public » est retenu et signalé comme statut de droit public, per R8. Le seuil manquant n'est jamais un motif d'exclusion, per R29.

**Test scenarios**

- Une fiche complète et cochée est retenue.
- Chacun des six motifs écarte la fiche et rend son propre libellé.
- Une fiche « Établissement public » est retenue, et son profil porte la mention de statut.
- Une fiche sans seuil renseigné est retenue.
- Une fiche non cochée n'est jamais retenue, quels que soient ses autres champs.

**Verification** — cas purs verts ; la même fonction est appelée à la préparation et à la validation, per R20a.

### U3. Moteur pur de regroupement et de sérialisation

**Goal** — Transformer une liste de fiches retenues en profils numérotés, et produire le contenu exact des deux modes d'export.

**Requirements** — R9, R11, R11a (règle de calcul), R12, R13, R29 (mention « seuil inconnu »).

**Dependencies** — U1, U2.

**Files** — `index.html` : `KIT_PURE`, `KIT_TESTS`.

**Approach**

1. Calculer, pour chaque fiche retenue, les valeurs **transmises** : branche — le numéro IDCC quand la table embarquée en donne un pour ce libellé, le libellé seul sinon, les deux étant transmis lorsque le numéro existe —, effectif — **toujours la tranche**, jamais le nombre exact : transmettre « 312 salariés » désigne une entreprise là où « 250-499 salariés » en désigne des dizaines, et fragmente les profils au lieu de les regrouper. Le nombre exact, lorsqu'il est saisi, sert à choisir la tranche et à rien d'autre ; la valeur sentinelle d'inconnu est écartée en amont par U2 —, seuil, activité selon la règle de relecture, registre. L'activité transmise est le texte saisi lorsqu'il a été relu dans son état exact, le libellé officiel INSEE sinon, et rien du tout si ni l'un ni l'autre n'existe.
2. Regrouper les fiches dont ces valeurs coïncident ; numéroter les profils ; conserver pour chacun la liste des identifiants de fiches, le nombre de destinataires et la date du plus récent envoi de veille parmi ses fiches, calculée depuis les interactions — huitième élément que R11 met au profil.
3. Sérialiser en mode restreint : la liste close de R11, sans aucun élément nominatif.
4. Sérialiser en mode étendu : la liste close de R12 par destinataire. Ni l'un ni l'autre ne porte les champs de R13.

**Test scenarios**

- Deux fiches aux valeurs transmises identiques partagent un profil ; deux fiches dont seul le registre diffère n'en partagent pas.
- Deux fiches à l'activité saisie identique dont une seule est relue tombent dans deux profils, et celle qui n'est pas relue porte le libellé officiel.
- Deux fiches aux activités saisies différentes, aucune relue, de même libellé officiel : un seul profil.
- Le mode restreint ne contient aucun nom, prénom, dénomination, adresse ni courriel — assertion portant sur la sortie sérialisée entière, pas sur des champs nommés. Le contrôle est mécanique : la sortie ne doit contenir aucune des chaînes présentes dans les champs nominatifs des fiches du lancement, comparaison faite après normalisation. Un texte d'activité relu qui contiendrait malgré tout une dénomination fait échouer ce contrôle et le signale, la relecture humaine n'étant pas la seule garde.
- Le mode étendu ne contient ni note, ni commentaire d'interaction, ni lieu de rencontre, ni prochaine action, ni origine, ni note de relance, ni étiquette.
- Un profil dont aucune fiche n'a de seuil porte « seuil inconnu ».

**Verification** — cas purs verts, dont un cas qui sérialise un carnet fictif complet et vérifie l'absence de toute chaîne nominative.

### U4. Filtre « reçoit la veille » au tableau de bord

**Goal** — Voir d'un coup d'œil qui est désigné, et le rester après un tri.

**Requirements** — R2 (première moitié).

**Dependencies** — U1.

**Files** — `index.html` : états de filtre en tête d'`App`, barre de filtres, fonction de filtrage.

**Approach** — Un filtre de plus sur le modèle des six existants : un état initialisé à « tous », un sélecteur dans la barre, une clause dans la fonction de filtrage.

**Test scenarios**

- Le filtre isole les fiches désignées, et se combine avec la catégorie et le statut.
- Remis à « tous », il ne retire rien.

**Verification** — `node scripts/run-gates.js` vert ; test de câblage sur la présence du filtre.

### U5. Relecture de l'activité dans le formulaire

**Goal** — Permettre de marquer une activité bonne à transmettre, une fois par entreprise, et faire tomber cette marque dès que le texte change.

**Requirements** — R11a (interface).

**Dependencies** — U1, U3.

**Files** — `index.html` : zone du champ activité de `renderForm` (≈ 4404-4431), `submitForm` (≈ 3254-3300).

**Approach** — La marque enregistre le texte exact validé ; la comparaison avec le texte courant suffit à la faire tomber, sans nouvelle machinerie. Se brancher là où la propagation d'activité entre fiches d'une même entreprise se déclenche déjà, de sorte que valider une fois marque toutes les fiches de la même dénomination portant ce texte. **Aucun hook** ne doit être ajouté dans `renderForm`.

**Execution note** — cette zone porte déjà cinquante lignes de propagation avec question et compte rendu, corrigées deux fois cette semaine ; écrire d'abord les tests de câblage qui protègent l'existant.

**Test scenarios**

- Marquer une activité relue, enregistrer, rouvrir : la marque tient.
- Corriger le texte d'un mot : la marque tombe et le formulaire le signale.
- Marquer sur une fiche d'une entreprise à trois fiches : les trois sont marquées.
- La propagation d'activité existante continue de fonctionner à l'identique.
- Aucun hook React dans `renderForm`.

**Verification** — `node scripts/run-gates.js --with-smoke` vert ; les cas de la propagation d'activité restent verts sans modification.

### U6. Écran de préparation

**Goal** — L'écran qui va de « je veux envoyer » au fichier de profils.

**Requirements** — R2 (seconde moitié), R4, R7, R8 (affichage), R10, R11a (relecture depuis l'aperçu), R14, R15, R16 (écriture du registre).

**Dependencies** — U2, U3, U5.

**Files** — `index.html` : nouvelle vue dans le routeur (≈ 5475-5481), entrée de navigation, corps de l'écran, écriture de la clé racine.

**Approach**

1. Choix des catégories réellement présentes ; « Avocat / EC » jamais proposée.
2. Liste nominative des destinataires, cochable et décochable depuis l'écran ; liste des fiches écartées avec leur motif.
3. Choix du mode, restreint présélectionné, jamais mémorisé d'un lancement à l'autre.
4. Aperçu obligatoire montrant le contenu exact, ligne par ligne, avant production. L'aperçu signale les activités saisies mais non relues — leur profil porte alors le libellé officiel INSEE — et permet de les marquer bonnes à transmettre sans quitter l'écran, en réutilisant la fonction de marquage de U5. Sans quoi la relecture supposerait d'ouvrir les fiches une à une, ce que R2 existe précisément pour éviter.
5. Production du fichier et écriture, dans une clé racine des données, du registre du lancement — identifiant, date, mode, profils et fiches — **et de son entrée au journal de R26**, dès l'export et non à la validation. L'identifiant est tiré au sort de façon à rester unique même si les deux appareils préparent un envoi sans s'être synchronisés.

**Patterns to follow** — le panneau « Taille des entreprises » porte le mécanisme complet d'un aperçu obligatoire avant action de masse, y compris la progression et le compte rendu ; la production du fichier suit l'export de sauvegarde existant.

**Test scenarios**

- L'aperçu affiche exactement ce que la sérialisation produira. Il n'écrit dans les fiches que sur un geste explicite de marquage d'activité, jamais du seul fait d'être affiché ; R22 vise l'écriture automatique, non une action demandée par l'utilisateur.
- Le mode revient à restreint au lancement suivant.
- Une fiche décochée depuis l'écran disparaît de la liste et du fichier.
- Une activité saisie non relue est signalée dans l'aperçu ; la marquer depuis l'écran fait passer le profil du libellé officiel au texte saisi, sans quitter l'écran.
- Aucune requête réseau n'est émise pendant tout le parcours.
- Le registre écrit survit à un rechargement de l'application.
- Aucun hook React dans les fonctions de rendu appelées conditionnellement.

**Verification** — `node scripts/run-gates.js --with-smoke` vert ; recette en navigateur sur données fictives.

### U7. Export Excel et import du marqueur

**Goal** — Le marqueur voyage dans le tableur, dans les deux sens.

**Requirements** — R1 (circulation).

**Dependencies** — U1.

**Files** — `index.html` : en-têtes et lignes de l'export (≈ 3308-3331), largeurs de colonnes (≈ 1467), détection de colonne à l'import (≈ 3708-3742).

**Approach** — Colonne ajoutée **en dernière position**, per KTD6, avec sa largeur. Deux contrôles automatiques épinglent la fin des listes d'en-têtes et de largeurs : les ré-épingler dans le même commit, sans affaiblir aucune assertion. À l'import, une détection par mot-clé de plus, indépendante de l'ordre.

**Test scenarios**

- L'export porte la colonne en dernier et la valeur attendue.
- Les deux contrôles qui épinglent la fin des listes — le littéral d'en-têtes et l'expression sur les largeurs de colonnes — sont ré-épinglés dans le même commit sur la nouvelle dernière colonne ; les autres contrôles d'ordre relatif restent verts sans retouche.
- Un import réinjecte le marqueur ; un fichier sans cette colonne n'efface pas les marqueurs existants.

**Verification** — `node scripts/run-gates.js` vert.

### U8. Documentation et version v1.6.0

**Goal** — Livrer la première moitié.

**Requirements** — traçabilité.

**Dependencies** — U6, U7.

**Files** — `index.html` (version), `sw.js` (nom de cache), `LISEZMOI.txt`, `docs/RECETTE.md`.

**Approach** — Version portée aux quatre endroits solidaires. Le mode d'emploi décrit la préparation et dit clairement que la validation dans l'application arrive à la version suivante ; d'ici là les textes se recopient à la main. Cases de recette pour le parcours de préparation.

**Test scenarios** — le contrôle de version existant couvre les quatre endroits ; les phrases nouvelles du mode d'emploi sont épinglées par un test de documentation.

**Verification** — `node scripts/run-gates.js --with-smoke` vert, `SMOKE_OK`, `"authenticated":true`, `"exceptions":[]`.

### U9. Moteur pur de validation du retour

**Goal** — Décider, sans interface, si un fichier de retour est acceptable et à quoi il correspond.

**Requirements** — R16 (lecture du registre), R17, R18.

**Dependencies** — U3, U6.

**Files** — `index.html` : `KIT_PURE`, `KIT_TESTS`.

**Approach** — Une fonction pure prenant le registre des lancements et le contenu déposé, rendant soit les projets appariés à leurs destinataires, soit un refus motivé. Elle porte les deux voies de KTD2 : appariement par le registre lorsque le lancement est connu, réappariement par description sinon. Un lancement est clos quand chacun de ses projets a été validé ou refusé ; un lancement interrompu reprend sans reproposer les projets traités.

**Test scenarios**

- Retour d'un lancement connu : les projets trouvent leurs destinataires.
- Retour d'un lancement inconnu, mais dont les descriptions correspondent aux fiches locales : les destinataires sont retrouvés par le calcul, et l'écran le dit.
- Retour d'un lancement inconnu dont une description ne correspond à aucune fiche : ce projet est signalé sans destinataire, les autres restent validables.
- Identifiant absent, fichier tronqué, numéro de profil inconnu, lancement clos : quatre refus distincts, chacun avec son motif.
- Lancement interrompu : les projets déjà traités ne sont pas reproposés.

**Verification** — cas purs verts pour chacun des refus et chacune des deux voies d'appariement.

### U10. Écran de retour et validation

**Goal** — Déposer le fichier, parcourir les projets, corriger, valider.

**Requirements** — R20, R20a, R21, R22.

**Dependencies** — U9.

**Files** — `index.html` : nouvelle vue, dépôt de fichier, corps de l'écran.

**Approach** — L'écran se rejoint depuis l'écran de préparation, qui affiche en permanence les lancements non clos et propose d'y déposer un retour ; il n'a pas d'entrée propre dans la navigation, la veille restant une seule destination. Dépôt sur le patron de l'import de sauvegarde existant. Un projet à la fois, avec son texte, la liste nominative de ses destinataires et un champ de correction valant pour tous. L'aptitude est réévaluée à ce moment par la fonction de U2 ; une fiche devenue inapte est nommée et retirée. Rien n'est écrit dans les fiches avant validation.

**Test scenarios**

- Refuser un projet n'empêche pas de valider les suivants.
- Une fiche archivée entre l'export et la validation est nommée et retirée.
- Une correction de texte s'applique à tous les destinataires du projet.
- Fermer l'application au milieu, redéposer le même fichier : la validation reprend où elle s'était arrêtée.
- Aucun hook React dans les fonctions de rendu appelées conditionnellement.

**Verification** — `node scripts/run-gates.js --with-smoke` vert ; recette en navigateur.

### U11. Préparation des courriels et date de veille

**Goal** — Ouvrir le courriel de chaque destinataire et laisser une trace qui ne dérange rien.

**Requirements** — R6, R19, R23, R24, R25.

**Dependencies** — U10.

**Files** — `index.html` : préparation du courriel, `SUIVI_TYPES` (≈ 477), écriture groupée.

**Approach** — Après validation d'un projet, l'écran liste ses destinataires et prépare leur courriel **un par un, sur commande** : l'utilisateur en ouvre un, part dans sa messagerie, revient, ouvre le suivant ; la liste montre lesquels ont déjà été préparés. Aucune ouverture en rafale — un navigateur bloque les fenêtres successives, et rien ne garantit que l'utilisateur revienne. Le prénom est substitué par la fonction de modèle existante. Le courriel se prépare par le mécanisme déjà en service, qui bascule sur le presse-papiers au-delà de la limite du lien : l'annoncer **avant** le clic, comme le fait déjà le chemin invitation, et afficher aussi l'objet à recopier. La date de veille est écrite comme entrée de la famille « suivi », per KTD3 : cela suppose d'ajouter le type à la table des types de suivi **et** à la table des types d'interaction qui alimente la modale de saisie — en l'excluant explicitement des types proposés à la main, sous peine de faire apparaître un bouton parasite qu'un contrôle existant surveille. Toutes les écritures d'une validation se font **en une fois, vérifiée**, per KTD7. Le vocabulaire dit « préparé le », jamais « envoyé le », per R24.

**Test scenarios**

- Après une validation touchant quarante fiches dont douze portent une relance planifiée : les douze relances et leurs notes sont intactes, les échéances du tableau de bord inchangées.
- Le compteur d'interactions de l'export Excel ne bouge pas du fait d'une veille.
- La recherche plein texte ne remonte pas une fiche sur le contenu d'une entrée de veille.
- Un texte long annonce le presse-papiers avant le clic et affiche l'objet.
- L'écriture groupée est vérifiée : un quota atteint produit une erreur visible, jamais un succès affiché à tort.
- La modale d'interaction n'expose pas de bouton pour créer une entrée de veille à la main.

**Verification** — `node scripts/run-gates.js --with-smoke` vert ; recette en navigateur avec une fixture portant des relances planifiées.

### U12. Service worker aveugle aux entrées de suivi

**Goal** — Que les notifications ne se dérèglent pas après un envoi.

**Requirements** — R25 (compteurs de notification), per KTD4.

**Dependencies** — U11.

**Files** — `sw.js` (≈ 81-88), `index.html` (test de cohérence).

**Approach** — Le service worker recalcule les relances avec sa propre copie de la logique et ne filtre pas les entrées de suivi. Lui apprendre à les ignorer, de la même manière que l'application. Ajouter un test qui compare les deux implémentations sur un même jeu fictif, pour que l'écart ne se recrée pas. Mécanique imposée : encadrer dans `sw.js` la fonction de calcul par deux marqueurs de commentaire, en extraire la tranche depuis la source du service worker déjà chargée par le lanceur de tests, et l'évaluer dans le bac à sable à côté de la fonction de l'application. À défaut de pouvoir isoler proprement la tranche, le signaler plutôt que de dupliquer la logique dans le test.

**Test scenarios**

- Sur un même carnet fictif, l'application et le service worker comptent le même nombre de fiches à relancer, entrées de veille comprises.
- Une fiche dont la seule interaction récente est une veille reste comptée comme à relancer.

**Verification** — `node --check sw.js` et `node scripts/run-gates.js` verts.

### U13. Journal des lancements et son panneau

**Goal** — Pouvoir répondre à « qu'est-ce qui est sorti, et quand ».

**Requirements** — R26, R27 clause (c).

**Dependencies** — U9.

**Files** — `index.html` : clé racine partagée avec le registre, panneau du menu « ⋯ ».

**Approach** — Un panneau de plus sur le patron des six existants. Le journal liste identifiant, date, mode, nombre de profils et de destinataires, et l'état du lancement. Il partage la clé racine du registre, per KTD5.

**Test scenarios**

- Un lancement apparaît au journal dès l'export, avec son mode.
- Le journal survit à un rechargement, à une restauration de sauvegarde et à un retour de version.
- Le panneau s'ouvre en fermant les autres, comme ses voisins.

**Verification** — `node scripts/run-gates.js` vert.

### U14. Rapport de fusion dans les deux sens

**Goal** — Qu'un retrait de désignation écrasé par la synchronisation ne reste pas invisible.

**Requirements** — R27 (seconde moitié).

**Dependencies** — aucune.

**Files** — `index.html` : `mergeData` (≈ 1390-1401), modal de rapport (≈ 5495-5500).

**Approach** — La branche où la valeur locale l'emporte sur une valeur distante plus ancienne ne pousse rien au rapport. La faire contribuer à une rubrique distincte, sans gonfler le décompte existant des mises à jour, qui a son propre sens à l'écran.

**Execution note** — correctif au cœur de la fusion : écrire d'abord les cas purs sur le rapport, pas sur l'écran.

**Test scenarios**

- Valeur locale plus récente qu'une valeur distante : le champ est nommé dans la nouvelle rubrique et la valeur locale est conservée.
- Le décompte des mises à jour affiché après une fusion garde sa valeur d'avant le correctif.
- Un marqueur de veille décoché sur un appareil puis fusionné avec l'autre est nommé au rapport.

**Verification** — `node scripts/run-gates.js` vert ; cas de fusion existants inchangés.

### U15. Documentation et version v1.6.1

**Goal** — Livrer la seconde moitié.

**Requirements** — traçabilité.

**Dependencies** — U11, U13.

**Files** — `index.html` (version), `sw.js`, `LISEZMOI.txt`, `docs/RECETTE.md`.

**Approach** — Version portée aux quatre endroits. Le mode d'emploi décrit la boucle complète, dit que le dépôt du retour se fait de préférence sur l'appareil qui a préparé l'envoi et ce qui se passe sinon, et que l'application ne sait jamais si un courriel est parti. Cases de recette pour le parcours complet.

**Test scenarios** — contrôle de version sur les quatre endroits ; phrases nouvelles épinglées.

**Verification** — `node scripts/run-gates.js --with-smoke` vert, `SMOKE_OK`, `"authenticated":true`, `"exceptions":[]`.

---

## Verification Contract

- **Portes** : `node scripts/run-gates.js --with-smoke` pour **toute unité touchant le bloc Babel — U1, U4, U5, U6, U10, U11, U13 —** et `node scripts/run-gates.js` pour les autres. Vérifier explicitement dans la sortie du smoke la présence de `SMOKE_OK`, de `"authenticated":true` et de `"exceptions":[]` — un `GATES_OK` lu dans une sortie tronquée a déjà laissé passer un écran blanc en production le 2026-09-08.
- **Mutations d'épreuve** : pour chaque unité portant une règle de décision (U2, U3, U9), appliquer temporairement au moins trois mutations au code et constater que les portes rougissent, puis rétablir.
- **Recette en navigateur** : sur fixture synthétique uniquement, jamais sur le carnet réel. Deux parcours — préparation complète à la fin de l'étape 1, boucle entière à la fin de l'étape 2 — dont un cas de dépôt sur un carnet n'ayant pas connu le lancement.
- **Non-régression du suivi** : la fixture de recette comporte des fiches portant une relance planifiée et sa note ; les échéances du tableau de bord sont relevées avant et après l'envoi.
- **Aucun réseau** : un contrôle vérifie qu'aucune requête n'est émise pendant la préparation et la validation.
- **Revue croisée** avant chaque demande de fusion, sur le protocole en vigueur : passe adversariale indépendante et lentilles, puis contradiction de chaque constat grave.

---

## Definition of Done

**Global**

- Les trente-deux exigences sont satisfaites ou explicitement reportées avec leur motif inscrit au plan.
- Les portes passent avec le smoke, vérifié champ par champ.
- Aucune fonction de rendu appelée conditionnellement ne contient de hook React, contrôle inclus dans les tests pour les deux nouveaux écrans.
- Le mode restreint est prouvé, par un test portant sur la sortie entière, ne contenir aucune chaîne nominative.
- Aucune donnée réelle de contact n'a été employée en développement ni en recette.
- Le code des tentatives abandonnées est retiré, non laissé dans la livraison.
- La version est portée aux quatre endroits solidaires, et le mode d'emploi décrit le comportement réel.

**Par étape**

- **v1.6.0** — l'utilisateur peut désigner ses destinataires, préparer un envoi, lire l'aperçu, obtenir le fichier de profils, et le mode d'emploi dit que la validation arrive ensuite.
- **v1.6.1** — l'utilisateur peut déposer un retour, valider projet par projet, ouvrir ses courriels, consulter le journal, et ses relances n'ont pas bougé.
