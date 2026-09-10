/**
 * Vágólapra másolás tartalékkal. A `navigator.clipboard` beágyazott nézetben,
 * egyes alkalmazáson belüli böngészőkben (Messenger, Facebook) vagy nem
 * biztonságos környezetben tiltva lehet — ilyenkor a régi `execCommand`
 * úttal próbáljuk. A visszatérési érték a lényeg: ha `false`, a felületnek
 * SZÓLNIA kell, különben a felhasználó a vágólap régi tartalmát illeszti be
 * az ügyfélnek szóló üzenetbe.
 */
export async function vagolapra(szoveg: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(szoveg);
      return true;
    }
  } catch {
    // tovább a tartalékra
  }
  try {
    const mezo = document.createElement("textarea");
    mezo.value = szoveg;
    mezo.setAttribute("readonly", "");
    mezo.style.position = "fixed";
    mezo.style.opacity = "0";
    document.body.appendChild(mezo);
    mezo.select();
    const sikerult = document.execCommand("copy");
    document.body.removeChild(mezo);
    return sikerult;
  } catch {
    return false;
  }
}
