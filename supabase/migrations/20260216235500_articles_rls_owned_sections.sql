set check_function_bodies = off;

alter table public.articles enable row level security;

-- Replace broad read access with ownership-scoped access via sections.
drop policy if exists "authenticated_read_articles" on public.articles;
create policy "authenticated_read_articles"
on public.articles
for select
to authenticated
using (
  exists (
    select 1
    from public.sections_feeds sf
    join public.sections s on s.id = sf.section_id
    where sf.feed_id = articles.feed_id
      and s.user_id = auth.uid()
  )
);
