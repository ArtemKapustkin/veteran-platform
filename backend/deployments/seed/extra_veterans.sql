-- 14 non-admin seed veterans (subset of seed.sql), inserted into prod
-- so we have multiple registrants for the demo registration distribution.
-- The seed admin row (11111111-…) is intentionally excluded; prod already
-- has a real admin (52fc80db-…) and we don't want two.

INSERT INTO vp.veterans (id, phone, fullname, brigade, rank, audience_status, city, interests, verified, verification_status, role, account_status) VALUES
  ('22222222-2222-2222-2222-222222222222', '+380500000002', 'Іван Петренко',     '95-та ОДШБр',  'Сержант',            'veteran',         'Київ', '{sport,psychology,social}',       true,  'approved', 'veteran', 'active'),
  ('33333333-3333-3333-3333-333333333333', '+380500000003', 'Олена Шевченко',    '93-тя ОМБр',   'Молодший лейтенант', 'veteran_female',  'Київ', '{yoga,culture,nature}',           true,  'approved', 'veteran', 'active'),
  ('44444444-4444-4444-4444-444444444444', '+380500000004', 'Микола Коваль',     '47-ма ОМБр',   'Старший солдат',     'veteran',         'Київ', '{sport,rehabilitation}',          false, 'none',     'veteran', 'active'),
  ('55555555-5555-5555-5555-555555555555', '+380500000005', 'Марія Ковальчук',   NULL,           NULL,                 'family',          'Київ', '{social,psychology,education}',   false, 'none',     'veteran', 'active'),
  ('66666666-6666-6666-6666-666666666666', '+380500000006', 'Андрій Бойко',      '92-га ОМБр',   'Капрал',             'veteran',         'Київ', '{spa,psychology,rehabilitation}', true,  'approved', 'veteran', 'active'),
  ('77777777-7777-7777-7777-777777777777', '+380500000007', 'Сергій Тарасенко',  '3-тя ОШБр',    'Старший сержант',    'veteran',         'Київ', '{sport,social,education}',        true,  'approved', 'veteran', 'active'),
  ('88888888-8888-8888-8888-888888888888', '+380500000008', 'Юрій Лисенко',      '128-ма ОГШБр', 'Молодший сержант',   'veteran',         'Київ', '{nature,rehabilitation,sport}',   true,  'approved', 'veteran', 'active'),
  ('99999999-9999-9999-9999-999999999999', '+380500000009', 'Ірина Романчук',    '53-тя ОМБр',   'Лейтенант',          'veteran_female',  'Київ', '{yoga,spa,culture}',              true,  'approved', 'veteran', 'active'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '+380500000010', 'Павло Демʼяненко',  '24-та ОМБр',   'Прапорщик',          'veteran',         'Київ', '{education,psychology,social}',   true,  'approved', 'veteran', 'active'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '+380500000011', 'Наталія Костенко',  '30-та ОМБр',   'Молодший сержант',   'veteran_female',  'Київ', '{yoga,spa,nature}',               true,  'approved', 'veteran', 'active'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '+380500000012', 'Тарас Левченко',    '79-та ОДШБр',  'Старший лейтенант',  'active_military', 'Київ', '{sport,education,rehabilitation}',true,  'approved', 'veteran', 'active'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '+380500000013', 'Оксана Литвин',     NULL,           NULL,                 'family',          'Київ', '{social,psychology}',             false, 'none',     'veteran', 'active'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '+380500000014', 'Катерина Білоус',   '14-та ОМБр',   'Сержант',            'veteran_female',  'Київ', '{culture,social,psychology}',     true,  'approved', 'veteran', 'active'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '+380500000015', 'Богдан Гончар',     '72-га ОМБр',   'Солдат',             'veteran',         'Київ', '{sport}',                         false, 'processing','veteran','active')
ON CONFLICT (id) DO UPDATE SET
  phone=EXCLUDED.phone, fullname=EXCLUDED.fullname, brigade=EXCLUDED.brigade,
  rank=EXCLUDED.rank, audience_status=EXCLUDED.audience_status, city=EXCLUDED.city,
  interests=EXCLUDED.interests, verified=EXCLUDED.verified,
  verification_status=EXCLUDED.verification_status, role=EXCLUDED.role,
  account_status=EXCLUDED.account_status, updated_at=now();
