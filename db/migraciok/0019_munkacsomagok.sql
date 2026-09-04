-- CÉGEM.AI — Munkacsomagok (assemblies).
--
-- A vízió-dokumentum "Wow #1"-e: "40 m² falfestés" → automatikus anyag +
-- idő + ár. Eddig az AI-doboz ezt úgy közelítette, hogy az árlista MINDEN
-- m²-ben árazott tételét felvette — ez őszinte volt (a "feltételezések"
-- sáv ki is mondta), de nem az, amit a vállalkozó gondol: a "térkövezés"
-- egy KONKRÉT tételcsomag (bontás + ágyazat + térkő + szegély + fugázás),
-- tételenként más-más mennyiséggel egy m²-re. A HANDOVER 2.4 ezt
-- tudatosan kihagyta ("önálló adatmodellt igényelne") — ez az a modell.
--
-- Tervezési döntések:
-- - A csomag NEM tárol árat. Az ár mindig az árlista (termekek) aktuális
--   eladási árából jön az ajánlat-számításkor (lib/ajanlat-szamitas.ts) —
--   ugyanaz az elv, mint eddig: "a modell megért, nem számol", és egy
--   árfrissítés után a csomag magától a friss árat adja.
-- - `mennyiseg_egysegre`: hány egység kell a TERMÉKBŐL a csomag EGY
--   alapegységére (pl. 1 m² térkövezéshez 1,05 m² térkő a vágási ráhagyás
--   miatt, 0,04 m³ ágyazóhomok). Ezt a vállalkozó adja meg a saját
--   tapasztalatából — NINCS beégetett szakmai norma (ugyanaz az elv, mint a
--   0005-ös normaidőnél): a rendszer nem talál ki számokat helyette.
-- - Nincs beágyazott csomag a csomagban — egy szint elég, és az ajánlat
--   tételei laposak maradnak (ajanlat_tetelek), semmi nem változik a
--   számla/dokumentum oldalon.
-- - `unique (ceg_id, nev)`: a csomagot NÉV szerint keresi az AI-doboz
--   ("50 m² térkövezés"), ezért egy cégen belül egyedi legyen.

create table munkacsomagok (
  id             uuid primary key default gen_random_uuid(),
  ceg_id         uuid not null references cegek(id) on delete cascade default aktualis_ceg(),
  nev            text not null,
  -- A csomag alapmennyiségének egysége (pl. m², fm, db) — csak a
  -- felületnek szól ("X m² térkövezés"), számolni a tételek egysége számol.
  mertekegyseg   text not null default 'm2',
  leiras         text,
  aktiv          boolean not null default true,
  letrehozva     timestamptz not null default now(),
  unique (ceg_id, nev)
);

create table munkacsomag_tetelek (
  id                   uuid primary key default gen_random_uuid(),
  csomag_id            uuid not null references munkacsomagok(id) on delete cascade,
  termek_id            uuid not null references termekek(id),
  mennyiseg_egysegre   numeric(12,4) not null,
  sorrend              int not null default 0,
  constraint munkacsomag_tetel_pozitiv check (mennyiseg_egysegre > 0),
  unique (csomag_id, termek_id)
);

-- --------------------------------------------------------------------- RLS

alter table munkacsomagok enable row level security;
alter table munkacsomagok force row level security;
create policy munkacsomagok_tenant on munkacsomagok
  using (ceg_id = aktualis_ceg())
  with check (ceg_id = aktualis_ceg());

-- A tételek a csomagon keresztül öröklik a cég-szűrést — ugyanaz a minta,
-- mint az ajanlat_tetelek (0001).
alter table munkacsomag_tetelek enable row level security;
alter table munkacsomag_tetelek force row level security;
create policy munkacsomag_tetelek_tenant on munkacsomag_tetelek
  using (exists (select 1 from munkacsomagok c
                 where c.id = munkacsomag_tetelek.csomag_id and c.ceg_id = aktualis_ceg()))
  with check (exists (select 1 from munkacsomagok c
                      where c.id = munkacsomag_tetelek.csomag_id and c.ceg_id = aktualis_ceg()));

grant select, insert, update, delete on munkacsomagok to authenticated, cegem_app;
grant select, insert, update, delete on munkacsomag_tetelek to authenticated, cegem_app;

-- Íráskor: a tétel terméke UGYANAHHOZ a céghez tartozzon, mint a csomag.
-- Az idegen kulcs önmagában nem cég-specifikus, és egy SECURITY DEFINER
-- olvasó (mint a naptár-feednél, 0014) az RLS-t megkerülve szivárogtatna —
-- ugyanaz a védelem, mint a 0014/0015 triggereknél.
create or replace function munkacsomag_tetel_ceg_ellenoriz() returns trigger
language plpgsql set search_path = public
as $$
declare
  csomag_ceg uuid;
  termek_ceg uuid;
begin
  select ceg_id into csomag_ceg from munkacsomagok where id = new.csomag_id;
  select ceg_id into termek_ceg from termekek where id = new.termek_id;
  if csomag_ceg is null or termek_ceg is null or csomag_ceg <> termek_ceg then
    raise exception
      'A tétel terméke (%) nem ugyanahhoz a céghez tartozik, mint a csomag.', new.termek_id
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger munkacsomag_tetelek_ceg_ellenorzese
  before insert or update of termek_id, csomag_id on munkacsomag_tetelek
  for each row execute function munkacsomag_tetel_ceg_ellenoriz();

-- ---------------------------------------------------------------- indexek

create index on munkacsomagok (ceg_id, aktiv);
create index on munkacsomag_tetelek (csomag_id, sorrend);
