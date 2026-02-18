set check_function_bodies = off;

create table if not exists public.article_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  article_id bigint not null references public.articles(id) on delete cascade,
  read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, article_id)
);

create index if not exists article_reads_user_read_at_idx
  on public.article_reads (user_id, read_at desc);

create index if not exists article_reads_article_id_idx
  on public.article_reads (article_id);

alter table public.article_reads enable row level security;

drop policy if exists "article_reads_select_own" on public.article_reads;
create policy "article_reads_select_own"
on public.article_reads
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "article_reads_insert_own_owned_articles" on public.article_reads;
create policy "article_reads_insert_own_owned_articles"
on public.article_reads
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.sections s
    join public.sections_feeds sf on sf.section_id = s.id
    join public.articles a on a.feed_id = sf.feed_id
    where s.user_id = auth.uid()
      and a.id = article_reads.article_id
  )
);

drop policy if exists "article_reads_update_own_owned_articles" on public.article_reads;
create policy "article_reads_update_own_owned_articles"
on public.article_reads
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.sections s
    join public.sections_feeds sf on sf.section_id = s.id
    join public.articles a on a.feed_id = sf.feed_id
    where s.user_id = auth.uid()
      and a.id = article_reads.article_id
  )
);

drop policy if exists "article_reads_delete_own" on public.article_reads;
create policy "article_reads_delete_own"
on public.article_reads
for delete
to authenticated
using (user_id = auth.uid());

grant select, insert, update, delete on table public.article_reads to authenticated;
grant select, insert, update, delete on table public.article_reads to service_role;