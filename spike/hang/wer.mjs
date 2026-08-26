#!/usr/bin/env node
/**
 * CÉGEM.AI — 0. fázis spike / 3. kérdés (2. rész: szolgáltatók összevetése)
 *
 * A hang-teszt.html a böngészőbe épített Web Speech API-t méri. Ez a szkript
 * ugyanazokra a mondatokra hasonlítja össze a többi szolgáltatót is, hogy a
 * döntés ne érzésre szülessen.
 *
 * Bemenet:
 *   hang/eredmeny/*.json     — a mérőlapról letöltött eredmény (a referenciákat is tartalmazza)
 *   hang/atiratok.csv        — a többi szolgáltató átiratai:  id;szolgaltato;hallott
 *
 * Kimenet:
 *   eredmenyek/hang-riport.md
 *
 * Futtatás:  node hang/wer.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ITT = path.dirname(fileURLToPath(import.meta.url));
const EREDMENY = path.join(ITT, 'eredmeny');
const ATIRATOK = path.join(ITT, 'atiratok.csv');
const RIPORT = path.join(ITT, '..', 'eredmenyek', 'hang-riport.md');

/* Ugyanaz a normalizálás és szándékfelismerő, mint a mérőlapon és a prototípusban.
   Szándékos másolat: a spike-eszközök egymástól függetlenül futtathatók. */
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const PARTNEREK = ['kovacs', 'szabo', 'nagy', 'baumax', 'zold', 'kohalo'];

function szandekFelismeres(szoveg) {
  const t = norm(szoveg);
  if (!t) return null;
  if (/(intezd el|csinald meg helyettem|surgos dolgaim|mit kell ma|intezz el|vegyuk sorra)/.test(t)) return 'agent';
  if (/(ajanlat|arajanlat)/.test(t) && /(keszits|csinalj|kerek|kellene|keszitsd)/.test(t)) return 'ajanlat';
  if (/(lejart|kintlevo|tartoznak|kinnlevo|nem fizetett|hatralek)/.test(t)) return 'lejart';
  if (/(mennyit kell|kifizet|fizetnunk|utalni|bejovo szaml)/.test(t)) return 'fizetendo';
  if (/(mai teendo|mi a dolgom|teendoim|mi van ma|mai feladat|napirend)/.test(t)) return 'teendo';
  if (/(helyzet a cegemben|hogy allunk|osszefoglal|hogy all a ceg|vezetoi)/.test(t)) return 'osszefoglalo';
  if (/(felszolit|emlekezteto|fizetesi emlek)/.test(t)) return 'felszolitas';
  if (/(emlekeztess|jegyezd fel|vegyel fel|allits be|rogzits|ird fel)/.test(t)) return 'feladat';
  if (/(szerzodes|kotber|mi a lenyeg|elemezd|dokumentum)/.test(t)) return 'szerzodes';
  if (/(arlista|mennyibe kerul|mi az ara|termek)/.test(t)) return 'arlista';
  if (PARTNEREK.some((p) => t.includes(p)) && /(mutasd|nyisd|hozd|mi a helyzet|hogy all)/.test(t)) return 'partner';
  return null;
}

const szavak = (s) => norm(s).replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);

function wer(referencia, hallott) {
  const a = szavak(referencia);
  const b = szavak(hallott);
  if (!a.length) return b.length ? 1 : 0;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length] / a.length;
}

const entitasTalalat = (entitasok, hallott) => {
  if (!entitasok || !entitasok.length) return null;
  const t = norm(hallott);
  return { jo: entitasok.filter((alt) => alt.some((v) => t.includes(norm(v)))).length, ossz: entitasok.length };
};

/* ------------------------------------------------------------------ bemenet */

fs.mkdirSync(EREDMENY, { recursive: true });
if (!fs.readdirSync(EREDMENY).some((f) => f.endsWith('.json'))) {
  console.error(
    `Nincs mérési eredmény itt: ${path.relative(process.cwd(), EREDMENY)}\n` +
      `Nyisd meg Chrome-ban a hang/hang-teszt.html lapot, vedd fel a mondatokat,\n` +
      `majd az "Eredmény mentése (JSON)" gombbal letöltött fájlt tedd ebbe a mappába.`
  );
  process.exit(2);
}

const futasok = fs
  .readdirSync(EREDMENY)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(EREDMENY, f), 'utf8')));

// A referenciák az első futásból; minden futás ugyanazt a mondatkészletet méri.
const spec = new Map();
for (const futas of futasok)
  for (const s of futas.sorok)
    if (!spec.has(s.id))
      spec.set(s.id, { referencia: s.referencia, csoport: s.csoport, vart_szandek: s.vart_szandek, entitasok: s.entitasok || [] });

// szolgáltató -> id -> hallott szöveg
const atirat = new Map();
const felvesz = (szolgaltato, id, hallott) => {
  if (!atirat.has(szolgaltato)) atirat.set(szolgaltato, new Map());
  atirat.get(szolgaltato).set(id, hallott);
};

for (const futas of futasok)
  for (const s of futas.sorok)
    if (s.hallott != null) felvesz(s.szolgaltato || 'web-speech-api', s.id, s.hallott);

