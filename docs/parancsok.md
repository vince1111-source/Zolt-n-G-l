# A prototípusok felismert parancsai

Két prototípus van, és **külön parancskészletük** van. A fő irány a telefonos.

- [Telefonos prototípus](#telefonos-prototípus) — `prototype/CEGEM-AI-telefon.html`
- [Asztali prototípus](#asztali-prototípus) — `prototype/CEGEM-AI-prototipus.html`

Mindkettő ékezet nélkülire normalizálva vizsgál (`norm()`), tehát ékezettel és
anélkül is működik. **Egyik sem nyelvi modell**: determinisztikus mintaillesztés,
ami demóra jó, termékbe nem.

---

## Telefonos prototípus

Ez a 0. réteg — ugyanaz a logika, mint a `spike/parancs/reteg0.mjs` fájlban és a
hangmérő lapon. Ami itt eldől, az ingyen van: nincs hálózat, nincs token.

| Szándék | Felismerési minta | Kell hozzá | Mit csinál |
|---|---|---|---|
| Végigvezetés | `intezd el`, `intezz el`, `csinald meg helyettem`, `surgos dolgaim`, `vegyuk sorra`, `mai surgos` | — | Ügyek összeszedése, majd tételenként jóváhagyási kapu |
| Számla rögzítése | `fotoz`, `szamlat rogzits`, `olvasd be`, `szkenneld`, `bejovo szamlat` | — | Fotó → kiolvasás → megerősítő folyamat |
| Ajánlat | `ajanlat`, `arajanlat`, `adj arat`, `kalkulalj` | partner + mennyiség | Kalkuláció, majd teljes képernyős jóváhagyó lap |
| Partner megnyitása | `mutasd`, `nyisd meg`, `nezzuk`, `hogy allunk a`, `mi a helyzet a`, `mennyivel tartozik` | partner | Partner adatlap AI-összefoglalóval |
| Fizetési felszólítás | `felszolit`, `fizetesi emlek`, `hogy fizessen`, `szolj ra` | partner | Levéltervezet jóváhagyási kapuval |
| Feladat rögzítése | `emlekeztess`, `jegyezd fel`, `ird fel`, `vegyel fel`, `allits be`, `rogzits`, `ne felejtsem` | határidő | Dátumfelismerés + feladat |
| Lejárt / kintlévőség | `lejart`, `kintlevo`, `ki tartozik`, `nem fizettek`, `hatralek` | — | Kintlévőség nézet |
| Fizetendő | `mennyit kell kifizet`, `mit kell utalni`, `utalni`, `bejovo szaml`, `kinek tartozom` | — | Heti esedékesség |
| Mai teendő | `mai teendo`, `mi a dolgom`, `teendoim`, `mi van ma`, `napirend`, `mit kell ma` | — | Feladatlista |
| Összefoglaló | `helyzet a cegemben`, `hogy allunk`, `foglald ossze`, `osszefoglal`, `hogy all a ceg` | — | Napi állás |
| Árlista | `arlista`, `mennyibe kerul`, `mi az ara`, `listaar`, `mennyiert adom` | — | Árlista nézet |
| Ajánlatok | `ajanlataim`, `ajanlatok`, `kikuldott ajanlat`, `nyitott ajanlat` | — | A kiadott ajánlatok és a sorsuk |
| Anyagszükséglet | `mennyi anyag`, `anyagszukseglet`, `mit kell rendelni`, `hany raklap`, `beszerzesi lista` | mennyiség* | Beszerzési lista ugyanabból a méretből |
| Cégadatok | `cegadat`, `cegprofil`, `adoszamom`, `bankszamlaszamom`, `beallitas` | — | Cégprofil nézet |
| Nagyker | `nagyker`, `beszerzesi ar`, `arres`, `mennyiert adja`, `arfrissites` | — | Beszerzési árak, árrés, váró árfrissítés |
| Munkák | `munkaim`, `hogy all a munka`, `helyszin`, `epitkezes` | — | Munkák: állapot, fotódokumentáció, kapcsolódó ajánlat |

\* Az anyagszükséglet a mondatból veszi a méretet, vagy az utoljára nézett
ajánlatból — ha egyik sincs, visszakérdez.

**Ha hiányzik egy szükséges adat**, a rendszer visszakérdez („Melyik partnernek?"),
nem találgat. Ha egyáltalán nem ismeri fel, kiírja, hogy továbbadná a modellnek —
a prototípusban nincs modellhívás.

### Példaparancsok (a chipsáv)

1. Intézd el a mai sürgős dolgaimat
2. Készíts ajánlatot a Kovács Kft-nek 800 négyzetméter térkövezésre
3. Mutasd a lejárt számláimat
4. Jövő kedden emlékeztess, hogy hívjam fel a Kovács Kft-t
5. Küldj fizetési felszólítást a Zöld Kertnek
6. Mennyibe kerül a szürke térkő?
7. Mutasd az ajánlataimat
8. Mennyi anyag kell 800 négyzetméterhez?
9. Mennyiért adja most a BauMax a térkövet?
10. Fotózok egy számlát
11. Mi a mai teendőm?

### Számfelismerés

Kimondott számnevet is kezel: „nyolcszáz négyzetméter" → `800`. Számjeggyel
mértékegység mellett (`800 nm`, `120 négyzetre`), betűvel kimondva, vagy csupasz
számként, ha a mondatban pontosan egy szerepel.

---

## Asztali prototípus

A `handle()` függvény szándékfelismerő ágai, felismerési mintával együtt.

| Szándék | Felismerési minta (regex, normalizált) | Mit csinál |
|---|---|---|
| 16. modul — végigvezetés | `intezd el`, `csinald meg helyettem`, `surgos dolgaim`, `intezz el`, `vegyuk sorra` | Összegyűjti és priorizálja az ügyeket, majd tételenként jóváhagyási kaput mutat |
| Ajánlatkészítés | (`ajanlat`\|`arajanlat`) ÉS (`keszits`\|`csinalj`\|`kerek`\|`kellene`\|`keszitsd`) | Partner + m² kinyerése, kalkuláció az árlistából, A4 ajánlat |
| Lejárt / kintlévőség | `lejart`, `kintlevo`, `tartoznak`, `nem fizetett`, `hatralek` | Pénzügyi nézet + összegzés + felajánlja az emlékeztetőt |
| Fizetendő | `mennyit kell`, `kifizet`, `fizetnunk`, `utalni`, `bejovo szaml` | Heti esedékesség, lejárt bejövő kiemelése |
| Mai teendő | `mai teendo`, `mi a dolgom`, `teendoim`, `mi van ma`, `mai feladat`, `napirend` | Feladatnézet + felsorolás |
| Vezetői összefoglaló | `helyzet a cegemben`, `hogy allunk`, `osszefoglal`, `hogy all a ceg`, `vezetoi` | Teljes napi állás |
| Fizetési felszólítás | `felszolit`, `emlekezteto`, `fizetesi emlek` | Levéltervezet jóváhagyási kapuval |
| Feladat rögzítése | `emlekeztess`, `jegyezd fel`, `vegyel fel`, `allits be`, `rogzits` | Dátumfelismerés (`holnap`, `jovo kedd`, `jovo het`, `penteken`) + feladat |
| Szerződéselemzés | `szerzodes`, `kotber`, `mi a lenyeg`, `elemezd`, `dokumentum` | Szimulált kivonat + jogi disclaimer |
| Árlista | `arlista`, `mennyibe kerul`, `mi az ara`, `termek` | Árlista nézet |
| Partner megnyitása | partnernév + (`mutasd`\|`nyisd`\|`hozd`\|`mi a helyzet`\|`hogy all`) | Partnerközpont adatlap AI-összefoglalóval |
| Fallback | minden más | Felsorolja a működő példaparancsokat |

### Példaparancsok (a `CHIPS` tömb)

1. Mi a helyzet a cégemben?
2. Intézd el a mai sürgős dolgaimat
3. Készíts ajánlatot a Kovács Kft-nek 800 négyzetméter térkövezésre
4. Mutasd a lejárt számláimat
5. Mi a mai teendőm?
6. Mutasd a Kovács Kft-t
7. Mennyit kell kifizetnünk ezen a héten?
8. Jövő kedden emlékeztess, hogy hívjam fel a Kovács Kft-t
9. Mi a lényeg a szerződésben?

### Ajánlatkészítés logikája (`buildQuote`)

Bemenet: partner, m², változat (`normal` / `mintas` / `antik`).

Generált tételek:
1. Alapozás, zúzottkő ágyazat — m²
2. Térkő anyag (szürke vagy antik) — m² × 1,05 (vágási ráhagyás)
3. Térkő lerakás (normál vagy mintás kötés) — m²
4. Szegélykő anyag — fm
5. Szegélykő elhelyezés — fm
6. Kiszállás — 1 alkalom

Kerület becslése: `Math.round(4*Math.sqrt(m2)/5)*5` — **négyzetes területet feltételez**, és ezt a „Amit feltételeztem” sávban ki is írja. 800 m² → 115 fm.

Ezután: partner törzsvevői kedvezménye → nettó → ÁFA 27% → bruttó.

**Ez a rész a termékben is így maradhat**, csak az LLM tölti ki a paramétereket a beszédből, a kalkuláció determinisztikus kód marad. Számolást ne bízz a modellre.
