-- Phase 14: Hero media CMS fields (LAND-02)
INSERT INTO "LandingPageContent" ("section", "key", "value", "type", "metadata") VALUES
  ('hero', 'media_type', 'none', 'text', '{"options": ["none", "image", "video"]}'),
  ('hero', 'media_url', '', 'url', '{}')
ON CONFLICT ("section", "key") DO NOTHING;
