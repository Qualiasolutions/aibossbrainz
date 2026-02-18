-- Add FAQ and Contact sections to Landing Page CMS
-- This allows admin to edit FAQs and Contact page content

-- Insert FAQ content (5 FAQs matching current pricing page)
INSERT INTO "LandingPageContent" ("section", "key", "value", "type", "metadata") VALUES
  -- FAQ Section
  ('faq', 'section_title', 'Frequently Asked Questions', 'text', '{}'),
  ('faq', 'section_subtitle', 'Everything you need to know about our membership plans.', 'textarea', '{}'),

  -- FAQ 1
  ('faq', 'faq_1_question', 'Can I cancel my subscription?', 'text', '{}'),
  ('faq', 'faq_1_answer', 'Your subscription is yours to control -- upgrade, downgrade, or cancel whenever you want. No penalties, no hassle.', 'textarea', '{}'),

  -- FAQ 2
  ('faq', 'faq_2_question', 'What is 24/7 Access?', 'text', '{}'),
  ('faq', 'faq_2_answer', 'You get unlimited access to our AI executive platform anytime, anywhere. Chat with Alexandria (CMO) or Kim (CSO) whenever you need strategic guidance - day or night. Don''t forget, you can hear their voices too!', 'textarea', '{}'),

  -- FAQ 3
  ('faq', 'faq_3_question', 'What''s the Sales & Marketing Checkup?', 'text', '{}'),
  ('faq', 'faq_3_answer', 'A comprehensive audit of your current sales and marketing operations. We analyze your pipeline, messaging, campaigns, and provide a prioritized action plan.', 'textarea', '{}'),

  -- FAQ 4
  ('faq', 'faq_4_question', 'Why choose the Annual plan?', 'text', '{}'),
  ('faq', 'faq_4_answer', 'The Annual plan saves you $1,000 compared to monthly AND includes exclusive bonuses: Monthly Group Strategy Calls ($6,000 value), Resource Library access ($1,000+ value), and the Sales & Marketing Checkup ($97 value).', 'textarea', '{}'),

  -- FAQ 5
  ('faq', 'faq_5_question', 'What''s included in Lifetime Access?', 'text', '{}'),
  ('faq', 'faq_5_answer', 'Limited to just 10 seats, Lifetime Access includes everything in the monthly membership PLUS Private Quarterly Coaching Calls with founders Alexandria and Kim, and Lifetime Sales + Marketing Support. One payment. No BS. No surprises. Ever.', 'textarea', '{}'),

  -- Contact Page Content
  ('contact', 'page_title', 'Get in Touch', 'text', '{}'),
  ('contact', 'page_subtitle', 'Sales and Marketing Strategy 24/7', 'text', '{}'),

  -- Contact Info
  ('contact', 'email', 'ai.bossbrainz@aleccimedia.com', 'text', '{}'),
  ('contact', 'location', 'Phoenix, Arizona', 'text', '{}'),

  -- Form Section
  ('contact', 'form_title', 'Send us a Message', 'text', '{}'),
  ('contact', 'form_subtitle', 'Fill out the form below and we''ll get back to you shortly.', 'textarea', '{}'),
  ('contact', 'success_message', 'Thank you for reaching out. We''ll get back to you soon.', 'textarea', '{}'),

  -- AI Team CTA
  ('contact', 'cta_title', 'Talk to Our AI Executives', 'text', '{}'),
  ('contact', 'cta_description', 'Sales and Marketing Strategy 24/7. Get instant strategic advice from Alexandria (CMO) and Kim (CSO).', 'textarea', '{}'),
  ('contact', 'cta_button_text', 'Start Consulting Now', 'text', '{}'),
  ('contact', 'cta_button_link', '/login', 'text', '{}'),

  -- Common Questions
  ('contact', 'faq_1_title', 'Free trial?', 'text', '{}'),
  ('contact', 'faq_1_answer', 'Yes! Start with 50 free messages to test our AI executives.', 'text', '{}'),
  ('contact', 'faq_2_title', 'Enterprise plans?', 'text', '{}'),
  ('contact', 'faq_2_answer', 'Contact us for custom pricing and features.', 'text', '{}'),
  ('contact', 'faq_3_title', 'Data security?', 'text', '{}'),
  ('contact', 'faq_3_answer', 'We use enterprise-grade encryption and never share your data.', 'text', '{}')

ON CONFLICT ("section", "key") DO NOTHING;
