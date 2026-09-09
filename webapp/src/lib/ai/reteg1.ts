import { strukturaltValasz, MODELL_OLCSO, type AiHivasEredmeny } from "./openai.ts";
import { NAP_ALAK_TERKEP, type Ertelmezes, type NapSzo } from "../szandek.ts";

/**
 * 1. RÉTEG — olcsó modell, zárt sémával (spike/parancs/reteg1.mjs terve, a
 * webapp négy műveletére szűkítve).
 *
 * Csak azt kapja, amit a 0. réteg nem ismert fel. A dolga kizárólag a
 * megértés: melyik művelet, milyen adatokkal. SEMMIT nem számol és semmit
 * nem hajt végre — a válasz ugyanabba az `Ertelmezes` alakba fordul, amit a
 * 0. réteg is ad, és onnan ugyanaz a determinisztikus kód fut (partner-
 * illesztés, árkalkuláció, jóváhagyás). Ha hiányzik adat, a modell egy
 * rövid visszakérdezést ad — a rendszer kérdez, nem találgat.
 */

export const RETEG1_SZANDEKOK = [
  "ajanlat_keszites",
  "naptar_esemeny",
  "feladat_felvetel",
  "partner_helyzet",
  "teendok",
  "ismeretlen",
] as const;

export type Reteg1Valasz = {
  szandek: (typeof RETEG1_SZANDEKOK)[number];
  partner: string;
  mennyiseg_m2: number | null;
  csomag: string;
  nap: string;
  ido: string;
  szoveg: string;
  hianyzik: ("partner" | "mennyiseg" | "nap" | "ido" | "szoveg")[];
  visszakerdezes: string;
};

export const RETEG1_SEMA = {
  type: "object",
  additionalProperties: false,
  required: ["szandek", "partner", "mennyiseg_m2", "csomag", "nap", "ido", "szoveg", "hianyzik", "visszakerdezes"],
  properties: {
    szandek: { type: "string", enum: [...RETEG1_SZANDEKOK] },
    partner: {
      type: "string",
      description:
        "A megnevezett partner. Ha a felsorolt partnerek egyikére utal egyértelműen, annak a teljes neve; különben ahogy elhangzott. Üres, ha nincs.",
    },
    mennyiseg_m2: { type: ["number", "null"], description: "Felület négyzetméterben, számként. null, ha nem hangzott el." },
    csomag: { type: "string", description: "A felsorolt munkacsomagok egyikének neve, ha a munka típusa egyértelműen arra utal. Üres, ha nincs." },
    nap: {
      type: "string",
      description: "Nap: 'ma', 'holnap', 'holnaputan', hét napja ékezet nélkül ('hetfo'…'vasarnap'), vagy ISO dátum (ÉÉÉÉ-HH-NN). Üres, ha nincs.",
    },
    ido: { type: "string", description: "Időpont ÓÓ:PP alakban, 24 órás. Üres, ha nem hangzott el." },
    szoveg: { type: "string", description: "Teendőnél a teendő szövege az elhangzott alakban; naptárnál rövid leírás (pl. 'felmérés'). Üres, ha nincs." },
    hianyzik: {
      type: "array",
      items: { type: "string", enum: ["partner", "mennyiseg", "nap", "ido", "szoveg"] },
      description: "Amit a művelet elindításához még meg kellene kérdezni.",
    },
    visszakerdezes: { type: "string", description: "Egy rövid magyar kérdés a hiányzó adatra, vagy üres, ha minden megvan." },
  },
} as const;

export const RETEG1_UTASITAS = `Egy magyar építőipari kisvállalkozó ír vagy mond egy parancsot a telefonjába.
A dolgod EGYETLEN dolog: eldönteni, melyik műveletet kéri, és milyen adatokkal.

Szabályok:
- Csak a felsorolt szándékok közül válassz. Ha egyik sem illik, "ismeretlen" — ez nem hiba, ez a helyes válasz.
- Semmit ne számolj ki, és semmit ne találj ki. Ami nem hangzott el, maradjon üres / null, és kerüljön a hianyzik listába.
- A mennyiség számként kerüljön vissza, akkor is, ha szóban hangzott el ("nyolcszáz négyzet" → 800).
- A beszélt nyelv pongyola: tegez, félbehagy, a cégnevet röviden mondja ("Kovácsék", "a Zöldnél"). Ez normális.
- Partnert és munkacsomagot CSAK a felsoroltak közül nevezz meg teljes névvel, és csak ha egyértelmű; ha nem az, add vissza úgy, ahogy elhangzott.
- A visszakerdezes egyetlen rövid, konkrét magyar kérdés, amit egy szóval meg lehet válaszolni. Csak akkor, ha hiányzik valami.

A szándékok:
  ajanlat_keszites — árajánlat készítése (kell: partner, mennyiség m²-ben; opcionális: munkacsomag)
  naptar_esemeny   — időpont, találkozó, felmérés a naptárba (kell: partner, nap, ido)
  feladat_felvetel — emlékeztető, teendő felírása (kell: szoveg; opcionális: nap)
  partner_helyzet  — hogy állunk egy partnerrel, mennyivel tartozik, mutasd (kell: partner)
  teendok          — mi a mai dolgom, teendőim, mi van ma a naptárban (nem kell adat)
  ismeretlen       — minden más (árlista-kérdés, számla, kérdés a rendszerhez, csevegés)`;

