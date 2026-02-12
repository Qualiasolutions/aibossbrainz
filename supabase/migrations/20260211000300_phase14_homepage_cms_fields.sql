-- Phase 14: Executive descriptions + Checkup section CMS fields
-- LAND-01: Executive bio descriptions (plain text, not chat bubbles)
-- LAND-04: Sales & Marketing Checkup section (items ordered lowest to highest value)

INSERT INTO "LandingPageContent" ("section", "key", "value", "type", "metadata") VALUES
  -- Executive descriptions (LAND-01)
  ('executives', 'alex_description', 'Brand strategist with Fortune 500 experience. Specializes in go-to-market strategy, brand positioning, and digital campaigns that drive growth.', 'textarea', '{}'),
  ('executives', 'kim_description', 'Revenue architect and sales optimization expert. Helps build pipelines, improve conversion rates, and close deals more effectively.', 'textarea', '{}'),
  -- Checkup section (LAND-04) - ordered lowest to highest value
  ('checkup', 'section_title', 'What You Get with Annual', 'text', '{}'),
  ('checkup', 'item_1_title', 'The Sales & Marketing Checkup', 'text', '{}'),
  ('checkup', 'item_1_value', '$97', 'text', '{}'),
  ('checkup', 'item_2_title', 'Access to Our Resource Library', 'text', '{}'),
  ('checkup', 'item_2_value', '$1,000+', 'text', '{}'),
  ('checkup', 'item_3_title', 'Monthly Group Sales & Marketing Strategy Call', 'text', '{}'),
  ('checkup', 'item_3_value', '$6,000', 'text', '{}')
ON CONFLICT ("section", "key") DO NOTHING;
