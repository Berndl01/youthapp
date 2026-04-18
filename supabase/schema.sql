-- ══════════════════════════════════════════════════════════════════════
-- HUMATRIX MVP – Supabase Database Schema
-- ══════════════════════════════════════════════════════════════════════
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ══════════════════════════════════════════════════════════════════════

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────
-- 1. ENUM TYPES
-- ─────────────────────────────────────────────────────────────────────
do $$ begin create type user_role as enum ('player', 'coach', 'admin'); exception when duplicate_object then null; end $$;
do $$ begin create type team_role as enum ('player', 'coach'); exception when duplicate_object then null; end $$;
do $$ begin create type questionnaire_type as enum ('player_selftest', 'coach_player_rating', 'coach_selftest'); exception when duplicate_object then null; end $$;
do $$ begin create type question_type as enum ('scale', 'single_choice', 'multiple_choice', 'text'); exception when duplicate_object then null; end $$;
do $$ begin create type submission_status as enum ('draft', 'submitted'); exception when duplicate_object then null; end $$;
do $$ begin create type player_type_code as enum (
  'ESAF', 'ESAD', 'ESIF', 'ESID',
  'ETAF', 'ETAD', 'ETIF', 'ETID',
  'WSAF', 'WSAD', 'WSIF', 'WSID',
  'WTAF', 'WTAD', 'WTIF', 'WTID'
); exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────────
-- 2. PROFILES (extends auth.users)
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  first_name text not null default '',
  last_name text not null default '',
  role user_role not null default 'player',
  avatar_url text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, first_name, last_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'player')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────
-- 3. CLUBS
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.clubs (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  logo_url text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────
-- 4. TEAMS
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.teams (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  season text not null default '2025/26',
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────
-- 5. TEAM MEMBERSHIPS
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.team_memberships (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  role_in_team team_role not null default 'player',
  joined_at timestamptz not null default now(),
  unique(user_id, team_id)
);

-- ─────────────────────────────────────────────────────────────────────
-- 6. PLAYER PROFILES
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.player_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  birth_date date,
  position text,
  jersey_number integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(user_id, team_id)
);

-- ─────────────────────────────────────────────────────────────────────
-- 7. COACH PROFILES
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.coach_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  bio text,
  created_at timestamptz not null default now(),
  unique(user_id, club_id)
);

