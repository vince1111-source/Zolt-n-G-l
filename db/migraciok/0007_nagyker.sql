-- CÉGEM.AI — Nagyker / beszállítói katalógus.
--
-- A vízió-dokumentum 11., 14., 15., 16. szakasza: a beszállító (partnerek,
-- szallito=true) tételeinek BESZERZÉSI ára elkülönítve a saját eladási
-- árlistától (termekek). V1: kézi felvétel — nincs automatikus webes
-- árkaparás vagy külső API-integráció (lásd CLAUDE.md "Amit ne csinálj").
--
-- Ez az ELSŐ funkció, ami a `javasolt_muveletek` kaput az `ajanlat_kikuldes`-en
-- kívül használja: amikor egy beszállító ára változik, a rendszer kiszámolja
-- a javasolt új eladási árat (az árrés arányának megtartásával), de sem a
-- nagyker_tetelek.beszerzesi_ar, sem a termekek beszerzési/eladási ára NEM
-- változik, amíg valaki jóvá nem hagyja.
--
-- A `javasolt_muvelet_atmenet()` trigger (0001, finomítva 0003-ban) nem
-- `tipus` szerint ágazik, csak `allapot` szerint — az új 'arfrissites' érték
-- a meglévő állapotgépet MÓDOSÍTÁS NÉLKÜL használhatja.

alter type muvelet_tipus add value 'arfrissites';

-- ------------------------------------------------------------------- tábla

create table nagyker_tetelek (
  id             uuid primary key default gen_random_uuid(),
  ceg_id         uuid not null references cegek(id) on delete cascade default aktualis_ceg(),
  szallito_id    uuid not null references partnerek(id),
  -- Opcionális kapcsolat a saját eladott termékhez. Enélkül a tétel csak
  -- beszerzési-ár nyilvántartás — nincs mihez tartani az árrést.
  termek_id      uuid references termekek(id) on delete set null,
  nev            text not null,
  cikkszam       text,
  mertekegyseg   text not null,
  beszerzesi_ar  numeric(14,2) not null default 0,
  aktiv          boolean not null default true,
  -- Az utolsó JÓVÁHAGYOTT árfrissítés időpontja — nem a javaslat rögzítéséé.
  frissitve      timestamptz not null default now(),
  letrehozva     timestamptz not null default now(),
  unique (szallito_id, nev)
);

-- A szállító tényleg szállító legyen — adatbázis-szinten kikényszerítve,
-- nem csak a felület jó szándékával (ugyanaz az elv, mint a 3. sarkalatos
-- szabálynál: a garancia a sémában van, nem az alkalmazáskódban).
create or replace function nagyker_tetel_szallito_ellenoriz() returns trigger
language plpgsql set search_path = public
as $$
begin
  if not exists (
    select 1 from partnerek p
    where p.id = new.szallito_id and p.szallito = true
  ) then
    raise exception
      'A(z) % azonosítójú partner nincs szállítóként megjelölve — nagyker-tétel csak szállítóhoz vehető fel.',
      new.szallito_id
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger nagyker_tetelek_szallito_ellenorzese
  before insert or update of szallito_id on nagyker_tetelek
  for each row execute function nagyker_tetel_szallito_ellenoriz();

-- --------------------------------------------------------------------- RLS

alter table nagyker_tetelek enable row level security;
alter table nagyker_tetelek force row level security;
create policy nagyker_tetelek_tenant on nagyker_tetelek
  using (ceg_id = aktualis_ceg())
  with check (ceg_id = aktualis_ceg());

grant select, insert, update, delete on nagyker_tetelek to cegem_app;
grant select, insert, update, delete on nagyker_tetelek to authenticated;

-- ---------------------------------------------------------------- indexek

create index on nagyker_tetelek (ceg_id, szallito_id);
create index on nagyker_tetelek (termek_id) where termek_id is not null;
