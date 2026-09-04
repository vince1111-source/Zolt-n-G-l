-- CÉGEM.AI — jogosultság-szűkítés (ellenséges felülvizsgálat, L1).
--
-- A Supabase alapértelmezett jogai (`alter default privileges for role
-- postgres … grant all on tables to anon, authenticated, service_role`)
-- miatt az élő projektben az `anon` és az `authenticated` szerep MINDEN
-- public táblán — az újakon is — ALL jogot örököl (TRUNCATE, TRIGGER,
-- REFERENCES is), függetlenül attól, mit ír egy migráció `grant` sora.
-- Az anon-t eddig egyetlen dolog tartotta távol a tenant-tábláktól: a
-- 0003-as `revoke execute on function aktualis_ceg() from anon` miatt a
-- tenant-policy ki sem értékelhető. Ez működik, de egyetlen sorompó;
-- TRUNCATE-re az RLS nem is vonatkozik.
--
-- Ez a migráció a tényleges felületre szűkít:
--   anon:          semmilyen tábla-/szekvencia-jog (az egyetlen anon-
--                  útvonal, a naptár-feed, SECURITY DEFINER RPC-ken megy,
--                  táblajog nélkül is működik — 0014);
--   authenticated: csak select/insert/update/delete (TRUNCATE, REFERENCES,
--                  TRIGGER nem — PostgREST sosem használja őket).
-- És ugyanezt beállítja a JÖVŐBELI táblákra is (default privileges), hogy
-- a következő migráció ne örökölje újra az over-grantet.
--
-- Helyi (db/futtat.sh) futtatásnál az anon/authenticated/postgres szerep
-- hiányozhat — akkor a megfelelő ág kimarad, a migráció nem bukik el.

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on all tables in schema public from anon;
    revoke all on all sequences in schema public from anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke truncate, references, trigger on all tables in schema public from authenticated;
  end if;

  if exists (select 1 from pg_roles where rolname = 'postgres') then
    if exists (select 1 from pg_roles where rolname = 'anon') then
      alter default privileges for role postgres in schema public revoke all on tables from anon;
      alter default privileges for role postgres in schema public revoke all on sequences from anon;
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      alter default privileges for role postgres in schema public
        revoke truncate, references, trigger on tables from authenticated;
    end if;
  end if;
end $$;
