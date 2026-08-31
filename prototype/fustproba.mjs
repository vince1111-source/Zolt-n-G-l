#!/usr/bin/env node
/**
 * Füstpróba a telefon-első prototípushoz.
 *
 * A CLAUDE.md előírja, hogy módosítás után le kell futtatni. Ez a fájl teszi
 * ezt végrehajthatóvá: végigmegy a fő folyamatokon, és három olyan hibát keres,
 * ami ebben a projektben már többször előfordult:
 *   - vízszintes túlcsordulás telefonszélességen,
 *   - 44 px alatti célfelület (kesztyűben használhatatlan),
 *   - inline span-ek miatt egy sorba folyó címke/érték/forrás.
 *
 * Futtatás:
 *   npm i playwright && npx playwright install chromium
 *   node prototype/fustproba.mjs
 *
 * Ha a Chromium máshol van (pl. előre telepítve):
 *   CHROME=/utvonal/chrome node prototype/fustproba.mjs
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ITT = path.dirname(fileURLToPath(import.meta.url));
const OLDAL = 'file://' + path.join(ITT, 'CEGEM-AI-telefon.html');
const TELEFON = { width: 390, height: 844 };

let bukas = 0;
const ok = (allitas, uzenet, extra = '') => {
  if (!allitas) bukas += 1;
  console.log(`  ${allitas ? '✓' : '✗'} ${uzenet}${extra ? ' — ' + extra : ''}`);
};

const bongeszo = await chromium.launch(
  process.env.CHROME ? { executablePath: process.env.CHROME } : {}
);

async function ujOldal(opts = {}) {
  const ctx = await bongeszo.newContext({ viewport: TELEFON, deviceScaleFactor: 2, ...opts });
  const oldal = await ctx.newPage();
  // A külső betűkészlet-kérés hálózat nélkül percekig lóg. A füstpróbának
  // nincs rá szüksége, és így hermetikus is: nem függ a hálózattól.
  await oldal.route('**://*/**', r => {
    const u = r.request().url();
    r.continue ? (u.startsWith('file:') ? r.continue() : r.abort()) : r.abort();
  });
  const hibak = [];
  // A betűkészlet a Google Fontsról jön; hálózat nélküli futásnál ez nem hiba.
  oldal.on('console', m => m.type() === 'error' && !/ERR_|fonts\.g/.test(m.text()) && hibak.push(m.text()));
  oldal.on('pageerror', e => hibak.push('pageerror: ' + e.message));
  await oldal.goto(OLDAL);
  await oldal.waitForTimeout(400);
  return { ctx, oldal, hibak };
}

const tulcsordul = o => o.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
const kicsiCelok = o => o.evaluate(() =>
  [...document.querySelectorAll('button, .mezo')]
    .map(b => ({ t: (b.textContent || b.ariaLabel || '').trim().slice(0, 30), h: Math.round(b.getBoundingClientRect().height) }))
    .filter(x => x.h > 0 && x.h < 44));

/* ---------------------------------------------------------------- 1. váz -- */
console.log('\nAlapképernyő');
{
  const { ctx, oldal, hibak } = await ujOldal();
  ok(!(await tulcsordul(oldal)), 'nincs vízszintes túlcsordulás');
  const kicsi = await kicsiCelok(oldal);
  ok(kicsi.length === 0, 'minden célfelület legalább 44 px', JSON.stringify(kicsi));
  ok(hibak.length === 0, 'nincs konzolhiba', hibak.join(' | '));
  await ctx.close();
}

/* ------------------------------------------------------------ 2. ajánlat -- */
console.log('\nAjánlat készítése és jóváhagyása');
{
  const { ctx, oldal, hibak } = await ujOldal();
  await oldal.locator('.chip', { hasText: 'Készíts ajánlatot' }).click();
  await oldal.waitForTimeout(500);
  const vegosszeg = (await oldal.locator('.osszesen .v').textContent()).replace(/\s/g, ' ').trim();
  // Ugyanaz a szám, mint az asztali prototípusban — ha eltér, a demó két
  // különböző összeget mond ugyanarra a parancsra.
  ok(vegosszeg === '12 485 922 Ft', 'a végösszeg egyezik az asztali prototípuséval', vegosszeg);
  ok(await oldal.evaluate(() => {
    const t = document.querySelector('.tetelek');
    return t.scrollHeight <= t.getBoundingClientRect().height + 1;
  }), 'a tétellista nincs levágva (a végösszeg látszik)');
  ok(!(await tulcsordul(oldal)), 'nincs túlcsordulás az ajánlat lapon');
  await oldal.locator('[data-tett="ajanlat-jovahagy"]').click();
  await oldal.waitForTimeout(400);
  ok((await oldal.locator('#lap').count()) === 0, 'jóváhagyás után bezárul a lap');
  ok(await oldal.evaluate(() => naplo.some(n => n.allapot === 'végrehajtva')), 'a napló rögzítette a kiküldést');
  ok(hibak.length === 0, 'nincs konzolhiba', hibak.join(' | '));
  await ctx.close();
}

