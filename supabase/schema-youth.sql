-- ══════════════════════════════════════════════════════════════════════
-- HUMATRIX YOUTH ACADEMY — Komplett-Setup
-- ══════════════════════════════════════════════════════════════════════
-- Führe ZUERST schema.sql + seed.sql aus, DANN dieses File.
-- ══════════════════════════════════════════════════════════════════════


-- 1. Altersgruppen-Typ
do $$ begin
  create type age_group as enum ('u13', 'u16', 'u19');
exception when duplicate_object then null;
end $$;


-- 2. Neue Spalten auf bestehende Tabellen
alter table public.clubs add column if not exists is_academy boolean default false;
alter table public.clubs add column if not exists academy_focus text;
alter table public.teams add column if not exists age_group age_group;
alter table public.player_profiles add column if not exists age_group age_group;
alter table public.player_profiles add column if not exists school_type text;
alter table public.player_profiles add column if not exists parent_email text;
alter table public.player_profiles add column if not exists parent_name text;
alter table public.type_results add column if not exists age_group age_group;
alter table public.type_results add column if not exists questionnaire_variant text;
alter table public.profiles add column if not exists birth_date date;


-- 3. Trigger updaten: birth_date aus user_metadata aufnehmen
-- Dieser ersetzt den Original-Trigger und kann auch mit birth_date umgehen
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, first_name, last_name, role, birth_date)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'player'),
    case
      when new.raw_user_meta_data->>'birth_date' is not null
        and new.raw_user_meta_data->>'birth_date' != ''
      then (new.raw_user_meta_data->>'birth_date')::date
      else null
    end
  );
  return new;
end;
$$ language plpgsql security definer;


-- 4. Demo-Akademie + Teams
insert into public.clubs (id, name, is_academy, academy_focus)
values ('00000000-0000-0000-0000-000000000a01', 'Humatrix Youth Academy Demo', true, 'football')
on conflict (id) do update set is_academy = true, academy_focus = 'football';

insert into public.teams (id, club_id, name, season, age_group) values
  ('00000000-0000-0000-0000-000000000b13', '00000000-0000-0000-0000-000000000a01', 'U13 Falcons', '2025/26', 'u13'),
  ('00000000-0000-0000-0000-000000000b16', '00000000-0000-0000-0000-000000000a01', 'U16 Eagles',  '2025/26', 'u16'),
  ('00000000-0000-0000-0000-000000000b19', '00000000-0000-0000-0000-000000000a01', 'U19 Wolves',  '2025/26', 'u19')
on conflict (id) do update set age_group = excluded.age_group, name = excluded.name;

insert into public.questionnaires (id, title, description, type, version, is_active) values
  ('00000000-0000-0000-0000-000000001013', 'Youth U13 Selbsttest',        '68 Fragen', 'player_selftest',     1, true),
  ('00000000-0000-0000-0000-000000001016', 'Youth U16 Selbsttest',        '68 Fragen', 'player_selftest',     1, true),
  ('00000000-0000-0000-0000-000000001019', 'Youth U19 Selbsttest',        '68 Fragen', 'player_selftest',     1, true),
  ('00000000-0000-0000-0000-000000002013', 'Youth U13 Fremdeinschätzung', '20 Fragen', 'coach_player_rating', 1, true),
  ('00000000-0000-0000-0000-000000002016', 'Youth U16 Fremdeinschätzung', '20 Fragen', 'coach_player_rating', 1, true),
  ('00000000-0000-0000-0000-000000002019', 'Youth U19 Fremdeinschätzung', '20 Fragen', 'coach_player_rating', 1, true),
  ('00000000-0000-0000-0000-000000003001', 'Trainer Persönlichkeit',      '16 Fragen', 'coach_selftest',      1, true),
  ('00000000-0000-0000-0000-000000003002', 'Trainer Coaching-Stil',       '24 Fragen', 'coach_selftest',      1, true)
on conflict (id) do nothing;

-- FERTIG. Registrierung sollte jetzt funktionieren.
