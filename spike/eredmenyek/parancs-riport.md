# 4. spike — parancsfelismerés költsége

*Készült: 2026-08-30 · 68 mondatos korpusz · csak a 0. réteg mérve*

A kérdés nem az, hogy egy nyelvi modell érti-e a magyar parancsokat — érti.
A kérdés az, hogy **mennyit kell fizetni érte havonta felhasználónként**, és
mennyit lehet ebből lespórolni azzal, hogy a gyakori parancsokat el sem küldjük.

> **Olvasd óvatosan.** A korpuszt és a felismerő mintáit ugyanaz írta, ezért a
> lefedettség itt felső becslés, nem bizonyíték. Valódi számot két dolog ad:
> a 3. spike hangfelvételeiből származó **tényleges átiratok** átengedése ezen a
> mérésen, és az első éles felhasználók parancsnaplója. Amíg ez nincs meg, a
> 100% azt mutatja, hogy a megközelítés működik — nem azt, hogy ennyi lesz élesben.

## A két szám

| Mérőszám | Érték |
|---|---|
| A 0. réteg (ingyenes) helyesen kezeli | **100%** a valódi parancsokból |
| Téves felismerés | **0 db** 68 mondatból |
| Modellnek továbbadva | 7.4% |
| Becsült havi költség lépcsősen | **11 Ft / felhasználó** |
| Becsült havi költség, ha minden hívás modell | 148 Ft / felhasználó |

Havi 300 paranccsal, claude-haiku-4-5 árazással, 380 Ft/USD árfolyamon.

## Miért a téves felismerés a fontos szám

A kihagyás olcsó: ha a 0. réteg nem ismer fel valamit, a modell megkapja, és
a felhasználó nem vesz észre semmit. A téves felismerés viszont rossz műveletet
indít el — ez az egyetlen kimenet, ami kárt okoz. Ezért a 0. réteg úgy van
hangolva, hogy **bizonytalanság esetén továbbadjon**, ne találgasson.

Ugyanez a szabály él az adatokra is: ha a szándék megvan, de a partner vagy a
mennyiség hiányzik, a rendszer visszakérdez ahelyett, hogy kitalálná.

## A 0. réteg mindent kezelt

Ez gyanús — bővítsd a korpuszt nehezebb mondatokkal.

## 1. réteg — nincs mérve

Futtasd API kulccsal: `ANTHROPIC_API_KEY=... node parancs/merd.mjs --reteg1`
Addig a költségmodell konzervatív becslést használ (700 be / 120 ki token hívásonként).

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
napján érvényes listaárak; az árfolyam a `USD_HUF` környezeti változóval állítható.*
