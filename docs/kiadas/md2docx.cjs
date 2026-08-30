/**
 * Markdown → Word átalakító a CÉGEM.AI fejlesztői specifikációhoz.
 * Csak azt kezeli, amit a dokumentum tényleg használ: címsorok, bekezdések,
 * táblázatok, felsorolások, kódblokkok, vízszintes vonal.
 */
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  TableOfContents, PageBreak, LevelFormat, convertInchesToTwip,
} = require('docx');

const BE = process.argv[2];
const KI = process.argv[3];
let md = fs.readFileSync(BE, 'utf8').split(/\r?\n/);
// A címoldal külön készül, ezért a fájl eleji címblokk kimarad a törzsből.
const elsoValaszto = md.findIndex(s => /^---+\s*$/.test(s));
if (elsoValaszto > -1 && elsoValaszto < 8) md = md.slice(elsoValaszto + 1);

const LAP_SZELES = 9026; // A4 - 2×1" margó, DXA

/* ---------- soron belüli formázás: **félkövér**, `kód`, *dőlt* ---------- */
function futamok(szoveg, alap = {}) {
  const ki = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let utolso = 0, m;
  while ((m = re.exec(szoveg))) {
    if (m.index > utolso) ki.push(new TextRun({ text: szoveg.slice(utolso, m.index), ...alap }));
    const t = m[0];
    if (t.startsWith('**')) ki.push(new TextRun({ text: t.slice(2, -2), bold: true, ...alap }));
    else if (t.startsWith('`')) ki.push(new TextRun({ text: t.slice(1, -1), font: 'Consolas', size: 19, ...alap }));
    else ki.push(new TextRun({ text: t.slice(1, -1), italics: true, ...alap }));
    utolso = m.index + t.length;
  }
  if (utolso < szoveg.length) ki.push(new TextRun({ text: szoveg.slice(utolso), ...alap }));
  return ki.length ? ki : [new TextRun({ text: '', ...alap })];
}

const cellak = sor => sor.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim());

function tablazat(sorok) {
  const fej = cellak(sorok[0]);
  const torzs = sorok.slice(2).map(cellak);
  const n = fej.length;
  const szel = Math.floor(LAP_SZELES / n);
  const oszlopok = Array(n).fill(szel);
  oszlopok[n - 1] = LAP_SZELES - szel * (n - 1);

  const cella = (szoveg, fejlec, i) => new TableCell({
    width: { size: oszlopok[i], type: WidthType.DXA },
    shading: fejlec ? { type: ShadingType.CLEAR, fill: 'EFEDE6' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({
      spacing: { before: 0, after: 0 },
      children: futamok(szoveg, fejlec ? { bold: true, size: 19 } : { size: 19 }),
    })],
  });

  return new Table({
    columnWidths: oszlopok,
    width: { size: LAP_SZELES, type: WidthType.DXA },
    rows: [
      new TableRow({ tableHeader: true, children: fej.map((c, i) => cella(c, true, i)) }),
      ...torzs.map(r => new TableRow({
        children: oszlopok.map((_, i) => cella(r[i] ?? '', false, i)),
      })),
    ],
  });
}

/* ------------------------------- feldolgozás ------------------------------- */
const elemek = [];
let i = 0;

