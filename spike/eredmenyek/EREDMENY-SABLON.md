# 0. fázis — spike eredmények

**Kitöltötte:** …
**Dátum:** …

Ez a lap dönti el, mekkora az MVP. Amíg üres, az MVP-fejlesztés nem indul.

---

## 1. NAV bejövő számla lekérdezés

**Technikai felhasználó regisztrálva:** igen / nem · dátum: …
**Környezet:** teszt / éles

| Kérdés | Válasz |
|---|---|
| A `kapcsolat` hívás átment? | |
| Hány bejövő számla jött vissza, milyen időszakra? | |
| Mely mezők jöttek vissza 100%-ban? | |
| Mely mezők hiányoztak? (különösen: fizetési határidő) | |
| Jött tételszintű adat (`queryInvoiceData`)? | |
| Mennyi késéssel jelenik meg egy számla a NAV-nál? | |

**Következmény a 6. modulra:**

> …

---

## 2. Számlaolvasás pontossága

**Számlák száma:** … · **modell:** … · **riport:** `eredmenyek/szamlaolvasas-riport.md`

| Mérőszám | Érték |
|---|---|
| Mezőszintű pontosság | |
| Hibátlan számla aránya | |
| **Csendes hiba** (rossz érték, nem bejelölve) | |
| Költség számlánként | |

**Mely mezők a leggyengébbek?**

> …

**Következmény a megerősítő folyamatra** (mit kérdezünk vissza mindig, mit soha):

> …

---

## 3. Magyar hangfelismerés

**Mért környezetek:** … · **riport:** `eredmenyek/hang-riport.md`

| Szolgáltató | WER | Szándék eltalálva | Kulcsadat |
|---|---|---|---|
| web-speech-api | | | |
| | | | |

**Melyik környezetben esett le leginkább?**

> …

---

## Termékdöntések

| Döntés | Válasz | Indok |
|---|---|---|
| Hang: fő út vagy kiegészítő? | | |
| A 6. modul fő forrása: NAV vagy fotó? | | |
| Kiolvasó modell (ár/pontosság alapján) | | |
| Számlázó partner: Számlázz.hu vagy Billingo? | | |
| Havi üzemeltetési költség / felhasználó | | |
| Ebből következő előfizetési ár | | |

## MVP-scope módosítás

| Modul | Eredeti becslés | Módosított | Miért |
|---|---|---|---|
| 6 — bejövő számlák | 20–30 nap | | |
| 1 — AI-főképernyő (hang) | 15–25 nap | | |
| | | | |

**Az MVP mérete a spike után:** … fejlesztői nap.
