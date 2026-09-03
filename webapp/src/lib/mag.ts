/**
 * A `mag/` a termék saját, keretrendszer-független magja (lásd
 * `mag/README.md`) — determinisztikus árkalkuláció, fizetési határidő és
 * kintlévőség-számítás, `node --test mag/*.teszt.mjs`-szel tesztelve.
 * Ez a fájl az egyetlen hely a webappban, ami a repó-gyökérbeli `mag/`
 * mappára relatív úttal hivatkozik — minden más innen importál.
 *
 * A `mag/*.mjs` fájlok JSDoc-kommentezett sima JS-ek, nem TS-ek — ezért itt
 * explicit típusokkal burkoljuk be őket, hogy a webapp oldalán ne a
 * JSDoc-ból következtetett (esetenként bizonytalan) típusokra épüljünk.
 */
import * as arkalkulacio from "../../../mag/arkalkulacio.mjs";
import * as kintlevosegMod from "../../../mag/kintlevoseg.mjs";
import * as hataridoMod from "../../../mag/fizetesi_hatarido.mjs";
import * as munkaidoMod from "../../../mag/munkaido.mjs";

export type Osszesites = {
  listaar: number;
  kedvezmeny: number;
  netto: number;
  afa: number;
  brutto: number;
};

export function forintra(n: number): number {
  return arkalkulacio.forintra(n);
}

export function osszesites(
  tetelek: { netto: number }[],
  opciok?: { kedvezmenySzazalek?: number; afaKulcs?: number },
): Osszesites {
  return arkalkulacio.osszesites(tetelek, opciok);
}

export type SzamlaSor = {
  partner: string;
  brutto: number;
  hatarido: string;
  allapot: "nyitott" | "fizetve" | "sztornozott";
};

export type KintlevosegOsszesites = {
  nyitottOsszesen: number;
  nyitottDarab: number;
  lejartOsszesen: number;
  lejartDarab: number;
  legregebbiLejaratNapja: number | null;
  partnerenkent: {
    partner: string;
    nyitottOsszeg: number;
    lejartOsszeg: number;
    darab: number;
  }[];
};

export function kintlevosegOsszesites(
  szamlak: SzamlaSor[],
  ma: string,
): KintlevosegOsszesites {
  return kintlevosegMod.kintlevosegOsszesites(szamlak, ma);
}

export function fizetesiHatarido(p: {
  kelt: string;
  fizetesiHataridoNap: number;
}): string {
  return hataridoMod.fizetesiHatarido(p);
}

export function napokEltelte(kezdo: string, ma: string): number {
  return hataridoMod.napokEltelte(kezdo, ma);
}

export function lejartE(hatarido: string, ma: string): boolean {
  return hataridoMod.lejartE(hatarido, ma);
}

export function munkaidoPercBecsles(p: {
  mennyiseg: number;
  normaidoPercEgysegre: number;
  szorzo?: number;
}): number {
  return munkaidoMod.munkaidoPercBecsles(p);
}

export type OsszesitettMunkaido = { osszesPerc: number; hianyzoTetelSzam: number };

export function osszesitettMunkaido(
  tetelek: { munkaidoPerc: number | null | undefined }[],
): OsszesitettMunkaido {
  return munkaidoMod.osszesitettMunkaido(tetelek);
}

export function percOraSzoveg(perc: number): string {
  return munkaidoMod.percOraSzoveg(perc);
}
