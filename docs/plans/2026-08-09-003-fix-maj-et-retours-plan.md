---
title: "Bandeau de mise à jour fiabilisé et retour explicite de propagation"
date: 2026-08-09
type: fix
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: ce-brainstorm
---

# Bandeau de mise à jour fiabilisé et retour explicite de propagation

## Goal Capsule

Incident réel du 2026-08-09 : après la fusion de la v1.5.4, l'appareil de l'utilisateur est resté en v1.5.3 **sans que le bandeau de mise à jour ne se propose** — le signal `kit-sw-updated` est émis à l'activation du nouveau service worker, souvent pendant l'écran de mot de passe, avant que l'App (qui n'écoute qu'après connexion) ne soit montée : événement perdu. Second point (demande utilisateur) : une propagation de rattachement qui ne trouve aucune autre fiche ferme la fenêtre sans rien dire. v1.5.5/kit-crm-v47.

## Requirements

- R1. Le signal de mise à jour est conservé jusqu'au montage de l'App : un drapeau global est posé à l'activation du nouveau service worker et lu au montage — le bandeau s'affiche même si l'activation a précédé la connexion.
- R2. Le rattachement affiche un retour dans TOUS les cas : quand la propagation ne trouve aucune autre fiche, message « Rattachée. Aucune autre fiche ne porte ce nom d'entreprise. » (fenêtre fermée d'un tap) ; les messages existants sont inchangés.
- R3. Versions v1.5.5/kit-crm-v47 (regex du test version mises à jour) ; câblages verrouillés par tests sur le document réel.

## Acceptance Examples

- AE1. Nouvelle version déployée, app ouverte, connexion après l'activation silencieuse → bandeau « Mise à jour disponible » visible après connexion.
- AE2. Rattachement d'une entreprise à fiche unique → message explicite au lieu d'une fermeture muette.

## Implementation Units

### MJ-U1. Les deux correctifs et les versions

- **Files :** `index.html`, `sw.js`.
- **Approach :** drapeau `window.__kitMajPrete` posé au dispatch de `kit-sw-updated` (bloc SW, bas d'index.html) ; lecture du drapeau au montage dans le useEffect écouteur de l'App ; message systématique dans `chooseEffectif` (branche vide) ; versions + regex + tests de câblage.
- **Verification :** runner 0 échec ; `node --check sw.js` ; smoke navigateur.

## Definition of Done

PR vers `main` avec revue croisée, constats corrigés. Fusion = déploiement v1.5.5.
