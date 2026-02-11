-- Create knowledge_base_content table for storing ingested transcripts and documents
-- Used by the AI knowledge base system to supplement filesystem-based content

CREATE TABLE IF NOT EXISTS "knowledge_base_content" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "title" text NOT NULL,
  "source" text NOT NULL,  -- e.g., 'fireflies', 'manual'
  "source_id" text,         -- External ID (e.g., Fireflies transcript ID), nullable for manual entries
  "bot_type" text NOT NULL CHECK ("bot_type" IN ('alexandria', 'kim', 'shared')),
  "content" text NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

-- Prevent re-ingesting the same transcript from the same source
CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_base_content_source_source_id_unique"
  ON "knowledge_base_content" ("source", "source_id")
  WHERE "source_id" IS NOT NULL;

-- Enable RLS
ALTER TABLE "knowledge_base_content" ENABLE ROW LEVEL SECURITY;

-- Service role has full access (admin operations only)
CREATE POLICY "service_role_full_access"
  ON "knowledge_base_content"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_knowledge_base_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updated_at" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER knowledge_base_content_updated_at
  BEFORE UPDATE ON "knowledge_base_content"
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_base_content_updated_at();
