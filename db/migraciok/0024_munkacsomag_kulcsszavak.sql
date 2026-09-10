-- 0024: munkacsomag-kulcsszavak — az AI-doboz (hang és szöveg) ezekre a szavakra
-- is ráismer ("bejáró", "kocsibejáró" → Kocsibeálló). Additív, nullable: a meglévő
-- kód és adat változatlanul működik; a tábla RLS-e érvényes marad.
alter table munkacsomagok add column if not exists kulcsszavak text;
comment on column munkacsomagok.kulcsszavak is
  'Vesszővel elválasztott szavak, amelyekre az AI-doboz ezt a csomagot választja (pl. "járda, terasz").';
