---
title: Veille personnalisée par profil - Plan
type: feat
date: 2026-09-09
topic: veille-personnalisee
artifact_contract: ce-unified-plan/v1
artifact_readiness: requirements-only
product_contract_source: ce-brainstorm
execution: code
---

# Veille personnalisée par profil - Plan

## Goal Capsule

**Objectif** — Permettre d'envoyer, à la demande, une actualité de droit social ciblée aux contacts désignés du carnet, sans que l'application appelle un modèle de langage ni qu'un élément nominatif quitte le poste par défaut. Le périmètre couvert est la chaîne complète d'un envoi : désignation des destinataires, export de profils, retour des projets rédigés, validation, ouverture du courriel. La rédaction elle-même se fait hors application et n'est pas spécifiée ici.

**Autorité produit** — Uriel SANSY. Les décisions de la section Key Decisions ont été prises en dialogue le 2026-09-09 et ne sont pas à rouvrir en planification.

**Blocages ouverts** — Un seul : la source de la ligne « activité » du profil restreint (voir Outstanding Questions, première entrée). Les deux autres questions ouvertes n'empêchent pas de planifier.

**Révision** — Ce plan a été relu le 2026-09-09 par cinq lentilles indépendantes ; leurs 58 constats graves sont intégrés ci-dessous. Les exigences ont été renumérotées à cette occasion.

## Product Contract

### Summary

L'application apprend à préparer un envoi d'actualité : l'utilisateur coche dans les fiches qui doit recevoir, lance la préparation, et obtient un fichier de **profils** décrivant des situations d'entreprise sans nommer personne — les fiches dont la branche, l'effectif et l'activité coïncident partagent un seul profil. Les projets rédigés hors application reviennent par un fichier déposé dans l'outil, qui les présente profil par profil avec leurs destinataires ; chaque validation ouvre les courriels correspondants, que l'utilisateur envoie lui-même.

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
- **Le seuil d'effectif est une donnée saisie, jamais déduite** (session-settled: user-directed — proposé par l'utilisateur, choisi contre une déduction depuis l'effectif précis existant). L'effectif INSEE et l'effectif de l'article L. 1111-2 ne sont pas la même grandeur, et depuis la loi PACTE le franchissement ne produit effet qu'après cinq années civiles consécutives : une entreprise de 310 personnes peut n'avoir pas franchi 300, une entreprise redescendue à 290 peut rester soumise. Gouverne R11, R27, R28.
- **L'unité de rédaction est le profil, pas la fiche.** Des fiches dont la branche, l'effectif, le seuil et l'activité coïncident partagent un seul profil, donc un seul texte : soixante destinataires se ramènent en pratique à une quinzaine de textes à relire. Correction d'une incohérence relevée en relecture. Gouverne R9, R18, R20.
- **Le presse-papiers est le régime normal de sortie, pas l'exception.** Mesuré sur les courriels de l'essai à blanc : 1 878 et 1 786 caractères de lien pour un plafond de 1 800. Le plan cesse de présenter la bascule comme un cas de bord. Gouverne R22, R23.

### Requirements

**Désignation des destinataires**

- R1. Chaque fiche porte un marqueur « reçoit la veille », faux par défaut, modifiable dans le formulaire de fiche.
- R2. Le marqueur est visible et actionnable hors de la fiche : un filtre au tableau de bord isole les fiches désignées, et l'écran de préparation permet de cocher et décocher depuis la liste. Sans quoi désigner soixante personnes suppose d'ouvrir soixante formulaires.
- R3. Une fiche de catégorie « Avocat / EC » n'est jamais retenue, quel que soit son marqueur.
- R4. L'écran de préparation propose les catégories réellement présentes dans le carnet, y compris celles créées par l'utilisateur, et permet de retenir celles qu'il veut.
- R5. Une fiche archivée, une fiche « En transition » et une fiche sans adresse électronique ne sont jamais retenues. La fiche en transition est écartée parce que sa branche, son effectif et son activité décrivent un employeur que la personne a quitté.
- R6. Plusieurs fiches d'une même entreprise peuvent être désignées ; chacune reçoit son propre courriel.
- R7. Avant de produire quoi que ce soit, l'écran de préparation affiche la liste nominative des personnes à qui l'envoi s'adresse.
- R8. Une fiche désignée dont la branche ou l'effectif manquent est écartée de l'export ; l'écran la nomme et indique ce qui lui manque. Un libellé de branche signifiant l'absence de convention collective vaut branche manquante.

**Le lancement**

