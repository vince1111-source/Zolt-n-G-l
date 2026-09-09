import type { AiEredmeny } from "@/app/(vedett)/actions";

/**
 * Amit a rendszer VISSZAMOND egy hangból jött parancs után — a böngésző
 * saját felolvasójával (ingyenes, nincs API). Rövid, egy-két mondat, csak
 * tény: mit értett, mit csinált, vagy mit kérdez. Tiszta függvény, hogy
 * tesztelhető legyen.
 */
export function felolvasasSzoveg(e: AiEredmeny): string {
  switch (e.allapot) {
    case "ismeretlen":
      return "Ezt nem értettem. Mondd újra másképp.";
    case "kerdes":
    case "hiba":
      return e.uzenet;
    case "naptar_letrehozva":
      return `Naptárba felvéve: ${e.cim}, ${e.kezdetSzoveg}.`;
    case "feladat_letrehozva":
      return `Felírtam: ${e.cim}${e.hataridoSzoveg ? `, ${e.hataridoSzoveg.replace(/\.$/, "")}` : ""}.`;
    case "teendok":
      return e.felolvasas;
    case "partner_helyzet": {
      const kint = e.nyitottSzamlaDarab
        ? `kintlévőség ${forint(e.nyitottSzamlaOsszeg)}${e.lejartSzamlaOsszeg > 0 ? `, ebből lejárt ${forint(e.lejartSzamlaOsszeg)}` : ""}`
        : "nincs nyitott számla";
      return `${e.partnerNev}: ${e.fuggoAjanlat} függő ajánlat, ${e.nyitottMunka} nyitott munka, ${kint}.`;
    }
    case "javaslat":
      return `Ajánlat előkészítve ${e.partnerNev} részére, bruttó ${forint(e.elonezet.brutto)}. Nézd át, és hagyd jóvá a képernyőn.`;
    default:
      return "";
  }
}

function forint(n: number): string {
  // A hu-HU tagolás nem törő szóközt ad — a felolvasónak és a tesztnek sima szóköz kell.
  return `${Math.round(n).toLocaleString("hu-HU").replace(/[\u00A0\u202F]/g, " ")} forint`;
}