/* ------------------------------------------- 2b. ajánlat módosítása -- */
console.log('\nAjánlat módosítása beszédből');
{
  const { ctx, oldal, hibak } = await ujOldal();
  await oldal.locator('.chip', { hasText: 'Készíts ajánlatot' }).click();
  await oldal.waitForTimeout(500);
  const elso = (await oldal.locator('.osszesen .v').textContent()).trim();
  await oldal.locator('[data-tett="ajanlat-modosit"]').click();
  await oldal.waitForTimeout(250);
  await oldal.fill('#bevitel', 'kilencszáz négyzetméter antik térkővel');
  await oldal.locator('#kuldGomb').click();
  await oldal.waitForTimeout(600);
  const masodik = (await oldal.locator('.osszesen .v').textContent()).trim();
  ok(elso !== masodik, 'a módosítás után más a végösszeg', `${elso} → ${masodik}`);
  ok(await oldal.evaluate(() => utolsoAjanlat.m2 === 900 && utolsoAjanlat.valtozat === 'antik'),
    'a kimondott szám és a változat is átment');
  ok((await oldal.locator('.tetel', { hasText: 'antik' }).count()) === 1, 'az antik anyag került a tételek közé');
  // A jóváhagyó lap szándékosan kizár minden más bevitelt (egy képernyő,
  // egy döntés), ezért előbb be kell zárni.
  await oldal.locator('#lap [data-zar]').last().click();
  await oldal.waitForTimeout(250);
  ok((await oldal.locator('#lap').count()) === 0, 'a Mégsem bezárja a lapot');
  // A módosítás-várakozás nem ragadhat be: egy sima parancsnak át kell mennie.
  await oldal.evaluate(() => { modositastVar = true; });
  await oldal.fill('#bevitel', 'mutasd a lejárt számláimat');
  await oldal.locator('#kuldGomb').click();
  await oldal.waitForTimeout(400);
  ok(await oldal.evaluate(() => nezet === 'penzugy' && modositastVar === false),
    'a nem-módosítás parancs a szokásos úton megy tovább');
  ok(hibak.length === 0, 'nincs konzolhiba', hibak.join(' | '));
  await ctx.close();
}

/* --------------------------------------------------- 3. számla rögzítése -- */
console.log('\nSzámla rögzítése megerősítő folyamattal');
{
  const { ctx, oldal, hibak } = await ujOldal();
  await oldal.locator('[data-lap="szamla"]').click();
  await oldal.waitForTimeout(250);
  // A fotógombnak tényleg a kamerát/fájlválasztót kell nyitnia.
  const valaszto = oldal.waitForEvent('filechooser', { timeout: 3000 }).then(() => true, () => false);
  await oldal.locator('.fotogomb').click();
  ok(await valaszto, 'a fotógomb megnyitja a fájlválasztót');
  await oldal.locator('[data-demofoto]').click();
  await oldal.waitForTimeout(1200);
  ok((await oldal.locator('.mezo').count()) > 0, 'megjelentek a kiolvasott mezők');
  ok((await oldal.locator('.mezo.ellenorizd').count()) > 0, 'a bizonytalan mező meg van jelölve');
  ok(await oldal.evaluate(() => {
    const bal = document.querySelector('.mezo .bal');
    const [n, e, h] = ['.nev', '.ert', '.honnan'].map(s => bal.querySelector(s).getBoundingClientRect());
    return n.bottom <= e.top + 1 && e.bottom <= h.top + 1;
  }), 'a címke, az érték és a forrás külön sorban van');
  await oldal.locator('[data-tett="szamla-rogzit"]').click();
  await oldal.waitForTimeout(400);
  ok(await oldal.evaluate(() => bejovoSzamlak.length === 3), 'a számla bekerült a fizetendők közé');
  ok(hibak.length === 0, 'nincs konzolhiba', hibak.join(' | '));
  await ctx.close();
}

