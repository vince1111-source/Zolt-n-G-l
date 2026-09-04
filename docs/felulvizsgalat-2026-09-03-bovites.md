# Ellenséges átvizsgálás — bővítés (munkacsomagok, teendő, partner-helyzet, lejárt ajánlat)

Dátum: 2026-09-03. Vizsgált változáskészlet: a `claude/projekt-folytatasa-p0titv` ág nem commitolt diffje (AI-doboz új szándékai, ajánlatszerkesztés, munkacsomagok, `0019_munkacsomagok.sql`).

Módszer: 5 támadó nézőpont (tenant-izoláció, állapotgép/pénz, bemenetkezelés, verseny/atomicitás, termékszabályok), minden állítást külön ellenőrző ügynök igazolt a kódon végigkövetve. 17 állítás érkezett, a verifier mind a 17-et megerősítette; az azonos hibát más oldalról találó állítások össze vannak vonva. Elutasított állítás nincs.

**Állapot: mind a 11 javítva** (lásd HANDOVER 2.10 "Az ellenséges felülvizsgálat eredménye és a javítások"), két tudatosan nyitva hagyott ponttal: az M1 teljes tranzakciós RPC-változata (később, ha a szerkesztés valós használatba kerül) és az L1-nél a `supabase_admin` default ACL (postgres-ként nem módosítható).

| Súlyosság | Db | Téma |
|---|---|---|
| high | 4 | AI-doboz néma az új állapotokra; inaktív termék csendes beárazása / cseréje (3 helyen) |
| medium | 6 | nem atomi ajánlatmentés + TOCTOU; lejárt-dátum; csomag-, partner-, teendő-felismerés találgat; csomag-egység átértelmezés |
| low | 1 | Supabase táblajogok tágabbak, mint a migráció szövege |

---

## HIGH

### H1. Az AiBox nem jeleníti meg a `feladat_letrehozva` és `partner_helyzet` eredményt

**Fájl:** `webapp/src/components/AiBox.tsx`

**Forgatókönyv:** `aiErtelmezes` két új állapotot ad vissza, az AiBox viszont csak `ismeretlen` / `hiba` / `siker` / `naptar_letrehozva` / `javaslat` ágat renderel; a `tsc` nem jelzi, mert a JSX-feltétellánc nem kimerítőség-ellenőrzött. „Írd fel, hogy hívjam fel Kovácsot holnap": a `feladatok` sor beíródik, a doboz semmit nem mutat, a szöveg a mezőben marad — újraküldés duplikált teendőt szúr be. „Hogy állunk Kovácssal?": három lekérdezés lefut, semmi nem jelenik meg.

**Gyökérok (utólag):** az AiBox-átírás egy `&&`-láncban egy bukó teszt UTÁN állt, a fájlírás csendben kimaradt. Tanulság: fájlírást soha ne köss `&&`-vel teszt eredményéhez.

**Javítás:** két render-ág; a mező ürül lefutott parancs után; `PELDAK` és az „ismeretlen" súgó bővítve.

### H2. Inaktív termék csendben beárazódik (másolat, szerkesztés, csomag-ajánlat); a „kimaradt" toast halott kód

**Fájl:** `webapp/src/lib/ajanlat-szamitas.ts` (`ajanlatSzamitas`); `ajanlatok/actions.ts` (`ajanlatMasolasa`); `(vedett)/actions.ts` (csomag-ág)

**Forgatókönyv:** `ajanlatSzamitas` `.in("id", …)`-vel tölti a termékeket `aktiv`-szűrés nélkül. Az árlista sosem töröl (`aktiv=false`), `ajanlat_tetelek.termek_id` sosem NULL → a másolat „kihagyott" számlálója mindig 0. „Térkő 6 cm szürke" egy éve inaktiválva, „Másolat" egy régi ajánlatról → az új piszkozat a befagyott áron tartalmazza, a toast „(a mai árakon)"-t mond.

**Javítás:** `.eq("aktiv", true)` + Set-alapú hiányellenőrzés az `ajanlatSzamitas`-ban (minden hívóra hat); a Másolat `termekek(aktiv)` alapján kihagy és számol; a csomag-ág inaktív tételnél névvel hibát ad.

### H3. AjanlatForm: az inaktivált termék sora csendben az ábécé első termékére cserélődik

**Fájl:** `webapp/src/app/(vedett)/ajanlatok/AjanlatForm.tsx`; `ajanlatok/[id]/szerkesztes/page.tsx`

**Forgatókönyv:** A szerkesztő csak aktív termékeket ad a formnak, a `kezdoSorok` az inaktívra mutató tételt is tartalmazza. A vezérelt `<select required value={…}>` placeholder-optionje `disabled`; ha egyetlen option sem egyezik, a React és a böngésző az első nem-disabled optiont jelöli ki, a FormData a DOM-ból megy. Playwright-tal reprodukálva: 20 m² térkő → „Ágyazóhomok 20" figyelmeztetés nélkül.

**Javítás:** nem-disabled jelölt option „Már nincs az árlistában — válassz másikat" + piros figyelmeztetés (disabled+selected kimaradna a FormData-ból és elcsúsztatná az indexpárosítást); a szerver a H2-beli szűrővel elutasít; a csomag-gomb az aktív termékekre szűr és jelzi a kimaradtakat.

### H4. CsomagForm: az inaktivált termék tétele csendben más termékre cserélődik és így mentődik

**Fájl:** `webapp/src/app/(vedett)/arlista/csomagok/{CsomagForm.tsx,[id]/page.tsx,actions.ts}`

