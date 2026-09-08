#!/usr/bin/env node
"use strict";

var fs = require("fs");
var path = require("path");
var racine = path.join(__dirname, "..");
var source = path.join(racine, "data", "source", "Structure_NAF_2025_Maj_2024-10-04.xlsx");
var destination = path.join(racine, "data", "naf-2025.js");

try {
  var XLSX = require(path.join(racine, "lib", "xlsx.full.min.js"));
  var classeur = XLSX.read(fs.readFileSync(source), { type: "buffer" });
  var feuille = classeur.Sheets["NAF 2025"];
  if (!feuille) throw new Error("La feuille « NAF 2025 » est absente du classeur.");
  var lignes = XLSX.utils.sheet_to_json(feuille, { header: 1, defval: "" });
  var libelles = {};
  lignes.forEach(function (ligne) {
    var code = String(ligne[1]).trim();
    if (!/^\d{2}\.\d{2}[A-Z]$/.test(code)) return;
    var libelle = String(ligne[2]).replace(/\s+/g, " ").trim();
    if (Object.prototype.hasOwnProperty.call(libelles, code)) throw new Error("Code NAF dupliqué : " + code + ".");
    if (!libelle) throw new Error("Libellé vide pour le code NAF " + code + ".");
    if (libelle.indexOf("�") >= 0) throw new Error("Caractère de remplacement dans le libellé du code NAF " + code + ".");
    libelles[code] = libelle;
  });
  var codes = Object.keys(libelles).sort(function (a, b) { return a < b ? -1 : a > b ? 1 : 0; });
  if (codes.length !== 747) throw new Error("Nombre de sous-classes NAF incorrect : " + String(codes.length) + " au lieu de 747.");
  var tries = {};
  codes.forEach(function (code) { tries[code] = libelles[code]; });
  var contenu = "/* Table des libellés NAF 2025 — générée par scripts/build-naf.js à partir de data/source/Structure_NAF_2025_Maj_2024-10-04.xlsx (INSEE, licence ouverte). Ne pas modifier à la main. */\n" +
    "var KIT_NAF = {\n" +
    "  version: \"NAF 2025 — INSEE, Structure NAF 2025 Maj 2024-10-04\",\n" +
    "  nomenclature: \"NAF 2025\",\n" +
    "  libelles: " + JSON.stringify(tries, null, 2) + "\n" +
    "};\n";
  fs.writeFileSync(destination, contenu, "utf8");
  console.log("NAF 2025 : 747 sous-classes écrites dans data/naf-2025.js");
} catch (erreur) {
  console.error("Erreur de génération NAF 2025 : " + (erreur && erreur.message ? erreur.message : String(erreur)));
  process.exitCode = 1;
}
