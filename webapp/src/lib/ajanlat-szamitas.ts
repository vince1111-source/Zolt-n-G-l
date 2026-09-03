import { szerverKliens } from "@/lib/supabase/server";
import { forintra, osszesites, munkaidoPercBecsles } from "@/lib/mag";

/**
 * Az ajánlat tétel/összesítés-számítás és a mentés — ezt hívja a kézi
 * ajánlatűrlap (`ajanlatok/actions.ts`) ÉS a szöveges AI-doboz
 * ((vedett)/actions.ts) is, hogy ne legyen két külön árkalkuláció-
 * implementáció. Szándékosan NEM "use server" fájl: ez a két függvény
 * csak más szerver oldali kódból hívódik, sosem közvetlenül űrlapból vagy
 * kliensből, ezért nem kell Server Action-ként kezelni (az itteni
 * elágazásos visszatérési típusok pontosan megmaradnak, nem lapulnak
 * szét — ha ezt a fájlt "use server"-nek jelöltük volna, a Next.js
 * Action-típusfeldolgozása minden mezőt opcionálissá tesz).
 */

export type TetelBemenet = {
  termekId: string;
  mennyiseg: number;
  // Munkaidő-only szorzó (pl. rétegek száma) — nem hat az anyagmennyiségre
  // vagy az árra, csak a becsült munkaidőre. Alapértelmezetten 1.
  munkaidoSzorzo?: number;
};

export type AjanlatHiba = { hiba: string };

export type AjanlatTetel = {
  termek_id: string;
  megnevezes: string;
  mennyiseg: number;
  mertekegyseg: string;
  egysegar: number;
  netto: number;
  sorrend: number;
  afa_kulcs: number;
  munkaido_szorzo: number;
  munkaido_perc: number | null;
};

export type AjanlatSzamitasSiker = {
  partner: { nev: string; kedvezmeny_szazalek: number };
  tetelek: AjanlatTetel[];
  afaKulcs: number;
  listaar: number;
  kedvezmeny: number;
  netto: number;
  afa: number;
  brutto: number;
};

/**
 * Egy ajánlat sorszáma a cégen belül folyamatos: AJ-{év}-{sorszám}.
 * A `unique (ceg_id, sorszam)` megkötést az adatbázis őrzi — ha két
 * kérés véletlenül ugyanazt a számot generálná, a beszúrás elutasítja,
 * nem csendben felülírja.
 */
async function kovetkezoSorszam(
  supabase: Awaited<ReturnType<typeof szerverKliens>>,
  cegId: string,
) {
  const ev = new Date().getFullYear();
  const { count } = await supabase
    .from("ajanlatok")
    .select("*", { count: "exact", head: true })
    .eq("ceg_id", cegId);
  return `AJ-${ev}-${String((count ?? 0) + 1).padStart(3, "0")}`;
}

/**
 * A tételek + összesítés kiszámítása egy partnerre és tétel-bemenetekre.
 * Ez a KANONIKUS pont: az egységár és a kedvezmény mindig innen, a szerver
 * saját adatbázis-olvasásából jön, sosem a hívó fél (űrlap vagy AI-doboz)
 * állításából. Az összesítés maga a `mag/arkalkulacio.mjs`-ből jön.
 */