/* ------------------------------------------------------ 4. végigvezetés -- */
console.log('\nVégigvezetés — jóváhagyási kapu');
{
  const { ctx, oldal, hibak } = await ujOldal();
  await oldal.locator('.chip', { hasText: 'Intézd el' }).click();
  await oldal.waitForTimeout(1000);
  ok((await oldal.locator('#lap h2').textContent()) === '1 / 3', 'a léptető az első ügynél áll');
  await oldal.locator('[data-tett="ugy-jovahagy"]').click(); await oldal.waitForTimeout(250);
  await oldal.locator('[data-tett="ugy-kihagy"]').click(); await oldal.waitForTimeout(250);
  await oldal.locator('[data-tett="ugy-jovahagy"]').click(); await oldal.waitForTimeout(400);
  const allapotok = await oldal.evaluate(() => ugyek.map(u => u.allapot));
  ok(JSON.stringify(allapotok) === JSON.stringify(['végrehajtott', 'kihagyott', 'végrehajtott']),
    'az állapotgép a jóváhagyást és a kihagyást is rögzítette', JSON.stringify(allapotok));
  ok((await oldal.locator('#lap').count()) === 0, 'a végén bezárul a léptető');
  // 3.2 szabály: a naplóból látszania kell, mit látott a rendszer.
  await oldal.locator('[data-megy="naplo"]').click();
  await oldal.waitForTimeout(300);
  ok((await oldal.locator('.naplotetel').count()) > 0, 'az AI napló nem üres');
  ok(hibak.length === 0, 'nincs konzolhiba', hibak.join(' | '));
  await ctx.close();
}

/* -------------------------------------------------------- 5. offline sor -- */
console.log('\nTérerő nélküli üzemmód');
{
  const { ctx, oldal, hibak } = await ujOldal();
  await oldal.locator('#tobbGomb').click(); await oldal.waitForTimeout(250);
  await oldal.locator('#offlineKapcsolo').click(); await oldal.waitForTimeout(300);
  await oldal.locator('.chip', { hasText: 'Készíts ajánlatot' }).click(); await oldal.waitForTimeout(500);
  await oldal.locator('[data-tett="ajanlat-jovahagy"]').click(); await oldal.waitForTimeout(400);
  ok(await oldal.evaluate(() => sor.length === 1), 'a művelet sorba került');
  ok((await oldal.locator('.kartya.figyelem .cimke').first().textContent()) === 'Küldésre vár',
    'a főképernyő tetején látszik a sor');
  await oldal.locator('#tobbGomb').click(); await oldal.waitForTimeout(250);
  await oldal.locator('#offlineKapcsolo').click(); await oldal.waitForTimeout(400);
  ok(await oldal.evaluate(() => sor.length === 0), 'visszatérő kapcsolatnál kiürül a sor');
  ok(hibak.length === 0, 'nincs konzolhiba', hibak.join(' | '));
  await ctx.close();
}

/* --------------------------------------------- 6. a kiküldhető dokumentum -- */
console.log('\nA kiküldendő dokumentum és az anyagszükséglet');
{
  const { ctx, oldal, hibak } = await ujOldal();
  await oldal.locator('.chip', { hasText: 'Készíts ajánlatot' }).click();
  await oldal.waitForTimeout(500);
  await oldal.locator('[data-tett="ajanlat-dokumentum"]').click();
  await oldal.waitForTimeout(300);
  ok((await oldal.locator('.dok').count()) === 1, 'megjelenik a dokumentum-előnézet');
  const dokVegso = (await oldal.locator('.dok-osszeg .vegso b').textContent()).replace(/\s/g, ' ').trim();
  // A dokumentum ugyanabból a számításból jön, mint a jóváhagyó lap — a
  // végösszegnek betűre egyeznie kell.
  ok(dokVegso === '12 485 922 Ft', 'a dokumentum végösszege egyezik a jóváhagyó lapéval', dokVegso);
  ok(await oldal.evaluate(() => {
    const d = document.querySelector('.dok');
    return d.textContent.includes(ceg.nev) && d.textContent.includes(ceg.adoszam);
  }), 'a fejléc a cégprofilból jön, nincs beégetve');
  ok(!(await tulcsordul(oldal)), 'nincs túlcsordulás a dokumentumon');
  await oldal.locator('[data-tett="ajanlat-anyag"]').click();
  await oldal.waitForTimeout(300);
  ok((await oldal.locator('.tetel').count()) === 6, 'az anyagszükséglet 6 tételt ad');
  ok(await oldal.evaluate(() => {
    // 800 m² · 5% ráhagyás = 840 m² → 65 raklap (12,96 m²/raklap, felfelé).
    const t = document.querySelector('.tetel .mennyi');
    return t.textContent.includes('65 raklap');
  }), 'a raklapszám a méretből számolódik');
  // Vissza az ajánlathoz: a lánc ne vesszen el.
  await oldal.locator('[data-tett="ajanlat-vissza"]').first().click();
  await oldal.waitForTimeout(250);
  ok((await oldal.locator('#lap h2').textContent()).startsWith('Ajánlat'), 'a Vissza az ajánlati laphoz tér vissza');
  ok(hibak.length === 0, 'nincs konzolhiba', hibak.join(' | '));
  await ctx.close();
}

