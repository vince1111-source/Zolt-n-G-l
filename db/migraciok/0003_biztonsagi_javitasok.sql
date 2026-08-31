-- ============================================================================
-- CÉGEM.AI — 0003 biztonsági javítások
--
-- A Supabase biztonsági tanácsadó (advisors) talált egy VALÓDI hibát:
--
--   `termek_arres` nézet alapból a LÉTREHOZÓ (a migrációt futtató, RLS-t
--   megkerülő szerep) jogán fut, nem a lekérdezőén. Ez azt jelentette, hogy
--   bárki, aki elér a nézethez, MINDEN cég termékét látta volna — pont az
--   izolációt kerülte volna meg, amit a 3. sarkalatos szabály előír.
--
-- A másik két észrevétel (search_path a triggerfüggvényeken, a segédfüggvények
-- RPC-n át hívhatók) kisebb súlyú, de a jó gyakorlat miatt ezeket is javítjuk.
-- ============================================================================

-- A nézet a LEKÉRDEZŐ jogán fusson — így a mögötte lévő `termekek` tábla
-- RLS szabálya érvényesül, nem a nézet tulajdonosáé.
alter view termek_arres set (security_invoker = true);

-- A triggerfüggvények search_path-ja rögzítve — védelem egy esetleges
-- séma-eltérítés ellen, még ha ezeket nem is lehet kívülről paraméterezni.
create or replace function javasolt_muvelet_atmenet() returns trigger
language plpgsql set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.allapot <> 'javasolt' then
      raise exception
        'Külső hatású művelet csak javasolt állapotban jöhet létre (kapott: %). '
        'A jóváhagyási kapu nem kerülhető meg.', new.allapot
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if old.allapot = new.allapot then
    return new;
  end if;

  if not (
       (old.allapot = 'javasolt'    and new.allapot in ('jovahagyott', 'kihagyott', 'elvetett'))
    or (old.allapot = 'jovahagyott' and new.allapot in ('vegrehajtott', 'elvetett'))
  ) then
    raise exception
      'Tiltott állapotátmenet: % → %. Végrehajtott állapotba csak jóváhagyott '
      'műveletből lehet eljutni.', old.allapot, new.allapot
      using errcode = 'check_violation';
  end if;

  return new;
end $$;

create or replace function ai_naplo_valtozatlan() returns trigger
language plpgsql set search_path = public
as $$
begin
  raise exception 'Az AI napló nem módosítható és nem törölhető (kísérlet: %).', tg_op
    using errcode = 'insufficient_privilege';
end $$;

-- A két segédfüggvény nem publikus API — csak bejelentkezett felhasználó
-- hívhatja (az `aktualis_ceg()` az RLS szabályokon belülről is fut, ahhoz
-- az `authenticated` jog kell; az `anon`-nak nincs rá szüksége).
revoke execute on function aktualis_ceg() from public, anon;
grant execute on function aktualis_ceg() to authenticated;

revoke execute on function sajat_ceg_letrehozasa(text, text) from public, anon;
grant execute on function sajat_ceg_letrehozasa(text, text) to authenticated;
