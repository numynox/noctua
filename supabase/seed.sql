INSERT INTO "public"."feeds" ("id", "created_at", "name", "url", "enabled", "filter") VALUES ('1', '2026-02-08 20:30:40.452463+00', 'Heise', 'https://www.heise.de/rss/heise-atom.xml', 'true', '{"exclude_keywords_title":["heise+","heise-Angebot:"]}'), ('2', '2026-02-08 20:31:05.158116+00', 'Caschy''s Blog', 'http://stadt-bremerhaven.de/feed', 'true', null), ('3', '2026-02-08 20:31:43.163993+00', 'Tagesschau Meldungen', 'https://www.tagesschau.de/infoservices/alle-meldungen-100~rss2.xml', 'true', null), ('4', '2026-02-08 20:32:05.133937+00', 'OMG Ubuntu', 'https://omgubuntu.co.uk/feed', 'true', null);

INSERT INTO public.profiles (id, full_name, email, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Example User', 'user@example.com', now());

INSERT INTO public.sections (id, created_at, title, icon, user_id)
VALUES (1, now(), 'News', '🗞️', '00000000-0000-0000-0000-000000000001'),
	(2, now(), 'Tech', '💻', '00000000-0000-0000-0000-000000000001');

INSERT INTO public.sections_feeds (section_id, feed_id, created_at)
VALUES (1, 1, now()),
	(1, 3, now()),
    (2, 1, now()),
    (2, 2, now()),
    (2, 4, now());