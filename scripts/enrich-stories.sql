-- Tarinapisteiden rikas luokittelu (admin-rikastus).
-- Aja Supabasen SQL-editorissa (DDL vaatii enemmän kuin anon-oikeudet).
-- Kaikki additiivista ja nullable/oletuksin -> vanhat 30 tarinaa toimivat ennallaan.

-- 1) Tarinaluokka: laajenna sallittuja arvoja ('mysteeri' uutena).
--    Pudotetaan mahdollinen olemassa oleva category-check (nimi voi vaihdella).
do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'stories'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%category%'
  loop
    execute format('alter table public.stories drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.stories
  add constraint stories_category_check
  check (category in ('historia', 'legenda', 'muisto', 'mysteeri'));

-- 2) Kohdetyyppi (yksi arvo, nullable).
alter table public.stories
  add column if not exists object_type text
    check (object_type is null or object_type in
      ('paikka', 'rakennus', 'henkilo', 'tapahtuma',
       'luontokohde', 'reitti', 'yhteiso'));

-- 3) Teemat (monivalinta, kontrolloitu sanasto UI:ssa).
alter table public.stories
  add column if not exists themes text[] not null default '{}';

-- 4) Ajankohta: vuosiväli (molemmat nullable, esihistoria = negatiivinen).
alter table public.stories
  add column if not exists year_start smallint
    check (year_start is null or year_start between -3000 and 2100);
alter table public.stories
  add column if not exists year_end smallint
    check (year_end is null or year_end between -3000 and 2100);

-- 5) Suositusikä: 0 = kaikille, muuten 7 / 12 / 16.
alter table public.stories
  add column if not exists min_age smallint not null default 0
    check (min_age in (0, 7, 12, 16));

-- 6) Tunnelma (monivalinta).
alter table public.stories
  add column if not exists moods text[] not null default '{}';

-- 7) Lähdepohja (yksi arvo, nullable).
alter table public.stories
  add column if not exists source_basis text
    check (source_basis is null or source_basis in
      ('dokumentoitu', 'muistitieto', 'perimatieto', 'tulkinta', 'huhu'));
