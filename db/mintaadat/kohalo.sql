-- ============================================================================
-- Mintaadat: Kőháló Kft. — ugyanaz, ami a prototípusokban szerepel.
--
-- Így a demó és az adatbázis ugyanazt a történetet meséli. Kitalált adatok;
-- valódi ügyféladat nem kerülhet a repóba.
-- ============================================================================

insert into cegek (id, nev, adoszam, cim, bankszamla, email, telefon) values
  ('11111111-1111-1111-1111-111111111111', 'Kőháló Kft.', '26845913-2-13',
   '2040 Budaörs, Kőfaragó u. 12.', '10300002-10512345-49020018',
   'iroda@kohalo.hu', '+36 30 412 8890');

insert into felhasznalok (id, ceg_id, nev, email, szerep) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'Vince', 'vince@kohalo.hu', 'tulajdonos');

insert into partnerek (id, ceg_id, nev, adoszam, kapcsolattarto, fizetesi_hatarido_nap, kedvezmeny_szazalek, szallito) values
  ('cccccccc-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'Kovács Építő Kft.', '12345678-2-42', 'Kovács Péter', 30, 3, false),
  ('cccccccc-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'Szabó Ingatlan Zrt.', '23456789-2-41', 'Szabó Judit', 15, 0, false),
  ('cccccccc-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
   'Nagy család', null, 'Nagy Tamás', 8, 0, false),
  ('cccccccc-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
   'Zöld Kert Bt.', '98765432-1-13', 'Kiss Anna', 15, 0, false),
  ('cccccccc-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111',
   'BauMax Trade Kft.', '34567890-2-13', 'Tóth Gábor', 8, 0, true);

-- Az árlista a prototípuséval azonos: ugyanarra a parancsra ugyanaz az összeg.
insert into termekek (ceg_id, nev, cikkszam, mertekegyseg, beszerzesi_ar, eladasi_ar, kategoria) values
  ('11111111-1111-1111-1111-111111111111', 'Térkő lerakás, normál kötés',    'MU-101', 'm²',   3200,  4800, 'munkadij'),
  ('11111111-1111-1111-1111-111111111111', 'Térkő lerakás, mintás/díszkötés','MU-102', 'm²',   4100,  6500, 'munkadij'),
  ('11111111-1111-1111-1111-111111111111', 'Alapozás, zúzottkő ágyazat',     'MU-110', 'm²',   1900,  2900, 'munkadij'),
  ('11111111-1111-1111-1111-111111111111', 'Szegélykő elhelyezés',           'MU-120', 'fm',   2200,  3400, 'munkadij'),
  ('11111111-1111-1111-1111-111111111111', 'Bontás, régi burkolat',          'MU-130', 'm²',   1100,  1800, 'munkadij'),
  ('11111111-1111-1111-1111-111111111111', 'Földmunka, gépi kiemelés',       'MU-140', 'm³',   3800,  5500, 'munkadij'),
  ('11111111-1111-1111-1111-111111111111', 'Térkő anyag, szürke 6 cm',       'AN-201', 'm²',   2980,  3950, 'anyag'),
  ('11111111-1111-1111-1111-111111111111', 'Térkő anyag, antik 6 cm',        'AN-202', 'm²',   3900,  5200, 'anyag'),
  ('11111111-1111-1111-1111-111111111111', 'Szegélykő, süttői 100×20',       'AN-210', 'fm',   1450,  2100, 'anyag'),
  ('11111111-1111-1111-1111-111111111111', 'Konténer, sitt elszállítás',     'SZ-301', 'db',  31000, 42000, 'szolgaltatas'),
  ('11111111-1111-1111-1111-111111111111', 'Kiszállás, munkakezdés',         'SZ-310', 'alk.',    0, 25000, 'szolgaltatas');

insert into szamlak (ceg_id, partner_id, irany, sorszam, kelt, fizetesi_hatarido, brutto, allapot, forras) values
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-0000-0000-0000-000000000001',
   'kimeno', 'SZ-2026/0142', '2026-07-18', '2026-08-17', 1240000, 'nyitott', 'szamlazo_api'),
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-0000-0000-0000-000000000004',
   'kimeno', 'SZ-2026/0138', '2026-07-06', '2026-08-05',  620000, 'nyitott', 'szamlazo_api'),
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-0000-0000-0000-000000000002',
   'kimeno', 'SZ-2026/0151', '2026-08-20', '2026-09-04', 3480000, 'nyitott', 'szamlazo_api'),
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-0000-0000-0000-000000000005',
   'bejovo', 'BM-2026/0281', '2026-08-10', '2026-09-09', 2146300, 'nyitott', 'nav'),
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-0000-0000-0000-000000000004',
   'bejovo', 'ZK/2026/77',   '2026-08-02', '2026-08-30',  609600, 'nyitott', 'foto');

insert into feladatok (ceg_id, partner_id, cim, hatarido, surgos, forras) values
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-0000-0000-0000-000000000001',
   'Kovács Építő Kft. — fizetési felszólítás', '2026-08-25', true, 'ai_javaslat'),
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-0000-0000-0000-000000000002',
   'Szabó Ingatlan Zrt. — ajánlat utánkövetése', '2026-08-25', false, 'ai_javaslat');
