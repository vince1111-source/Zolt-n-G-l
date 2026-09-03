-- CÉGEM.AI — Cég logó feltöltése az ajánlat-dokumentumhoz.
--
-- A `cegek.logo_url` oszlop már az 0001 óta megvan, csak eddig semmi nem
-- töltötte fel. Ez a migráció a hozzá tartozó Storage buckettet adja.
--
-- A bucket SZÁNDÉKOSAN nyilvános (public): a logó úgyis megjelenik minden
-- kiküldött ajánlat-dokumentumon, amit az ügyfél amúgy is lát — nincs
-- értelme aláírt URL-t generálni egy nem titkos képhez, és a public=true
-- így egyszerű, stabil, gyorsítótárazható URL-t ad. Az ÍRÁS (feltöltés/
-- csere/törlés) viszont továbbra is csak a saját cégnek engedett.

insert into storage.buckets (id, name, public) values ('ceg-logok', 'ceg-logok', true);

create policy ceg_logo_irhato_sajat_ceg on storage.objects
  for all
  using (bucket_id = 'ceg-logok' and (storage.foldername(name))[1] = aktualis_ceg()::text)
  with check (bucket_id = 'ceg-logok' and (storage.foldername(name))[1] = aktualis_ceg()::text);