/* -------------------------------------------------- 7. az ajánlatok sorsa -- */
console.log('\nAjánlatok listája és a jóváhagyás utóélete');
{
  const { ctx, oldal, hibak } = await ujOldal();
  const eleje = await oldal.evaluate(() => ajanlatok.length);
  await oldal.locator('.chip', { hasText: 'Készíts ajánlatot' }).click();
  await oldal.waitForTimeout(500);
  await oldal.locator('[data-tett="ajanlat-jovahagy"]').click();
  await oldal.waitForTimeout(400);
  ok(await oldal.evaluate((n) => ajanlatok.length === n + 1 && ajanlatok[0].allapot === 'kiküldve', eleje),
    'a jóváhagyott ajánlat bekerül a listába, kiküldve állapottal');
  await oldal.fill('#bevitel', 'mutasd az ajánlataimat');
  await oldal.locator('#kuldGomb').click();
  await oldal.waitForTimeout(400);
  ok(await oldal.evaluate(() => nezet === 'ajanlatok'), 'a parancs az ajánlatok nézetre visz');
  ok((await oldal.locator('[data-ajanlat]').count()) === eleje + 1, 'a lista minden ajánlatot mutat');
  // Egy régi ajánlat megnyitása: azt látjuk, amit az ügyfél kapott.
  await oldal.locator('[data-ajanlat="AJ-2026/031"]').click();
  await oldal.waitForTimeout(300);
  ok((await oldal.locator('.dok').count()) === 1, 'a régi ajánlat dokumentumként nyílik meg');
  ok((await oldal.locator('.lap-fej .jelzes').textContent()).includes('nincs válasz'),
    'az állapota is látszik rajta');
  ok(hibak.length === 0, 'nincs konzolhiba', hibak.join(' | '));
  await ctx.close();
}

/* --------------------------------------- 8. árlista: az ár tényleg átmegy -- */
console.log('\nÁrlista szerkesztése — az új ár beépül az ajánlatba');
{
  const { ctx, oldal, hibak } = await ujOldal();
  await oldal.locator('[data-megy="arlista"]').click();
  await oldal.waitForTimeout(300);
  await oldal.locator('[data-szerk="ar:2"]').click(); // Térkő lerakás 4800 Ft
  await oldal.waitForTimeout(300);
  await oldal.fill('.urlap input[name="ar"]', '5000');
  await oldal.locator('[data-ment]').click();
  await oldal.waitForTimeout(300);
  ok(await oldal.evaluate(() => arlista[2].ar === 5000), 'az új ár mentve');
  await oldal.locator('.chip', { hasText: 'Készíts ajánlatot' }).click();
  await oldal.waitForTimeout(500);
  const uj = (await oldal.locator('.osszesen .v').textContent()).replace(/\s/g, ' ').trim();
  // 800 m² × 200 Ft többlet: (10 135 500 + 160 000) × 0,97 × 1,27 = 12 683 026.
  ok(uj === '12 683 026 Ft', 'a következő ajánlat már az új árral számol', uj);
  ok(await oldal.evaluate(() => JSON.parse(localStorage.getItem(TAROLO)).arlista[2].ar === 5000),
    'a módosítás megmarad a tárolóban');
  await oldal.locator('#lap [data-zar]').first().click();
  await oldal.waitForTimeout(250);
  ok(hibak.length === 0, 'nincs konzolhiba', hibak.join(' | '));
  await ctx.close();
}

