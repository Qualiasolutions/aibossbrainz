-- Landing Page CMS Table
-- Stores editable content for the marketing landing page

CREATE TABLE IF NOT EXISTS "LandingPageContent" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "section" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'text',
  "metadata" JSONB DEFAULT '{}',
  "updatedBy" TEXT REFERENCES "User"(id),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("section", "key")
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_landing_page_section ON "LandingPageContent"("section");
CREATE INDEX IF NOT EXISTS idx_landing_page_key ON "LandingPageContent"("key");

-- Enable RLS
ALTER TABLE "LandingPageContent" ENABLE ROW LEVEL SECURITY;

-- Read policy: Anyone can read (for public landing page)
CREATE POLICY "landing_page_content_read" ON "LandingPageContent"
  FOR SELECT USING (true);

-- Write policy: Only admins can modify
CREATE POLICY "landing_page_content_write" ON "LandingPageContent"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "User" WHERE id = auth.uid()::text AND "isAdmin" = true
    )
  );

-- Insert default content
INSERT INTO "LandingPageContent" ("section", "key", "value", "type", "metadata") VALUES
  -- Hero Section
  ('hero', 'title_main', 'AI Boss Brainz', 'text', '{}'),
  ('hero', 'title_highlight', 'Your Sales & Marketing Experts 24/7', 'text', '{}'),
  ('hero', 'subtitle', 'AI-powered. Expert-led. Get high-level sales and marketing strategy built to grow your brand, results-obsessed, and ready to drop strategies that work.', 'textarea', '{}'),
  ('hero', 'cta_primary_text', 'Sign In', 'text', '{}'),
  ('hero', 'cta_primary_link', '/login', 'text', '{}'),
  ('hero', 'cta_secondary_text', 'View Pricing', 'text', '{}'),
  ('hero', 'cta_secondary_link', '/pricing', 'text', '{}'),

  -- Executive Cards Section
  ('executives', 'section_title', 'Meet Your', 'text', '{}'),
  ('executives', 'section_title_highlight', 'Sales and Marketing Masterminds', 'text', '{}'),
  ('executives', 'section_subtitle', '40+ years bringing Fortune 500 strategy to founders to the next level. Now laser-focused on scaling your brand with strategy that actually sells.', 'textarea', '{}'),

  -- Executive 1: Alexandria
  ('executives', 'alex_name', 'Alexandria Alecci', 'text', '{}'),
  ('executives', 'alex_role', 'Chief Marketing Officer', 'text', '{}'),
  ('executives', 'alex_image', 'https://i.ibb.co/39XxGyN1/Chat-GPT-Image-Oct-22-2025-04-39-58-AM.png', 'url', '{}'),
  ('executives', 'alex_expertise', 'Brand Strategy,Go-to-Market,Digital Campaigns', 'list', '{"delimiter": ","}'),

  -- Executive 2: Kim
  ('executives', 'kim_name', 'Kim Mylls', 'text', '{}'),
  ('executives', 'kim_role', 'Chief Sales Officer', 'text', '{}'),
  ('executives', 'kim_image', 'https://i.ibb.co/m7vk4JF/KIM-3.png', 'url', '{}'),
  ('executives', 'kim_expertise', 'Enterprise Sales,Pipeline Growth,Deal Closing', 'list', '{"delimiter": ","}'),

  -- Benefits Section
  ('benefits', 'section_title', 'Get the Move-the-Needle Strategies Now', 'text', '{}'),
  ('benefits', 'section_subtitle', 'Watch your business grow with expert guidance on demand', 'textarea', '{}'),

  ('benefits', 'benefit_1_title', 'Rapid-Fire Strategy', 'text', '{}'),
  ('benefits', 'benefit_1_desc', 'At your fingertips so you never stall on sales or marketing again', 'textarea', '{}'),
  ('benefits', 'benefit_1_icon', 'Zap', 'text', '{}'),

  ('benefits', 'benefit_2_title', 'Talk It Out or Type It In', 'text', '{}'),
  ('benefits', 'benefit_2_desc', '''Live'' call feature - hear our voices in real-time. Feel like you''re talking to Alexandria and Kim.', 'textarea', '{}'),
  ('benefits', 'benefit_2_icon', 'Mic', 'text', '{}'),

  ('benefits', 'benefit_3_title', 'Plug-and-Play Plans', 'text', '{}'),
  ('benefits', 'benefit_3_desc', 'Sales and marketing plans built to convert, no generic BS', 'textarea', '{}'),
  ('benefits', 'benefit_3_icon', 'Target', 'text', '{}'),

  ('benefits', 'benefit_4_title', '40+ Years of Proof', 'text', '{}'),
  ('benefits', 'benefit_4_desc', 'Fortune 500 and founder success - proven strategies from hundreds of brands and teams', 'textarea', '{}'),
  ('benefits', 'benefit_4_icon', 'TrendingUp', 'text', '{}'),

  -- CTA Section
  ('cta', 'title', 'This Is How You Grow Without Being Great at Sales or Marketing', 'text', '{}'),
  ('cta', 'subtitle', 'You don''t need to be a sales expert or marketing genius to grow - you just need the right messaging and strategy. Thousands of entrepreneurs are using our proven tools to scale. Stop second-guessing every move. Start dominating.', 'textarea', '{}'),
  ('cta', 'cta_primary_text', 'Sign In', 'text', '{}'),
  ('cta', 'cta_primary_link', '/login', 'text', '{}'),
  ('cta', 'cta_secondary_text', 'View Pricing', 'text', '{}'),
  ('cta', 'cta_secondary_link', '/pricing', 'text', '{}'),

  -- Colors / Theme
  ('theme', 'primary_gradient_from', 'red-500', 'color', '{}'),
  ('theme', 'primary_gradient_to', 'red-600', 'color', '{}'),
  ('theme', 'accent_color', 'rose-500', 'color', '{}'),
  ('theme', 'background_color', 'white', 'color', '{}'),

  -- Header/Footer
  ('header', 'logo_url', 'https://images.squarespace-cdn.com/content/v1/5ea759fa9e5575487ad28cd0/1591228238957-80Y8AGN1M9TTXTYNJ5QK/AM_Logo_Horizontal_4C+%281%29.jpg?format=500w', 'url', '{}'),
  ('footer', 'tagline', 'Executive consulting for sales and marketing strategy. Available 24/7.', 'textarea', '{}'),
  ('footer', 'email', 'hello@bossybrainz.ai', 'text', '{}'),
  ('footer', 'copyright', 'AI Boss Brainz. All rights reserved.', 'text', '{}')

ON CONFLICT ("section", "key") DO NOTHING;

-- Function to update the updatedAt timestamp
CREATE OR REPLACE FUNCTION update_landing_page_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
DROP TRIGGER IF EXISTS update_landing_page_content_timestamp ON "LandingPageContent";
CREATE TRIGGER update_landing_page_content_timestamp
  BEFORE UPDATE ON "LandingPageContent"
  FOR EACH ROW
  EXECUTE FUNCTION update_landing_page_timestamp();
