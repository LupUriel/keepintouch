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

**Objectif** — Permettre d'envoyer, à la demande, une actualité de droit social ciblée aux contacts désignés du carnet, sans que l'application appelle un modèle de langage ni qu'un élément nominatif quitte le poste par défaut. Le périmètre couvert ici est la chaîne complète d'un envoi : désignation des destinataires, export d'un profil, retour des projets rédigés, validation, ouverture du courriel. La rédaction elle-même se fait hors application et n'est pas spécifiée ici.

**Autorité produit** — Uriel SANSY. Les décisions de la section Key Decisions ont été prises en dialogue le 2026-09-09 et ne sont pas à rouvrir en planification.

**Blocages ouverts** — Aucun blocage. Trois questions restent ouvertes (voir Outstanding Questions) ; aucune n'empêche de planifier.

## Product Contract

### Summary

L'application apprend à préparer un envoi d'actualité : l'utilisateur coche dans les fiches qui doit recevoir, lance la préparation, et obtient un fichier de **profils** décrivant les entreprises sans nommer personne. Les projets de courriel rédigés hors application reviennent par un fichier déposé dans l'outil, qui les présente un par un en face de leur destinataire ; chaque validation ouvre un courriel pré-rempli que l'utilisateur envoie lui-même.

### Problem Frame

Le cabinet diffuse des lettres juridiques non personnalisées, et aucune source ne remonte à l'utilisateur ce qui concerne précisément les branches et les tailles d'entreprise de ses interlocuteurs. Écrire à chacun une actualité pertinente suppose de croiser sa convention collective, son effectif et son activité — un travail que le carnet permet mais que personne ne fait, faute d'outil.

Deux contraintes encadrent toute solution. D'abord la déontologie : le secret professionnel vise nommément le nom des clients (RIN art. 2.2) et le guide *Déontologie et intelligence artificielle* adopté par le CNB le 17 mars 2026 demande de ne transmettre à aucune IA générative une information couverte par ce secret. Ensuite la réidentification : le triplet branche + activité + effectif n'est pas un agrégat. Mesuré le 2026-09-09 sur l'API publique des entreprises, sans recours au carnet, le segment « métallurgie, 400 salariés, fabrication de câbles électriques » désigne **trois entreprises en France** ; le même exercice sur Syntec + 1 000-1 999 salariés en désigne 66, mais retombe à zéro ou une dès que l'activité fine est ajoutée. La précision qui rend le courriel utile est celle qui permet de retrouver l'entreprise.

### Key Decisions

