-- Veteran Platform — demo seed data.
-- Idempotent: safe to re-run. Use `make seed`.
-- Phones use the +38050000000X range so they don't collide with real numbers.

BEGIN;

-- ─────────────────────────── Veterans ───────────────────────────

INSERT INTO vp.veterans (id, phone, fullname, brigade, rank, audience_status, city, interests, verified, verification_status, role, account_status)
VALUES
  ('11111111-1111-1111-1111-111111111111', '+380500000001', 'Адмін Адмінович',  NULL,             NULL,                 'other',          'Київ',    '{}',                              true,  'approved', 'admin',   'active'),
  ('22222222-2222-2222-2222-222222222222', '+380500000002', 'Іван Петренко',    '95-та ОДШБр',    'Сержант',            'veteran',        'Київ',    '{sport,psychology,social}',       true,  'approved', 'veteran', 'active'),
  ('33333333-3333-3333-3333-333333333333', '+380500000003', 'Олена Шевченко',   '93-тя ОМБр',     'Молодший лейтенант', 'veteran_female', 'Львів',   '{yoga,culture,nature}',           true,  'approved', 'veteran', 'active'),
  ('44444444-4444-4444-4444-444444444444', '+380500000004', 'Микола Коваль',    '47-ма ОМБр',     'Старший солдат',     'veteran',        'Харків',  '{sport,rehabilitation}',          false, 'none',     'veteran', 'active'),
  ('55555555-5555-5555-5555-555555555555', '+380500000005', 'Марія Ковальчук',  NULL,             NULL,                 'family',         'Дніпро',  '{social,psychology,education}',   false, 'none',     'veteran', 'active'),
  ('66666666-6666-6666-6666-666666666666', '+380500000006', 'Андрій Бойко',    '92-га ОМБр',     'Капрал',             'veteran',        'Київ',    '{spa,psychology,rehabilitation}', true,  'approved', 'veteran', 'active')
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

