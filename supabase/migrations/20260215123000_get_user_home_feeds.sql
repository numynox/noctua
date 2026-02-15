set check_function_bodies = off;

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
  select distinct f.id, f.name, f.url
  from public.feeds f
  join public.sections_feeds sf on sf.feed_id = f.id
  join public.sections s on s.id = sf.section_id
  where s.user_id = p_user_id
    and s.user_id = auth.uid()
    and coalesce(f.enabled, true) = true
  order by f.id;
$$;

grant execute on function public.get_user_home_feeds(uuid) to authenticated;
