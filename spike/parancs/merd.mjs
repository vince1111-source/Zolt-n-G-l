#!/usr/bin/env node
/**
 * CÉGEM.AI — 0. fázis spike / 4. kérdés
 * Mennyibe kerül havonta egy felhasználó parancsfelismerése?
 *
 * A lépcsős felismerő két rétege:
 *   0. réteg — determinisztikus mintaillesztés. Ingyen, azonnal.
 *   1. réteg — olcsó modell (Haiku) szigorú sémával, csak amit a 0. nem kezelt.
 *
 * A mérés két számot ad:
 *   a) mekkora hányadot fed le a 0. réteg (ez a megspórolt pénz),
 *   b) mennyibe kerül a maradék, felhasználónként havi szinten.
 *
 * A 0. réteg mérése API kulcs NÉLKÜL is lefut:
 *   node parancs/merd.mjs
 * A teljes mérés (mindkét réteg):
 *   ANTHROPIC_API_KEY=... node parancs/merd.mjs --reteg1
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as reteg0 from './reteg0.mjs';

const ITT = path.dirname(fileURLToPath(import.meta.url));
const RIPORT = path.join(ITT, '..', 'eredmenyek', 'parancs-riport.md');

const argv = Object.fromEntries(
  process.argv.slice(2).map((v) => (v.startsWith('--') ? [v.slice(2), true] : [v, true]))
);
const KELL_RETEG1 = !!argv.reteg1;

/* Havi terhelés egy aktív építőipari felhasználóra. Ez a becslés a
   költségmodell egyetlen szabad paramétere — állítsd, ha más a valóság. */
const HAVI_PARANCS = Number(process.env.HAVI_PARANCS || 300);

/* USD / millió token. Forrás: platform.claude.com/docs — futtatás előtt ellenőrizd. */
const ARAK = {
  'claude-haiku-4-5': { be: 1, ki: 5 },
  'claude-sonnet-5': { be: 2, ki: 10 },
  'claude-opus-5': { be: 5, ki: 25 },
};
const MODELL = process.env.PARANCS_MODELL || 'claude-haiku-4-5';
const USD_HUF = Number(process.env.USD_HUF || 380);

const korpusz = JSON.parse(fs.readFileSync(path.join(ITT, 'mondatok.json'), 'utf8')).mondatok;

/* ------------------------------------------------------------ 0. réteg ---- */

const eredmenyek = korpusz.map((m) => {
  const r = reteg0.route(m.szoveg);
  const felismerte = !!r && r.szandek === m.szandek;
  const kellAdatok = Object.keys(m.adatok);
  const adatHibak = kellAdatok.filter((k) => !r || r.adatok[k] !== m.adatok[k]);
  return {
    ...m,
    reteg0: r,
    // Az "ismeretlen" mondatokra a helyes viselkedés az, hogy NEM ismeri fel.
    helyes: m.szandek === 'ismeretlen' ? !r : felismerte && adatHibak.length === 0,
    tevedett: !!r && m.szandek !== 'ismeretlen' && r.szandek !== m.szandek,
    felreismert_ismeretlen: !!r && m.szandek === 'ismeretlen',
    hianyzo_adat: felismerte ? adatHibak : [],
    tovabbadja: !r || (r.hianyzik || []).length > 0,
  };
});

const valodi = eredmenyek.filter((e) => e.szandek !== 'ismeretlen');
const ismeretlenek = eredmenyek.filter((e) => e.szandek === 'ismeretlen');

const lefedettseg = valodi.filter((e) => e.helyes).length / valodi.length;
const tevedes = eredmenyek.filter((e) => e.tevedett || e.felreismert_ismeretlen).length;
const tovabbadott = eredmenyek.filter((e) => e.tovabbadja).length / eredmenyek.length;

const sz = (x) => Math.round(x * 1000) / 10 + '%';

console.log(`\n0. RÉTEG — determinisztikus, ingyenes\n`);
console.log(`  Korpusz             : ${korpusz.length} mondat (${valodi.length} valódi parancs + ${ismeretlenek.length} amit nem szabad felismerni)`);
console.log(`  Teljesen jó         : ${sz(lefedettseg)}  — szándék és minden szükséges adat helyes`);
console.log(`  Téves felismerés    : ${tevedes} db  ← ez a veszélyes hiba, nem a kihagyás`);
console.log(`  Továbbmegy 1. rétegre: ${sz(tovabbadott)}`);

