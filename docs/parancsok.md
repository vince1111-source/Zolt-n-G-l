# A prototípus felismert parancsai

A `handle()` függvény szándékfelismerő ágai, felismerési mintával együtt. Ékezet nélkülire normalizálva vizsgál (`norm()`), tehát ékezettel és anélkül is működik.

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

## Példaparancsok (a `CHIPS` tömb)

1. Mi a helyzet a cégemben?
2. Intézd el a mai sürgős dolgaimat
3. Készíts ajánlatot a Kovács Kft-nek 800 négyzetméter térkövezésre
4. Mutasd a lejárt számláimat
5. Mi a mai teendőm?
6. Mutasd a Kovács Kft-t
7. Mennyit kell kifizetnünk ezen a héten?
8. Jövő kedden emlékeztess, hogy hívjam fel a Kovács Kft-t
9. Mi a lényeg a szerződésben?

## Ajánlatkészítés logikája (`buildQuote`)

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