**Forgatókönyv:** Ugyanaz, mint H3, az árazási törzsadatra: a térkő inaktiválása után a „Térkövezés" csomag megnyitva „Ágyazóhomok 1,05"-öt mutat, mentve a csomag mostantól 1,05 m³ ágyazóhomokot ír elő m²-enként, és az AI-doboz minden „50 m² térkövezés" ajánlata rossz.

**Javítás:** a szerkesztő minden terméket betölt és `aktiv || hivatkozott` szűr; „— inaktív" jelölés + figyelmeztetés; a szerver inaktív tételnél névvel hibát ad.

---

## MEDIUM

### M1. `ajanlatTetelekCsereje` nem atomi és nincs állapot-őr — TOCTOU a kiküldéssel

**Fájl:** `webapp/src/lib/ajanlat-szamitas.ts`; `ajanlatok/actions.ts` (`ajanlatFrissitese`, `ajanlatKikuldese`)

**Forgatókönyv:** (a) UPDATE fej → DELETE tételek → INSERT tételek három külön hívás; a harmadik bukása fej-új-összeg/nulla-tétel állapotot hagy. (b) `ajanlatFrissitese` külön SELECT-tel ellenőrzi a `piszkozat`-ot, majd `.eq("id")`-vel ír; `ajanlatKikuldese` feltétel nélkül vált `kikuldve`-re. „Mentem" az egyik fülön, „Kiküldöm" a másikon: a kiküldött ajánlat felülíródik, a jóváhagyási napló a régi bruttót mutatja.

**Javítás (minimál, TS):** a fej-UPDATE `.eq("allapot","piszkozat").select("id").maybeSingle()`, 0 sornál hiba a tételek érintése ELŐTT; a kiküldés compare-and-set (`piszkozat` + a naplózott bruttó), sikertelenségnél a naplósor `elvetett` + hibaüzenet + hiba-flash. **Nyitva:** a teljes tranzakciós RPC (`0021`, `select … for update`), ha a szerkesztés valós használatba kerül.

### M2. `ervenyes_ig` csak létrehozáskor íródik: régebbi piszkozat kiküldve azonnal „lejárt"

**Javítás:** `alapErvenyesseg()` egy helyen (`ajanlat-szamitas.ts`); a kiküldés `ervenyes_ig`-et is ír.

### M3. Munkacsomag-egyeztetés az első részsztring-találatot választja kérdés helyett

**Forgatókönyv:** kétirányú `includes`, hosszkorlát és rangsor nélkül: „… 50 m²-re ma" → „Mázolás"; „Térkő" / „Térkő prémium" → az olcsóbb.

**Javítás:** `csomagKereses` (`lib/szandek.ts`) rangsorral: pontos → név-előtag toldalékkal (a leghosszabb nyer) → csonka bevitel → részsztring ≥ 4 betű (egymásba ágyazott neveknél a hosszabb; egyébként `tobb` → kérdez). `.order("nev")`. Tesztek: `szandek.teszt.mts`.

### M4. `partnerKereses` téves partnert köt

**Forgatókönyv:** „Emlékeztess hogy nagyon fontos a beton" → Nagy Kft.; „hívjam fel Szabolcsot" → Szabó Bt.; „kisebb szerszámot" → „Kis" (3 betű); a teendő-ágon a TELJES cím a keresőkulcs, egyetlen találat megerősítés nélkül mentődik.

**Javítás:** `partnerKereses` (`lib/szandek.ts`) `biztos` jelzéssel (teljes név egész szavakként = biztos; részsztring/első-szó-előtag ≥ 4 = tipp); a teendő csak biztos találatot köt; az ajánlat-ág tippnél feltételezés-sorban kimondja, mit értett.

### M5. Túl tág teendő-kiváltószavak csendes DB-írásba térítik a nem-teendő parancsokat

**Forgatókönyv:** „Állíts be 20% kedvezményt Kovácsnak" → teendő; „Vegyél fel egy új partnert" → teendő; „Rögzíts egy számlát" → teendő. A prototípus ugyanezt az igelistát `kell:["hatarido"]` mellett használta.

**Javítás:** `vegyel fel` / `allits be` / `rogzits` CSAK nap-szóval teendő, különben a 0. réteg továbbad (ismeretlen).

### M6. A csomag-ág átértelmezi a kimondott egységet: „30 m²" → „30 fm"

**Javítás:** `M2_ALIASOK`; nem-m² csomagnál hiba, nem átszámolás; a feltételezés mindig azt írja, amit a felhasználó mondott.

---

## LOW

### L1. Az élő táblajogok tágabbak, mint amit a 0019 szövege állít; az anon-t egyetlen függvény-REVOKE tartja távol

**Forgatókönyv:** a Supabase `alter default privileges for role postgres` miatt az `anon` és az `authenticated` minden public táblán ALL-t örököl (TRUNCATE-re az RLS nem vonatkozik). Élőben ellenőrizve: `set role anon; select count(*) from munkacsomagok` → `permission denied for function aktualis_ceg` — egyetlen sorompó.

**Javítás:** `db/migraciok/0020_jogosultsag_szukites.sql` — anon: semmi táblajog; authenticated: csak select/insert/update/delete; ugyanez a `postgres` default privileges-ben. Élesben ellenőrizve (anon: 0 sor; a naptár-feed `.ics` 200). **Nyitva:** a `supabase_admin` default ACL-je (postgres-ként nem módosítható; a migrációk postgres-ként futnak, ezért nem érinti őket).

---

## Elutasított állítások

Nincs — mind a 17 vizsgált állítást megerősítette a verifier.
