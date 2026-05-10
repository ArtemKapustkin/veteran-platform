package migrations

import (
	"context"

	"github.com/uptrace/bun"
)

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		_, err := db.ExecContext(ctx, `
UPDATE vp.events SET cover_image_url = 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=1200&q=80'
  WHERE location_venue = 'Театр ім. І. Франка' AND cover_image_url IS NULL;

UPDATE vp.events SET cover_image_url = 'https://images.unsplash.com/photo-1487466365202-1afdb86c764e?w=1200&q=80'
  WHERE location_venue = 'Стадіон Лобановського' AND cover_image_url IS NULL;

UPDATE vp.events SET cover_image_url = 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=1200&q=80'
  WHERE location_venue = 'Київський іподром' AND cover_image_url IS NULL;

UPDATE vp.events SET cover_image_url = 'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=1200&q=80'
  WHERE location_venue = 'КПІ ім. Сікорського' AND cover_image_url IS NULL;

UPDATE vp.events SET cover_image_url = 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&q=80'
  WHERE location_venue = 'Veteran Hub' AND cover_image_url IS NULL;

UPDATE vp.events SET cover_image_url = 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80'
  WHERE location_venue = 'Київ Мілітарі Хаб' AND cover_image_url IS NULL;

UPDATE vp.events SET cover_image_url = 'https://images.unsplash.com/photo-1518457607834-6e8d80c183c5?w=1200&q=80'
  WHERE location_venue = 'Promprylad Renovation' AND cover_image_url IS NULL;

UPDATE vp.events SET cover_image_url = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&q=80'
  WHERE location_venue = 'Кафе «Своя кава»' AND cover_image_url IS NULL;

UPDATE vp.events SET cover_image_url = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80'
  WHERE location_venue = 'Сімейне кафе «Острів»' AND cover_image_url IS NULL;

UPDATE vp.events SET cover_image_url = 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1200&q=80'
  WHERE location_venue IN ('Психологічний хаб «Сприяй»', 'Центр кризового консультування') AND cover_image_url IS NULL;

UPDATE vp.events SET cover_image_url = 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&q=80'
  WHERE location_venue = 'Центр підтримки ветеранів «Поруч»' AND cover_image_url IS NULL;

UPDATE vp.events SET cover_image_url = 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&q=80'
  WHERE location_venue = 'Sport Life Голосіївський' AND cover_image_url IS NULL;

UPDATE vp.events SET cover_image_url = 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=1200&q=80'
  WHERE format = 'online' AND cover_image_url IS NULL;

UPDATE vp.events SET cover_image_url = 'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&q=80'
  WHERE cover_image_url IS NULL;
`)
		return err
	}, func(ctx context.Context, db *bun.DB) error {
		_, err := db.ExecContext(ctx, `
UPDATE vp.events SET cover_image_url = NULL
  WHERE cover_image_url LIKE 'https://images.unsplash.com/%';
`)
		return err
	})
}
