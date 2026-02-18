set check_function_bodies = off;

alter table public.sections
  add column if not exists sort_order integer;

alter table public.sections_feeds
  add column if not exists sort_order integer;

with ranked_sections as (
  select
    s.id,
    row_number() over (
      partition by s.user_id
      order by s.sort_order nulls last, s.created_at, s.id
    ) - 1 as next_sort_order
  from public.sections s
)
update public.sections s
set sort_order = ranked_sections.next_sort_order
from ranked_sections
where ranked_sections.id = s.id
  and (s.sort_order is null or s.sort_order <> ranked_sections.next_sort_order);

with ranked_section_feeds as (
  select
    sf.section_id,
    sf.feed_id,
    row_number() over (
      partition by sf.section_id
      order by sf.sort_order nulls last, sf.created_at, sf.feed_id
    ) - 1 as next_sort_order
  from public.sections_feeds sf
)
update public.sections_feeds sf
set sort_order = ranked_section_feeds.next_sort_order
from ranked_section_feeds
where ranked_section_feeds.section_id = sf.section_id
  and ranked_section_feeds.feed_id = sf.feed_id
  and (sf.sort_order is null or sf.sort_order <> ranked_section_feeds.next_sort_order);

update public.sections
set sort_order = 0
where sort_order is null;

update public.sections_feeds
set sort_order = 0
where sort_order is null;

alter table public.sections
  alter column sort_order set default 0,
  alter column sort_order set not null;

alter table public.sections_feeds
  alter column sort_order set default 0,
  alter column sort_order set not null;

create index if not exists sections_user_sort_order_idx
  on public.sections (user_id, sort_order, id);

create index if not exists sections_feeds_section_sort_order_idx
  on public.sections_feeds (section_id, sort_order, feed_id);

create or replace function public.get_user_home_feeds(p_user_id uuid)
returns table (
  id bigint,
  name text,
  url text
)
language sql
stable
security definer
set search_path = public
as $$
  select f.id, f.name, f.url
  from public.feeds f
  join public.sections_feeds sf on sf.feed_id = f.id
  join public.sections s on s.id = sf.section_id
  where s.user_id = p_user_id
    and s.user_id = auth.uid()
    and coalesce(f.enabled, true) = true
  group by f.id, f.name, f.url
  order by min(s.sort_order), min(sf.sort_order), f.id;
$$;

grant execute on function public.get_user_home_feeds(uuid) to authenticated;