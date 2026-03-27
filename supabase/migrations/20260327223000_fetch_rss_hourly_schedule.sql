set check_function_bodies = off;

create or replace function public.invoke_fetch_rss()
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_invoke_secret text;
  v_function_url text;
begin
  select decrypted_secret
    into v_invoke_secret
  from vault.decrypted_secrets
  where name = 'FETCH_RSS_INVOKE_SECRET'
  limit 1;

  if v_invoke_secret is null then
    raise exception 'FETCH_RSS_INVOKE_SECRET not found in vault';
  end if;

  select decrypted_secret
    into v_function_url
  from vault.decrypted_secrets
  where name = 'FETCH_RSS_FUNCTION_URL'
  limit 1;

  if v_function_url is null then
    raise exception 'FETCH_RSS_FUNCTION_URL not found in vault';
  end if;

  perform net.http_post(
    url := v_function_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_invoke_secret,
      'Content-Type', 'application/json'
    ),
    body := '{"name":"Functions"}'::jsonb
  );
end;
$function$;

do $do$
declare
  v_existing_job_id bigint;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise exception 'pg_cron extension is required for fetch-rss scheduling';
  end if;

  select jobid
    into v_existing_job_id
  from cron.job
  where jobname = 'fetch-rss-hourly'
  limit 1;

  if v_existing_job_id is not null then
    perform cron.unschedule(v_existing_job_id);
  end if;

  perform cron.schedule(
    'fetch-rss-hourly',
    '0 * * * *',
    $job$select public.invoke_fetch_rss();$job$
  );
end;
$do$;
