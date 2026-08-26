#!/usr/bin/env node
/**
 * CÉGEM.AI — 0. fázis spike / 2. kérdés (1. rész: kiolvasás)
 * Mennyire pontosan olvassa ki egy látásalapú modell a magyar bejövő számlákat?
 *
 * Ez a szkript csak kiolvas és naplóz. A pontosságot a testvére, az ertekel.mjs
 * számolja ki az általad kitöltött igazsag.csv alapján.
 *
 * Futtatás:
 *   cd spike && npm install
 *   export ANTHROPIC_API_KEY=...
 *   node szamlaolvasas/kiolvas.mjs
 *   node szamlaolvasas/kiolvas.mjs --modell claude-haiku-4-5 --parhuzam 2
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

const ITT = path.dirname(fileURLToPath(import.meta.url));
const BE = path.join(ITT, 'szamlak');
const KI = path.join(ITT, 'kimenet');

const a = Object.fromEntries(
  process.argv.slice(2).reduce((t, v, i, s) => (i % 2 ? [...t, [s[i - 1].replace(/^--/, ''), v]] : t), [])
);
const MODELL = a.modell || 'claude-opus-5';
const PARHUZAM = Number(a.parhuzam || 4);
const USD_HUF = Number(process.env.USD_HUF || 380); // állítsd az aktuális árfolyamra

// USD / millió token. Forrás: platform.claude.com/docs — ellenőrizd futtatás előtt.
const ARAK = {
  'claude-opus-5': { be: 5, ki: 25 },
  'claude-sonnet-5': { be: 2, ki: 10 },
  'claude-haiku-4-5': { be: 1, ki: 5 },
};

const MEZOK = [
  'kiallito_nev',
  'kiallito_adoszam',
  'vevo_nev',
  'vevo_adoszam',
  'szamla_sorszam',
  'kelt',
  'teljesites',
  'fizetesi_hatarido',
  'netto',
  'afa',
  'brutto',
  'penznem',
  'bankszamlaszam',
  'tetel_szam',
];

// Minden mező szöveg, a hiányzó érték üres string. A normalizálás és az
// összehasonlítás az ertekel.mjs dolga — a modellt nem terheljük formázással.
const SEMA = {
  type: 'object',
  additionalProperties: false,
  required: [...MEZOK, 'bizonytalan_mezok', 'megjegyzes'],
  properties: {
    ...Object.fromEntries(MEZOK.map((m) => [m, { type: 'string' }])),
    bizonytalan_mezok: {
      type: 'array',
      items: { type: 'string', enum: MEZOK },
      description: 'Azok a mezők, amelyeket a felhasználónak ellenőriznie kell.',
    },
    megjegyzes: { type: 'string' },
  },
};

const UTASITAS = `Magyar bejövő (szállítói) számlát kapsz képként vagy PDF-ként.
Olvasd ki belőle a kért mezőket pontosan úgy, ahogy a dokumentumon szerepelnek.

Szabályok:
- Csak azt írd le, ami tényleg látszik. Ha egy mező nincs a számlán vagy
  olvashatatlan, hagyd üresen — soha ne találd ki és ne számold ki.
- A kiállító az, aki a számlát kibocsátotta (szállító, eladó). A vevő az,
  akire kiállították. Ezt a kettőt ne cseréld fel.
- Dátumoknál a számlán szereplő alakot add vissza, átalakítás nélkül.
- Összegeknél a végösszegeket add meg (nettó, áfa, bruttó), a számlán látható
  formátumban. Ha több áfakulcs van, az összesített áfát add meg.
- A tetel_szam a számlatételek (sorok) darabszáma.
- A bizonytalan_mezok listába kerüljön minden mező, amit rossz képminőség,
  takarás, kézírás vagy kétértelmű felirat miatt a felhasználónak ellenőriznie kell.
  Ez a lista a termékben azt vezérli, mit kérdezünk vissza — ezért fontos, hogy
  őszinte legyen: ne legyen se túl bátor, se túlzottan óvatos.
- A megjegyzes egy rövid magyar mondat arról, mi nehezítette a kiolvasást,
  vagy üres, ha semmi.`;

const MIME = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

const client = new Anthropic();

function tartalom(fajl) {
  const kit = path.extname(fajl).toLowerCase();
  const mime = MIME[kit];
  if (!mime) return null;
  const adat = fs.readFileSync(fajl).toString('base64');
  return mime === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: mime, data: adat } }
    : { type: 'image', source: { type: 'base64', media_type: mime, data: adat } };
}

async function egyFajl(fajl) {
  const blokk = tartalom(fajl);
  if (!blokk) return { fajl: path.basename(fajl), hiba: 'nem támogatott formátum' };

  const kezdet = Date.now();
  for (let probalkozas = 1; probalkozas <= 4; probalkozas++) {
    try {
      const valasz = await client.messages.create({
        model: MODELL,
        max_tokens: 8000,
        system: UTASITAS,
        messages: [
          { role: 'user', content: [blokk, { type: 'text', text: 'Olvasd ki a számla adatait.' }] },
        ],
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: SEMA } },
      });

      const szoveg = valasz.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
      let adat;
      try {
        adat = JSON.parse(szoveg);
      } catch {
        return { fajl: path.basename(fajl), hiba: 'a válasz nem érvényes JSON', nyers: szoveg.slice(0, 400) };
      }
      return {
        fajl: path.basename(fajl),
        modell: MODELL,
        ms: Date.now() - kezdet,
        tokenek: {
          be: valasz.usage.input_tokens,
          ki: valasz.usage.output_tokens,
        },
        adat,
      };
    } catch (e) {
      const ujra = e?.status === 429 || (e?.status >= 500 && e?.status < 600) || e?.name === 'APIConnectionError';
      if (!ujra || probalkozas === 4) {
        return { fajl: path.basename(fajl), hiba: `${e?.status || ''} ${e?.message || e}`.trim() };
      }
      await new Promise((r) => setTimeout(r, 1000 * 2 ** probalkozas));
    }
  }
}

async function futtat() {
  if (!fs.existsSync(BE)) fs.mkdirSync(BE, { recursive: true });
  const fajlok = fs
    .readdirSync(BE)
    .filter((f) => MIME[path.extname(f).toLowerCase()])
    .map((f) => path.join(BE, f))
    .sort();

  if (!fajlok.length) {
    console.error(
      `Nincs feldolgozható fájl itt: ${path.relative(process.cwd(), BE)}\n` +
        `Tegyél be 50–100 valódi bejövő számlát (PDF és fotó vegyesen, köztük rossz minőségűeket is).\n` +
        `A mappa git-ignorált, a számlák nem kerülnek be a repóba.`
    );
    process.exit(2);
  }
  if (!ARAK[MODELL]) console.warn(`Figyelem: a(z) ${MODELL} modellhez nincs árazás a szkriptben, a költségbecslés kimarad.`);

  fs.mkdirSync(KI, { recursive: true });
  console.log(`${fajlok.length} fájl · modell: ${MODELL} · párhuzam: ${PARHUZAM}\n`);

  const eredmenyek = [];
  let kesz = 0;
  const sor = [...fajlok];
  const munkasok = Array.from({ length: Math.min(PARHUZAM, sor.length) }, async () => {
    while (sor.length) {
      const f = sor.shift();
      const e = await egyFajl(f);
      eredmenyek.push(e);
      fs.writeFileSync(
        path.join(KI, path.basename(f) + '.json'),
        JSON.stringify(e, null, 2),
        'utf8'
      );
      kesz += 1;
      const jel = e.hiba ? '✗' : e.adat?.bizonytalan_mezok?.length ? '~' : '✓';
      const info = e.hiba ? e.hiba : `${e.ms} ms, ${(e.adat.bizonytalan_mezok || []).length} bizonytalan mező`;
      console.log(`  ${jel} [${String(kesz).padStart(3)}/${fajlok.length}] ${e.fajl} — ${info}`);
    }
  });
  await Promise.all(munkasok);

  const jok = eredmenyek.filter((e) => !e.hiba);
  const beTok = jok.reduce((s, e) => s + e.tokenek.be, 0);
  const kiTok = jok.reduce((s, e) => s + e.tokenek.ki, 0);
  const osszegzes = {
    modell: MODELL,
    fajlok: eredmenyek.length,
    sikeres: jok.length,
    hibas: eredmenyek.length - jok.length,
    atlag_ms: jok.length ? Math.round(jok.reduce((s, e) => s + e.ms, 0) / jok.length) : 0,
    tokenek: { be: beTok, ki: kiTok },
  };
  if (ARAK[MODELL] && jok.length) {
    const usd = (beTok / 1e6) * ARAK[MODELL].be + (kiTok / 1e6) * ARAK[MODELL].ki;
    osszegzes.koltseg = {
      usd_osszesen: Number(usd.toFixed(4)),
      ft_szamlankent: Math.round((usd * USD_HUF) / jok.length),
      usd_huf_arfolyam: USD_HUF,
    };
  }
  fs.writeFileSync(path.join(KI, '_futas.json'), JSON.stringify(osszegzes, null, 2), 'utf8');

  console.log(`\n  ${osszegzes.sikeres} sikeres, ${osszegzes.hibas} hibás · átlag ${osszegzes.atlag_ms} ms`);
  if (osszegzes.koltseg) {
    console.log(`  Kiolvasási költség: kb. ${osszegzes.koltseg.ft_szamlankent} Ft / számla (${USD_HUF} Ft/USD árfolyammal)`);
    console.log(`  Ezt vidd át a havi üzemeltetési kalkulációba (HANDOVER 8. fejezet).`);
  }
  console.log(`\n  Következő lépés: töltsd ki az igazsag.csv-t, majd: node szamlaolvasas/ertekel.mjs`);
}

await futtat();
