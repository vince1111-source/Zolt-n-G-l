#!/usr/bin/env node
/**
 * CÉGEM.AI — 0. fázis spike / 2. kérdés (2. rész: kiértékelés)
 *
 * Összeveti a kiolvas.mjs kimenetét az általad kitöltött igazsag.csv-vel,
 * és kiszámolja azt a három számot, ami alapján a 6. modul scope-ja eldől:
 *
 *   1. mezőnkénti pontosság            — mennyi jön ki jól magától
 *   2. csendes hibák aránya            — rossz érték, amit a modell nem jelölt be
 *   3. felesleges bejelölések aránya   — jó érték, amit mégis ellenőriztetne
 *
 * A 2. a fontos: az a hiba, ami átcsúszik a felhasználón.
 *
 * Futtatás:  node szamlaolvasas/ertekel.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ITT = path.dirname(fileURLToPath(import.meta.url));
const KI = path.join(ITT, 'kimenet');
const IGAZSAG = path.join(ITT, 'igazsag.csv');
const RIPORT = path.join(ITT, '..', 'eredmenyek', 'szamlaolvasas-riport.md');

const MEZOK = [
  ['kiallito_nev', 'nev'],
  ['kiallito_adoszam', 'adoszam'],
  ['vevo_nev', 'nev'],
  ['vevo_adoszam', 'adoszam'],
  ['szamla_sorszam', 'azonosito'],
  ['kelt', 'datum'],
  ['teljesites', 'datum'],
  ['fizetesi_hatarido', 'datum'],
  ['netto', 'osszeg'],
  ['afa', 'osszeg'],
  ['brutto', 'osszeg'],
  ['penznem', 'kod'],
  ['bankszamlaszam', 'szamlaszam'],
  ['tetel_szam', 'szam'],
];

// ------------------------------------------------------------- normalizálás

const ekezetlen = (s) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const CEGFORMAK = /\b(kft|zrt|bt|kkt|nyrt|kht|ev|e\.?v|zartkoruen|mukodo|reszvenytarsasag|korlatolt|felelossegu|tarsasag|beteti)\b/g;

function norm(ertek, tipus) {
  const s = String(ertek ?? '').trim();
  if (!s) return '';
  switch (tipus) {
    case 'nev':
      return ekezetlen(s).replace(/[.,]/g, ' ').replace(CEGFORMAK, ' ').replace(/\s+/g, ' ').trim();
    case 'adoszam': {
      const d = s.replace(/\D/g, '');
      return d.slice(0, 8); // a törzsszám azonosít; az ÁFA- és megyekód külön kérdés
    }
    case 'szamlaszam':
      return s.replace(/\D/g, '');
    case 'azonosito':
      return ekezetlen(s).replace(/[\s]/g, '');
    case 'datum': {
      const d = s.replace(/[^\d]/g, ' ').trim().split(/\s+/);
      if (d.length >= 3 && d[0].length === 4) return `${d[0]}-${p2(d[1])}-${p2(d[2])}`;
      if (d.length >= 3) return `${d[2]}-${p2(d[1])}-${p2(d[0])}`;
      return s;
    }
    case 'osszeg': {
      // "1 234 567,89 Ft" → 1234567.89 ; "1,234,567.89" → 1234567.89
      let t = s.replace(/[^\d.,-]/g, '');
      if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
      else t = t.replace(/,/g, '');
      const n = Number(t);
      return Number.isFinite(n) ? String(Math.round(n * 100) / 100) : s;
    }
    case 'kod': {
      const k = s.toUpperCase().replace(/[^A-Z]/g, '');
      return k === 'FT' || k === 'HUF' ? 'HUF' : k;
    }
    case 'szam': {
      const n = Number(s.replace(/\D/g, ''));
      return Number.isFinite(n) && s.trim() ? String(n) : '';
    }
    default:
      return ekezetlen(s);
  }
}

const p2 = (x) => String(x).padStart(2, '0');

function egyezik(vart, kapott, tipus) {
  const a = norm(vart, tipus);
  const b = norm(kapott, tipus);
  if (a === b) return true;
  // Névnél a részleges egyezés is jó: "Kovács Építő" vs "Kovács Építő Kft."
  if (tipus === 'nev' && a && b && (a.includes(b) || b.includes(a))) return true;
  return false;
}

// ---------------------------------------------------------------- CSV-olvasó

function csvOlvas(fajl) {
  const nyers = fs.readFileSync(fajl, 'utf8').replace(/^﻿/, '');
  const sorok = nyers.split(/\r?\n/).filter((s) => s.trim());
  const fej = bont(sorok[0]);
  return sorok.slice(1).map((s) => Object.fromEntries(bont(s).map((v, i) => [fej[i] || `_${i}`, v])));
}

function bont(sor) {
  const ki = [];
  let mezo = '';
  let idezojelben = false;
  for (let i = 0; i < sor.length; i++) {
    const c = sor[i];
    if (c === '"') {
      if (idezojelben && sor[i + 1] === '"') { mezo += '"'; i++; }
      else idezojelben = !idezojelben;
    } else if (c === ';' && !idezojelben) {
      ki.push(mezo.trim());
      mezo = '';
    } else mezo += c;
  }
  ki.push(mezo.trim());
  return ki;
}

// ------------------------------------------------------------- kiértékelés

if (!fs.existsSync(IGAZSAG)) {
  console.error(
    `Nincs igazsag.csv itt: ${path.relative(process.cwd(), IGAZSAG)}\n` +
      `Indulj az igazsag-sablon.csv fájlból: másold igazsag.csv néven, és töltsd ki\n` +
      `soronként azt, ami a számlán TÉNYLEG szerepel. Ez a mérés alapja.`
  );
  process.exit(2);
}

const igazsag = csvOlvas(IGAZSAG);
const kimenetek = new Map();
for (const f of fs.existsSync(KI) ? fs.readdirSync(KI) : []) {
  if (!f.endsWith('.json') || f.startsWith('_')) continue;
  const j = JSON.parse(fs.readFileSync(path.join(KI, f), 'utf8'));
  kimenetek.set(j.fajl, j);
}

if (!kimenetek.size) {
  console.error('Nincs kiolvasott eredmény. Előbb futtasd: node szamlaolvasas/kiolvas.mjs');
  process.exit(2);
}

const stat = Object.fromEntries(
  MEZOK.map(([m]) => [m, { n: 0, helyes: 0, hibas: 0, hianyzo: 0, csendes: 0, bejelolt_jo: 0, bejelolt_rossz: 0 }])
);
const szamlaSzint = [];
let hianyzoKimenet = 0;

for (const sor of igazsag) {
  const kim = kimenetek.get(sor.fajl);
  if (!kim || kim.hiba) {
    hianyzoKimenet += 1;
    continue;
  }
  const bejelolt = new Set(kim.adat.bizonytalan_mezok || []);
  const rossz = [];
  const csendesek = [];

  for (const [mezo, tipus] of MEZOK) {
    const vart = sor[mezo];
    if (vart == null || vart === '') continue; // amit nem adtál meg, azt nem mérjük
    const kapott = kim.adat[mezo];
    const s = stat[mezo];
    s.n += 1;
    const jo = egyezik(vart, kapott, tipus);
    if (jo) {
      s.helyes += 1;
      if (bejelolt.has(mezo)) s.bejelolt_jo += 1;
    } else {
      s.hibas += 1;
      if (!String(kapott ?? '').trim()) s.hianyzo += 1;
      rossz.push(mezo);
      if (bejelolt.has(mezo)) s.bejelolt_rossz += 1;
      else { s.csendes += 1; csendesek.push(mezo); }
    }
  }
  szamlaSzint.push({
    fajl: sor.fajl,
    minoseg: sor.minoseg || '',
    tipus: path.extname(sor.fajl).toLowerCase().replace('.', ''),
    rossz,
    csendesek,
    hibatlan: rossz.length === 0,
    atmegy_ellenorzes_nelkul: csendesek.length === 0,
  });
}

// ---------------------------------------------------------------- riport

const osszN = Object.values(stat).reduce((s, v) => s + v.n, 0);
const osszHelyes = Object.values(stat).reduce((s, v) => s + v.helyes, 0);
const osszCsendes = Object.values(stat).reduce((s, v) => s + v.csendes, 0);
const osszBejelolt = Object.values(stat).reduce((s, v) => s + v.bejelolt_jo + v.bejelolt_rossz, 0);
const osszBejeloltJo = Object.values(stat).reduce((s, v) => s + v.bejelolt_jo, 0);

const sz = (a, b) => (b ? `${Math.round((1000 * a) / b) / 10}%` : '—');

const sorok = MEZOK.map(([m]) => {
  const s = stat[m];
  return `| \`${m}\` | ${s.n} | ${sz(s.helyes, s.n)} | ${s.csendes} | ${s.bejelolt_rossz + s.bejelolt_jo} |`;
});

function bontas(kulcs) {
  const csoportok = new Map();
  for (const s of szamlaSzint) {
    const k = s[kulcs] || '(nincs megadva)';
    if (!csoportok.has(k)) csoportok.set(k, []);
    csoportok.get(k).push(s);
  }
  return [...csoportok.entries()]
    .map(([k, v]) => `| ${k} | ${v.length} | ${sz(v.filter((x) => x.hibatlan).length, v.length)} | ${sz(v.filter((x) => x.atmegy_ellenorzes_nelkul).length, v.length)} |`)
    .join('\n');
}

const futas = fs.existsSync(path.join(KI, '_futas.json'))
  ? JSON.parse(fs.readFileSync(path.join(KI, '_futas.json'), 'utf8'))
  : null;

const riport = `# 2. spike — magyar számlaolvasás pontossága

*Készült: ${new Date().toISOString().slice(0, 10)} · modell: ${futas?.modell || '(ismeretlen)'} · ${szamlaSzint.length} kiértékelt számla*

## A három szám, ami dönt

| Mérőszám | Érték | Mit jelent |
|---|---|---|
| Mezőszintű pontosság | **${sz(osszHelyes, osszN)}** | ${osszHelyes} helyes a ${osszN} kitöltött mezőből |
| Hibátlan számla | **${sz(szamlaSzint.filter((s) => s.hibatlan).length, szamlaSzint.length)}** | ennyi jön ki javítás nélkül tökéletesen |
| **Csendes hiba** | **${sz(osszCsendes, osszN)}** | rossz érték, amit a modell NEM jelölt be — ez csúszik át a felhasználón |

Felesleges bejelölés: ${osszBejeloltJo} olyan mező, ami jó volt, mégis ellenőriztetné
(összesen ${osszBejelolt} bejelölésből). Ez a felhasználó idejét viszi, de nem veszélyes.

## Mezőnként

| Mező | Mért | Pontosság | Csendes hiba | Bejelölve |
|---|---|---|---|---|
${sorok.join('\n')}

## Fájltípus szerint

| Típus | Darab | Hibátlan | Ellenőrzés nélkül átmegy |
|---|---|---|---|
${bontas('tipus')}

## Képminőség szerint

| Minőség | Darab | Hibátlan | Ellenőrzés nélkül átmegy |
|---|---|---|---|
${bontas('minoseg')}

${futas?.koltseg ? `## Költség\n\nKb. **${futas.koltseg.ft_szamlankent} Ft / számla** (${futas.koltseg.usd_huf_arfolyam} Ft/USD árfolyamon, ${futas.modell}).\nEz megy át a HANDOVER 8. fejezet havi üzemeltetési kalkulációjába.\n` : ''}
## Számlák, ahol csendes hiba volt

${
  szamlaSzint.filter((s) => s.csendesek.length).length
    ? szamlaSzint
        .filter((s) => s.csendesek.length)
        .map((s) => `- \`${s.fajl}\` — ${s.csendesek.join(', ')}`)
        .join('\n')
    : '_Nincs ilyen. Ez a legjobb lehetséges kimenet._'
}

## Hogyan olvasd

- **Csendes hiba 2% alatt** → a megerősítő folyamat elég, ha csak a bejelölt
  mezőket kérdezi vissza. A 6. modul a becsült 20–30 nap alsó felébe fér.
- **Csendes hiba 2–8%** → minden pénzügyi mezőt (összegek, számlaszám, adószám)
  vissza kell erősíttetni, a többit nem. Ez a valószínű eset.
- **Csendes hiba 8% fölött** → a fotós ág nem lehet a fő út. Ilyenkor a NAV-lekérdezés
  (1. spike) az elsődleges forrás, a fotózás pedig csak kiegészítés.

${hianyzoKimenet ? `\n> ${hianyzoKimenet} igazsag.csv sorhoz nem volt kiolvasási eredmény (hiányzó vagy hibás fájl).\n` : ''}
---

*A mérés az \`igazsag.csv\`-ben megadott értékekhez viszonyít. Ahol a cellát üresen
hagytad, azt a mezőt nem mértük. A névösszehasonlítás a cégformát (Kft., Zrt.) és az
ékezeteket figyelmen kívül hagyja; az adószámoknál a 8 jegyű törzsszám számít.*
`;

fs.mkdirSync(path.dirname(RIPORT), { recursive: true });
fs.writeFileSync(RIPORT, riport, 'utf8');

console.log(`\nMezőszintű pontosság : ${sz(osszHelyes, osszN)}  (${osszHelyes}/${osszN})`);
console.log(`Hibátlan számla      : ${sz(szamlaSzint.filter((s) => s.hibatlan).length, szamlaSzint.length)}`);
console.log(`CSENDES HIBA         : ${sz(osszCsendes, osszN)}  ← ez a döntő szám`);
console.log(`\nRiport: ${path.relative(process.cwd(), RIPORT)}`);