/* ------------------------------- 9. partner felvétele és felismerése ----- */
console.log('\nÚj partner — a 0. réteg is megtanulja');
{
  const { ctx, oldal, hibak } = await ujOldal();
  await oldal.locator('[data-megy="partnerek"]').click();
  await oldal.waitForTimeout(300);
  await oldal.locator('[data-szerk="partner:"]').click();
  await oldal.waitForTimeout(300);
  await oldal.fill('.urlap input[name="nev"]', 'Molnár Kertépítő Kft.');
  await oldal.fill('.urlap input[name="kapcsolat"]', 'Molnár Dénes');
  await oldal.fill('.urlap input[name="kedvezmeny"]', '5');
  await oldal.locator('[data-ment]').click();
  await oldal.waitForTimeout(300);
  ok(await oldal.evaluate(() => partnerek.some(x => x.nev === 'Molnár Kertépítő Kft.' && x.kedvezmeny === 5)),
    'a partner bekerült, kedvezménnyel');
  await oldal.fill('#bevitel', 'készíts ajánlatot a Molnár Kertépítőnek 100 négyzetméterre');
  await oldal.locator('#kuldGomb').click();
  await oldal.waitForTimeout(500);
  ok(await oldal.evaluate(() => {
    const l = document.querySelector('#lap h2');
    return l && l.textContent.includes('Molnár');
  }), 'a kimondott név alapján a 0. réteg megtalálja az új partnert');
  ok(await oldal.evaluate(() => {
    const li = [...document.querySelectorAll('.feltetel li')];
    return li.some(x => x.textContent.includes('5% törzsvevői kedvezmény'));
  }), 'az 5% kedvezmény beépült a feltételezések közé');
  ok(hibak.length === 0, 'nincs konzolhiba', hibak.join(' | '));
  await ctx.close();
}

/* ----------------------------- 10. kiolvasott mező javítása egy koppintással */
console.log('\nKiolvasott mező javítása');
{
  const { ctx, oldal, hibak } = await ujOldal();
  await oldal.locator('[data-lap="szamla"]').click();
  await oldal.waitForTimeout(250);
  await oldal.locator('[data-demofoto]').click();
  await oldal.waitForTimeout(1200);
  await oldal.locator('.mezo.ellenorizd').click(); // a bizonytalan bankszámlaszám
  await oldal.waitForTimeout(300);
  await oldal.fill('.urlap input[name="ertek"]', '11111111-22222222-33333333');
  await oldal.locator('[data-ment]').click();
  await oldal.waitForTimeout(400);
  ok(await oldal.evaluate(() =>
    kiolvasott.find(m => m.kulcs === 'bankszamla').ertek === '11111111-22222222-33333333'),
    'a javított érték lett az igaz');
  ok((await oldal.locator('.mezo.javitott').count()) === 1, 'a javítás nyoma látszik a mezőn');
  ok((await oldal.locator('.mezo.ellenorizd').count()) === 0, 'nincs több bizonytalan mező');
  ok(await oldal.evaluate(() => naplo.some(n => n.mit === 'Kiolvasott mező javítása')),
    'a javítás bekerült az AI naplóba');
  // A Mégsem a javítólapon nem dobhatja el az egész folyamatot.
  await oldal.locator('.mezo').first().click();
  await oldal.waitForTimeout(300);
  await oldal.locator('.lap-lab [data-zar]').click();
  await oldal.waitForTimeout(300);
  ok((await oldal.locator('#lap h2').textContent()) === 'Ellenőrizd',
    'a javítás Mégsemje az Ellenőrizd lapra visz vissza');
  ok((await oldal.locator('.mezo.javitott').count()) === 1, 'a korábbi javítás megmaradt');
  ok(hibak.length === 0, 'nincs konzolhiba', hibak.join(' | '));
  await ctx.close();
}

/* --------------------------- 11. a kiadott ajánlat pillanatképe ---------- */
console.log('\nA kiadott ajánlat nem változik az árlistával');
{
  const { ctx, oldal, hibak } = await ujOldal();
  // Áremelés...
  await oldal.evaluate(() => { arlista[2].ar = 9999; });
  // ...de a régen kiküldött ajánlat a kiadáskori árat mutatja.
  await oldal.locator('[data-megy="ajanlatok"]').click();
  await oldal.waitForTimeout(300);
  await oldal.locator('[data-ajanlat="AJ-2026/031"]').click();
  await oldal.waitForTimeout(300);
  const vegso = (await oldal.locator('.dok-osszeg .vegso b').textContent()).replace(/\s/g, ' ').trim();
  ok(vegso === '4 397 820 Ft', 'a régi ajánlat a kiadáskori árakkal jelenik meg', vegso);
  ok(hibak.length === 0, 'nincs konzolhiba', hibak.join(' | '));
  await ctx.close();
}

