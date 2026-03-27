-- Update cars table
ALTER TABLE cars ADD COLUMN tank_capacity NUMERIC(5, 2);

-- Update refuel_events table
ALTER TABLE refuel_events ADD COLUMN fuel_level_after NUMERIC(5, 2);
ALTER TABLE refuel_events RENAME COLUMN price_per_liter TO price_per_liter_calculated; -- optional cleanup if derived

-- Store Vibilia preference on shared profile table used by both apps
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS preferred_fuel_type TEXT DEFAULT 'E10';

UPDATE public.profiles
SET preferred_fuel_type = 'E10'
WHERE preferred_fuel_type IS NULL;
