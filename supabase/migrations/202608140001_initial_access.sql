create extension if not exists pgcrypto;

create type public.teacher_role as enum ('teacher');
create type public.session_status as enum ('draft', 'open', 'closed', 'archived');
create type public.session_mode as enum ('single', 'circuit');

create table public.teacher_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role public.teacher_role not null default 'teacher',
  created_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teacher_profiles(user_id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vocabulary_entries (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  spanish text not null,
  english text not null,
  category text,
  image_url text,
  hint text,
  example_sentence text,
  audio_url text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teacher_profiles(user_id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete restrict,
  name text not null,
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9]{6,8}$'),
  status public.session_status not null default 'draft',
  mode public.session_mode not null default 'single',
  max_attempts integer not null default 1 check (max_attempts between 1 and 20),
  opened_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.session_modules (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  module_key text not null,
  position integer not null default 0,
  settings jsonb not null default '{}'::jsonb,
  unique (session_id, module_key)
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  private_id_hash text not null unique,
  private_id_last3 text not null check (char_length(private_id_last3) between 1 and 3),
  created_at timestamptz not null default now()
);

create table public.session_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  class_period text not null check (class_period in (
    'Período 0 - Spanish 1/2',
    'Período 1 - AP Spanish',
    'Período 2 - Spanish 1/2',
    'Período 3 - Spanish 1/2',
    'Período 4 - Spanish 1/2'
  )),
  joined_at timestamptz not null default now(),
  unique (session_id, student_id)
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.session_participants(id) on delete cascade,
  module_key text not null,
  attempt_number integer not null check (attempt_number > 0),
  correct_answers integer not null default 0 check (correct_answers >= 0),
  incorrect_answers integer not null default 0 check (incorrect_answers >= 0),
  duration_ms integer not null default 0 check (duration_ms >= 0),
  normalized_score numeric(6, 2) not null default 0 check (normalized_score between 0 and 100),
  completed_at timestamptz not null default now(),
  unique (participant_id, module_key, attempt_number)
);

alter table public.teacher_profiles enable row level security;
alter table public.lessons enable row level security;
alter table public.vocabulary_entries enable row level security;
alter table public.sessions enable row level security;
alter table public.session_modules enable row level security;
alter table public.students enable row level security;
alter table public.session_participants enable row level security;
alter table public.attempts enable row level security;

create policy "teacher reads own profile" on public.teacher_profiles for select to authenticated using (user_id = auth.uid());
create policy "teacher manages own lessons" on public.lessons for all to authenticated using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy "teacher manages own vocabulary" on public.vocabulary_entries for all to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id and l.teacher_id = auth.uid()))
  with check (exists (select 1 from public.lessons l where l.id = lesson_id and l.teacher_id = auth.uid()));
create policy "teacher manages own sessions" on public.sessions for all to authenticated using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy "teacher manages own session modules" on public.session_modules for all to authenticated
  using (exists (select 1 from public.sessions s where s.id = session_id and s.teacher_id = auth.uid()))
  with check (exists (select 1 from public.sessions s where s.id = session_id and s.teacher_id = auth.uid()));
create policy "teacher reads students in own sessions" on public.students for select to authenticated
  using (exists (
    select 1 from public.session_participants p
    join public.sessions s on s.id = p.session_id
    where p.student_id = students.id and s.teacher_id = auth.uid()
  ));
create policy "teacher manages own participants" on public.session_participants for all to authenticated
  using (exists (select 1 from public.sessions s where s.id = session_id and s.teacher_id = auth.uid()))
  with check (exists (select 1 from public.sessions s where s.id = session_id and s.teacher_id = auth.uid()));
create policy "teacher reads attempts in own sessions" on public.attempts for select to authenticated
  using (exists (
    select 1 from public.session_participants p
    join public.sessions s on s.id = p.session_id
    where p.id = attempts.participant_id and s.teacher_id = auth.uid()
  ));

create or replace function public.get_public_session(requested_code text)
returns table (session_id uuid, session_name text, session_code text, session_mode public.session_mode, max_attempts integer)
language sql
security definer
set search_path = public
as $$
  select s.id, s.name, s.code, s.mode, s.max_attempts
  from public.sessions s
  where s.code = upper(trim(requested_code)) and s.status = 'open'
  limit 1;
$$;

create or replace function public.join_public_session(
  requested_code text,
  requested_first_name text,
  requested_last_name text,
  requested_private_id text,
  requested_class_period text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_session public.sessions;
  target_student_id uuid;
  target_participant_id uuid;
  id_fingerprint text;
begin
  select * into target_session
  from public.sessions
  where code = upper(trim(requested_code)) and status = 'open'
  limit 1;

  if target_session.id is null then raise exception 'SESSION_NOT_OPEN'; end if;
  if length(trim(requested_first_name)) < 1 or length(trim(requested_last_name)) < 1 then raise exception 'INVALID_NAME'; end if;
  if length(trim(requested_private_id)) < 3 then raise exception 'INVALID_STUDENT_ID'; end if;

  id_fingerprint := encode(digest(trim(requested_private_id), 'sha256'), 'hex');

  insert into public.students (first_name, last_name, private_id_hash, private_id_last3)
  values (trim(requested_first_name), trim(requested_last_name), id_fingerprint, right(trim(requested_private_id), 3))
  on conflict (private_id_hash) do update set first_name = excluded.first_name, last_name = excluded.last_name
  returning id into target_student_id;

  insert into public.session_participants (session_id, student_id, class_period)
  values (target_session.id, target_student_id, requested_class_period)
  on conflict (session_id, student_id) do update set class_period = excluded.class_period
  returning id into target_participant_id;

  return target_participant_id;
end;
$$;

revoke all on function public.get_public_session(text) from public;
grant execute on function public.get_public_session(text) to anon, authenticated;
revoke all on function public.join_public_session(text, text, text, text, text) from public;
grant execute on function public.join_public_session(text, text, text, text, text) to anon, authenticated;
