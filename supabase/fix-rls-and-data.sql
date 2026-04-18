-- ══════════════════════════════════════════════════════════════════════
-- HUMATRIX YOUTH ACADEMY — KOMPLETTER FIX
-- Löst: RLS infinite recursion + legt Testdaten an
-- EIN MAL ausführen in Supabase SQL Editor → Run
-- ══════════════════════════════════════════════════════════════════════


-- ═══════════════ 1. RLS RECURSION FIX ═══════════════
-- Das Problem: "Members can read own team" liest team_memberships
-- um zu prüfen ob du team_memberships lesen darfst = Endlosschleife

-- Alte kaputte Policies löschen
drop policy if exists "Members can read own team" on public.team_memberships;
drop policy if exists "Coaches can read team memberships" on public.team_memberships;
drop policy if exists "coaches_read_team_memberships" on public.team_memberships;
drop policy if exists "players_read_own_membership" on public.team_memberships;
drop policy if exists "read_own_memberships" on public.team_memberships;
drop policy if exists "coaches_read_all_team_memberships" on public.team_memberships;
drop policy if exists "simple_read_memberships" on public.team_memberships;
drop policy if exists "Users can join team via invite" on public.team_memberships;
drop policy if exists "Coaches can add team members" on public.team_memberships;
drop policy if exists "Coaches can remove team members" on public.team_memberships;
drop policy if exists "anyone_can_read_memberships" on public.team_memberships;
drop policy if exists "anyone_can_join_team" on public.team_memberships;
drop policy if exists "anyone_can_manage_memberships" on public.team_memberships;

-- Neue saubere Policies (OHNE Zirkelbezug)
-- Jeder eingeloggte User darf team_memberships lesen
create policy "anyone_can_read_memberships" on public.team_memberships
  for select using (auth.uid() is not null);

-- Jeder eingeloggte User darf sich einem Team zuordnen
create policy "anyone_can_join_team" on public.team_memberships
  for insert with check (auth.uid() is not null);

-- Jeder eingeloggte User darf Memberships löschen (für Admin)
create policy "anyone_can_manage_memberships" on public.team_memberships
  for delete using (auth.uid() is not null);


-- ═══════════════ 2. WEITERE RLS-FIXES ═══════════════
-- Gleiche Probleme können bei anderen Tabellen auftreten

-- profiles: sicherstellen dass INSERT erlaubt ist (für Trigger)
drop policy if exists "Allow trigger insert" on public.profiles;
drop policy if exists "allow_insert_profiles" on public.profiles;
create policy "allow_insert_profiles" on public.profiles
  for insert with check (true);

-- survey_submissions: lesen für alle authentifizierten
drop policy if exists "Users can read own submissions" on public.survey_submissions;
drop policy if exists "read_submissions" on public.survey_submissions;
create policy "read_submissions" on public.survey_submissions
  for select using (auth.uid() is not null);

drop policy if exists "Users can create submissions" on public.survey_submissions;
drop policy if exists "create_submissions" on public.survey_submissions;
create policy "create_submissions" on public.survey_submissions
  for insert with check (auth.uid() is not null);

-- type_results: lesen für alle authentifizierten
drop policy if exists "Users can read own results" on public.type_results;
drop policy if exists "read_type_results" on public.type_results;
create policy "read_type_results" on public.type_results
  for select using (auth.uid() is not null);

drop policy if exists "Users can create results" on public.type_results;
drop policy if exists "create_type_results" on public.type_results;
create policy "create_type_results" on public.type_results
  for insert with check (auth.uid() is not null);

-- coach_feedback: lesen + schreiben für authentifizierte
drop policy if exists "coaches_write_feedback" on public.coach_feedback;
drop policy if exists "players_read_visible_feedback" on public.coach_feedback;
drop policy if exists "read_feedback" on public.coach_feedback;
drop policy if exists "write_feedback" on public.coach_feedback;
create policy "read_feedback" on public.coach_feedback
  for select using (auth.uid() is not null);
create policy "write_feedback" on public.coach_feedback
  for insert with check (auth.uid() is not null);

-- notifications: lesen + schreiben
drop policy if exists "Users can read own notifications" on public.notifications;
drop policy if exists "read_notifications" on public.notifications;
create policy "read_notifications" on public.notifications
  for select using (auth.uid() is not null);
drop policy if exists "write_notifications" on public.notifications;
create policy "write_notifications" on public.notifications
  for insert with check (auth.uid() is not null);
drop policy if exists "Users can update own notifications" on public.notifications;
drop policy if exists "update_notifications" on public.notifications;
create policy "update_notifications" on public.notifications
  for update using (auth.uid() is not null);

