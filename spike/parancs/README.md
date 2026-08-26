# 4. spike — mennyibe kerül a parancsfelismerés

**A kérdés:** havonta mennyit visz el felhasználónként az AI, ha beszéddel és
szöveggel is vezérelhető a rendszer?

**Miért került ide:** a projekt egyik kikötése, hogy a felhasználónkénti
üzemeltetési költség alacsony maradjon. A nyelvi modell nem attól olcsó, hogy
olcsó modellt választunk, hanem attól, hogy **a hívások nagy részét el sem
indítjuk**.

## A lépcsős felismerés

```
beszéd/szöveg
      │
      ▼
  0. RÉTEG  determinisztikus mintaillesztés          0 Ft · 0 ms · offline
      │     „mutasd a lejárt számláimat”
      │     „készíts ajánlatot a Kovácséknak 800 négyzetre”
      │
      ├── felismerte, minden adat megvan ──────────► művelet indul
      │
      ▼  nem ismerte fel, vagy hiányzik egy adat
  1. RÉTEG  olcsó modell, zárt sémával               ~0,5 Ft / hívás
      │     szándék + paraméterek kinyerése, semmi más
      │
      ├── megvan ──────────────────────────────────► művelet indul
      └── hiányzik valami ─────────────────────────► visszakérdez

  2. RÉTEG  erős modell — csak nyílt feladatra:      csak néhány %-nyi hívás
            zavaros beszédből ajánlat, szerződéskivonat, kétes számla
```

Két szabály tartja együtt:

1. **Bizonytalanság esetén a 0. réteg továbbad**, nem találgat. A kihagyás
   olcsó, a téves felismerés kárt okoz.
2. **A modell megért, nem számol.** Az árkalkuláció determinisztikus kód marad.
   Így a kiadott ajánlat mögött nem egy nyelvi modell áll, hanem a te árlistád.

## Futtatás

```bash
cd spike

# a 0. réteg mérése — API kulcs nem kell
node parancs/merd.mjs

# mindkét réteg, valódi tokenszámmal és költséggel
ANTHROPIC_API_KEY=... node parancs/merd.mjs --reteg1
```

Állítható környezeti változók: `HAVI_PARANCS` (alapérték 300),
`PARANCS_MODELL` (alapérték `claude-haiku-4-5`), `USD_HUF` (alapérték 380).

Kimenet: `eredmenyek/parancs-riport.md`.

## A korpusz

`mondatok.json` — 68 mondat, ahogy egy térkövező a telefonjába mondaná, a
pongyola alakokkal együtt („hát figyelj, a Kovácséknak kellene egy ajánlat úgy
nyolcszáz négyzetre”). Öt mondat szándékosan olyan, amit **nem szabad**
felismerni — mert nem tartozik a rendszerre. Ha a felismerő ezekre is rácsap,
az hiba, nem érdem.

**A mérés korlátja:** a korpuszt és a mintákat ugyanaz írta, ezért a lefedettség
felső becslés. Valódi számot a 3. spike hangfelvételeiből származó tényleges
átiratok adnak — azokat érdemes átengedni ezen a mérésen, mielőtt bármit
ígérünk. Az első éles felhasználók parancsnaplója pedig folyamatosan
visszatáplálható: minden mondat, ami a modellhez került, jelölt arra, hogy
felkerüljön a 0. rétegbe.

## Ha bővíted

Új parancs esetén **először a 0. rétegbe** vedd fel (`reteg0.mjs`, `SZANDEKOK`
tömb), és csak akkor hagyd a modellre, ha a megfogalmazás tényleg túl változatos.
Vedd fel a korpuszba is, különben a mérés nem mutatja meg, ha elromlik.

A 0. réteg mintái szándékosan ugyanazok, mint a prototípusban és a
hangmérő lapon — így a három mérés ugyanazt a viselkedést méri.
