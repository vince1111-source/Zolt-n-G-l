-- CÉGEM.AI — AI-generált, tárolt szövegek (a lépcsős AI-réteg bekötése).
--
-- CLAUDE.md költségszabály: "A napi összefoglaló naponta egyszer
-- generálódik és tárolódik." Ez az a tábla. Egy sor = egy cég egy napja;
-- az egyediség a kulcs: két párhuzamos "Ma"-megnyitás sem generál kétszer
-- (a második beszúrás 23505-tel elutasítva, a hívó a tároltat olvassa).
-- A `bemenet` a determinisztikus tények, amikből a szöveg készült — hogy
-- utólag látszódjon, mit látott a modell (2. sarkalatos szabály), és hogy
-- a szöveg ne tartalmazhasson olyan számot, ami nincs a bemenetben.

create table napi_osszefoglalok (
  ceg_id      uuid not null references cegek(id) on delete cascade default aktualis_ceg(),
  datum       date not null,
  szoveg      text not null,
  bemenet     jsonb not null,
  modell      text not null,
  token_be    integer not null default 0,
  token_ki    integer not null default 0,
  letrehozva  timestamptz not null default now(),
  primary key (ceg_id, datum)
);

alter table napi_osszefoglalok enable row level security;
alter table napi_osszefoglalok force row level security;
create policy napi_osszefoglalok_tenant on napi_osszefoglalok
  using (ceg_id = aktualis_ceg())
  with check (ceg_id = aktualis_ceg());

grant select, insert, update, delete on napi_osszefoglalok to authenticated, cegem_app;

-- Az ajánlat kísérőlevele: kérésre generált PISZKOZAT, amit a vállalkozó a
-- saját levelezőjébe másol. Nem küldünk e-mailt (10. modul, V2). Tárolva,
-- hogy ne generálódjon újra minden megnyitáskor — csak ha kéri.
alter table ajanlatok add column kisero_szoveg text;
