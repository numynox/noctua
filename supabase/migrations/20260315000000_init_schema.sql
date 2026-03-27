-- Create fuel_stations table
CREATE TABLE fuel_stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    brand TEXT,
    street TEXT,
    place TEXT,
    lat FLOAT8,
    lng FLOAT8,
    house_number TEXT,
    post_code TEXT,
    opening_times JSONB,
    overrides JSONB,
    whole_day BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create fuel_prices table
CREATE TABLE fuel_prices (
    id BIGSERIAL PRIMARY KEY,
    station_id UUID REFERENCES fuel_stations(id) ON DELETE CASCADE,
    fuel_type TEXT NOT NULL, -- E5, E10, Diesel, etc.
    price NUMERIC(5, 3) NOT NULL,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cars table
CREATE TABLE cars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create car_access table (for sharing)
CREATE TABLE car_access (
    car_id UUID REFERENCES cars(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    PRIMARY KEY (car_id, user_id)
);

-- Create refuel_events table
CREATE TABLE refuel_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    car_id UUID REFERENCES cars(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    mileage INTEGER NOT NULL,
    liters NUMERIC(6, 2) NOT NULL,
    total_price NUMERIC(7, 2) NOT NULL,
    price_per_liter NUMERIC(5, 3) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE fuel_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE refuel_events ENABLE ROW LEVEL SECURITY;

-- Basic Policies (Public read for stations/prices for now, authenticated for others)
CREATE POLICY "Public read fuel_stations" ON fuel_stations FOR SELECT USING (true);
CREATE POLICY "Public read fuel_prices" ON fuel_prices FOR SELECT USING (true);

CREATE POLICY "Users can manage their own cars" ON cars 
    FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Users can access shared cars" ON cars
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM car_access 
            WHERE car_access.car_id = cars.id AND car_access.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view refuel events for accessible cars" ON refuel_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM cars WHERE id = car_id AND (owner_id = auth.uid() OR EXISTS (
                SELECT 1 FROM car_access WHERE car_id = cars.id AND user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Users can add refuel events for accessible cars" ON refuel_events
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM cars WHERE id = car_id AND (owner_id = auth.uid() OR EXISTS (
                SELECT 1 FROM car_access WHERE car_id = cars.id AND user_id = auth.uid()
            ))
        )
    );