-- ─────────────────────────────────────────────────────────────────────
-- 8. QUESTIONNAIRES
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.questionnaires (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  type questionnaire_type not null,
  version integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────
-- 9. QUESTIONS
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.questions (
  id uuid primary key default uuid_generate_v4(),
  questionnaire_id uuid not null references public.questionnaires(id) on delete cascade,
  text text not null,
  category text not null, -- e.g. 'fuehrung', 'team', 'risiko', 'disziplin', 'kreativitaet', 'mental', 'kommunikation'
  question_type question_type not null default 'scale',
  scale_min integer default 1,
  scale_max integer default 7,
  scale_min_label text default 'Trifft gar nicht zu',
  scale_max_label text default 'Trifft voll zu',
  is_reversed boolean not null default false,
  sort_order integer not null default 0,
  is_required boolean not null default true
);

-- ─────────────────────────────────────────────────────────────────────
-- 10. QUESTION OPTIONS (for choice-based questions)
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.question_options (
  id uuid primary key default uuid_generate_v4(),
  question_id uuid not null references public.questions(id) on delete cascade,
  label text not null,
  value integer not null,
  sort_order integer not null default 0
);

-- ─────────────────────────────────────────────────────────────────────
-- 11. SURVEY SUBMISSIONS
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.survey_submissions (
  id uuid primary key default uuid_generate_v4(),
  questionnaire_id uuid not null references public.questionnaires(id),
  submitted_by uuid not null references public.profiles(id),
  subject_user_id uuid not null references public.profiles(id),
  team_id uuid references public.teams(id),
  status submission_status not null default 'draft',
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

comment on column public.survey_submissions.submitted_by is 'Who filled out the survey';
comment on column public.survey_submissions.subject_user_id is 'Who the survey is about';

-- ─────────────────────────────────────────────────────────────────────
-- 12. SURVEY ANSWERS
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.survey_answers (
  id uuid primary key default uuid_generate_v4(),
  submission_id uuid not null references public.survey_submissions(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  answer_value integer, -- for scale/choice
  answer_text text,     -- for free text
  unique(submission_id, question_id)
);

-- ─────────────────────────────────────────────────────────────────────
-- 13. TYPE RESULTS
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.type_results (
  id uuid primary key default uuid_generate_v4(),
  submission_id uuid not null references public.survey_submissions(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  result_type player_type_code not null,
  result_label text not null, -- e.g. 'Der Natürliche Anführer'
  confidence_score numeric(5,2), -- 0-100
  scoring_json jsonb not null default '{}', -- full scoring breakdown
  category_scores jsonb not null default '{}', -- scores per category
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────
-- 14. COACH FEEDBACK
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.coach_feedback (
  id uuid primary key default uuid_generate_v4(),
  player_user_id uuid not null references public.profiles(id),
  coach_user_id uuid not null references public.profiles(id),
  team_id uuid references public.teams(id),
  title text,
  feedback_text text not null,
  is_visible_to_player boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────
-- 15. ASSESSMENT COMPARISONS (Self vs Coach)
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.assessment_comparisons (
  id uuid primary key default uuid_generate_v4(),
  player_user_id uuid not null references public.profiles(id),
  self_submission_id uuid references public.survey_submissions(id),
  coach_submission_id uuid references public.survey_submissions(id),
  match_score numeric(5,2), -- 0-100 overall match
  differences_json jsonb not null default '{}', -- per-category diffs
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────
-- 16. INDEXES
-- ─────────────────────────────────────────────────────────────────────
create index if not exists idx_team_memberships_user on public.team_memberships(user_id);
create index if not exists idx_team_memberships_team on public.team_memberships(team_id);
create index if not exists idx_player_profiles_user on public.player_profiles(user_id);
create index if not exists idx_player_profiles_team on public.player_profiles(team_id);
create index if not exists idx_survey_submissions_subject on public.survey_submissions(subject_user_id);
create index if not exists idx_survey_submissions_by on public.survey_submissions(submitted_by);
create index if not exists idx_survey_answers_submission on public.survey_answers(submission_id);
create index if not exists idx_type_results_user on public.type_results(user_id);
create index if not exists idx_coach_feedback_player on public.coach_feedback(player_user_id);

-- ─────────────────────────────────────────────────────────────────────
-- 17. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.clubs enable row level security;
alter table public.teams enable row level security;
alter table public.team_memberships enable row level security;
alter table public.player_profiles enable row level security;
alter table public.coach_profiles enable row level security;
alter table public.questionnaires enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.survey_submissions enable row level security;
alter table public.survey_answers enable row level security;
alter table public.type_results enable row level security;
alter table public.coach_feedback enable row level security;
alter table public.assessment_comparisons enable row level security;

-- Profiles: users can read own, coaches can read team members
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "Coaches can read team member profiles" on public.profiles;
create policy "Coaches can read team member profiles" on public.profiles
  for select using (
    id in (
      select tm2.user_id from public.team_memberships tm1
      join public.team_memberships tm2 on tm1.team_id = tm2.team_id
      where tm1.user_id = auth.uid() and tm1.role_in_team = 'coach'
    )
  );

-- Clubs: readable by members
drop policy if exists "Club members can read" on public.clubs;
create policy "Club members can read" on public.clubs
  for select using (
    id in (
      select t.club_id from public.teams t
      join public.team_memberships tm on tm.team_id = t.id
      where tm.user_id = auth.uid()
    )
  );

-- Teams: readable by members
drop policy if exists "Team members can read" on public.teams;
create policy "Team members can read" on public.teams
  for select using (
    id in (
      select team_id from public.team_memberships
      where user_id = auth.uid()
    )
  );

-- Team memberships: readable by team members
drop policy if exists "Members can read own team" on public.team_memberships;
create policy "Members can read own team" on public.team_memberships
  for select using (
    team_id in (
      select team_id from public.team_memberships
      where user_id = auth.uid()
    )
  );

-- Questionnaires & questions: readable by all authenticated
drop policy if exists "Authenticated can read questionnaires" on public.questionnaires;
create policy "Authenticated can read questionnaires" on public.questionnaires
  for select using (auth.uid() is not null);

drop policy if exists "Authenticated can read questions" on public.questions;
create policy "Authenticated can read questions" on public.questions
  for select using (auth.uid() is not null);

drop policy if exists "Authenticated can read options" on public.question_options;
create policy "Authenticated can read options" on public.question_options
  for select using (auth.uid() is not null);

-- Survey submissions: own or coach's team
drop policy if exists "Users can read own submissions" on public.survey_submissions;
create policy "Users can read own submissions" on public.survey_submissions
  for select using (submitted_by = auth.uid() or subject_user_id = auth.uid());

drop policy if exists "Users can insert own submissions" on public.survey_submissions;
create policy "Users can insert own submissions" on public.survey_submissions
  for insert with check (submitted_by = auth.uid());

drop policy if exists "Users can update own draft" on public.survey_submissions;
create policy "Users can update own draft" on public.survey_submissions
  for update using (submitted_by = auth.uid() and status = 'draft');

drop policy if exists "Coaches can read team submissions" on public.survey_submissions;
create policy "Coaches can read team submissions" on public.survey_submissions
  for select using (
    subject_user_id in (
      select tm2.user_id from public.team_memberships tm1
      join public.team_memberships tm2 on tm1.team_id = tm2.team_id
      where tm1.user_id = auth.uid() and tm1.role_in_team = 'coach'
    )
  );

-- Survey answers: same as submissions
drop policy if exists "Users can read own answers" on public.survey_answers;
create policy "Users can read own answers" on public.survey_answers
  for select using (
    submission_id in (
      select id from public.survey_submissions
      where submitted_by = auth.uid() or subject_user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert own answers" on public.survey_answers;
create policy "Users can insert own answers" on public.survey_answers
  for insert with check (
    submission_id in (
      select id from public.survey_submissions where submitted_by = auth.uid()
    )
  );

drop policy if exists "Users can update own answers" on public.survey_answers;
create policy "Users can update own answers" on public.survey_answers
  for update using (
    submission_id in (
      select id from public.survey_submissions where submitted_by = auth.uid() and status = 'draft'
    )
  );

-- Type results: own or coach's team
drop policy if exists "Users can read own results" on public.type_results;
create policy "Users can read own results" on public.type_results
  for select using (user_id = auth.uid());

drop policy if exists "Coaches can read team results" on public.type_results;
create policy "Coaches can read team results" on public.type_results
  for select using (
    user_id in (
      select tm2.user_id from public.team_memberships tm1
      join public.team_memberships tm2 on tm1.team_id = tm2.team_id
      where tm1.user_id = auth.uid() and tm1.role_in_team = 'coach'
    )
  );

-- Coach feedback: coach can manage, player sees visible ones
drop policy if exists "Coaches can manage own feedback" on public.coach_feedback;
create policy "Coaches can manage own feedback" on public.coach_feedback
  for all using (coach_user_id = auth.uid());

drop policy if exists "Players can read visible feedback" on public.coach_feedback;
create policy "Players can read visible feedback" on public.coach_feedback
  for select using (player_user_id = auth.uid() and is_visible_to_player = true);

-- Player profiles
drop policy if exists "Users can read own player profile" on public.player_profiles;
create policy "Users can read own player profile" on public.player_profiles
  for select using (user_id = auth.uid());

drop policy if exists "Users can update own player profile" on public.player_profiles;
create policy "Users can update own player profile" on public.player_profiles
  for update using (user_id = auth.uid());

drop policy if exists "Coaches can read team player profiles" on public.player_profiles;
create policy "Coaches can read team player profiles" on public.player_profiles
  for select using (
    team_id in (
      select team_id from public.team_memberships
      where user_id = auth.uid() and role_in_team = 'coach'
    )
  );

-- Coach profiles
drop policy if exists "Users can read own coach profile" on public.coach_profiles;
create policy "Users can read own coach profile" on public.coach_profiles
  for select using (user_id = auth.uid());

drop policy if exists "Users can update own coach profile" on public.coach_profiles;
create policy "Users can update own coach profile" on public.coach_profiles
  for update using (user_id = auth.uid());

-- Assessment comparisons
drop policy if exists "Players can read own comparisons" on public.assessment_comparisons;
create policy "Players can read own comparisons" on public.assessment_comparisons
  for select using (player_user_id = auth.uid());

drop policy if exists "Coaches can read team comparisons" on public.assessment_comparisons;
create policy "Coaches can read team comparisons" on public.assessment_comparisons
  for select using (
    player_user_id in (
      select tm2.user_id from public.team_memberships tm1
      join public.team_memberships tm2 on tm1.team_id = tm2.team_id
      where tm1.user_id = auth.uid() and tm1.role_in_team = 'coach'
    )
  );

-- ─────────────────────────────────────────────────────────────────────
-- 18. SEED DATA: Humatrix Player Types Reference
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.player_type_definitions (
  code player_type_code primary key,
  label text not null,
  emoji text not null,
  color text not null,
  description text not null,
  family text,
  tagline text,
  coaching_tips text[] not null default '{}',
  warning_signs text[] not null default '{}'
);

insert into public.player_type_definitions values
  ('ESAF', 'Der Architekt', '🏗️', '#A78BFA',
   'Systematisch, ruhig, eigenverantwortlich. Führt durch Kompetenz, nicht Lautstärke.',
   'Strategen', 'Plant, baut, perfektioniert',
   array['Feedback sachlich und datenbasiert','Raum für eigenständiges Arbeiten','Als Sparringspartner nutzen','Entwicklungspläne gemeinsam erstellen'],
   array['Kann distanziert wirken','Schwer emotional erreichbar','Ungeduldig mit weniger Strukturierten']),

  ('ESAD', 'Der Perfektionist', '🔬', '#C4B5FD',
   'Detailverliebt, selbstkritisch, konstant. Arbeitet im Stillen.',
   'Strategen', 'Feilt an jedem Detail',
   array['Aufgaben klar mit messbaren Zielen','Fortschritte sichtbar machen','Schrittweise Verantwortung geben','Klare Rahmenbedingungen'],
   array['Zu selbstkritisch','Scheut Führung','Braucht klare Rahmen']),

  ('ESIF', 'Der Innovator', '⚡', '#8B5CF6',
   'Kreativ, emotional, eigenständig. Sucht neue Wege.',
   'Strategen', 'Denkt anders, spielt anders',
   array['Kreative Freiräume schaffen','Emotionale Höhen nutzen','In Tiefs auffangen','Als Ideengeber einsetzen'],
   array['Inkonstant','Frustriert bei engen Vorgaben','Braucht emotionale Freiheit']),

  ('ESID', 'Der Künstler', '🎨', '#7C3AED',
   'Sensibel, intuitiv, entwicklungsorientiert.',
   'Strategen', 'Fühlt das Spiel voraus',
   array['Vertrauen vor Kritik aufbauen','Stärken regelmäßig benennen','Feedback unter vier Augen','Intuition ernst nehmen'],
   array['Kritikempfindlich','Leistung schwankt mit Stimmung','Braucht Sicherheit']),

  ('ETAF', 'Der Mentor', '🧭', '#60A5FA',
   'Ruhiger Teamführer mit Entwicklungsfokus.',
   'Teamformer', 'Entwickelt andere',
   array['Als Brücke Team-Staff einsetzen','Führungsrolle anerkennen','In taktische Prozesse einbinden','Eigene Entwicklung fördern'],
   array['Eigene Bedürfnisse zurückstellen','Zu geduldig','Meidet Konflikte']),

  ('ETAD', 'Der Teamarchitekt', '🏛️', '#93C5FD',
   'Zuverlässig und sozial intelligent.',
   'Teamformer', 'Baut das Fundament',
   array['Beitrag vor dem Team anerkennen','Individuelle Ziele setzen','Auch mal Hauptrolle geben','Klares Feedback'],
   array['Stellt sich zu wenig heraus','Braucht Anerkennung','Übersieht Grenzen']),

  ('ETIF', 'Der Katalysator', '🔥', '#3B82F6',
   'Emotional, mitreißend, entwicklungsorientiert.',
   'Teamformer', 'Zündet den Funken',
   array['Energie als Teamressource nutzen','Rolle bei Ansprachen geben','In Tiefs auffangen','Regeneration durchsetzen'],
   array['Tiefs ziehen Team mit','Kann erschöpfen','Braucht Offenheit']),

  ('ETID', 'Der Verbinder', '🤝', '#2563EB',
   'Emotional intelligent, anpassungsfähig.',
   'Teamformer', 'Spürt was das Team braucht',
   array['Als Seismographen nutzen','Bei Konflikten als Brücke','Stabiles Umfeld schaffen','Individuelle Gespräche führen'],
   array['Verliert sich in Dynamik','Leistung leidet bei Konflikten','Schwer in toxischem Umfeld']),

  ('WSAF', 'Der Commander', '👑', '#F59E0B',
   'Siegeswillig, kontrolliert, dominant.',
   'Performer', 'Übernimmt Kontrolle',
   array['Echte Verantwortung geben','Feedback auf Augenhöhe','Ehrgeiz in messbare Ziele lenken','Respekt zeigen'],
   array['Zu fordernd','Schwer zu coachen','Kann einschüchtern']),

  ('WSAD', 'Der Analyst', '📊', '#D97706',
   'Analytisch, ruhig, ergebnisorientiert.',
   'Performer', 'Denkt zwei Züge voraus',
   array['In Analyse einbinden','Daten und Video teilen','Emotionale Teamarbeit fördern','Klare Ziele setzen'],
   array['Zu kopflastig','Emotionale Distanz','Frustration bei Inkompetenz']),

  ('WSIF', 'Der Gladiator', '⚔️', '#EAB308',
   'Intensiv und siegesorientiert.',
   'Performer', 'Kämpft mit jeder Faser',
   array['Intensität lenken mit klaren Aufgaben','Grenzen setzen ohne Energie brechen','In Druckmomenten Verantwortung geben','Zweikampfstärke taktisch nutzen'],
   array['Kann über Grenze gehen','Schwer zu bremsen','Konflikte bei Einsatz-Differenz']),

  ('WSID', 'Der Taktiker', '🎯', '#CA8A04',
   'Wettkampfstark, anpassungsfähig.',
   'Performer', 'Spürt den Moment',
   array['In Schlüsselmomente einbauen','Training abwechslungsreich','Verantwortung für Entscheidungen','Instinkt als Waffe einsetzen'],
   array['Schwankt: Genie vs. unsichtbar','Braucht große Momente','Routine demotiviert']),

  ('WTAF', 'Der Kapitän', '🛡️', '#F87171',
   'Fels in der Brandung. Stabil in Krisen.',
   'Anführer', 'Trägt das Team',
   array['Als verlängerten Arm nutzen','Verantwortung teilen','Vertrauen und Freiheit geben','Vier-Augen-Gespräche auf Augenhöhe'],
   array['Nimmt zu viel Last','Schwer Schwäche zu zeigen','Kann autoritär wirken']),

  ('WTAD', 'Der Mannschaftsspieler', '🔄', '#FB7185',
   'Kompromisslos im Dienst des Teams.',
   'Anführer', 'Gibt alles ohne Ego',
   array['Einsatz öffentlich anerkennen','Individuelle Ziele setzen','Auch mal Hauptrolle geben','Vielseitigkeit strategisch nutzen'],
   array['Eigene Entwicklung vernachlässigen','Wird übersehen','Braucht Wertschätzung']),

  ('WTIF', 'Der Motivator', '📣', '#EF4444',
   'Lauteste Stimme auf dem Platz.',
   'Anführer', 'Reißt alle mit',
   array['Emotionale Energie in Krisen nutzen','Klare Feedback-Regeln','Raum für emotionale Führung','Motivationsfähigkeit nutzen'],
   array['Bei Niederlagen destruktiv','Emotionale Schwankungen','Kann Ruhigere überfahren']),

  ('WTID', 'Der Mitreißer', '💫', '#DC2626',
   'Gewinnt Energie aus der Mannschaft.',
   'Anführer', 'Spielt für das Wir',
   array[]::text[],
   array[]::text[]);

-- No RLS on type definitions (public reference data)
alter table public.player_type_definitions enable row level security;
drop policy if exists "Anyone can read type definitions" on public.player_type_definitions;
create policy "Anyone can read type definitions" on public.player_type_definitions
  for select using (true);

-- ─────────────────────────────────────────────────────────────────────
-- 19. HELPER FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────

-- Get user's role
create or replace function public.get_user_role()
returns user_role as $$
  select role from public.profiles where id = auth.uid();
$$ language sql security definer stable;

-- Get teams for current user
create or replace function public.get_my_teams()
returns setof uuid as $$
  select team_id from public.team_memberships where user_id = auth.uid();
$$ language sql security definer stable;

-- Check if user is coach of a team
create or replace function public.is_coach_of_team(p_team_id uuid)
returns boolean as $$
  select exists(
    select 1 from public.team_memberships
    where user_id = auth.uid() and team_id = p_team_id and role_in_team = 'coach'
  );
$$ language sql security definer stable;

-- Updated_at trigger
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

-- ═══════════════════════════════════════════════════════════════════
-- FIX: Missing INSERT Policies
-- ═══════════════════════════════════════════════════════════════════

-- type_results: users can insert for submissions they own
drop policy if exists "Users can insert own type results" on public.type_results;
create policy "Users can insert own type results" on public.type_results
  for insert with check (
    submission_id in (
      select id from public.survey_submissions where submitted_by = auth.uid()
    )
  );

-- assessment_comparisons: coaches can insert for their team players
drop policy if exists "Coaches can insert comparisons" on public.assessment_comparisons;
create policy "Coaches can insert comparisons" on public.assessment_comparisons
  for insert with check (
    player_user_id in (
      select tm2.user_id from public.team_memberships tm1
      join public.team_memberships tm2 on tm1.team_id = tm2.team_id
      where tm1.user_id = auth.uid() and tm1.role_in_team = 'coach'
    )
  );

-- player_profiles: users can insert own
drop policy if exists "Users can insert own player profile" on public.player_profiles;
create policy "Users can insert own player profile" on public.player_profiles
  for insert with check (user_id = auth.uid());

-- coach_profiles: users can insert own
drop policy if exists "Users can insert own coach profile" on public.coach_profiles;
create policy "Users can insert own coach profile" on public.coach_profiles
  for insert with check (user_id = auth.uid());

-- team_memberships: only via service role (admin/signup flow)
-- For MVP, team assignments happen via SQL or service_role API

-- clubs/teams: read-only for users, created via service_role
-- Already handled by existing SELECT policies

-- ═══ FIX: coach_feedback policy too permissive ═══
-- Drop the overly permissive "for all" and replace with specific policies
drop policy if exists "Coaches can manage own feedback" on public.coach_feedback;

drop policy if exists "Coaches can insert feedback" on public.coach_feedback;
create policy "Coaches can insert feedback" on public.coach_feedback
  for insert with check (coach_user_id = auth.uid());

drop policy if exists "Coaches can read own feedback" on public.coach_feedback;
create policy "Coaches can read own feedback" on public.coach_feedback
  for select using (coach_user_id = auth.uid());

drop policy if exists "Coaches can update own feedback" on public.coach_feedback;
create policy "Coaches can update own feedback" on public.coach_feedback
  for update using (coach_user_id = auth.uid());

drop policy if exists "Coaches can delete own feedback" on public.coach_feedback;
create policy "Coaches can delete own feedback" on public.coach_feedback
  for delete using (coach_user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════
-- MONTHLY BATTERIES: Track anchor metrics over the season
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.battery_responses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid references public.teams(id),
  battery text not null check (battery in ('A', 'B', 'C', 'D', 'E')),
  season_month integer not null check (season_month between 1 and 12),
  season text not null default '2025/26',
  -- 5 anchor values (1-7 scale)
  anchor_satisfaction numeric(3,1),
  anchor_psych_safety numeric(3,1),
  anchor_commitment numeric(3,1),
  anchor_alignment numeric(3,1),
  anchor_motivation numeric(3,1),
  -- Full answers as JSON
  answers_json jsonb not null default '{}',
  -- Focus area scores
  focus_scores jsonb not null default '{}',
  -- Derived
  turnover_risk text check (turnover_risk in ('low', 'mid', 'high')),
  submitted_at timestamptz not null default now(),
  unique(user_id, season, season_month)
);

create index if not exists idx_battery_user on public.battery_responses(user_id);
create index if not exists idx_battery_team on public.battery_responses(team_id);

alter table public.battery_responses enable row level security;

drop policy if exists "Players can insert own battery" on public.battery_responses;
create policy "Players can insert own battery" on public.battery_responses
  for insert with check (user_id = auth.uid());

drop policy if exists "Players can read own batteries" on public.battery_responses;
create policy "Players can read own batteries" on public.battery_responses
  for select using (user_id = auth.uid());

drop policy if exists "Coaches can read team batteries" on public.battery_responses;
create policy "Coaches can read team batteries" on public.battery_responses
  for select using (
    team_id in (
      select team_id from public.team_memberships
      where user_id = auth.uid() and role_in_team = 'coach'
    )
  );

-- ═══════════════════════════════════════════════════════════════════
-- NOTIFICATIONS: Coach triggers battery → players get notified
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid references public.teams(id),
  type text not null check (type in ('battery_request', 'feedback', 'result')),
  title text not null,
  message text not null,
  action_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications(user_id);

alter table public.notifications enable row level security;

drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications" on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications" on public.notifications
  for update using (user_id = auth.uid());

drop policy if exists "Coaches can insert team notifications" on public.notifications;
create policy "Coaches can insert team notifications" on public.notifications
  for insert with check (
    user_id in (
      select tm2.user_id from public.team_memberships tm1
      join public.team_memberships tm2 on tm1.team_id = tm2.team_id
      where tm1.user_id = auth.uid() and tm1.role_in_team = 'coach'
    )
  );

-- ═══ Battery E: Post-Matchday ═══
-- (uses battery_responses table with battery='E')

-- ═══════════════════════════════════════════════════════════════════
-- ADMIN: Coaches can create/manage clubs, teams, memberships
-- ═══════════════════════════════════════════════════════════════════

-- Coaches can create clubs
drop policy if exists "Coaches can create clubs" on public.clubs;
create policy "Coaches can create clubs" on public.clubs
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
  );

-- Coaches can create teams
drop policy if exists "Coaches can create teams" on public.teams;
create policy "Coaches can create teams" on public.teams
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
  );

-- Coaches can manage team memberships
drop policy if exists "Coaches can add team members" on public.team_memberships;
create policy "Coaches can add team members" on public.team_memberships
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
  );

drop policy if exists "Coaches can remove team members" on public.team_memberships;
create policy "Coaches can remove team members" on public.team_memberships
  for delete using (
    exists (
      select 1 from public.team_memberships tm
      where tm.team_id = team_memberships.team_id
      and tm.user_id = auth.uid()
      and tm.role_in_team = 'coach'
    )
  );

-- Coaches can delete their teams
drop policy if exists "Coaches can delete teams" on public.teams;
create policy "Coaches can delete teams" on public.teams
  for delete using (
    exists (
      select 1 from public.team_memberships
      where team_id = teams.id and user_id = auth.uid() and role_in_team = 'coach'
    )
  );

-- All authenticated users can read all profiles (needed for admin member assignment)
drop policy if exists "Authenticated users can read profiles" on public.profiles;
create policy "Authenticated users can read profiles" on public.profiles
  for select using (auth.uid() is not null);

-- ═══════════════════════════════════════════════════════════════════
-- INVITE LINKS: Players join teams via shared link
-- ═══════════════════════════════════════════════════════════════════

-- Add invite code to teams (if not exists, safe to run multiple times)
DO $$ BEGIN
  ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS invite_code text UNIQUE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Allow anyone to read teams by invite code (for registration)
drop policy if exists "Anyone can read team by invite code" on public.teams;
create policy "Anyone can read team by invite code" on public.teams
  for select using (invite_code is not null);

-- Allow new users to add themselves to a team via invite
drop policy if exists "Users can join team via invite" on public.team_memberships;
create policy "Users can join team via invite" on public.team_memberships
  for insert with check (user_id = auth.uid());

-- ═══ Fußball-spezifische Spielerdaten ═══
DO $$ BEGIN
  ALTER TABLE public.player_profiles ADD COLUMN IF NOT EXISTS preferred_foot text CHECK (preferred_foot IN ('links', 'rechts', 'beidfüßig'));
  ALTER TABLE public.player_profiles ADD COLUMN IF NOT EXISTS height_cm integer;
  ALTER TABLE public.player_profiles ADD COLUMN IF NOT EXISTS weight_kg integer;
  ALTER TABLE public.player_profiles ADD COLUMN IF NOT EXISTS previous_clubs text;
  ALTER TABLE public.player_profiles ADD COLUMN IF NOT EXISTS joined_club_date date;
  ALTER TABLE public.player_profiles ADD COLUMN IF NOT EXISTS contract_until date;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