/* ------------------- 12. árlistatétel törlése nem törheti el a rendszert -- */
console.log('\nÁrlistatétel törlése után a rendszer őszintén hibázik');
{
  const { ctx, oldal, hibak } = await ujOldal();
  await oldal.locator('[data-megy="arlista"]').click();
  await oldal.waitForTimeout(300);
  await oldal.locator('[data-szerk="ar:5"]').click(); // Kiszállás, munkakezdés
  await oldal.waitForTimeout(300);
  await oldal.locator('[data-torol]').click();
  await oldal.waitForTimeout(300);
  ok(await oldal.evaluate(() => !arlista.some(t => t.nev === 'Kiszállás, munkakezdés')), 'a tétel törölve');
  await oldal.locator('.chip', { hasText: 'Készíts ajánlatot' }).click();
  await oldal.waitForTimeout(500);
  ok((await oldal.locator('#lap').count()) === 0, 'nem nyílik törött ajánlatlap');
  ok(await oldal.evaluate(() => valasz && valasz.szoveg.includes('hiányzik')),
    'a válasz néven nevezi a hiányzó tételt');
  ok(hibak.length === 0, 'nincs konzolhiba (nem TypeError, hanem kezelt hiba)', hibak.join(' | '));
  await ctx.close();
}

/* ------------- 13. a módosítás-várakozás nem téríti el a teljes parancsot -- */
console.log('\nMódosítás közben adott teljes parancs a szokásos úton megy');
{
  const { ctx, oldal, hibak } = await ujOldal();
  await oldal.locator('.chip', { hasText: 'Készíts ajánlatot' }).click();
  await oldal.waitForTimeout(500);
  await oldal.locator('[data-tett="ajanlat-modosit"]').click();
  await oldal.waitForTimeout(250);
  await oldal.fill('#bevitel', 'készíts ajánlatot a Szabó Ingatlan Zrt.-nek 300 négyzetméter térkövezésre');
  await oldal.locator('#kuldGomb').click();
  await oldal.waitForTimeout(500);
  ok(await oldal.evaluate(() => {
    const h = document.querySelector('#lap h2');
    return h && h.textContent.includes('Szabó');
  }), 'az új parancs új ajánlatot nyit a kért partnernek, nem a régit írja át');
  ok(await oldal.evaluate(() => utolsoAjanlat.partner === 'szabo' && utolsoAjanlat.m2 === 300),
    'az utolsó ajánlat már a Szabóé');
  ok(hibak.length === 0, 'nincs konzolhiba', hibak.join(' | '));
  await ctx.close();
}

/* --------------------- 14. offline jóváhagyás: őszinte állapot a listában -- */
console.log('\nOffline jóváhagyott ajánlat állapota');
{
  const { ctx, oldal, hibak } = await ujOldal();
  await oldal.locator('#tobbGomb').click(); await oldal.waitForTimeout(250);
  await oldal.locator('#offlineKapcsolo').click(); await oldal.waitForTimeout(300);
  await oldal.locator('.chip', { hasText: 'Készíts ajánlatot' }).click(); await oldal.waitForTimeout(500);
  await oldal.locator('[data-tett="ajanlat-jovahagy"]').click(); await oldal.waitForTimeout(400);
  ok(await oldal.evaluate(() => ajanlatok[0].allapot === 'küldésre vár'),
    'a lista nem mondja kiküldöttnek, amíg tényleg ki nem ment');
  ok(await oldal.evaluate(() => naplo[0].mit.includes('Kovács Építő Kft.') || sor[0].mit.includes('Kovács Építő Kft.')),
    'a napló és a sor a valódi partnert rögzíti');
  await oldal.locator('#tobbGomb').click(); await oldal.waitForTimeout(250);
  await oldal.locator('#offlineKapcsolo').click(); await oldal.waitForTimeout(400);
  ok(await oldal.evaluate(() => ajanlatok[0].allapot === 'kiküldve'),
    'a kapcsolat visszatérésekor az ajánlat tényleg kiküldötté válik');
  ok(hibak.length === 0, 'nincs konzolhiba', hibak.join(' | '));
  await ctx.close();
}

