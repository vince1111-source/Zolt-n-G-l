/*
 * CÉGEM.AI service worker — a "telepíthető PWA" másik fele (lásd
 * src/app/manifest.ts). SZÁNDÉKOSAN minimális, és a biztonság a fő
 * tervezési szempont, nem az offline-teljesség:
 *
 * Ez egy hitelesített, több cég adatát RLS-szel elválasztó alkalmazás.
 * Egy service worker cache pontosan az a hely, ahol egy cég adata
 * átszivároghat egy másik felhasználóhoz ugyanazon az eszközön (közös
 * telefon, kilépés után bennmaradt oldal), vagy ahol kilépés után is
 * "él" egy régi, bejelentkezett képernyő. Ezért:
 *
 *   - HTML-navigációt SOHA nem cache-elünk. Hálózat-először, és ha nincs
 *     hálózat, egy statikus, adatmentes /offline.html jön — nem egy
 *     korábbi, valaki más adatait tartalmazó oldal.
 *   - Csak a tartalom-hash-elt, változatlan statikus fájlokat cache-eljük
 *     (/_next/static/*, ikonok, manifest). Ezekben nincs semmilyen
 *     felhasználói adat, ezért cégfüggetlenek.
 *   - A Supabase-hívásokhoz (más origin) és a /naptar-feed/* titkos
 *     feedhez hozzá sem nyúlunk.
 *
 * Mivel felhasználói adat sosem kerül a cache-be, kilépéskor nincs mit
 * törölni — ez tudatos: egy "töröld kilépéskor" horog elfelejthető vagy
 * elromolhat, egy soha-nem-cache-elt adat nem.
 */

const VERZIO = "cegemai-v1";
const STATIKUS_ELOTOLTES = ["/offline.html", "/ikon-192.png", "/ikon-512.png", "/manifest.webmanifest"];

self.addEventListener("install", (esemeny) => {
  esemeny.waitUntil(
    caches.open(VERZIO).then((cache) => cache.addAll(STATIKUS_ELOTOLTES)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (esemeny) => {
  esemeny.waitUntil(
    caches
      .keys()
      .then((kulcsok) => Promise.all(kulcsok.filter((k) => k !== VERZIO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function statikusE(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/manifest.webmanifest" ||
    /^\/ikon-\d+\.png$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (esemeny) => {
  const keres = esemeny.request;
  if (keres.method !== "GET") return;

  const url = new URL(keres.url);
  if (url.origin !== self.location.origin) return; // Supabase és minden más: érintetlen
  if (url.pathname.startsWith("/naptar-feed/")) return; // titkos token, sosem cache

  if (keres.mode === "navigate") {
    esemeny.respondWith(
      fetch(keres).catch(() => caches.match("/offline.html")),
    );
    return;
  }

  if (statikusE(url)) {
    esemeny.respondWith(
      caches.match(keres).then(
        (talalat) =>
          talalat ||
          fetch(keres).then((valasz) => {
            if (valasz.ok) {
              const masolat = valasz.clone();
              caches.open(VERZIO).then((cache) => cache.put(keres, masolat));
            }
            return valasz;
          }),
      ),
    );
  }
});