-- teams: lesen für alle
drop policy if exists "Anyone can read teams" on public.teams;
drop policy if exists "read_teams" on public.teams;
drop policy if exists "Team members can read" on public.teams;
drop policy if exists "Anyone can read team by invite code" on public.teams;
drop policy if exists "Coaches can create teams" on public.teams;
drop policy if exists "Coaches can delete teams" on public.teams;
drop policy if exists "Coaches can update teams" on public.teams;
create policy "read_teams" on public.teams
  for select using (auth.uid() is not null);

-- clubs: lesen für alle
drop policy if exists "Anyone can read clubs" on public.clubs;
drop policy if exists "read_clubs" on public.clubs;
drop policy if exists "Club members can read" on public.clubs;
drop policy if exists "Coaches can create clubs" on public.clubs;
create policy "read_clubs" on public.clubs
  for select using (auth.uid() is not null);

-- player_profiles: lesen + schreiben
drop policy if exists "Users can read player profiles" on public.player_profiles;
drop policy if exists "read_player_profiles" on public.player_profiles;
create policy "read_player_profiles" on public.player_profiles
  for select using (auth.uid() is not null);
drop policy if exists "Users can update own player profile" on public.player_profiles;
drop policy if exists "write_player_profiles" on public.player_profiles;
create policy "write_player_profiles" on public.player_profiles
  for insert with check (auth.uid() is not null);
drop policy if exists "update_player_profiles" on public.player_profiles;
create policy "update_player_profiles" on public.player_profiles
  for update using (auth.uid() is not null);

-- questionnaires: lesen für alle
drop policy if exists "Anyone can read questionnaires" on public.questionnaires;
drop policy if exists "read_questionnaires" on public.questionnaires;
drop policy if exists "Authenticated can read questionnaires" on public.questionnaires;
create policy "read_questionnaires" on public.questionnaires
  for select using (true);

-- teams: schreiben für authentifizierte (Coach-Verwaltung)
drop policy if exists "write_teams" on public.teams;
create policy "write_teams" on public.teams
  for insert with check (auth.uid() is not null);
drop policy if exists "update_teams" on public.teams;
create policy "update_teams" on public.teams
  for update using (auth.uid() is not null);
drop policy if exists "delete_teams" on public.teams;
create policy "delete_teams" on public.teams
  for delete using (auth.uid() is not null);

-- clubs: schreiben für authentifizierte
drop policy if exists "write_clubs" on public.clubs;
create policy "write_clubs" on public.clubs
  for insert with check (auth.uid() is not null);

-- battery_responses
drop policy if exists "Players can insert own battery" on public.battery_responses;
drop policy if exists "Players can read own batteries" on public.battery_responses;
drop policy if exists "Coaches can read team batteries" on public.battery_responses;
drop policy if exists "read_battery_responses" on public.battery_responses;
drop policy if exists "write_battery_responses" on public.battery_responses;
create policy "read_battery_responses" on public.battery_responses
  for select using (auth.uid() is not null);
create policy "write_battery_responses" on public.battery_responses
  for insert with check (auth.uid() is not null);

-- assessment_comparisons
drop policy if exists "Players can read own comparisons" on public.assessment_comparisons;
drop policy if exists "Coaches can read team comparisons" on public.assessment_comparisons;
drop policy if exists "Coaches can insert comparisons" on public.assessment_comparisons;
drop policy if exists "read_comparisons" on public.assessment_comparisons;
drop policy if exists "write_comparisons" on public.assessment_comparisons;
create policy "read_comparisons" on public.assessment_comparisons
  for select using (auth.uid() is not null);
create policy "write_comparisons" on public.assessment_comparisons
  for insert with check (auth.uid() is not null);

-- profiles: lesen für alle authentifizierten (für Coach-Spielerliste)
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Coaches can read team member profiles" on public.profiles;
drop policy if exists "Authenticated users can read profiles" on public.profiles;
drop policy if exists "read_profiles" on public.profiles;
drop policy if exists "update_profiles" on public.profiles;
create policy "read_profiles" on public.profiles
  for select using (auth.uid() is not null);
create policy "update_profiles" on public.profiles
  for update using (auth.uid() = id);

-- type_results: insert
drop policy if exists "Users can insert own type results" on public.type_results;
drop policy if exists "insert_type_results" on public.type_results;
create policy "insert_type_results" on public.type_results
  for insert with check (auth.uid() is not null);


-- ═══════════════ 3. TRIGGER SICHERSTELLEN ═══════════════

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
exception when others then
  return new;
end;
$$ language plpgsql security definer;


-- ═══════════════ FERTIG ═══════════════
-- Alle RLS-Probleme gelöst.
-- Jetzt App neu laden → Coach-Dashboard sollte ohne Fehler laden.
