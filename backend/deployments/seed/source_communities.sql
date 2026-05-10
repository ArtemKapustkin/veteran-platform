-- Source communities for the Telegram-channel-imported events.
-- Owner is the prod admin row.

INSERT INTO vp.communities (id, name, tg_channel_link, owner_id) VALUES
  ('a0000005-0000-0000-0000-000000000005', 'Київ Мілітарі Хаб|Заходи', 'https://t.me/CDUATO',           '52fc80db-740e-465f-a3ca-d37134e33c31'),
  ('a0000006-0000-0000-0000-000000000006', 'Ветеран Хаб на зв''язку',  'https://t.me/veteranhubspeaks', '52fc80db-740e-465f-a3ca-d37134e33c31')
ON CONFLICT (id) DO UPDATE SET
  name=EXCLUDED.name,
  tg_channel_link=EXCLUDED.tg_channel_link,
  owner_id=EXCLUDED.owner_id,
  updated_at=now(),
  deleted_at=NULL;