/** A modellnek átadott bemenet — a mondat mellett a cég saját nevei, hogy a rövidítéseket feloldhassa. */
export function reteg1Bemenet(p: {
  szoveg: string;
  ma: string;
  maNapNeve: string;
  partnerNevek: string[];
  csomagNevek: string[];
}): string {
  return [
    `Ma: ${p.ma} (${p.maNapNeve}).`,
    `Partnerek: ${p.partnerNevek.length ? p.partnerNevek.join("; ") : "(nincs)"}.`,
    `Munkacsomagok: ${p.csomagNevek.length ? p.csomagNevek.join("; ") : "(nincs)"}.`,
    `Parancs: """${p.szoveg.trim()}"""`,
  ].join("\n");
}

export async function reteg1Felismeres(p: {
  szoveg: string;
  ma: string;
  maNapNeve: string;
  partnerNevek: string[];
  csomagNevek: string[];
}): Promise<AiHivasEredmeny<Reteg1Valasz>> {
  return strukturaltValasz<Reteg1Valasz>({
    modell: MODELL_OLCSO,
    utasitas: RETEG1_UTASITAS,
    bemenet: reteg1Bemenet(p),
    semaNev: "cegemai_szandek",
    sema: RETEG1_SEMA as unknown as Record<string, unknown>,
    maxKiToken: 1000,
  });
}

export type Reteg1Ertelmezes = Ertelmezes | { szandek: "kerdes"; kerdes: string };

const ISO_DATUM = /^\d{4}-\d{2}-\d{2}$/;
const IDO = /^([01]?\d|2[0-3]):[0-5]\d$/;

function napMezok(nap: string): { napszo: NapSzo | null; datumIso?: string } {
  const n = nap.trim().toLowerCase();
  if (!n) return { napszo: null };
  if (ISO_DATUM.test(n)) return { napszo: null, datumIso: n };
  const napszo = NAP_ALAK_TERKEP[n];
  return napszo ? { napszo } : { napszo: null };
}

/**
 * A modell válasza → ugyanaz az `Ertelmezes`, mint a 0. rétegé. Tiszta
 * függvény, hálózat nélkül tesztelhető. Ha egy kötelező adat hiányzik,
 * `kerdes` — a modell saját visszakérdezésével, vagy egy alapértelmezettel.
 */
export function reteg1Ertelmezesse(v: Reteg1Valasz): Reteg1Ertelmezes {
  const kerdes = (alap: string) => ({ szandek: "kerdes" as const, kerdes: v.visszakerdezes.trim() || alap });
  const partner = v.partner.trim();

  switch (v.szandek) {
    case "ajanlat_keszites": {
      if (!partner) return kerdes("Melyik partnernek készüljön az ajánlat?");
      if (!(typeof v.mennyiseg_m2 === "number" && v.mennyiseg_m2 > 0)) return kerdes("Hány négyzetméterre?");
      return {
        szandek: "ajanlat_keszites",
        partnerSzoveg: partner,
        m2: v.mennyiseg_m2,
        leiras: v.csomag.trim() || undefined,
      };
    }
    case "naptar_esemeny": {
      if (!partner) return kerdes("Kihez mész?");
      const nap = napMezok(v.nap);
      if (!nap.napszo && !nap.datumIso) return kerdes("Melyik napon?");
      const ido = v.ido.trim();
      if (!IDO.test(ido)) return kerdes("Hány órakor?");
      const [o, p] = ido.split(":");
      return {
        szandek: "naptar_esemeny",
        napszo: nap.napszo,
        datumIso: nap.datumIso,
        oraSzoveg: `${o.padStart(2, "0")}:${p}`,
        partnerSzoveg: partner,
        leiras: v.szoveg.trim() || undefined,
      };
    }
    case "feladat_felvetel": {
      const cim = v.szoveg.trim();
      if (!cim) return kerdes("Mit írjak fel?");
      const nap = napMezok(v.nap);
      return {
        szandek: "feladat_felvetel",
        cim: cim.charAt(0).toUpperCase() + cim.slice(1),
        napszo: nap.napszo ?? undefined,
        datumIso: nap.datumIso,
      };
    }
    case "partner_helyzet": {
      if (!partner) return kerdes("Melyik partnerre gondolsz?");
      return { szandek: "partner_helyzet", partnerSzoveg: partner };
    }
    case "teendok":
      return { szandek: "teendok" };
    default:
      return { szandek: "ismeretlen" };
  }
}
