-- CÉGEM.AI — Munka-fotódokumentáció.
--
-- A telefonos prototípusban már megvan (fotó egy munkához kötve),
-- a valódi webapp-ban eddig hiányzott — lásd HANDOVER 8.1. Egy Supabase
-- Storage bucket + egy metaadat-tábla: a tábla teszi kereshetővé/
-- rendezhetővé a fotókat (ki töltötte fel, mikor, melyik munkához),
-- a bucket maga PRIVÁT — csak a saját cég éri el, aláírt URL-en át.

create table munka_fotok (
  id              uuid primary key default gen_random_uuid(),
  ceg_id          uuid not null references cegek(id) on delete cascade default aktualis_ceg(),
  munka_id        uuid not null references munkak(id) on delete cascade,
  storage_utvonal text not null,
  feltoltotte_id  uuid references felhasznalok(id),
  feltoltve       timestamptz not null default now()
);

alter table munka_fotok enable row level security;
alter table munka_fotok force row level security;
create policy munka_fotok_tenant on munka_fotok
  using (ceg_id = aktualis_ceg())
  with check (ceg_id = aktualis_ceg());

grant select, insert, delete on munka_fotok to authenticated, cegem_app;

create index on munka_fotok (munka_id);

-- Írás-időben megakadályozni, hogy egy fotó idegen cég munkájához
-- kapcsolódjon — ugyanaz a minta, mint a 0014-es naptár-esemény/munka
-- ellenőrzés és a 0007-es nagyker_tetel_szallito_ellenoriz.
create or replace function munka_foto_munka_ceg_ellenoriz() returns trigger
language plpgsql set search_path = public
as $$
begin
  if not exists (
    select 1 from munkak m where m.id = new.munka_id and m.ceg_id = new.ceg_id
  ) then
    raise exception
      'A kapcsolt munka (%) nem ehhez a céghez tartozik.', new.munka_id
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger munka_fotok_munka_ellenorzese
  before insert or update of munka_id, ceg_id on munka_fotok
  for each row execute function munka_foto_munka_ceg_ellenoriz();

-- Storage bucket — privát, útvonal-konvenció: {ceg_id}/{munka_id}/{fajl}.
insert into storage.buckets (id, name, public) values ('munka-fotok', 'munka-fotok', false);

create policy munka_fotok_storage_sajat_ceg on storage.objects
  for all
  using (bucket_id = 'munka-fotok' and (storage.foldername(name))[1] = aktualis_ceg()::text)
  with check (bucket_id = 'munka-fotok' and (storage.foldername(name))[1] = aktualis_ceg()::text);