while (i < md.length) {
  const sor = md[i];

  // kódblokk
  if (/^```/.test(sor)) {
    i += 1;
    const kod = [];
    while (i < md.length && !/^```/.test(md[i])) { kod.push(md[i]); i += 1; }
    i += 1;
    kod.forEach((k, idx) => elemek.push(new Paragraph({
      spacing: { before: idx === 0 ? 120 : 0, after: idx === kod.length - 1 ? 160 : 0 },
      shading: { type: ShadingType.CLEAR, fill: 'F5F4EF' },
      children: [new TextRun({ text: k || ' ', font: 'Consolas', size: 18 })],
    })));
    continue;
  }

  // táblázat
  if (/^\s*\|/.test(sor) && i + 1 < md.length && /^\s*\|[\s:-]+\|/.test(md[i + 1])) {
    const sorok = [];
    while (i < md.length && /^\s*\|/.test(md[i])) { sorok.push(md[i]); i += 1; }
    elemek.push(tablazat(sorok));
    elemek.push(new Paragraph({ text: '', spacing: { after: 160 } }));
    continue;
  }

  // vízszintes vonal
  if (/^---+\s*$/.test(sor)) {
    elemek.push(new Paragraph({
      spacing: { before: 120, after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCC8BC' } },
      children: [new TextRun('')],
    }));
    i += 1; continue;
  }

  // címsorok
  const cim = sor.match(/^(#{1,4})\s+(.*)$/);
  if (cim) {
    const szint = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4][cim[1].length - 1];
    elemek.push(new Paragraph({
      heading: szint,
      spacing: { before: cim[1].length === 1 ? 360 : 260, after: 120 },
      children: futamok(cim[2].replace(/[·—]/g, m => m)),
    }));
    i += 1; continue;
  }

  // felsorolás
  if (/^\s*[-*]\s+/.test(sor)) {
    const szint = /^\s{2,}/.test(sor) ? 1 : 0;
    elemek.push(new Paragraph({
      bullet: { level: szint },
      spacing: { after: 60 },
      children: futamok(sor.replace(/^\s*[-*]\s+/, '')),
    }));
    i += 1; continue;
  }

  // számozott lista
  if (/^\s*\d+\.\s+/.test(sor)) {
    elemek.push(new Paragraph({
      numbering: { reference: 'szamozott', level: 0 },
      spacing: { after: 60 },
      children: futamok(sor.replace(/^\s*\d+\.\s+/, '')),
    }));
    i += 1; continue;
  }

  // idézet
  if (/^>\s?/.test(sor)) {
    elemek.push(new Paragraph({
      spacing: { before: 120, after: 120 },
      indent: { left: convertInchesToTwip(0.3) },
      border: { left: { style: BorderStyle.SINGLE, size: 12, color: '8A6A10', space: 8 } },
      children: futamok(sor.replace(/^>\s?/, ''), { italics: true }),
    }));
    i += 1; continue;
  }

  // üres sor
  if (!sor.trim()) { i += 1; continue; }

  // bekezdés — a folytatósorokat összevonjuk
  const bekezdes = [sor];
  i += 1;
  while (i < md.length && md[i].trim() && !/^(#{1,4}\s|\s*\||\s*[-*]\s|\s*\d+\.\s|>|```|---+\s*$)/.test(md[i])) {
    bekezdes.push(md[i]); i += 1;
  }
  elemek.push(new Paragraph({
    spacing: { after: 140, line: 280 },
    children: futamok(bekezdes.join(' ')),
  }));
}

/* --------------------------------- doksi --------------------------------- */
const doc = new Document({
  creator: 'CÉGEM.AI',
  title: 'CÉGEM.AI — fejlesztői specifikáció',
  description: 'Fejlesztői specifikáció árajánlatkéréshez és megvalósításhoz',
  styles: {
    default: {
      document: { run: { font: 'Calibri', size: 21 }, paragraph: { spacing: { line: 280 } } },
      heading1: { run: { font: 'Calibri', size: 34, bold: true, color: '1B1A16' } },
      heading2: { run: { font: 'Calibri', size: 27, bold: true, color: '1B1A16' } },
      heading3: { run: { font: 'Calibri', size: 23, bold: true, color: '4A463C' } },
      heading4: { run: { font: 'Calibri', size: 21, bold: true, color: '4A463C' } },
    },
  },
  numbering: {
    config: [{
      reference: 'szamozott',
      levels: [{
        level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.START,
        style: { paragraph: { indent: { left: 520, hanging: 260 } } },
      }],
    }],
  },
  sections: [{
    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    children: [
      new Paragraph({
        spacing: { before: 2600, after: 120 },
        children: [new TextRun({ text: 'CÉGEM.AI', bold: true, size: 56 })],
      }),
      new Paragraph({
        spacing: { after: 400 },
        children: [new TextRun({ text: 'Fejlesztői specifikáció', size: 32, color: '7A5C00' })],
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Verzió 1.0 · 2026. augusztus 26.', size: 21, color: '6F6B5F' })],
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({
          text: 'Magyar nyelvű AI vállalkozói asszisztens építőipari kisvállalkozásoknak',
          size: 21, color: '6F6B5F',
        })],
      }),
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
        children: [new TextRun('Tartalom')],
      }),
      new TableOfContents('Tartalom', { hyperlink: true, headingStyleRange: '1-3' }),
      new Paragraph({ children: [new PageBreak()] }),
      ...elemek,
    ],
  }],
});

Packer.toBuffer(doc).then(b => {
  fs.writeFileSync(KI, b);
  console.log(`kész: ${KI} — ${elemek.length} elem, ${Math.round(b.length / 1024)} KB`);
});