- R9. Un lancement porte un identifiant propre et une date. Les fiches retenues sont regroupées en **profils distincts** : deux fiches partagent un profil quand leur branche, leur effectif, leur seuil franchi et leur activité coïncident.
- R10. L'écran de préparation demande le mode d'export à chaque lancement. Le mode restreint est présélectionné et le choix n'est jamais mémorisé d'un lancement à l'autre.
- R11. En mode restreint, un profil porte exactement : son numéro, la branche, l'effectif, le seuil franchi (R27), l'activité, le registre de politesse, la date du plus récent envoi de veille parmi ses fiches, et le nombre de destinataires. Aucun élément nominatif n'y figure : ni nom, ni prénom, ni dénomination d'entreprise, ni adresse, ni courriel.
- R12. En mode étendu, le profil porte en outre, pour chaque destinataire, une liste **close** de champs : prénom, nom, dénomination de l'entreprise, fonction, lieu d'exercice, catégorie, date du dernier échange. Aucun autre champ de la fiche n'y figure.
- R13. Ne sortent dans aucun mode : les notes, les commentaires d'interactions, le lieu de rencontre, la prochaine action, l'origine, la note de relance et les étiquettes — tous champs de saisie libre.
- R14. Un aperçu obligatoire affiche le contenu exact qui va sortir, ligne par ligne, avant que l'export soit produit, dans les deux modes.
- R15. L'application n'émet aucune requête réseau pour préparer, transmettre ou récupérer une veille. L'export est un fichier écrit localement.
- R16. Le lancement enregistre localement la correspondance entre chaque numéro de profil et les fiches qu'il désigne. Ce registre survit à la fermeture de l'application ; sans lui, aucun retour ne peut être rattaché à son destinataire.

**Retour et validation**

- R17. Le fichier de retour porte l'identifiant du lancement. L'application refuse, avec son motif, tout retour dont l'identifiant est inconnu, ne correspond pas à un export qu'elle a produit, ou a déjà été consommé.
- R18. Le fichier de retour est décrit dans le plan de réalisation : au minimum, l'identifiant du lancement, et pour chaque profil son numéro, un objet et un corps. Un fichier incomplet, tronqué ou portant un numéro de profil absent du lancement est refusé sans rien modifier.
- R19. Un projet est un modèle à trous : l'application substitue le prénom et le registre de chaque destinataire au moment du rendu.
- R20. La validation porte sur un projet, donc sur un profil : l'écran montre le texte une fois, avec la liste des destinataires qui le recevront, et l'utilisateur valide ou refuse l'ensemble. Refuser un projet n'empêche pas les autres.
- R21. L'utilisateur peut corriger le texte d'un projet avant validation ; la correction vaut pour tous les destinataires de ce profil.
- R22. Rien n'est écrit dans les fiches avant validation. Le registre du lancement (R16) et le journal (R26) ne sont pas des écritures dans les fiches.

**Envoi**

- R23. La validation prépare le courriel de chaque destinataire. Lorsque le lien de messagerie dépasse la limite technique — cas le plus fréquent pour un texte de veille — l'application copie le corps dans le presse-papiers, affiche l'objet à recopier, et le dit avant que l'utilisateur clique, non après.
- R24. L'application n'envoie jamais de courriel elle-même, et ne sait pas si un courriel a été envoyé. Tout libellé d'interface le dit ainsi : « préparé le », jamais « envoyé le ».
- R25. La date de veille d'une fiche appartient à la famille des entrées de suivi au sens de la décision du 2026-09-07 : elle n'entre dans aucun calcul de relance ni de statut. Ne bougent notamment pas du fait d'une veille : la relance planifiée et sa note, l'attente de retour, la mise en sommeil, la date de dernier contact de l'export Excel, et les statistiques d'interactions.

**Traces et synchronisation**

- R26. L'application tient un journal des lancements : identifiant, date, mode retenu, nombre de profils et de destinataires. Il est consultable, et permet de revoir ce qui a été préparé la fois précédente.
- R27. Le marqueur de R1, la date de veille de R25 et le seuil de R28 sont des champs de fiche synchronisés au même titre que les autres : dernière écriture datée gagne, et un écart entre deux appareils est signalé au rapport de fusion. Le journal de R26 survit à la synchronisation et à la restauration d'une sauvegarde.

**Seuil d'effectif au sens du droit du travail**

- R28. La fiche porte un champ « seuil franchi », renseigné à la main, à une seule valeur parmi : je ne sais pas (défaut), moins de 11, 11, 50, 300, 1 000. Il est distinct de l'effectif et n'est jamais déduit d'un nombre ni d'une réponse SIRENE.
- R29. Le seuil est facultatif : son absence n'écarte pas la fiche au titre de R8. Quand il vaut « je ne sais pas », le profil dit que le seuil est inconnu plutôt que de laisser croire à un seuil non franchi.