export async function ajanlatSzamitas(
  supabase: Awaited<ReturnType<typeof szerverKliens>>,
  partnerId: string,
  tetelBemenetek: TetelBemenet[],
): Promise<AjanlatHiba | AjanlatSzamitasSiker> {
  if (!tetelBemenetek.length) {
    return { hiba: "Legalább egy tételt adj meg mennyiséggel." };
  }

  const { data: partner } = await supabase
    .from("partnerek")
    .select("nev, kedvezmeny_szazalek")
    .eq("id", partnerId)
    .single();
  if (!partner) return { hiba: "A partner nem található." };

  const { data: termekek } = await supabase
    .from("termekek")
    .select("id, nev, mertekegyseg, eladasi_ar, afa_kulcs, normaido_perc_egyseg")
    .in(
      "id",
      tetelBemenetek.map((s) => s.termekId),
    );
  if (!termekek || termekek.length !== tetelBemenetek.length) {
    return { hiba: "Egy vagy több tétel már nem elérhető az árlistában." };
  }

  const tetelek: AjanlatTetel[] = tetelBemenetek.map((s, i) => {
    const t = termekek.find((x) => x.id === s.termekId)!;
    const munkaidoSzorzo = s.munkaidoSzorzo ?? 1;
    return {
      termek_id: t.id,
      megnevezes: t.nev,
      mennyiseg: s.mennyiseg,
      mertekegyseg: t.mertekegyseg,
      egysegar: t.eladasi_ar,
      netto: forintra(s.mennyiseg * t.eladasi_ar),
      sorrend: i,
      afa_kulcs: t.afa_kulcs,
      munkaido_szorzo: munkaidoSzorzo,
      // Csak akkor számolunk becsült időt, ha a tételhez ténylegesen van
      // megadva normaidő — nincs kitalált alapértelmezés (lásd
      // db/migraciok/0005_munkaido.sql).
      munkaido_perc: t.normaido_perc_egyseg
        ? munkaidoPercBecsles({
            mennyiseg: s.mennyiseg,
            normaidoPercEgysegre: t.normaido_perc_egyseg,
            szorzo: munkaidoSzorzo,
          })
        : null,
    };
  });

  // Az áfakulcs tételenként eltérhetne, de az ajánlat fejlécén egy
  // összesített kulcs van — a legelső tétel kulcsát használjuk (a
  // gyakorlatban egy ajánlaton belül egységes szokott lenni).
  const afaKulcs = tetelek[0]?.afa_kulcs ?? 27;
  const osszeg = osszesites(tetelek, {
    kedvezmenySzazalek: partner.kedvezmeny_szazalek,
    afaKulcs,
  });

  return { partner, tetelek, afaKulcs, ...osszeg };
}

/**
 * A kiszámított tételek/összesítés tényleges DB-be mentése — ezt hívja a
 * kézi ajánlatűrlap és az AI-doboz jóváhagyása is, `ajanlatSzamitas`
 * eredményével.
 */
export async function ajanlatMentese(
  supabase: Awaited<ReturnType<typeof szerverKliens>>,
  cegId: string,
  partnerId: string,
  szamitas: AjanlatSzamitasSiker,
): Promise<AjanlatHiba | { id: string; sorszam: string }> {
  const sorszam = await kovetkezoSorszam(supabase, cegId);

  const { data: ujAjanlat, error: ajanlatHiba } = await supabase
    .from("ajanlatok")
    .insert({
      partner_id: partnerId,
      sorszam,
      netto: szamitas.netto,
      afa: szamitas.afa,
      brutto: szamitas.brutto,
      kedvezmeny_szazalek: szamitas.partner.kedvezmeny_szazalek,
      // Az ajánlat 30 napig érvényes, ha másképp nem szóltunk — ez kerül
      // rá az ügyfélnek szóló dokumentumra is.
      ervenyes_ig: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
    })
    .select("id")
    .single();

  if (ajanlatHiba || !ujAjanlat) {
    return { hiba: ajanlatHiba?.message ?? "Az ajánlat létrehozása sikertelen." };
  }

  const { error: tetelHiba } = await supabase.from("ajanlat_tetelek").insert(
    szamitas.tetelek.map(({ afa_kulcs: _afa_kulcs, ...tetel }) => ({
      ...tetel,
      ajanlat_id: ujAjanlat.id,
    })),
  );

  if (tetelHiba) {
    // A fej már létrejött tétel nélkül — inkább ezt jelezzük, mint hogy
    // csendben félkész ajánlatot hagyjunk.
    return { hiba: `A tételek mentése sikertelen: ${tetelHiba.message}` };
  }

  return { id: ujAjanlat.id, sorszam };
}
