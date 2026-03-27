-- Unify Noctua + Vibilia profile model:
-- - keep one shared profile table: public.profiles
-- - keep one signup trigger: on_auth_user_created -> handle_new_user_profile

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS preferred_fuel_type TEXT DEFAULT 'E10';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) THEN
    UPDATE public.profiles p
    SET preferred_fuel_type = COALESCE(up.preferred_fuel_type, p.preferred_fuel_type, 'E10')
    FROM public.user_profiles up
    WHERE p.id = up.id
      AND (p.preferred_fuel_type IS NULL OR p.preferred_fuel_type = 'E10');
  END IF;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created_vibilia_profile ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_vibilia_user_profile();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) THEN
    DROP POLICY IF EXISTS "Users can manage their own profiles" ON public.user_profiles;
    DROP TABLE IF EXISTS public.user_profiles;
  END IF;
END $$;

UPDATE public.profiles
SET preferred_fuel_type = 'E10'
WHERE preferred_fuel_type IS NULL;