### Flows

- F1. **Un envoi complet.** L'utilisateur ouvre l'écran de veille → retient les catégories → voit la liste nominative des destinataires et corrige les cases → lit la liste des fiches écartées et ce qui leur manque → choisit le mode, restreint par défaut → lit l'aperçu de ce qui va sortir → produit le fichier de profils → le confie à l'outil de rédaction, hors application → dépose le fichier de retour → parcourt les projets, un par profil, avec leurs destinataires → corrige s'il le souhaite → valide → les courriels se préparent un par un → il les envoie depuis sa messagerie.

### Acceptance Examples

- AE1. Douze fiches désignées se répartissant sur quatre couples branche × effectif × activité : l'export contient quatre profils, non douze, chacun indiquant son nombre de destinataires.
- AE2. Deux fiches désignées dans la même société, mêmes données : un seul profil, un seul texte, deux courriels portant chacun son prénom.
- AE3. Une fiche désignée sans convention collective : elle n'apparaît pas dans l'export, et l'écran la nomme en indiquant « convention collective manquante ». Idem pour une fiche sans adresse électronique, pour une fiche archivée et pour une fiche « En transition ».
- AE4. Une fiche « Avocat / EC » dont le marqueur a été coché par erreur : elle n'est jamais retenue.
- AE5. Mode étendu retenu : l'aperçu montre les champs nommés par R12 et rien d'autre — ni note, ni lieu de rencontre, ni prochaine action. Au lancement suivant, le mode est revenu à restreint sans intervention.
- AE6. Deux lancements successifs sans dépôt du premier retour : déposer ensuite le retour du premier est accepté et s'applique à ses propres destinataires ; déposer deux fois le même fichier est refusé avec son motif.
- AE7. Application fermée puis rouverte entre l'export et le retour : les profils retrouvent leurs destinataires.
- AE8. Un profil dont toutes les fiches ont été supprimées depuis l'export : le projet est signalé comme sans destinataire, les autres restent validables.
- AE9. Après un envoi touchant quarante fiches dont douze portent une relance planifiée avec sa note : les douze relances et leurs notes sont intactes, le tableau de bord affiche les mêmes échéances qu'avant, et chaque fiche porte sa date de veille.
- AE10. Une fiche dont l'effectif INSEE est « 250-499 sal. » et dont le seuil franchi est renseigné à 50 : le profil transmet le seuil 50, non 300 ; une fiche de même tranche sans seuil renseigné transmet « seuil inconnu », et reste exportée.
- AE11. Marqueur décoché sur un appareil, puis fusion avec l'autre appareil qui le portait coché : la modification la plus récente l'emporte et l'écart est signalé au rapport de fusion.
- AE12. Projet dont le corps dépasse la limite du lien de messagerie : l'application l'annonce avant le clic, copie le corps et affiche l'objet à recopier.

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

- **D'où vient la ligne « activité » du profil restreint ?** Le champ `activite` est une saisie libre de 200 caractères : il peut contenir « Filiale française de DUPONT SA, site de Roubaix », c'est-à-dire précisément ce que R11 promet d'exclure. Trois voies : n'exporter que le libellé officiel NAF, qui n'est pas une saisie ; exporter la saisie en la signalant dans l'aperçu comme texte à relire ; ou n'exporter la saisie que lorsqu'elle coïncide avec le libellé officiel. **Bloquant** : à trancher avec l'utilisateur avant réalisation.
- **Faut-il avertir quand un profil désigne trop peu d'entreprises ?** Le service statistique public ne diffuse pas une valeur portant sur moins de trois unités. L'application pourrait interroger l'API publique des entreprises au moment de l'aperçu et signaler les profils les plus étroits — au prix d'un appel réseau, soumis au geste explicite.
- **Où placer le champ « seuil franchi » de R28 ?** Le formulaire de fiche l'exposerait à chaque saisie ; le panneau « Taille des entreprises », où vit déjà l'effectif précis, le rangerait avec ses voisins mais le rendrait moins visible.
- **Convention collective : libellé ou IDCC ?** Le carnet stocke un libellé. Un profil gagnerait à porter l'IDCC, mais treize branches de la table embarquée n'en ont pas et l'import Excel peut écrire un libellé hors liste. À trancher en planification : convertir quand c'est possible, transmettre le libellé sinon.
