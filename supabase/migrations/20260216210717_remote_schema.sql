set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.invoke_fetch_rss()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_secret text;
begin
  select decrypted_secret
    into v_secret
  from vault.decrypted_secrets
  where name = 'FETCH_RSS_INVOKE_SECRET'
  limit 1;

  if v_secret is null then
    raise exception 'FETCH_RSS_INVOKE_SECRET not found in vault';
  end if;

  perform net.http_post(
    url := 'https://tnirrxwmgscbxpbdepmz.supabase.co/functions/v1/fetch-rss',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_secret,
      'Content-Type', 'application/json'
    ),
    body := '{"name":"Functions"}'::jsonb
  );
end;
$function$
;


