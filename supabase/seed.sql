INSERT INTO "public"."feeds" ("id", "created_at", "name", "url", "enabled", "filter", "icon") VALUES ('1', '2026-02-08 20:30:40.452463+00', 'Heise', 'https://www.heise.de/rss/heise-atom.xml', 'true', '{"exclude_keywords_title":["heise+","heise-Angebot:"]}', 'https://www.heise.de/favicon.ico'), ('2', '2026-02-08 20:31:05.158116+00', 'Caschy''s Blog', 'http://stadt-bremerhaven.de/feed', 'true', null, 'http://stadt-bremerhaven.de/favicon.ico'), ('3', '2026-02-08 20:31:43.163993+00', 'Tagesschau', 'https://www.tagesschau.de/infoservices/alle-meldungen-100~rss2.xml', 'true', null, 'https://www.tagesschau.de/favicon.ico'), ('4', '2026-02-08 20:32:05.133937+00', 'OMG Ubuntu', 'https://omgubuntu.co.uk/feed', 'true', null, 'https://omgubuntu.co.uk/favicon.ico'), ('5', '2026-02-22 10:18:35.033984+00', 'ZDF Heute', 'https://www.zdf.de/rss/zdf/nachrichten', 'true', '{"exclude_keywords_title":["Bundesliga","Lottozahlen","Aktuelle Pressemitteilungen des ZDF","Schlagzeilen"]}', 'https://www.zdf.de/favicon.ico'), ('6', '2026-02-22 10:20:37.14556+00', 'Ars Technica', 'https://feeds.arstechnica.com/arstechnica/index', 'true', null, 'https://arstechnica.com/favicon.ico'), ('7', '2026-02-22 10:23:29.899968+00', 'Rest of World', 'https://restofworld.org/feed/latest', 'true', null, 'https://restofworld.org/wp-content/themes/orbis/static-assets/media/favicon-32.png');

-- Seed Fuel Stations
INSERT INTO fuel_stations (id, name, brand, street, house_number, post_code, place, lat, lng, whole_day)
VALUES 
	('24a381e3-0d72-416d-bfd8-b2f65f6e5802', 'Esso Tankstelle', 'ESSO', 'HAUPTSTR. 7', ' ', '84152', 'MENGKOFEN', 48.72210601, 12.44438439, false),
	('60c0eefa-d2a8-4f5c-82cc-b5244ecae955', 'Shell Station', 'SHELL', 'Münchner Str. 1', '1', '80331', 'München', 48.1351, 11.5820, true),
	('4429a7d9-fb2d-4c29-8cfe-2ca90323f9f8', 'Aral Tankstelle', 'ARAL', 'Berliner Str. 50', '50', '10115', 'Berlin', 52.5200, 13.4050, true);

-- Seed some historical prices for the last 72 hours
-- Generate series of timestamps and randomized prices
INSERT INTO fuel_prices (station_id, fuel_type, price, checked_at)
SELECT 
	s.id,
	f.type,
	1.40 + (random() * 0.20),
	now() - (interval '1 hour' * hour)
FROM 
	fuel_stations s,
	(VALUES ('E5'), ('E10'), ('Diesel')) f(type),
	generate_series(0, 72) AS hour;