/* ------------------------- 15. nagyker: árrés, fedezet, árfrissítés ------ */
console.log('\nNagyker — árréses árlista és az árfrissítés kapuja');
{
  const { ctx, oldal, hibak } = await ujOldal();
  // A fedezet a jóváhagyó lapon látszik...
  await oldal.locator('.chip', { hasText: 'Készíts ajánlatot' }).click();
  await oldal.waitForTimeout(500);
  ok((await oldal.locator('.fedezet').count()) === 1, 'a fedezet-sáv ott van a jóváhagyó lapon');
  ok(/Fedezet/.test(await oldal.locator('.fedezet .c').textContent()), 'és fedezetnek nevezi magát');
  // ...de az ügyfélnek szóló dokumentumra nem kerül rá.
  await oldal.locator('[data-tett="ajanlat-dokumentum"]').click();
  await oldal.waitForTimeout(300);
  const dokSzoveg = await oldal.evaluate(() => document.getElementById('lap').textContent);
  ok(!/[Ff]edezet|beszerz/i.test(dokSzoveg), 'a dokumentumon nincs fedezet és nincs beszerzési ár');
  await oldal.locator('[data-tett="ajanlat-vissza"]').first().click();
  await oldal.waitForTimeout(250);
  await oldal.locator('#lap .gombsor [data-zar]').click();
  await oldal.waitForTimeout(250);

  // Nagyker nézet: parancsból, árrés-jelzésekkel és a váró frissítéssel.
  await oldal.fill('#bevitel', 'Mennyiért adja most a BauMax a térkövet?');
  await oldal.locator('#kuldGomb').click();
  await oldal.waitForTimeout(400);
  ok(await oldal.evaluate(() => nezet === 'nagyker'), 'a parancs a nagyker nézetre visz');
  ok((await oldal.locator('.jelzes', { hasText: 'árrés' }).count()) > 0, 'az árrés tételenként látszik');
  ok((await oldal.locator('[data-lap="arfrissites"]').count()) === 1, 'az árfrissítés átvezetésre vár');

  // Az árfrissítés a kapun megy át: átnézed, és csak jóváhagyásra vezet át.
  await oldal.locator('[data-lap="arfrissites"]').click();
  await oldal.waitForTimeout(300);
  const regiSzurke = await oldal.evaluate(() => arlista.find(t => t.nev === 'Térkő anyag, szürke 6 cm').ar);
  await oldal.locator('[data-tett="arfrissites-atvezet"]').click();
  await oldal.waitForTimeout(400);
  ok(await oldal.evaluate(() => arlista.find(t => t.nev === 'Térkő anyag, szürke 6 cm').besz === 3190),
    'a beszerzési ár átment');
  const ujSzurke = await oldal.evaluate(() => arlista.find(t => t.nev === 'Térkő anyag, szürke 6 cm').ar);
  ok(ujSzurke > regiSzurke && ujSzurke % 10 === 0, 'az eladási ár az árrés tartásával nőtt, 10 Ft-ra kerekítve',
    `${regiSzurke} → ${ujSzurke}`);
  ok(await oldal.evaluate(() => arfrissites === null), 'nincs több váró frissítés');
  ok(await oldal.evaluate(() => naplo.some(n => n.mit.includes('árfrissítés') && n.allapot === 'végrehajtva')),
    'az átvezetés a naplóban, jóváhagyással');
  // A következő ajánlat már az új árral megy.
  await oldal.locator('.chip', { hasText: 'Készíts ajánlatot' }).click();
  await oldal.waitForTimeout(500);
  const vegso = (await oldal.locator('.osszesen .v').textContent()).replace(/\s/g, ' ').trim();
  ok(vegso !== '12 485 922 Ft', 'a következő ajánlat már az átvezetett árral számol', vegso);
  ok(hibak.length === 0, 'nincs konzolhiba', hibak.join(' | '));
  await ctx.close();
}

/* --------------------- 16. anyaglap: beszerzési költség a nagyker árain -- */
console.log('\nBeszerzési költség az anyaglapon');
{
  const { ctx, oldal, hibak } = await ujOldal();
  await oldal.locator('.chip', { hasText: 'Mennyi anyag kell' }).click();
  await oldal.waitForTimeout(500);
  const cimke = await oldal.locator('#lap .osszesen .c').textContent();
  ok(/Beszerzés/.test(cimke), 'az anyaglap alján ott a beszerzési összeg', cimke);
  const osszeg = await oldal.locator('#lap .osszesen .v').textContent();
  ok(/Ft/.test(osszeg) && osszeg.trim() !== '0 Ft', 'az összeg a nagyker árain számolt', osszeg.trim());
  ok(hibak.length === 0, 'nincs konzolhiba', hibak.join(' | '));
  await ctx.close();
}

