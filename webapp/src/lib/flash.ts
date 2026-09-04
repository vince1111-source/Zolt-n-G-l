import { cookies } from "next/headers";

export type FlashTipus = "siker" | "hiba" | "info";
export type FlashUzenet = { tipus: FlashTipus; szoveg: string; nonce: number };

const SUTI_NEV = "cegemai_flash";

/**
 * Egyszeri, átirányítást túlélő visszajelzés ("flash") — a globális
 * toast-rendszer szerver oldali fele (lásd components/Toast.tsx).
 *
 * A Server Action-ök nagy része `redirect()`-tel zárul, és egy inline
 * "Mentve." üzenet az átirányítás után már sehol nincs — a felhasználó
 * nem kap visszajelzést. Ez a rövid életű süti viszi át az üzenetet a
 * következő oldalra, ahol a `(vedett)/layout.tsx` kiolvassa és a toast
 * megjeleníti. Nem `httpOnly`, mert a kliens a megjelenítés után maga
 * törli; nincs benne semmi bizalmas, csak egy felhasználónak szánt mondat.
 *
 * A `nonce` azért kell, hogy két egymás utáni, azonos szövegű üzenet is
 * két külön toastot adjon (a kliens a süti értékének változására figyel).
 */
export async function flashUzenet(tipus: FlashTipus, szoveg: string) {
  const suti = await cookies();
  suti.set(SUTI_NEV, JSON.stringify({ tipus, szoveg, nonce: Date.now() } satisfies FlashUzenet), {
    path: "/",
    maxAge: 15,
    sameSite: "lax",
    httpOnly: false,
  });
}

export async function flashOlvasas(): Promise<FlashUzenet | null> {
  const nyers = (await cookies()).get(SUTI_NEV)?.value;
  if (!nyers) return null;
  try {
    const ertek = JSON.parse(nyers) as Partial<FlashUzenet>;
    if (typeof ertek.szoveg !== "string" || typeof ertek.nonce !== "number") return null;
    const tipus: FlashTipus =
      ertek.tipus === "hiba" || ertek.tipus === "info" ? ertek.tipus : "siker";
    return { tipus, szoveg: ertek.szoveg, nonce: ertek.nonce };
  } catch {
    return null;
  }
}

export const FLASH_SUTI_NEV = SUTI_NEV;