if (fs.existsSync(ATIRATOK)) {
  const sorok = fs.readFileSync(ATIRATOK, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter((s) => s.trim());
  const fej = sorok[0].split(';').map((s) => s.trim().toLowerCase());
  const oszlop = (nev) => fej.indexOf(nev);
  for (const sor of sorok.slice(1)) {
    const m = sor.split(';');
    const id = (m[oszlop('id')] || '').trim();
    const szolg = (m[oszlop('szolgaltato')] || '').trim();
    const hallott = (m[oszlop('hallott')] || '').trim().replace(/^"|"$/g, '');
    if (id && szolg) felvesz(szolg, id, hallott);
  }
}

/* -------------------------------------------------------------- számítás */

const ertekel = (szolgaltato) => {
  const sorok = [...spec.entries()]
    .filter(([id]) => atirat.get(szolgaltato).has(id))
    .map(([id, sp]) => {
      const hallott = atirat.get(szolgaltato).get(id);
      return {
        id, ...sp, hallott,
        wer: wer(sp.referencia, hallott),
        szandek: szandekFelismeres(hallott),
        entitas: entitasTalalat(sp.entitasok, hallott),
      };
    });
  const szandekosak = sorok.filter((s) => s.vart_szandek);
  const ent = sorok.map((s) => s.entitas).filter(Boolean);
  return {
    szolgaltato,
    db: sorok.length,
    wer: sorok.length ? sorok.reduce((s, x) => s + x.wer, 0) / sorok.length : null,
    hibatlan: sorok.filter((s) => s.wer === 0).length,
    szandek: szandekosak.length
      ? szandekosak.filter((s) => s.szandek === s.vart_szandek).length / szandekosak.length
      : null,
    entitas: ent.length ? ent.reduce((s, e) => s + e.jo, 0) / ent.reduce((s, e) => s + e.ossz, 0) : null,
    sorok,
  };
};

const eredmenyek = [...atirat.keys()].map(ertekel).sort((a, b) => a.wer - b.wer);
const sz = (x) => (x == null ? '—' : Math.round(x * 1000) / 10 + '%');

const kornyezetek = [...new Set(futasok.map((f) => f.kornyezet).filter(Boolean))];

const riport = `# 3. spike — magyar hangfelismerés

*Készült: ${new Date().toISOString().slice(0, 10)} · ${spec.size} tesztmondat · ${eredmenyek.length} szolgáltató*
${kornyezetek.length ? `\nMért környezet: ${kornyezetek.join(' · ')}\n` : ''}
## Összehasonlítás

| Szolgáltató | Mondat | Szóhiba (WER) | Szó szerint pontos | Szándék eltalálva | Kulcsadat eltalálva |
|---|---|---|---|---|---|
${eredmenyek
  .map((e) => `| ${e.szolgaltato} | ${e.db} | **${sz(e.wer)}** | ${sz(e.db ? e.hibatlan / e.db : null)} | ${sz(e.szandek)} | ${sz(e.entitas)} |`)
  .join('\n')}

**A döntő oszlop a „szándék eltalálva”, nem a szóhiba.** A felhasználónak az számít,
hogy a rendszer a helyes műveletet indítja-e el; egy félreírt toldalék nem baj.
A „kulcsadat” oszlop a cégneveket és a mennyiségeket méri — ezek elrontása viszont
rossz ajánlatot vagy rossz partnert jelent, tehát ez a második legfontosabb szám.

## Mondatonként

| # | Mondat | ${eredmenyek.map((e) => e.szolgaltato).join(' | ')} |
|---|---|${eredmenyek.map(() => '---|').join('')}
${[...spec.entries()]
  .map(([id, sp]) => {
    const cellak = eredmenyek.map((e) => {
      const s = e.sorok.find((x) => x.id === id);
      return s ? `${Math.round(s.wer * 100)}%${sp.vart_szandek ? (s.szandek === sp.vart_szandek ? ' ✓' : ' ✗') : ''}` : '—';
    });
    return `| ${id} | ${sp.referencia} | ${cellak.join(' | ')} |`;
  })
  .join('\n')}

## Rosszul felismert mondatok

${
  eredmenyek
    .flatMap((e) => e.sorok.filter((s) => s.wer > 0.2).map((s) => `- **${e.szolgaltato}** — „${s.referencia}” → „${s.hallott}”`))
    .join('\n') || '_Nincs 20% fölötti szóhibás mondat._'
}

## Hogyan olvasd

| Szándékpontosság | Termékdöntés |
|---|---|
| 95% fölött | A hang lehet a fő út. A parancssáv marad tartaléknak. |
| 85–95% | A hang kényelmi kiegészítő, a szöveges parancssáv a fő út. Kimondott parancs után mindig látszódjon, mit értett. |
| 85% alatt | A hang demófunkció. Ne épüljön rá ígéret, és ne az legyen az első benyomás. |

Ezt a döntést a HANDOVER 8. fejezete szerint **előre** kell meghozni, nem utólag:
ha az első benyomás a hang, akkor a hangnak kell a legjobban működnie.

---

*A szóhiba (WER) szószintű szerkesztési távolság a referenciamondathoz képest,
kisbetűsítve, ékezetek és írásjelek nélkül. A szándékfelismerés a prototípus
\`handle()\` függvényének mintáival dolgozik — így a mérés azt mutatja, amit a
felhasználó ténylegesen tapasztalna.*
`;

fs.mkdirSync(path.dirname(RIPORT), { recursive: true });
fs.writeFileSync(RIPORT, riport, 'utf8');

for (const e of eredmenyek) {
  console.log(`${e.szolgaltato.padEnd(22)} WER ${sz(e.wer).padStart(6)}   szándék ${sz(e.szandek).padStart(6)}   kulcsadat ${sz(e.entitas).padStart(6)}`);
}
console.log(`\nRiport: ${path.relative(process.cwd(), RIPORT)}`);