- **Deux modes d'export, choisis à chaque lancement, jamais mémorisés** (session-settled: user-directed — choisi contre un mode unique : l'utilisateur peut recourir à un outil sous contrat professionnel, où le fournisseur n'accède pas aux données saisies ; le régime dépend du compte, pas de la marque). Gouverne R5, R6, R7, R8.
- **Le mode restreint est la position par défaut** (session-settled: user-approved). Resserrer plus tard ce qui sort ne coûte rien ; l'inverse est irréversible. Gouverne R5.
- **Les champs libres ne sortent dans aucun mode** (session-settled: user-directed — choisi contre un mode « vraiment tout »). Notes et commentaires d'interactions sont les seuls endroits où une confidence peut se loger sans que l'utilisateur puisse la relire avant chaque envoi. Gouverne R7.
- **La désignation vit dans la fiche** (session-settled: user-directed — choisi contre une sélection mémorisée au moment de l'envoi et contre une règle « tout le monde sauf exclusions »). Gouverne R1.
- **Une fiche inapte est écartée et signalée, jamais dégradée** (session-settled: user-directed). Rien de générique ne part sous couvert de veille ciblée. Gouverne R10.
- **Un envoi de veille ne compte pas comme un échange** (session-settled: user-directed). Sans quoi un envoi collectif viderait le tableau de bord de ses relances et l'outil cesserait de signaler les contacts réellement délaissés. Gouverne R17.
- **Le retour est un modèle à trous, pas un courriel figé.** Un même profil sert plusieurs destinataires ; le prénom et le registre sont substitués localement. Gouverne R12.
- **Le seuil d'effectif est une donnée saisie, jamais déduite** (session-settled: user-directed — proposé par l'utilisateur, choisi contre une déduction depuis l'effectif précis existant). L'effectif INSEE et l'effectif de l'article L. 1111-2 ne sont pas la même grandeur, et depuis la loi PACTE le franchissement ne produit effet qu'après cinq années civiles consécutives : une entreprise de 310 personnes peut n'avoir pas franchi 300, une entreprise redescendue à 290 peut rester soumise. Seul l'utilisateur, qui a vu passer le CSE ou la BDESE, connaît le fait du franchissement. Gouverne R6, R20, R21.

### Requirements

**Désignation des destinataires**

- R1. Chaque fiche porte un marqueur « reçoit la veille », faux par défaut, modifiable dans le formulaire de fiche.
- R2. Une fiche de catégorie « Avocat / EC » n'est jamais retenue pour un envoi de veille, quel que soit son marqueur.
- R3. L'écran de préparation permet de lancer sur les clients, sur les prospects, ou sur les deux.
- R4. Plusieurs fiches d'une même entreprise peuvent être désignées ; chacune reçoit son propre courriel.
- R5. L'écran de préparation demande le mode d'export à chaque lancement. Le mode restreint est présélectionné et le choix n'est jamais mémorisé d'un lancement à l'autre.

**Ce qui sort du carnet**

- R6. En mode restreint, chaque fiche retenue produit un profil identifié par un numéro d'ordre, portant la branche, l'effectif, le seuil de franchissement connu (R20), l'activité, le registre de politesse et la date du dernier envoi de veille de cette fiche. Aucun élément nominatif n'y figure : ni nom, ni prénom, ni dénomination d'entreprise, ni adresse, ni courriel.
- R7. En mode étendu, le profil porte en outre les champs structurés de la fiche — identité, entreprise, fonction, lieu d'exercice, catégorie, dates. Les champs libres, notes et commentaires d'interactions, ne sortent dans aucun mode.
- R8. Un aperçu obligatoire affiche le contenu exact qui va sortir, ligne par ligne, avant que l'export soit produit, dans les deux modes.
- R9. L'export est un fichier écrit localement. L'application n'émet aucune requête réseau pour préparer, transmettre ou récupérer une veille.
- R10. Une fiche désignée dont la branche ou l'effectif manquent est écartée de l'export ; l'écran de préparation la nomme et indique ce qui lui manque.

**Retour et validation**

- R11. Un fichier de propositions se dépose dans l'application, qui affiche d'abord le récapitulatif par profil, puis chaque projet en face de son destinataire.
- R12. Un projet est un modèle à trous : l'application substitue le prénom et le registre de chaque destinataire au moment du rendu.
- R13. La validation se fait destinataire par destinataire ; refuser un projet n'empêche pas les autres.
- R14. Rien n'est écrit dans le carnet avant qu'un projet soit validé.
- R15. Un fichier de retour mal formé, tronqué ou portant un numéro de profil inconnu est refusé avec son motif, sans rien modifier.

**Envoi**

- R16. La validation ouvre le courriel pré-rempli — destinataire, objet, corps — selon le mécanisme déjà utilisé pour l'invitation à déjeuner. Lorsque le lien dépasse la limite technique, l'application copie le corps dans le presse-papiers et le dit à l'écran.
- R17. L'application n'envoie jamais de courriel elle-même.

**Traces**

- R18. Chaque fiche mémorise la date de son dernier envoi de veille, visible dans son historique. Cette date ne compte pas comme un échange : les délais de relance de la fiche ne bougent pas.
- R19. L'application conserve, pour chaque lancement, la date, le mode retenu et le nombre de fiches concernées, de sorte que la question « qu'est-ce qui est sorti, et quand » trouve toujours sa réponse.

**Seuil d'effectif au sens du droit du travail**

- R20. La fiche porte un champ « seuil franchi », renseigné à la main, à une seule valeur parmi : je ne sais pas (défaut), moins de 11, 11, 50, 300, 1 000. Il est distinct de l'effectif et n'est jamais déduit d'un nombre ni d'une réponse SIRENE.
- R21. Le seuil est facultatif : son absence n'écarte pas la fiche au titre de R10. Quand il est renseigné, il figure dans le profil ; quand il vaut « je ne sais pas », le profil dit que le seuil est inconnu plutôt que de laisser croire à un seuil non franchi.

### Flows

- F1. **Un envoi complet.** L'utilisateur ouvre l'écran de veille → choisit clients, prospects ou les deux → choisit le mode d'export, restreint par défaut → lit l'aperçu de ce qui va sortir et la liste des fiches écartées → produit le fichier de profils → le confie à l'outil de rédaction, hors application → dépose le fichier de retour → lit le récapitulatif par profil → parcourt les projets, destinataire par destinataire → valide → le courriel s'ouvre pré-rempli → l'ajuste s'il le souhaite → l'envoie depuis sa messagerie.

### Acceptance Examples

- AE1. Trois fiches désignées chez trois sociétés différentes, toutes renseignées : l'export contient trois profils numérotés, sans aucun nom ; l'aperçu montre exactement ces trois profils.
- AE2. Deux fiches désignées dans la même société : deux courriels distincts, un par personne, portant le même texte avec chacun son prénom.
- AE3. Une fiche désignée sans convention collective : elle n'apparaît pas dans l'export, et l'écran de préparation la nomme en indiquant « convention collective manquante ».
- AE4. Une fiche « Avocat / EC » dont le marqueur a été coché par erreur : elle n'est jamais retenue.
- AE5. Mode étendu retenu : l'aperçu montre l'identité et l'entreprise, et ne contient ni note ni commentaire d'interaction. Au lancement suivant, le mode est revenu à restreint sans intervention.
- AE6. Fichier de retour déposé alors qu'un profil a disparu du carnet depuis l'export : le projet correspondant est signalé comme sans destinataire, les autres restent validables.
- AE7. Projet validé dont le corps dépasse la limite du lien de messagerie : l'application copie le corps et l'annonce, au lieu d'ouvrir un courriel tronqué.
- AE8. Après un envoi à quarante fiches, le tableau de bord affiche les mêmes relances qu'avant : aucune fiche n'est passée « à jour » du fait de la veille, et chaque fiche porte « Veille envoyée le … » dans son historique.
- AE9. Un second envoi lancé le lendemain : chaque profil porte la date du dernier envoi de la fiche, y compris pour les fiches désignées entre-temps qui n'en ont pas.
- AE10. Une fiche dont l'effectif INSEE est « 250-499 sal. » et dont le seuil franchi est renseigné à 50 : le profil transmet le seuil 50, non 300 ; une fiche de même tranche sans seuil renseigné transmet « seuil inconnu », et reste exportée.

### Scope Boundaries

Hors de ce plan, et volontairement :

- L'envoi automatique de courriels depuis l'application. Le geste final reste manuel.
- Tout appel à un modèle de langage depuis l'application, et tout appel réseau automatique.
- Le préremplissage ou la suggestion automatique des conventions collectives : décision antérieure, motivée par le caractère déclaratif et souvent inexact des sources.
- La lecture assistée de sites de presse professionnelle sous licence, écartée le 2026-09-08 au vu du fichier robots.txt et des conditions générales d'AEF Info.
- La fiche mensuelle « Ce qui change au 1er du mois en droit social » : sujet distinct, à traiter ensuite.
- Le rythme : aucun déclenchement périodique, l'envoi part quand l'utilisateur le demande.
- La méthode de rédaction elle-même — choix des sources, structure des briefs, ton des courriels — déjà éprouvée par l'essai à blanc du 2026-09-08 et hors du périmètre applicatif.

### Outstanding Questions

- **Convention collective : libellé ou IDCC ?** Le carnet stocke un libellé, non un numéro. Un profil gagnerait à porter l'IDCC, mais treize branches de la table embarquée n'en ont pas, et l'import Excel peut écrire un libellé hors liste. À trancher en planification : convertir quand c'est possible et transmettre le libellé sinon, ou transmettre le libellé seul.
- **Où placer le champ « seuil franchi » de R20 ?** Le formulaire de fiche l'exposerait à chaque saisie ; le panneau « Taille des entreprises », où vit déjà l'effectif précis, le rangerait avec ses voisins mais le rendrait moins visible. À trancher en planification, avec la question de savoir si le seuil circule dans l'export Excel, l'import et la fusion entre appareils.
- **Faut-il avertir quand un profil désigne trop peu d'entreprises ?** Le service statistique public ne diffuse pas une valeur portant sur moins de trois unités. L'application pourrait mesurer et signaler les profils les plus étroits avant l'export. À décider : garde-fou utile ou complexité inutile.
