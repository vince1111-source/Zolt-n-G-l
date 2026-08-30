/**
 * Markdown → nyomtatható PDF, Chromiumon keresztül.
 * (A LibreOffice ebben a környezetben nem indul, ezért nem a .docx-ből megyünk.)
 */
import fs from 'node:fs';
import { chromium } from 'playwright';

const BE = process.argv[2];
const KI = process.argv[3];
let sorok = fs.readFileSync(BE, 'utf8').split(/\r?\n/);

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const beljel = s => esc(s)
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/(^|[\s(])\*([^*]+)\*/g, '$1<em>$2</em>');

const cellak = s => s.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim());

// Címoldal a fájl eleji címblokkból
const valaszto = sorok.findIndex(s => /^---+\s*$/.test(s));
const fejlecSorok = valaszto > -1 && valaszto < 8 ? sorok.slice(0, valaszto) : [];
if (fejlecSorok.length) sorok = sorok.slice(valaszto + 1);

const ki = [];
let i = 0;
while (i < sorok.length) {
  const sor = sorok[i];

  if (/^```/.test(sor)) {
    i += 1; const kod = [];
    while (i < sorok.length && !/^```/.test(sorok[i])) { kod.push(sorok[i]); i += 1; }
    i += 1;
    ki.push(`<pre>${esc(kod.join('\n'))}</pre>`);
    continue;
  }

  if (/^\s*\|/.test(sor) && i + 1 < sorok.length && /^\s*\|[\s:-]+\|/.test(sorok[i + 1])) {
    const t = [];
    while (i < sorok.length && /^\s*\|/.test(sorok[i])) { t.push(sorok[i]); i += 1; }
    const fej = cellak(t[0]);
    const torzs = t.slice(2).map(cellak);
    ki.push(`<table><thead><tr>${fej.map(c => `<th>${beljel(c)}</th>`).join('')}</tr></thead><tbody>` +
      torzs.map(r => `<tr>${fej.map((_, j) => `<td>${beljel(r[j] ?? '')}</td>`).join('')}</tr>`).join('') +
      `</tbody></table>`);
    continue;
  }

  if (/^---+\s*$/.test(sor)) { ki.push('<hr>'); i += 1; continue; }

  const cim = sor.match(/^(#{1,4})\s+(.*)$/);
  if (cim) { ki.push(`<h${cim[1].length}>${beljel(cim[2])}</h${cim[1].length}>`); i += 1; continue; }

  if (/^\s*[-*]\s+/.test(sor)) {
    const tetelek = [];
    while (i < sorok.length && /^\s*[-*]\s+/.test(sorok[i])) {
      tetelek.push(`<li>${beljel(sorok[i].replace(/^\s*[-*]\s+/, ''))}</li>`); i += 1;
    }
    ki.push(`<ul>${tetelek.join('')}</ul>`);
    continue;
  }

  if (/^\s*\d+\.\s+/.test(sor)) {
    const tetelek = [];
    while (i < sorok.length && /^\s*\d+\.\s+/.test(sorok[i])) {
      tetelek.push(`<li>${beljel(sorok[i].replace(/^\s*\d+\.\s+/, ''))}</li>`); i += 1;
    }
    ki.push(`<ol>${tetelek.join('')}</ol>`);
    continue;
  }

  if (/^>\s?/.test(sor)) {
    const t = [];
    while (i < sorok.length && /^>\s?/.test(sorok[i])) { t.push(sorok[i].replace(/^>\s?/, '')); i += 1; }
    ki.push(`<blockquote>${beljel(t.join(' '))}</blockquote>`);
    continue;
  }

  if (!sor.trim()) { i += 1; continue; }

  const bek = [sor]; i += 1;
  while (i < sorok.length && sorok[i].trim() &&
         !/^(#{1,4}\s|\s*\||\s*[-*]\s|\s*\d+\.\s|>|```|---+\s*$)/.test(sorok[i])) {
    bek.push(sorok[i]); i += 1;
  }
  ki.push(`<p>${beljel(bek.join(' '))}</p>`);
}

const cimoldal = fejlecSorok.length ? `
<section class="cimoldal">
  <div class="marka">CÉGEM<span>.AI</span></div>
  <div class="alcim">Fejlesztői specifikáció</div>
  <div class="meta">${fejlecSorok.slice(1).filter(s => s.trim()).map(s => beljel(s.replace(/^\*\*|\*\*$/g, ''))).join('<br>')}</div>
</section>` : '';

const html = `<!doctype html><html lang="hu"><head><meta charset="utf-8">
<title>CÉGEM.AI — fejlesztői specifikáció</title>
<style>
  @page { size: A4; margin: 20mm 18mm 18mm; }
  * { box-sizing: border-box }
  body { font: 10.5pt/1.5 "DejaVu Sans", Arial, sans-serif; color: #1b1a16; margin: 0 }
  .cimoldal { height: 240mm; display: flex; flex-direction: column; justify-content: center;
              page-break-after: always; }
  .cimoldal .marka { font-size: 34pt; font-weight: 700; letter-spacing: -.02em }
  .cimoldal .marka span { color: #7a5c00 }
  .cimoldal .alcim { font-size: 19pt; color: #7a5c00; margin: 4mm 0 12mm }
  .cimoldal .meta { font-size: 10pt; color: #6f6b5f; line-height: 1.7 }
  h1 { font-size: 17pt; margin: 10mm 0 3mm; page-break-after: avoid; page-break-before: always }
  h1:first-of-type { page-break-before: avoid }
  h2 { font-size: 13.5pt; margin: 8mm 0 2.5mm; page-break-after: avoid }
  h3 { font-size: 11.5pt; margin: 6mm 0 2mm; color: #4a463c; page-break-after: avoid }
  h4 { font-size: 10.5pt; margin: 4mm 0 1.5mm; color: #4a463c; page-break-after: avoid }
  p { margin: 0 0 2.5mm }
  ul, ol { margin: 0 0 3mm; padding-left: 6mm }
  li { margin-bottom: 1mm }
  li::marker { color: #7a5c00 }
  strong { color: #14130f }
  code { font-family: "DejaVu Sans Mono", monospace; font-size: 9pt; background: #f2f0e9;
         padding: .5mm 1mm; border-radius: 1mm }
  pre { font-family: "DejaVu Sans Mono", monospace; font-size: 8.5pt; background: #f7f6f1;
        border: .3mm solid #e0dcd0; border-radius: 1mm; padding: 3mm; margin: 0 0 4mm;
        white-space: pre-wrap; page-break-inside: avoid; line-height: 1.45 }
  table { border-collapse: collapse; width: 100%; margin: 0 0 4mm; font-size: 9.5pt;
          page-break-inside: avoid }
  th, td { border: .3mm solid #d3cfc2; padding: 1.6mm 2mm; text-align: left; vertical-align: top }
  th { background: #efede6; font-weight: 600 }
  blockquote { margin: 3mm 0; padding: 2mm 0 2mm 4mm; border-left: 1mm solid #8a5a00;
               background: #fbf7ec; font-style: italic }
  hr { border: none; border-top: .3mm solid #d3cfc2; margin: 6mm 0 }
</style></head><body>${cimoldal}${ki.join('\n')}</body></html>`;

const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const p = await (await b.newContext()).newPage();
await p.setContent(html, { waitUntil: 'load' });
await p.pdf({
  path: KI,
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: '<div style="width:100%;font-size:8pt;color:#8b887e;padding:0 18mm;' +
    'font-family:sans-serif;display:flex;justify-content:space-between">' +
    '<span>CÉGEM.AI — fejlesztői specifikáció</span>' +
    '<span class="pageNumber"></span></div>',
  margin: { top: '20mm', bottom: '16mm', left: '18mm', right: '18mm' },
});
if (process.env.KEP) {
  await p.setViewportSize({ width: 794, height: 1123 });
  await p.screenshot({ path: process.env.KEP, fullPage: false });
  await p.evaluate(() => window.scrollTo(0, 1123 * 3));
  await p.screenshot({ path: process.env.KEP.replace('.png', '-b.png') });
}
await b.close();
console.log(`kész: ${KI} — ${Math.round(fs.statSync(KI).size / 1024)} KB`);
