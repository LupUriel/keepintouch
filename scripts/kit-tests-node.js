#!/usr/bin/env node
var fs = require("fs");
var vm = require("vm");

var html = fs.readFileSync("index.html", "utf8");
var scripts = [];
html.replace(/<script([^>]*)>([\s\S]*?)<\/script>/gi, function (_, attrs, source) {
  if (!/\bsrc\s*=/.test(attrs) && !/text\/babel/.test(attrs)) scripts.push(source);
  return _;
});
var storage = {};
var sandbox = {
  console: console,
  location: { hostname: "localhost" },
  navigator: { onLine: true },
  localStorage: {
    getItem: function (key) { return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null; },
    setItem: function (key, value) { storage[key] = String(value); },
    removeItem: function (key) { delete storage[key]; },
    key: function (index) { return Object.keys(storage)[index] || null; },
    get length() { return Object.keys(storage).length; }
  },
  msal: { PublicClientApplication: function () { return { initialize: function () { return Promise.resolve(); }, handleRedirectPromise: function () { return Promise.resolve(null); }, getAllAccounts: function () { return []; } }; } },
  alert: function () {},
  setTimeout: function () { return 0; },
  clearTimeout: function () {}
};
vm.createContext(sandbox);
scripts.forEach(function (source) { vm.runInContext(source, sandbox); });
Promise.resolve().then(function () { process.exitCode = sandbox.KIT_TESTS.run() ? 1 : 0; });
