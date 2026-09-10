-- CÉGEM.AI — Munkatárs meghívása e-mail alapján + a felhasznalok írásjogának
-- szűkítése a tulajdonosra.
--
-- Miért: az első tesztfelhasználót (Zoli) úgy kell beengedni a demóadatos
-- cégbe, hogy senki ne adjon kézbe jelszót, és a rendszer ne hozzon létre
-- neki üres saját céget. A folyamat:
--   1. a tulajdonos a Cégprofilban felvesz egy e-mailt (felhasznalok-sor
--      `auth_user_id` NÉLKÜL — ez a "függő meghívás");
--   2. a meghívott a saját e-mailjével regisztrál, megerősíti;
--   3. a `sajat_ceg_letrehozasa` a MEGERŐSÍTETT e-mail alapján a meglévő
--      sorhoz köti a fiókot, és nem hoz létre új céget.
--
-- Biztonság: a kötés kizárólag `auth.users.email_confirmed_at` mellett
-- történik — így nem lehet más nevében "beülni" egy meghívásba egy meg nem
-- erősített regisztrációval. A `felhasznalok` táblát eddig a cég MINDEN
-- tagja írhatta (`felhasznalok_tenant` ALL policy) — egy munkatárs a saját
-- szerepét is átírhatta volna tulajdonosra. Innentől: olvasni minden tag
-- olvas, írni csak a tulajdonos ír; a saját név a meglévő
-- `sajat_nev_frissitese` RPC-n megy (SECURITY DEFINER, nem érinti).

-- A hívó szerepe — ugyanaz a minta, mint az aktualis_ceg(): SECURITY
-- DEFINER, hogy a policy ne hivatkozzon rekurzívan a saját táblájára.
create or replace function sajat_szerep() returns felhasznalo_szerep
language sql stable security definer set search_path = public
as $$
  select szerep from public.felhasznalok where auth_user_id = auth.uid() limit 1
$$;
revoke all on function sajat_szerep() from public;
grant execute on function sajat_szerep() to authenticated;

drop policy if exists felhasznalok_tenant on felhasznalok;

create policy felhasznalok_tenant_olvas on felhasznalok
  for select using (ceg_id = aktualis_ceg());

create policy felhasznalok_tulajdonos_felvesz on felhasznalok
  for insert with check (ceg_id = aktualis_ceg() and sajat_szerep() = 'tulajdonos');

create policy felhasznalok_tulajdonos_modosit on felhasznalok
  for update
  using (ceg_id = aktualis_ceg() and sajat_szerep() = 'tulajdonos')
  with check (ceg_id = aktualis_ceg() and sajat_szerep() = 'tulajdonos');

-- Törölni csak FÜGGŐ meghívást lehet (még nem regisztrált). Egy élő tag
-- eltávolítása külön, átgondolt művelet (mi legyen az általa létrehozott
-- adatokkal) — az nem ennek a migrációnak a dolga.
create policy felhasznalok_tulajdonos_visszavon on felhasznalok
  for delete using (ceg_id = aktualis_ceg() and sajat_szerep() = 'tulajdonos' and auth_user_id is null);

-- Egy cégen belül egy e-mailre egy függő meghívás.
create unique index if not exists felhasznalok_fuggo_meghivas_idx
  on felhasznalok (ceg_id, lower(email)) where auth_user_id is null;

-- A regisztráció befejezése: előbb a függő meghívás, csak utána új cég.
create or replace function sajat_ceg_letrehozasa(p_ceg_nev text, p_felhasznalo_nev text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uj_ceg_id uuid;
  sajat_email text;
  megerositve timestamptz;
  meghivas record;
begin
  if auth.uid() is null then
    raise exception 'Bejelentkezés szükséges.' using errcode = 'insufficient_privilege';
  end if;

  if exists (select 1 from felhasznalok where auth_user_id = auth.uid()) then
    raise exception 'Ehhez a fiókhoz már tartozik cég.' using errcode = 'unique_violation';
  end if;

  select email, email_confirmed_at into sajat_email, megerositve
  from auth.users where id = auth.uid();

  select id, ceg_id into meghivas
  from felhasznalok
  where auth_user_id is null and lower(email) = lower(sajat_email)
  order by letrehozva
  limit 1;

  if meghivas.id is not null then
    if megerositve is null then
      raise exception 'A meghívás elfogadásához előbb erősítsd meg az e-mail címed.'
        using errcode = 'insufficient_privilege';
    end if;
    update felhasznalok
      set auth_user_id = auth.uid(),
          nev = coalesce(nullif(trim(p_felhasznalo_nev), ''), nev)
      where id = meghivas.id;
    return meghivas.ceg_id;
  end if;

  if coalesce(trim(p_ceg_nev), '') = '' then
    raise exception 'A cégnév kötelező.' using errcode = 'check_violation';
  end if;

  insert into cegek (nev) values (trim(p_ceg_nev)) returning id into uj_ceg_id;

  insert into felhasznalok (ceg_id, nev, email, szerep, auth_user_id)
  values (uj_ceg_id, coalesce(nullif(trim(p_felhasznalo_nev), ''), sajat_email), sajat_email,
          'tulajdonos', auth.uid());

  return uj_ceg_id;
end $$;

-- A regisztráció-befejező oldalnak: várja-e meghívás a bejelentkezett
-- fiók e-mailjét, és ha igen, melyik cégtől (csak a cég neve, semmi más).
create or replace function fuggo_meghivas() returns text
language sql stable security definer set search_path = public
as $$
  select c.nev
  from public.felhasznalok f
  join public.cegek c on c.id = f.ceg_id
  where f.auth_user_id is null
    and lower(f.email) = lower((select email from auth.users where id = auth.uid()))
  order by f.letrehozva
  limit 1
$$;
revoke all on function fuggo_meghivas() from public;
grant execute on function fuggo_meghivas() to authenticated;
