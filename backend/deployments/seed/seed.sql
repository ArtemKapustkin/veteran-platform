-- Veteran Platform — demo seed data.
-- Idempotent: safe to re-run. Use `make seed`.
-- Phones use the +38050000000X range so they don't collide with real numbers.
--
-- All events live in Kyiv at real, recognisable venues with accurate
-- coordinates so the map renders pins where you'd expect. Districts use
-- the transliterated slugs from `KyivDistrict` in the OpenAPI schema.

BEGIN;

-- ─────────────────────────── Veterans ───────────────────────────
-- 15 demo accounts: 1 admin + 14 veterans. Mix of verified/unverified,
-- different audience statuses (male/female/family/active military) and a
-- spread of interests so the recommendation/filter UIs have variety.

INSERT INTO vp.veterans (id, phone, fullname, brigade, rank, audience_status, city, interests, verified, verification_status, role, account_status)
VALUES
  ('11111111-1111-1111-1111-111111111111', '+380500000001', 'Адмін Адмінович',     NULL,             NULL,                 'other',           'Київ', '{}',                              true,  'approved', 'admin',   'active'),
  ('22222222-2222-2222-2222-222222222222', '+380500000002', 'Іван Петренко',        '95-та ОДШБр',    'Сержант',            'veteran',         'Київ', '{sport,psychology,social}',       true,  'approved', 'veteran', 'active'),
  ('33333333-3333-3333-3333-333333333333', '+380500000003', 'Олена Шевченко',       '93-тя ОМБр',     'Молодший лейтенант', 'veteran_female',  'Київ', '{yoga,culture,nature}',           true,  'approved', 'veteran', 'active'),
  ('44444444-4444-4444-4444-444444444444', '+380500000004', 'Микола Коваль',        '47-ма ОМБр',     'Старший солдат',     'veteran',         'Київ', '{sport,rehabilitation}',          false, 'none',     'veteran', 'active'),
  ('55555555-5555-5555-5555-555555555555', '+380500000005', 'Марія Ковальчук',      NULL,             NULL,                 'family',          'Київ', '{social,psychology,education}',   false, 'none',     'veteran', 'active'),
  ('66666666-6666-6666-6666-666666666666', '+380500000006', 'Андрій Бойко',         '92-га ОМБр',     'Капрал',             'veteran',         'Київ', '{spa,psychology,rehabilitation}', true,  'approved', 'veteran', 'active'),
  ('77777777-7777-7777-7777-777777777777', '+380500000007', 'Сергій Тарасенко',     '3-тя ОШБр',      'Старший сержант',    'veteran',         'Київ', '{sport,social,education}',        true,  'approved', 'veteran', 'active'),
  ('88888888-8888-8888-8888-888888888888', '+380500000008', 'Юрій Лисенко',         '128-ма ОГШБр',   'Молодший сержант',   'veteran',         'Київ', '{nature,rehabilitation,sport}',   true,  'approved', 'veteran', 'active'),
  ('99999999-9999-9999-9999-999999999999', '+380500000009', 'Ірина Романчук',       '53-тя ОМБр',     'Лейтенант',          'veteran_female',  'Київ', '{yoga,spa,culture}',              true,  'approved', 'veteran', 'active'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '+380500000010', 'Павло Демʼяненко',     '24-та ОМБр',     'Прапорщик',          'veteran',         'Київ', '{education,psychology,social}',   true,  'approved', 'veteran', 'active'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '+380500000011', 'Наталія Костенко',     '30-та ОМБр',     'Молодший сержант',   'veteran_female',  'Київ', '{yoga,spa,nature}',               true,  'approved', 'veteran', 'active'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '+380500000012', 'Тарас Левченко',       '79-та ОДШБр',    'Старший лейтенант',  'active_military', 'Київ', '{sport,education,rehabilitation}',true,  'approved', 'veteran', 'active'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '+380500000013', 'Оксана Литвин',        NULL,             NULL,                 'family',          'Київ', '{social,psychology}',             false, 'none',     'veteran', 'active'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '+380500000014', 'Катерина Білоус',      '14-та ОМБр',     'Сержант',            'veteran_female',  'Київ', '{culture,social,psychology}',     true,  'approved', 'veteran', 'active'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '+380500000015', 'Богдан Гончар',        '72-га ОМБр',     'Солдат',             'veteran',         'Київ', '{sport}',                         false, 'processing','veteran','active'),
  ('a1111111-1111-1111-1111-111111111111', '+380500000016', 'Олександр Мельник',    '128-ма ОГШБр',   'Сержант',            'veteran',         'Київ', '{rehabilitation,social}',         false, 'pending_review','veteran','active'),
  ('a2222222-2222-2222-2222-222222222222', '+380500000017', 'Світлана Гайдамака',   NULL,             NULL,                 'fallen_family',   'Київ', '{psychology,social}',             false, 'pending_review','veteran','active'),
  ('a3333333-3333-3333-3333-333333333333', '+380500000018', 'Дмитро Захарчук',      '36-та ОБрМП',    'Старшина',           'veteran',         'Київ', '{sport,nature}',                  false, 'pending_review','veteran','active')
