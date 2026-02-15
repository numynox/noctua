set check_function_bodies = off;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user_profile();

alter table public.feeds enable row level security;
alter table public.articles enable row level security;
alter table public.profiles enable row level security;
alter table public.sections enable row level security;
alter table public.sections_feeds enable row level security;

drop policy if exists "authenticated_read_feeds" on public.feeds;
create policy "authenticated_read_feeds"
on public.feeds
for select
to authenticated
using (true);

drop policy if exists "authenticated_read_articles" on public.articles;
create policy "authenticated_read_articles"
on public.articles
for select
to authenticated
using (true);

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "sections_select_own" on public.sections;
create policy "sections_select_own"
on public.sections
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "sections_insert_own" on public.sections;
create policy "sections_insert_own"
on public.sections
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "sections_update_own" on public.sections;
create policy "sections_update_own"
on public.sections
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "sections_delete_own" on public.sections;
create policy "sections_delete_own"
on public.sections
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "sections_feeds_select_owned_sections" on public.sections_feeds;
create policy "sections_feeds_select_owned_sections"
on public.sections_feeds
for select
to authenticated
using (
  exists (
    select 1
    from public.sections s
    where s.id = sections_feeds.section_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "sections_feeds_insert_owned_sections" on public.sections_feeds;
create policy "sections_feeds_insert_owned_sections"
on public.sections_feeds
for insert
to authenticated
with check (
  exists (
    select 1
    from public.sections s
    where s.id = sections_feeds.section_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "sections_feeds_update_owned_sections" on public.sections_feeds;
create policy "sections_feeds_update_owned_sections"
on public.sections_feeds
for update
to authenticated
using (
  exists (
    select 1
    from public.sections s
    where s.id = sections_feeds.section_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.sections s
    where s.id = sections_feeds.section_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "sections_feeds_delete_owned_sections" on public.sections_feeds;
create policy "sections_feeds_delete_owned_sections"
on public.sections_feeds
for delete
to authenticated
using (
  exists (
    select 1
    from public.sections s
    where s.id = sections_feeds.section_id
      and s.user_id = auth.uid()
  )
);
