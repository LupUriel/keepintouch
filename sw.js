var CACHE_NAME = "kit-crm-v30";

self.addEventListener("install", function (event) {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (n) { return n !== CACHE_NAME; })
          .map(function (n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  event.respondWith(
    caches.match(event.request).then(function (response) {
      return response || fetch(event.request).then(function (fetchResponse) {
        return caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, fetchResponse.clone());
          return fetchResponse;
        });
      });
    }).catch(function () {
      return caches.match("./index.html");
    })
  );
});

/* ═══════ NOTIFICATIONS DE RELANCE (Periodic Background Sync) ═══════ */
var RENCONTRE_TYPES = ["petitdej", "dejeuner", "diner", "verre", "formation_repas", "conference_repas"];
var RENCONTRE_OVERDUE_MONTHS = 12;
var FOLLOWUP_DAYS = 14;
var FOLLOWUP_RETRY_DAYS = 21;
function _today() { return new Date().toISOString().split("T")[0]; }
function _monthsSince(d) {
  if (!d) return Infinity;
  var dt = new Date(d), now = new Date();
  var m = (now.getFullYear() - dt.getFullYear()) * 12 + (now.getMonth() - dt.getMonth());
  if (now.getDate() < dt.getDate()) m -= 1;
  return m < 0 ? 0 : m;
}
function _daysSince(d) { if (!d) return Infinity; return Math.floor((Date.now() - new Date(d).getTime()) / 86400000); }
function _daysUntil(d) { if (!d) return Infinity; return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000); }
function _lastRencontre(c) {
  var best = null;
  (c.interactions || []).forEach(function (x) { if (RENCONTRE_TYPES.indexOf(x.type) >= 0 && (!best || x.date > best)) best = x.date; });
  return best;
}
function _latest(c) {
  var best = null;
  (c.interactions || []).forEach(function (x) { if (!best || x.date > best.date) best = x; });
  return best;
}
function _isSnoozed(c) { return !!(c.snoozedUntil && c.snoozedUntil > _today()); }
function _daysAwaiting(c) { var li = _latest(c); if (!li || !li.awaitingResponse) return -1; return _daysSince(li.date); }
function _daysRetry(c) { var li = _latest(c); if (!li || !li.retryPending) return -1; return _daysSince(li.date); }
function _isParked(c) { return !!(c.awaitingUntil && c.awaitingUntil > _today()); }
function _awaitingActive(c) {
  if (_isParked(c)) return true;
  var da = _daysAwaiting(c); if (da >= 0 && da < FOLLOWUP_DAYS) return true;
  var dr = _daysRetry(c); if (dr >= 0 && dr < FOLLOWUP_RETRY_DAYS) return true;
  return false;
}
function _awaitStale(c) { return _daysAwaiting(c) >= FOLLOWUP_DAYS && !_isParked(c); }
function _retryStale(c) { return _daysRetry(c) >= FOLLOWUP_RETRY_DAYS && !_isParked(c); }
function _isClient(c) { return ((c && c.category) || "").toLowerCase() === "client"; }
function _cycleFor(c) {
  if (c.inTransition) return { due: 6, warn: 5 };
  if (c.priority === "high") return { due: 6, warn: 5 };
  if (c.priority === "none") return null;
  if (c.priority === "low") return { due: 18, warn: 16 };
  return _isClient(c) ? { due: 12, warn: 9 } : { due: 12, warn: 11 };
}
function _computeDue(contacts) {
  contacts = (contacts || []).filter(function (c) { return !c.archived; });
  var info = { total: 0, retard: 0, planifiees: 0, attente: 0, relance: 0 };
  (contacts || []).forEach(function (c) {
    var cyc = _cycleFor(c);
    var r = !!cyc && !_isSnoozed(c) && !_awaitingActive(c) && _monthsSince(_lastRencontre(c)) >= cyc.due;
    var p = !!c.followUpDate && _daysUntil(c.followUpDate) <= 0;
    var a = _awaitStale(c);
    var rt = _retryStale(c);
    if (!(r || p || a || rt)) return;
    info.total++;
    if (a) info.attente++;
    else if (rt) info.relance++;
    else if (p) info.planifiees++;
    else info.retard++;
  });
  return info;
}
function _notifBody(info) {
  var parts = [];
  if (info.retard) parts.push(info.retard + " en retard");
  if (info.planifiees) parts.push(info.planifiees + " relance" + (info.planifiees > 1 ? "s" : "") + " due" + (info.planifiees > 1 ? "s" : ""));
  if (info.attente) parts.push(info.attente + " sans réponse");
  if (info.relance) parts.push(info.relance + " à recontacter");
  return parts.join(" · ");
}
function _idbGet(key) {
  return new Promise(function (res) {
    try {
      var rq = indexedDB.open("kit-crm-db", 1);
      rq.onupgradeneeded = function () { try { rq.result.createObjectStore("kv"); } catch (e) {} };
      rq.onsuccess = function () {
        var db = rq.result;
        try { var g = db.transaction("kv", "readonly").objectStore("kv").get(key); g.onsuccess = function () { res(g.result); }; g.onerror = function () { res(null); }; }
        catch (e) { res(null); }
      };
      rq.onerror = function () { res(null); };
    } catch (e) { res(null); }
  });
}
function _checkAndNotify() {
  return _idbGet("data").then(function (data) {
    if (!data || !data.contacts) return;
    var info = _computeDue(data.contacts);
    if (info.total > 0) {
      return self.registration.showNotification("Keep In Touch — " + info.total + " à suivre", {
        body: _notifBody(info), tag: "kit-relances", renotify: true,
        icon: "./icons/icon-192.png", badge: "./icons/icon-192.png", data: { url: "./" }
      });
    }
  });
}
self.addEventListener("periodicsync", function (event) {
  if (event.tag === "kit-relances") event.waitUntil(_checkAndNotify());
});
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].url.indexOf(self.registration.scope) === 0 && "focus" in list[i]) return list[i].focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow("./");
  }));
});