ON CONFLICT (id) DO UPDATE SET
  phone               = EXCLUDED.phone,
  fullname            = EXCLUDED.fullname,
  brigade             = EXCLUDED.brigade,
  rank                = EXCLUDED.rank,
  audience_status     = EXCLUDED.audience_status,
  city                = EXCLUDED.city,
  interests           = EXCLUDED.interests,
  verified            = EXCLUDED.verified,
  verification_status = EXCLUDED.verification_status,
  role                = EXCLUDED.role,
  account_status      = EXCLUDED.account_status,
  updated_at          = now();

-- ─────────────────────────── Communities ───────────────────────────

INSERT INTO vp.communities (id, name, tg_channel_link, owner_id)
VALUES
  ('a0000001-0000-0000-0000-000000000001', 'CS2 побратими',         'https://t.me/cs2vets',    '22222222-2222-2222-2222-222222222222'),
  ('a0000002-0000-0000-0000-000000000002', 'Йога-практики',         'https://t.me/yogavets',   '33333333-3333-3333-3333-333333333333'),
  ('a0000003-0000-0000-0000-000000000003', 'Риболовля для своїх',   'https://t.me/fishvets',   '22222222-2222-2222-2222-222222222222'),
  ('a0000004-0000-0000-0000-000000000004', '95-та бригада',         'https://t.me/95brigade',  '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE SET
  name            = EXCLUDED.name,
  tg_channel_link = EXCLUDED.tg_channel_link,
  owner_id        = EXCLUDED.owner_id,
  updated_at      = now(),
  deleted_at      = NULL;

-- ─────────────────────────── Events ───────────────────────────
-- Distribution across districts (8/10 covered) so the filter chips have
-- something to bite on. Coordinates are real Kyiv venues so the map
-- renders pins where they'd be in real life.

INSERT INTO vp.events (
  id, category, status, title, description, quota, starts_at, ends_at,
  format, repeat, for_whom, cost_tier, cost_price_uah, cost_veteran_price_uah,
  accessibility_tags, verified_only, community_id,
  location_city, location_district, location_address, location_venue,
  location_lat, location_lng,
  cover_image_url, created_by_role, created_by_id
) VALUES
  ('e0000001-0000-0000-0000-000000000001', 'sport',          'published',
   'Ранкова пробіжка для побратимів',
   'Зустрічаємось щонеділі о 7:00, біг 5 км у комфортному темпі.',
   20, '2026-06-15 07:00:00+00', '2026-06-15 09:00:00+00',
   'offline', 'weekly', 'veterans', 'free_for_all', NULL, NULL,
   '{kids_allowed,shelter_nearby}', false, NULL,
   'Київ', 'darnytskyi', 'Парк ''Партизанської слави''', NULL,
   50.4214, 30.6328,
   NULL, 'admin', '11111111-1111-1111-1111-111111111111'),

  ('e0000002-0000-0000-0000-000000000002', 'yoga',           'published',
   'Йога на світанку у Шевченківському парку',
   'Спокійна практика на свіжому повітрі для відновлення.',
   15, '2026-06-20 06:30:00+00', '2026-06-20 08:00:00+00',
   'offline', 'weekly', 'veterans', 'free_for_veterans_and_families', NULL, NULL,
   '{kids_allowed,is_accessible}', false, 'a0000002-0000-0000-0000-000000000002',
   'Київ', 'shevchenkivskyi', 'парк Тараса Шевченка, бул. Шевченка', NULL,
   50.4419, 30.5128,
   NULL, 'veteran', '33333333-3333-3333-3333-333333333333'),

  ('e0000003-0000-0000-0000-000000000003', 'psychology',     'published',
   'Групова терапія для УБД',
   'Безпечний простір для розмови з кваліфікованим психологом.',
   10, '2026-06-18 18:00:00+00', '2026-06-18 20:00:00+00',
   'offline', 'biweekly', 'veterans', 'free_for_ubd', NULL, NULL,
   '{no_shooting,shelter_nearby,is_accessible}', true, NULL,
   'Київ', 'shevchenkivskyi', 'вул. Хрещатик, 22', 'Veteran Hub',
   50.4477, 30.5223,
   NULL, 'admin', '11111111-1111-1111-1111-111111111111'),

  ('e0000004-0000-0000-0000-000000000004', 'culture',        'published',
   'Похід в Театр Франка',
   'Колективний вихід на виставу зі знижкою для ветеранів.',
   30, '2026-06-25 19:00:00+00', '2026-06-25 22:00:00+00',
   'offline', 'once', 'veterans_and_families', 'discount_for_veterans', 350.00, 100.00,
   '{is_accessible,kids_allowed}', false, NULL,
   'Київ', 'shevchenkivskyi', 'площа Івана Франка, 3', 'Театр ім. Івана Франка',
   50.4451, 30.5246,
   NULL, 'veteran', '33333333-3333-3333-3333-333333333333'),

  ('e0000005-0000-0000-0000-000000000005', 'education',      'published',
   'Курс цифрової грамотності у КПІ',
   'Базові навички роботи з ноутбуком, поштою, держпослугами.',
   25, '2026-07-01 17:00:00+00', '2026-07-01 19:00:00+00',
   'offline', 'weekly', 'open', 'free_via_state_program', NULL, NULL,
   '{is_accessible,kids_allowed}', false, NULL,
   'Київ', 'solomianskyi', 'просп. Берестейський, 37', 'КПІ ім. Ігоря Сікорського',
   50.4500, 30.4596,
   NULL, 'admin', '11111111-1111-1111-1111-111111111111'),

  ('e0000006-0000-0000-0000-000000000006', 'nature',         'published',
   'Прогулянка Голосіївським лісом',
   'Денний похід для досвідчених. 8 км маршруту з зупинками.',
   12, '2026-07-12 09:00:00+00', '2026-07-12 15:00:00+00',
   'offline', 'once', 'veterans', 'free_for_all', NULL, NULL,
   '{shelter_nearby,age_18_plus}', true, NULL,
   'Київ', 'holosiivskyi', 'просп. Академіка Глушкова, 1', 'Голосіївський парк',
   50.3676, 30.5025,
   NULL, 'veteran', '33333333-3333-3333-3333-333333333333'),

  ('e0000007-0000-0000-0000-000000000007', 'social',         'published',
   'Зустріч ветеранів 47-ї ОМБр',
   'Кава, спогади, обмін контактами. Без фото-відеозйомки.',
   40, '2026-06-22 14:00:00+00', '2026-06-22 17:00:00+00',
   'offline', 'monthly', 'veterans', 'free_for_all', NULL, NULL,
   '{no_shooting,shelter_nearby}', false, NULL,
   'Київ', 'podilskyi', 'вул. Спаська, 12', 'Кафе ''Своя кава''',
   50.4595, 30.5167,
   NULL, 'veteran', '44444444-4444-4444-4444-444444444444'),

  ('e0000008-0000-0000-0000-000000000008', 'spa',            'published',
   'Спа-день для захисниць',
   'Програма для жінок-ветеранок: масаж, басейн, тиха зона.',
   8, '2026-06-29 11:00:00+00', '2026-06-29 17:00:00+00',
   'offline', 'monthly', 'female_veterans', 'free_for_veterans_and_families', NULL, NULL,
   '{separate_zones,is_accessible}', true, NULL,
   'Київ', 'pecherskyi', 'вул. Лаврська, 1', 'Спа-комплекс ''Печерська''',
   50.4350, 30.5575,
   NULL, 'admin', '11111111-1111-1111-1111-111111111111'),

  ('e0000009-0000-0000-0000-000000000009', 'rehabilitation', 'published',
   'Реабілітація через біг — Парк Перемоги',
   'Адаптована програма бігу для ветеранів з протезами.',
   10, '2026-06-19 10:00:00+00', '2026-06-19 12:00:00+00',
   'offline', 'weekly', 'veterans', 'free_via_state_program', NULL, NULL,
   '{is_accessible,shelter_nearby,no_shooting}', true, NULL,
   'Київ', 'dniprovskyi', 'Парк Перемоги, просп. Юрія Гагаріна', NULL,
   50.4523, 30.5765,
   NULL, 'veteran', '66666666-6666-6666-6666-666666666666'),

  ('e000000a-0000-0000-0000-00000000000a', 'social',         'pending_approval',
   'Зустрічі побратимів на Оболоні',
   'Регулярні зустрічі по середах у дружньому колі біля озера.',
   25, '2026-07-08 18:00:00+00', '2026-07-08 21:00:00+00',
   'offline', 'weekly', 'veterans', 'free_for_all', NULL, NULL,
   '{shelter_nearby,kids_allowed}', false, NULL,
   'Київ', 'obolonskyi', 'просп. Героїв Сталінграда, 10А', 'Парк Дружби народів',
   50.5126, 30.5023,
   NULL, 'veteran', '44444444-4444-4444-4444-444444444444'),

  ('e000000b-0000-0000-0000-00000000000b', 'yoga',           'pending_approval',
   'Йога в парку Нивки',
   'Щотижневі ранкові сесії на траві. Килимки видаємо.',
   50, '2026-07-05 08:00:00+00', '2026-07-05 09:30:00+00',
   'offline', 'weekly', 'open', 'free_for_all', NULL, NULL,
   '{kids_allowed,is_accessible}', false, 'a0000002-0000-0000-0000-000000000002',
   'Київ', 'sviatoshynskyi', 'парк Нивки, вул. Стеценка', NULL,
   50.4633, 30.4108,
   NULL, 'veteran', '33333333-3333-3333-3333-333333333333'),

  ('e000000c-0000-0000-0000-00000000000c', 'culture',        'published',
   'Кінопоказ ''20 днів у Маріуполі''',
   'Спільний перегляд із обговоренням після показу.',
   60, '2026-07-15 19:30:00+00', '2026-07-15 22:00:00+00',
   'offline', 'once', 'open', 'free_for_all', NULL, NULL,
   '{kids_allowed,shelter_nearby,age_18_plus}', false, NULL,
   'Київ', 'podilskyi', 'Андріївський узвіз, 26', 'Кінотеатр ''Жовтень''',
   50.4630, 30.5167,
   NULL, 'admin', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE SET
  category               = EXCLUDED.category,
  status                 = EXCLUDED.status,
  title                  = EXCLUDED.title,
  description            = EXCLUDED.description,
  quota                  = EXCLUDED.quota,
  starts_at              = EXCLUDED.starts_at,
  ends_at                = EXCLUDED.ends_at,
  format                 = EXCLUDED.format,
  repeat                 = EXCLUDED.repeat,
  for_whom               = EXCLUDED.for_whom,
  cost_tier              = EXCLUDED.cost_tier,
  cost_price_uah         = EXCLUDED.cost_price_uah,
  cost_veteran_price_uah = EXCLUDED.cost_veteran_price_uah,
  accessibility_tags     = EXCLUDED.accessibility_tags,
  verified_only          = EXCLUDED.verified_only,
  community_id           = EXCLUDED.community_id,
  location_city          = EXCLUDED.location_city,
  location_district      = EXCLUDED.location_district,
  location_address       = EXCLUDED.location_address,
  location_venue         = EXCLUDED.location_venue,
  location_lat           = EXCLUDED.location_lat,
  location_lng           = EXCLUDED.location_lng,
  cover_image_url        = EXCLUDED.cover_image_url,
  created_by_role        = EXCLUDED.created_by_role,
  created_by_id          = EXCLUDED.created_by_id,
  updated_at             = now();

-- ─────────────────────────── Registrations ───────────────────────────
-- Pre-populated so each event shows realistic attendance ("X ветеранів
-- уже йдуть") and the SeatBar/CounterBlock have something to render.
--
-- Idempotency: we wipe only the registrations created by the seeded
-- veteran IDs (so any registrations made via the live API by a real test
-- user are preserved) and re-insert from scratch with fresh UUIDs. The
-- denormalized `events.seats_taken` counter is recomputed from the
-- registrations table at the end so it stays consistent.
--
-- Verified-only events (e3, e6, e8, e9) only receive verified veterans.
-- The female-only event (e8) only receives veteran_female accounts.

DELETE FROM vp.registration_companions
WHERE registration_id IN (
  SELECT id FROM vp.registrations
  WHERE veteran_id IN (
    '11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333','44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555','66666666-6666-6666-6666-666666666666',
    '77777777-7777-7777-7777-777777777777','88888888-8888-8888-8888-888888888888',
    '99999999-9999-9999-9999-999999999999','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','cccccccc-cccc-cccc-cccc-cccccccccccc',
    'dddddddd-dddd-dddd-dddd-dddddddddddd','eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'ffffffff-ffff-ffff-ffff-ffffffffffff'
  )
);

DELETE FROM vp.registrations
WHERE veteran_id IN (
  '11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333','44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555','66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777','88888888-8888-8888-8888-888888888888',
  '99999999-9999-9999-9999-999999999999','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','cccccccc-cccc-cccc-cccc-cccccccccccc',
  'dddddddd-dddd-dddd-dddd-dddddddddddd','eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'ffffffff-ffff-ffff-ffff-ffffffffffff'
);

INSERT INTO vp.registrations (id, event_id, veteran_id, seats, status, confirmed_at, created_at, updated_at)
SELECT
  gen_random_uuid(),
  event_id::uuid,
  veteran_id::uuid,
  1,
  'confirmed'::vp.registration_status,
  now() - (random() * interval '5 days'),
  now() - (random() * interval '5 days'),
  now()
FROM (VALUES
  -- e1 sport · Парк Партизанської слави · 9 going / 20
  ('e0000001-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222'),
  ('e0000001-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444'),
  ('e0000001-0000-0000-0000-000000000001', '66666666-6666-6666-6666-666666666666'),
  ('e0000001-0000-0000-0000-000000000001', '77777777-7777-7777-7777-777777777777'),
  ('e0000001-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888'),
  ('e0000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('e0000001-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  ('e0000001-0000-0000-0000-000000000001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
  ('e0000001-0000-0000-0000-000000000001', 'ffffffff-ffff-ffff-ffff-ffffffffffff'),

  -- e2 yoga · парк Шевченка · 8 going / 15
  ('e0000002-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333'),
  ('e0000002-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555'),
  ('e0000002-0000-0000-0000-000000000002', '66666666-6666-6666-6666-666666666666'),
  ('e0000002-0000-0000-0000-000000000002', '99999999-9999-9999-9999-999999999999'),
  ('e0000002-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  ('e0000002-0000-0000-0000-000000000002', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  ('e0000002-0000-0000-0000-000000000002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
  ('e0000002-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222'),

  -- e3 psychology (verified-only) · Veteran Hub · 6 going / 10
  ('e0000003-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222'),
  ('e0000003-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333'),
  ('e0000003-0000-0000-0000-000000000003', '66666666-6666-6666-6666-666666666666'),
  ('e0000003-0000-0000-0000-000000000003', '77777777-7777-7777-7777-777777777777'),
  ('e0000003-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('e0000003-0000-0000-0000-000000000003', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),

  -- e4 culture · Театр Франка · 10 going / 30 (+ 1 group reg of 3 inserted below)
  ('e0000004-0000-0000-0000-000000000004', '33333333-3333-3333-3333-333333333333'),
  ('e0000004-0000-0000-0000-000000000004', '44444444-4444-4444-4444-444444444444'),
  ('e0000004-0000-0000-0000-000000000004', '55555555-5555-5555-5555-555555555555'),
  ('e0000004-0000-0000-0000-000000000004', '66666666-6666-6666-6666-666666666666'),
  ('e0000004-0000-0000-0000-000000000004', '77777777-7777-7777-7777-777777777777'),
  ('e0000004-0000-0000-0000-000000000004', '88888888-8888-8888-8888-888888888888'),
  ('e0000004-0000-0000-0000-000000000004', '99999999-9999-9999-9999-999999999999'),
  ('e0000004-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('e0000004-0000-0000-0000-000000000004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  ('e0000004-0000-0000-0000-000000000004', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),

  -- e5 education · КПІ · 4 going / 25 (lots of room — quiet event)
  ('e0000005-0000-0000-0000-000000000005', '55555555-5555-5555-5555-555555555555'),
  ('e0000005-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('e0000005-0000-0000-0000-000000000005', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  ('e0000005-0000-0000-0000-000000000005', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),

  -- e6 nature (verified-only) · Голосіївський ліс · 9 going / 12 (almost full)
  ('e0000006-0000-0000-0000-000000000006', '22222222-2222-2222-2222-222222222222'),
  ('e0000006-0000-0000-0000-000000000006', '33333333-3333-3333-3333-333333333333'),
  ('e0000006-0000-0000-0000-000000000006', '66666666-6666-6666-6666-666666666666'),
  ('e0000006-0000-0000-0000-000000000006', '77777777-7777-7777-7777-777777777777'),
  ('e0000006-0000-0000-0000-000000000006', '88888888-8888-8888-8888-888888888888'),
  ('e0000006-0000-0000-0000-000000000006', '99999999-9999-9999-9999-999999999999'),
  ('e0000006-0000-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('e0000006-0000-0000-0000-000000000006', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  ('e0000006-0000-0000-0000-000000000006', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),

  -- e7 social · Зустріч 47-ї ОМБр · 14 going / 40 (broad audience)
  ('e0000007-0000-0000-0000-000000000007', '22222222-2222-2222-2222-222222222222'),
  ('e0000007-0000-0000-0000-000000000007', '33333333-3333-3333-3333-333333333333'),
  ('e0000007-0000-0000-0000-000000000007', '44444444-4444-4444-4444-444444444444'),
  ('e0000007-0000-0000-0000-000000000007', '55555555-5555-5555-5555-555555555555'),
  ('e0000007-0000-0000-0000-000000000007', '66666666-6666-6666-6666-666666666666'),
  ('e0000007-0000-0000-0000-000000000007', '77777777-7777-7777-7777-777777777777'),
  ('e0000007-0000-0000-0000-000000000007', '88888888-8888-8888-8888-888888888888'),
  ('e0000007-0000-0000-0000-000000000007', '99999999-9999-9999-9999-999999999999'),
  ('e0000007-0000-0000-0000-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('e0000007-0000-0000-0000-000000000007', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  ('e0000007-0000-0000-0000-000000000007', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  ('e0000007-0000-0000-0000-000000000007', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  ('e0000007-0000-0000-0000-000000000007', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
  ('e0000007-0000-0000-0000-000000000007', 'ffffffff-ffff-ffff-ffff-ffffffffffff'),

  -- e8 spa (verified + female only) · 4 going / 8
  ('e0000008-0000-0000-0000-000000000008', '33333333-3333-3333-3333-333333333333'),
  ('e0000008-0000-0000-0000-000000000008', '99999999-9999-9999-9999-999999999999'),
  ('e0000008-0000-0000-0000-000000000008', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  ('e0000008-0000-0000-0000-000000000008', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),

  -- e9 rehabilitation (verified-only) · Парк Перемоги · 3 going / 10
  ('e0000009-0000-0000-0000-000000000009', '22222222-2222-2222-2222-222222222222'),
  ('e0000009-0000-0000-0000-000000000009', '66666666-6666-6666-6666-666666666666'),
  ('e0000009-0000-0000-0000-000000000009', '88888888-8888-8888-8888-888888888888'),

  -- e000000c culture · Кінопоказ Жовтень · 14 going / 60 (will trend)
  ('e000000c-0000-0000-0000-00000000000c', '22222222-2222-2222-2222-222222222222'),
  ('e000000c-0000-0000-0000-00000000000c', '33333333-3333-3333-3333-333333333333'),
  ('e000000c-0000-0000-0000-00000000000c', '44444444-4444-4444-4444-444444444444'),
  ('e000000c-0000-0000-0000-00000000000c', '55555555-5555-5555-5555-555555555555'),
  ('e000000c-0000-0000-0000-00000000000c', '66666666-6666-6666-6666-666666666666'),
  ('e000000c-0000-0000-0000-00000000000c', '77777777-7777-7777-7777-777777777777'),
  ('e000000c-0000-0000-0000-00000000000c', '88888888-8888-8888-8888-888888888888'),
  ('e000000c-0000-0000-0000-00000000000c', '99999999-9999-9999-9999-999999999999'),
  ('e000000c-0000-0000-0000-00000000000c', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('e000000c-0000-0000-0000-00000000000c', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  ('e000000c-0000-0000-0000-00000000000c', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  ('e000000c-0000-0000-0000-00000000000c', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  ('e000000c-0000-0000-0000-00000000000c', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
  ('e000000c-0000-0000-0000-00000000000c', 'ffffffff-ffff-ffff-ffff-ffffffffffff')
) AS t(event_id, veteran_id);

-- One pending-companions group registration on e4 (Театр Франка) so the
-- "запросив 2 побратимів — чекаємо їхнього підтвердження" UX has data.
-- 22222222 (Іван) is the group creator; 2 invited phones are unbound to
-- existing accounts until those phones sign in via OTP.
WITH new_group AS (
  INSERT INTO vp.registrations
    (id, event_id, veteran_id, seats, status, reservation_expires_at, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    'e0000004-0000-0000-0000-000000000004'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    3,
    'pending_companions'::vp.registration_status,
    now() + interval '20 hours',
    now() - interval '4 hours',
    now()
  )
  RETURNING id
)
INSERT INTO vp.registration_companions (id, registration_id, phone, invite_token, fullname, status, created_at)
SELECT
  gen_random_uuid(),
  nr.id,
  phone,
  -- URL-safe base64 token, padding stripped to match what
  -- backend/internal/service/application/registration_service.go emits.
  rtrim(translate(encode(gen_random_bytes(18), 'base64'), '+/', '-_'), '='),
  NULL,
  'pending'::vp.companion_status,
  now() - interval '4 hours'
FROM new_group nr,
     (VALUES ('+380500000099'), ('+380500000098')) AS p(phone);

-- Recompute the denormalized counter from the registrations table so it
-- always matches what /events?... will return. Counts confirmed seats AND
-- reserved seats from pending_companions groups.
UPDATE vp.events e
SET seats_taken = COALESCE((
  SELECT SUM(seats)
  FROM vp.registrations
  WHERE event_id = e.id
    AND status IN ('confirmed', 'pending_companions')
), 0),
updated_at = now();

-- ─────────────────────── Verification attempts ───────────────────────
-- Mock AI verdicts for the three pending_review veterans so the admin
-- queue has realistic data: one unreadable photo, one no_match (extracted
-- name didn't line up with the profile), and one upstream AI error.

INSERT INTO vp.verification_attempts (
  id, veteran_id, document_type, submitted_at, decision, confidence,
  extracted_name, extracted_id, notes, decided_at, decided_by
) VALUES
  ('b1111111-1111-1111-1111-111111111111',
   'a1111111-1111-1111-1111-111111111111',
   'ubd_paper', now() - interval '2 days',
   'unreadable', 0.12,
   NULL, NULL,
   'Зображення розмите, не вдалося розпізнати ані ПІБ, ані номер посвідчення. Рекомендуємо перезняти на рівній поверхні при денному світлі.',
   now() - interval '2 days', 'ai'),

  ('b2222222-2222-2222-2222-222222222222',
   'a2222222-2222-2222-2222-222222222222',
   'family_fallen', now() - interval '1 day',
   'no_match', 0.41,
   'С. О. Гайдамака', NULL,
   'Розпізнане імʼя на документі (ініціали + прізвище) не повністю співпадає з повним ПІБ у профілі. Можливо, документ оформлений на скорочене імʼя — потрібна перевірка людиною.',
   now() - interval '1 day', 'ai'),

  ('b3333333-3333-3333-3333-333333333333',
   'a3333333-3333-3333-3333-333333333333',
   'reestr_extract', now() - interval '6 hours',
   'unreadable', 0.0,
   NULL, NULL,
   'AI verification failed: openai vision timeout after 30s. Please try again or escalate to admin review.',
   now() - interval '6 hours', 'ai')
ON CONFLICT (id) DO NOTHING;

COMMIT;

\echo ''
\echo 'Seeded:'
\echo '  18 veterans (1 admin, 9 verified, 5 unverified, 3 pending admin review) — all in Київ'
\echo '  3 verification attempts mocking AI failure modes (unreadable, no_match, upstream error)'
\echo '  4 communities'
\echo '  12 events in Київ across 8 districts (10 published, 2 pending_approval)'
\echo '  81 solo registrations + 1 pending-companions group of 3 with 2 invitees'