/* ----------------- 17. az átvizsgálás javított hibái ne jöjjenek vissza -- */
console.log('\nÁrrés-szélsőségek és a nagyker-kapcsolat');
{
  const { ctx, oldal, hibak } = await ujOldal();
  // Nagyker-nevű tétel felvételekor a beszerzési ár a szállítóét követi —
  // az árfrissítő lapon nincs NaN.
  await oldal.locator('[data-megy="arlista"]').click(); await oldal.waitForTimeout(250);
  await oldal.locator('[data-szerk="ar:-1"]').click(); await oldal.waitForTimeout(250);
  await oldal.fill('.urlap input[name="nev"]', 'Zúzottkő 0/32');
  await oldal.fill('.urlap input[name="ar"]', '6000');
  await oldal.locator('[data-ment]').click(); await oldal.waitForTimeout(300);
  ok(await oldal.evaluate(() => {
    const t = arlista.find(x => x.nev === 'Zúzottkő 0/32');
    return t && t.besz === 4200 && t.nagyker === true;
  }), 'a nagyker-nevű új tétel átveszi a szállító beszerzési árát');
  await oldal.evaluate(() => { nezet = 'nagyker'; valasz = null; rajzol(); });
  await oldal.waitForTimeout(250);
  await oldal.locator('[data-lap="arfrissites"]').click(); await oldal.waitForTimeout(300);
  const frissitoSzoveg = await oldal.evaluate(() => document.getElementById('lap').textContent);
  ok(!/NaN|Infinity/.test(frissitoSzoveg), 'az árfrissítő lapon nincs NaN és nincs Infinity');
  await oldal.locator('#lap [data-zar]').last().click(); await oldal.waitForTimeout(250);

  // Veszteséges ár: piros jelzés az árlistán, piros fedezet-sáv az ajánlaton.
  await oldal.evaluate(() => {
    arlista.find(x => x.nev === 'Térkő anyag, szürke 6 cm').ar = 2000; // besz 2980 alatt
    nezet = 'arlista'; rajzol();
  });
  await oldal.waitForTimeout(250);
  ok((await oldal.locator('.jelzes.j-kritikus', { hasText: 'árrés' }).count()) > 0,
    'a beszerzés alatti ár piros árrés-jelzést kap');
  await oldal.locator('.chip', { hasText: 'Készíts ajánlatot' }).click();
  await oldal.waitForTimeout(500);
  ok(await oldal.evaluate(() => {
    const f = document.querySelector('.fedezet');
    return f && !f.classList.contains('veszteseg'); // 800 m²-en még pozitív a teljes fedezet
  }), 'pozitív fedezetnél nincs veszteség-jelzés');
  await oldal.evaluate(() => {
    // Mindent önköltség alá viszünk — a fedezet negatívba fordul.
    arlista.forEach(t => { if(t.besz) t.ar = Math.max(1, Math.round(t.besz * 0.5)); });
    const aj = ajanlatKeszites('kovacs', 800, 'normal');
    nezettAjanlat = { a: aj, szam: kovetkezoAjanlatSzam(), allapot:'tervezet', kelt:'2026-08-25' };
    lapNyit(ajanlatLap(aj, nezettAjanlat.szam, 'tervezet', '2026-08-25'));
  });
  await oldal.waitForTimeout(300);
  ok((await oldal.locator('.fedezet.veszteseg').count()) === 1, 'negatív fedezetnél piros a sáv');
  ok(/Veszteséges/.test(await oldal.locator('.fedezet .c').textContent()),
    'és ki is mondja, hogy veszteséges');
  ok(hibak.length === 0, 'nincs konzolhiba', hibak.join(' | '));
  await ctx.close();
}

/* ------------------------------------------------------------ 6. témák -- */
console.log('\nMegjelenés');
for (const [nev, opts] of [['világos', { colorScheme: 'light' }], ['sötét', { colorScheme: 'dark' }]]) {
  const { ctx, oldal } = await ujOldal(opts);
  const hatter = await oldal.evaluate(() => getComputedStyle(document.body).backgroundColor);
  ok(hatter !== 'rgba(0, 0, 0, 0)', `${nev} téma: a body háttere ki van festve`, hatter);
  ok(!(await tulcsordul(oldal)), `${nev} téma: nincs túlcsordulás`);
  await ctx.close();
}
{
  const { ctx, oldal } = await ujOldal();
  await oldal.locator('#napfenyGomb').click();
  await oldal.waitForTimeout(250);
  ok(await oldal.evaluate(() => document.documentElement.getAttribute('data-napfeny') === '1'),
    'a napfény üzemmód bekapcsol');
  await ctx.close();
}

await bongeszo.close();
console.log(`\n${bukas ? `${bukas} ellenőrzés bukott` : 'Minden ellenőrzés rendben'}\n`);
process.exit(bukas ? 1 : 0);
