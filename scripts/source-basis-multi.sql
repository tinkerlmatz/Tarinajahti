-- Muutetaan source_basis skalaarista monivalinnaksi (text -> text[]).
-- Aja Supabasen SQL-editorissa. Turvallinen: olemassa oleva arvo siirtyy
-- yksialkioiseksi taulukoksi, null -> tyhjä taulukko.

-- 1) Pudota mahdollinen source_basis-check (nimi voi vaihdella).
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
      and pg_get_constraintdef(con.oid) ilike '%source_basis%'
  loop
    execute format('alter table public.stories drop constraint %I', c.conname);
  end loop;
end $$;

-- 2) Muunna tyyppi taulukoksi (säilyttää olemassa olevat arvot).
alter table public.stories
  alter column source_basis drop default;
alter table public.stories
  alter column source_basis type text[]
  using (
    case
      when source_basis is null then '{}'::text[]
      else array[source_basis]
    end
  );
alter table public.stories
  alter column source_basis set default '{}';
alter table public.stories
  alter column source_basis set not null;
