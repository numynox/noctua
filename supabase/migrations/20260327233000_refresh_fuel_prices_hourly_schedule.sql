set check_function_bodies = off;

create or replace function public.invoke_refresh_fuel_prices()
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_invoke_secret text;
  v_function_url text;
  v_fuel_price_api_key text;
begin
  select decrypted_secret
    into v_invoke_secret
  from vault.decrypted_secrets
  where name = 'FUEL_PRICE_INVOKE_SECRET'
  limit 1;

  if v_invoke_secret is null then
    raise exception 'FUEL_PRICE_INVOKE_SECRET not found in vault';
  end if;

  select decrypted_secret
    into v_function_url
  from vault.decrypted_secrets
  where name = 'REFRESH_FUEL_PRICES_FUNCTION_URL'
  limit 1;

  if v_function_url is null then
    raise exception 'REFRESH_FUEL_PRICES_FUNCTION_URL not found in vault';
  end if;

  select decrypted_secret
    into v_fuel_price_api_key
  from vault.decrypted_secrets
  where name = 'FUEL_PRICE_API_KEY'
  limit 1;

  if v_fuel_price_api_key is null then
    raise exception 'FUEL_PRICE_API_KEY not found in vault';
  end if;

  perform net.http_post(
    url := v_function_url,
    headers := jsonb_build_object(
      'x-invoke-secret', v_invoke_secret,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
end;
$function$;

do $do$
declare
  v_existing_job_id bigint;
  v_job record;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise exception 'pg_cron extension is required for refresh-fuel-prices scheduling';
  end if;

  for v_job in
    select jobid
    from cron.job
    where jobname = 'refresh-fuel-prices-hourly'
       or command ilike '%invoke_refresh_fuel_prices%'
  loop
    perform cron.unschedule(v_job.jobid);
  end loop;

  select jobid
    into v_existing_job_id
  from cron.job
  where jobname = 'refresh-fuel-prices-hourly'
  limit 1;

  if v_existing_job_id is not null then
    perform cron.unschedule(v_existing_job_id);
  end if;

  perform cron.schedule(
    'refresh-fuel-prices-hourly',
    '10 * * * *',
    $job$select public.invoke_refresh_fuel_prices();$job$
  );
end;
$do$;