const rosszak = eredmenyek.filter((e) => !e.helyes);
if (rosszak.length) {
  console.log(`\n  Amit a 0. réteg nem kezelt:`);
  for (const r of rosszak) {
    const mit = r.tevedett
      ? `TÉVES → ${r.reteg0.szandek}`
      : r.felreismert_ismeretlen
        ? `TÉVES → ${r.reteg0.szandek} (nem lett volna szabad)`
        : r.reteg0
          ? `hiányzó adat: ${(r.reteg0.hianyzik || r.hianyzo_adat).join(', ')}`
          : 'nem ismerte fel';
    console.log(`    · „${r.szoveg}” — ${mit}`);
  }
}

/* ------------------------------------------------------------ 1. réteg ---- */

let reteg1 = null;
if (KELL_RETEG1) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic();
  const { SEMA, UTASITAS } = await import('./reteg1.mjs');

  const maradek = eredmenyek.filter((e) => e.tovabbadja);
  console.log(`\n1. RÉTEG — ${MODELL}, ${maradek.length} mondat\n`);

  let beTok = 0, kiTok = 0, jo = 0;
  for (const m of maradek) {
    try {
      const v = await client.messages.create({
        model: MODELL,
        max_tokens: 400,
        system: UTASITAS,
        messages: [{ role: 'user', content: m.szoveg }],
        output_config: { format: { type: 'json_schema', schema: SEMA } },
      });
      beTok += v.usage.input_tokens;
      kiTok += v.usage.output_tokens;
      const adat = JSON.parse(v.content.filter((b) => b.type === 'text').map((b) => b.text).join(''));
      const talalt = adat.szandek === m.szandek;
      if (talalt) jo += 1;
      console.log(`  ${talalt ? '✓' : '✗'} „${m.szoveg}” → ${adat.szandek}`);
    } catch (e) {
      console.log(`  ! „${m.szoveg}” — ${e?.status || ''} ${e?.message || e}`);
    }
  }

  const ar = ARAK[MODELL];
  const usdPerHivas = ar ? (beTok / 1e6) * ar.be + (kiTok / 1e6) * ar.ki : null;
  reteg1 = {
    modell: MODELL,
    mondat: maradek.length,
    pontossag: maradek.length ? jo / maradek.length : null,
    atlag_be: Math.round(beTok / maradek.length),
    atlag_ki: Math.round(kiTok / maradek.length),
    ft_per_hivas: usdPerHivas ? (usdPerHivas / maradek.length) * USD_HUF : null,
  };
  console.log(`\n  Pontosság: ${sz(reteg1.pontossag)} · átlag ${reteg1.atlag_be} be / ${reteg1.atlag_ki} ki token`);
}

/* ------------------------------------------------------- költségmodell ---- */

const ar = ARAK[MODELL] || ARAK['claude-haiku-4-5'];
// Ha nem futott az 1. réteg, konzervatív becslés: 700 be / 120 ki token hívásonként.
const atlagBe = reteg1?.atlag_be ?? 700;
const atlagKi = reteg1?.atlag_ki ?? 120;
const ftPerHivas = ((atlagBe / 1e6) * ar.be + (atlagKi / 1e6) * ar.ki) * USD_HUF;

const fizetosHanyad = tovabbadott;
const haviParancsKoltseg = HAVI_PARANCS * fizetosHanyad * ftPerHivas;
const mindenModellel = HAVI_PARANCS * ftPerHivas;

console.log(`\nKÖLTSÉG — havi ${HAVI_PARANCS} parancs, ${MODELL}, ${USD_HUF} Ft/USD\n`);
console.log(`  Lépcsős felismeréssel : ${Math.round(haviParancsKoltseg)} Ft / hó / felhasználó`);
console.log(`  Ha minden hívás modell: ${Math.round(mindenModellel)} Ft / hó / felhasználó`);
console.log(`  Megtakarítás          : ${sz(1 - haviParancsKoltseg / mindenModellel)}\n`);

/* ------------------------------------------------------------- riport ---- */

