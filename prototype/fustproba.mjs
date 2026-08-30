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
  await oldal.locator('.fotogomb').click();
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
