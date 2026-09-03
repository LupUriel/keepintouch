#!/usr/bin/env node
"use strict";

// Cette porte compare les bundles de lib aux empreintes déclarées dans VERSIONS.txt.
// Usage : node scripts/check-lib-hashes.js, depuis n'importe quel répertoire courant.

var crypto = require("crypto");
var fs = require("fs");
var path = require("path");
var racine = path.join(__dirname, "..");
var repertoireLib = path.join(racine, "lib");
var erreurs = [];
var declarations = {};
var nombre = 0;

try {
  var manifeste = fs.readFileSync(path.join(repertoireLib, "VERSIONS.txt"), "utf8");
  manifeste.split(/\r?\n/).forEach(function (ligne, index) {
    if (!ligne.trim()) return;

    var correspondance = ligne.match(/^\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*sha256:([0-9a-fA-F]{64})\s*$/);
    if (!correspondance) {
      erreurs.push("LIGNE ILLISIBLE " + String(index + 1) + ": " + ligne);
      return;
    }

    var fichier = correspondance[1].trim();
    var attendu = correspondance[3].toLowerCase();
    declarations[fichier] = true;
    nombre += 1;

    try {
      var contenu = fs.readFileSync(path.join(repertoireLib, fichier));
      var obtenu = crypto.createHash("sha256").update(contenu).digest("hex");
      if (obtenu.toLowerCase() !== attendu) {
        erreurs.push("MISMATCH " + fichier + " attendu " + attendu + " obtenu " + obtenu);
      }
    } catch (erreurFichier) {
      if (erreurFichier && erreurFichier.code === "ENOENT") {
        erreurs.push("FICHIER MANQUANT " + fichier);
      } else {
        erreurs.push("ERREUR FICHIER " + fichier + ": " + (erreurFichier && erreurFichier.message || erreurFichier));
      }
    }
  });

  fs.readdirSync(repertoireLib).forEach(function (fichier) {
    if (/\.js$/i.test(fichier) && !declarations[fichier]) erreurs.push("NON DECLARE " + fichier);
  });
} catch (erreur) {
  erreurs.push("ECHEC MANIFESTE: " + (erreur && erreur.message || erreur));
}

if (erreurs.length) {
  erreurs.forEach(function (erreur) { console.error(erreur); });
  process.exitCode = 1;
} else {
  console.log("LIB_HASHES_OK (" + String(nombre) + " fichiers)");
}