const riport = `# 4. spike — parancsfelismerés költsége

*Készült: ${new Date().toISOString().slice(0, 10)} · ${korpusz.length} mondatos korpusz${reteg1 ? ` · 1. réteg: ${reteg1.modell}` : ' · csak a 0. réteg mérve'}*

A kérdés nem az, hogy egy nyelvi modell érti-e a magyar parancsokat — érti.
A kérdés az, hogy **mennyit kell fizetni érte havonta felhasználónként**, és
mennyit lehet ebből lespórolni azzal, hogy a gyakori parancsokat el sem küldjük.

> **Olvasd óvatosan.** A korpuszt és a felismerő mintáit ugyanaz írta, ezért a
> lefedettség itt felső becslés, nem bizonyíték. Valódi számot két dolog ad:
> a 3. spike hangfelvételeiből származó **tényleges átiratok** átengedése ezen a
> mérésen, és az első éles felhasználók parancsnaplója. Amíg ez nincs meg, a
> ${sz(lefedettseg)} azt mutatja, hogy a megközelítés működik — nem azt, hogy ennyi lesz élesben.

## A két szám

| Mérőszám | Érték |
|---|---|
| A 0. réteg (ingyenes) helyesen kezeli | **${sz(lefedettseg)}** a valódi parancsokból |
| Téves felismerés | **${tevedes} db** ${korpusz.length} mondatból |
| Modellnek továbbadva | ${sz(tovabbadott)} |
| Becsült havi költség lépcsősen | **${Math.round(haviParancsKoltseg)} Ft / felhasználó** |
| Becsült havi költség, ha minden hívás modell | ${Math.round(mindenModellel)} Ft / felhasználó |

Havi ${HAVI_PARANCS} paranccsal, ${MODELL} árazással, ${USD_HUF} Ft/USD árfolyamon.

## Miért a téves felismerés a fontos szám

A kihagyás olcsó: ha a 0. réteg nem ismer fel valamit, a modell megkapja, és
a felhasználó nem vesz észre semmit. A téves felismerés viszont rossz műveletet
indít el — ez az egyetlen kimenet, ami kárt okoz. Ezért a 0. réteg úgy van
hangolva, hogy **bizonytalanság esetén továbbadjon**, ne találgasson.

Ugyanez a szabály él az adatokra is: ha a szándék megvan, de a partner vagy a
mennyiség hiányzik, a rendszer visszakérdez ahelyett, hogy kitalálná.

${
  rosszak.length
    ? `## Amit a 0. réteg nem kezelt\n\n` +
      rosszak
        .map((r) => {
          const mit = r.tevedett || r.felreismert_ismeretlen
            ? `**téves** → \`${r.reteg0.szandek}\``
            : r.reteg0
              ? `hiányzó adat: ${(r.reteg0.hianyzik || r.hianyzo_adat).join(', ')} → visszakérdez`
              : 'nem ismerte fel → 1. réteg';
          return `- „${r.szoveg}” — ${mit}`;
        })
        .join('\n')
    : '## A 0. réteg mindent kezelt\n\nEz gyanús — bővítsd a korpuszt nehezebb mondatokkal.'
}

${
  reteg1
    ? `## 1. réteg — ${reteg1.modell}\n\n| | |\n|---|---|\n| Mondat | ${reteg1.mondat} |\n| Szándékpontosság | ${sz(reteg1.pontossag)} |\n| Átlagos tokenhasználat | ${reteg1.atlag_be} be / ${reteg1.atlag_ki} ki |\n| Költség hívásonként | ${(reteg1.ft_per_hivas ?? 0).toFixed(2)} Ft |\n`
    : `## 1. réteg — nincs mérve\n\nFuttasd API kulccsal: \`ANTHROPIC_API_KEY=... node parancs/merd.mjs --reteg1\`\nAddig a költségmodell konzervatív becslést használ (${atlagBe} be / ${atlagKi} ki token hívásonként).\n`
}
## Mit kezdj az eredménnyel

- **Minden százalék, amit a 0. réteg átvesz, közvetlen megtakarítás** — és
  ráadásul azonnali válasz, hálózat nélkül. Az új parancsokat érdemes előbb
  ide felvenni, és csak azt hagyni a modellre, ami tényleg változatos.
- **A modell dolga a megértés, nem a számolás.** Az árkalkuláció determinisztikus
  kód marad; a modell csak a paramétereket tölti ki. Ez egyszerre olcsóbb és
  védhetőbb, mert a számla mögött nem egy nyelvi modell áll.
- **A drága modell csak ott indokolt**, ahol tényleg nyílt a feladat: zavaros
  beszédből összerakott ajánlat, szerződéskivonat, kétértelmű számla. Ez a
  havi parancsok néhány százaléka.

---

*A becslés a korpusz alapján készült, nem éles használatból. Az árak a futtatás
napján érvényes listaárak; az árfolyam a \`USD_HUF\` környezeti változóval állítható.*
`;

fs.mkdirSync(path.dirname(RIPORT), { recursive: true });
fs.writeFileSync(RIPORT, riport, 'utf8');
console.log(`Riport: ${path.relative(process.cwd(), RIPORT)}\n`);