INSERT INTO vp.events (
  id, category, status, title, description, quota, starts_at, ends_at,
  format, repeat, for_whom, cost_tier, cost_price_uah, cost_veteran_price_uah,
  accessibility_tags, verified_only, community_id,
  location_city, location_district, location_address, location_venue,
  cover_image_url, created_by_role, created_by_id
) VALUES
  ('e0000001-0000-0000-0000-000000000001', 'sport',          'published',
   'Ранкова пробіжка для побратимів',
   'Зустрічаємось щонеділі о 7:00, біг 5 км у комфортному темпі.',
   20, '2026-06-15 07:00:00+00', '2026-06-15 09:00:00+00',
   'offline', 'weekly', 'veterans', 'free_for_all', NULL, NULL,
   '{kids_allowed,shelter_nearby}', false, NULL,
   'Київ', 'holosiivskyi', 'парк Партизанської слави', NULL,
   NULL, 'admin', '11111111-1111-1111-1111-111111111111'),

  ('e0000002-0000-0000-0000-000000000002', 'yoga',           'published',
   'Йога на світанку',
   'Спокійна практика на свіжому повітрі для відновлення.',
   15, '2026-06-20 06:30:00+00', '2026-06-20 08:00:00+00',
   'offline', 'weekly', 'veterans', 'free_for_veterans_and_families', NULL, NULL,
   '{kids_allowed,is_accessible}', false, 'a0000002-0000-0000-0000-000000000002',
   'Львів', NULL, 'Стрийський парк, головний вхід', NULL,
   NULL, 'veteran', '33333333-3333-3333-3333-333333333333'),

  ('e0000003-0000-0000-0000-000000000003', 'psychology',     'published',
   'Групова терапія для УБД',
   'Безпечний простір для розмови з кваліфікованим психологом.',
   10, '2026-06-18 18:00:00+00', '2026-06-18 20:00:00+00',
   'offline', 'biweekly', 'veterans', 'free_for_ubd', NULL, NULL,
   '{no_shooting,shelter_nearby,is_accessible}', true, NULL,
   'Київ', 'shevchenkivskyi', 'вул. Хрещатик, 22', 'Центр ментального здоров''я',
   NULL, 'admin', '11111111-1111-1111-1111-111111111111'),

  ('e0000004-0000-0000-0000-000000000004', 'culture',        'published',
   'Похід в театр Заньковецької',
   'Колективний вихід на виставу зі знижкою для ветеранів.',
   30, '2026-06-25 19:00:00+00', '2026-06-25 22:00:00+00',
   'offline', 'once', 'veterans_and_families', 'discount_for_veterans', 350.00, 100.00,
   '{is_accessible,kids_allowed}', false, NULL,
   'Львів', NULL, 'вул. Лесі Українки, 1', 'Театр ім. Заньковецької',
   NULL, 'veteran', '33333333-3333-3333-3333-333333333333'),

  ('e0000005-0000-0000-0000-000000000005', 'education',      'published',
   'Курс цифрової грамотності',
   'Базові навички роботи з ноутбуком, поштою, держпослугами.',
   25, '2026-07-01 17:00:00+00', '2026-07-01 19:00:00+00',
   'online', 'weekly', 'open', 'free_via_state_program', NULL, NULL,
   '{}', false, NULL,
   NULL, NULL, NULL, NULL,
   NULL, 'admin', '11111111-1111-1111-1111-111111111111'),

  ('e0000006-0000-0000-0000-000000000006', 'nature',         'published',
   'Похід у Карпати з ветеранським клубом',
   '3-денний похід для досвідчених. Включає ночівлю та харчування.',
   12, '2026-07-12 06:00:00+00', '2026-07-14 20:00:00+00',
   'offline', 'once', 'veterans', 'paid', 5000.00, NULL,
   '{shelter_nearby,age_18_plus}', true, NULL,
   'Львів', NULL, 'Старт від залізничного вокзалу', NULL,
   NULL, 'veteran', '33333333-3333-3333-3333-333333333333'),

  ('e0000007-0000-0000-0000-000000000007', 'social',         'published',
   'Зустріч ветеранів 47-ї ОМБр',
   'Кава, спогади, обмін контактами. Без фото-відеозйомки.',
   40, '2026-06-22 14:00:00+00', '2026-06-22 17:00:00+00',
   'offline', 'monthly', 'veterans', 'free_for_all', NULL, NULL,
   '{no_shooting,shelter_nearby}', false, NULL,
   'Харків', NULL, 'Сумська, 12', 'Кафе ''Своя кава''',
   NULL, 'veteran', '44444444-4444-4444-4444-444444444444'),

  ('e0000008-0000-0000-0000-000000000008', 'spa',            'published',
   'Спа-день для захисниць',
   'Програма для жінок-ветеранок: масаж, басейн, тиха зона.',
   8, '2026-06-29 11:00:00+00', '2026-06-29 17:00:00+00',
   'offline', 'monthly', 'female_veterans', 'free_for_veterans_and_families', NULL, NULL,
   '{separate_zones,is_accessible}', true, NULL,
   'Київ', 'pecherskyi', 'вул. Лаврська, 1', 'Спа-комплекс ''Печерська''',
   NULL, 'admin', '11111111-1111-1111-1111-111111111111'),

  ('e0000009-0000-0000-0000-000000000009', 'rehabilitation', 'published',
   'Реабілітація через біг',
   'Адаптована програма бігу для ветеранів з протезами.',
   10, '2026-06-19 10:00:00+00', '2026-06-19 12:00:00+00',
   'offline', 'weekly', 'veterans', 'free_via_state_program', NULL, NULL,
   '{is_accessible,shelter_nearby,no_shooting}', true, NULL,
   'Київ', 'darnytskyi', 'парк ''Партизанська слава''', NULL,
   NULL, 'veteran', '66666666-6666-6666-6666-666666666666'),

  ('e000000a-0000-0000-0000-00000000000a', 'social',         'pending_approval',
   'Зустрічі побратимів у Харкові',
   'Регулярні зустрічі по середах у дружньому колі.',
   25, '2026-07-08 18:00:00+00', '2026-07-08 21:00:00+00',
   'offline', 'weekly', 'veterans', 'free_for_all', NULL, NULL,
   '{shelter_nearby}', false, NULL,
   'Харків', NULL, 'вул. Пушкінська, 50', NULL,
   NULL, 'veteran', '44444444-4444-4444-4444-444444444444'),

  ('e000000b-0000-0000-0000-00000000000b', 'yoga',           'pending_approval',
   'Йога вдома — онлайн',
   'Щотижневі сесії через Zoom. Посилання після реєстрації.',
   50, '2026-07-05 19:00:00+00', '2026-07-05 20:00:00+00',
   'online', 'weekly', 'open', 'free_for_all', NULL, NULL,
   '{kids_allowed}', false, 'a0000002-0000-0000-0000-000000000002',
   NULL, NULL, NULL, NULL,
   NULL, 'veteran', '33333333-3333-3333-3333-333333333333'),

  ('e000000c-0000-0000-0000-00000000000c', 'culture',        'published',
   'Кінопоказ ''20 днів у Маріуполі''',
   'Спільний перегляд із обговоренням після показу.',
   60, '2026-07-15 19:30:00+00', '2026-07-15 22:00:00+00',
   'offline', 'once', 'open', 'free_for_all', NULL, NULL,
   '{kids_allowed,shelter_nearby,age_18_plus}', false, NULL,
   'Київ', 'podilskyi', 'Андріївський узвіз, 2', 'Кінотеатр ''Жовтень''',
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
  cover_image_url        = EXCLUDED.cover_image_url,
  created_by_role        = EXCLUDED.created_by_role,
  created_by_id          = EXCLUDED.created_by_id,
  updated_at             = now();

COMMIT;

\echo ''
\echo 'Seeded:'
\echo '  6 veterans (1 admin, 4 verified, 2 unverified incl. family)'
\echo '  4 communities'
\echo '  12 events (10 published, 2 pending_approval)'
