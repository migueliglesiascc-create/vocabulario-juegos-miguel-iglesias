create table if not exists public.lesson_source_files (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  teacher_id uuid not null references public.teacher_profiles(user_id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  mime_type text,
  size_bytes bigint not null check (size_bytes >= 0),
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'ready', 'error')),
  created_at timestamptz not null default now()
);

alter table public.lesson_source_files enable row level security;

drop policy if exists "Teachers manage their lesson source files" on public.lesson_source_files;
create policy "Teachers manage their lesson source files"
on public.lesson_source_files for all to authenticated
using (teacher_id = auth.uid())
with check (teacher_id = auth.uid() and exists (select 1 from public.lessons where id = lesson_id and teacher_id = auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lesson-sources', 'lesson-sources', false, 26214400, null)
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Teachers upload lesson sources" on storage.objects;
create policy "Teachers upload lesson sources"
on storage.objects for insert to authenticated
with check (bucket_id = 'lesson-sources' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Teachers read lesson sources" on storage.objects;
create policy "Teachers read lesson sources"
on storage.objects for select to authenticated
using (bucket_id = 'lesson-sources' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Teachers update lesson sources" on storage.objects;
create policy "Teachers update lesson sources"
on storage.objects for update to authenticated
using (bucket_id = 'lesson-sources' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Teachers delete lesson sources" on storage.objects;
create policy "Teachers delete lesson sources"
on storage.objects for delete to authenticated
using (bucket_id = 'lesson-sources' and (storage.foldername(name))[1] = auth.uid()::text);
