-- Pilottia varten: syntymävuosi + sukupuoli profiileihin.
-- Aja Supabasen SQL-editorissa (DDL vaatii enemmän kuin anon-oikeudet).

alter table public.profiles
  add column if not exists birth_year smallint
    check (birth_year is null or birth_year between 1900 and 2025);

-- Sukupuoli: rajatut arvot. null sallitaan (vanhat rivit).
alter table public.profiles
  add column if not exists gender text
    check (gender is null or gender in ('mies', 'nainen', 'muu', 'ei_kerro'));
