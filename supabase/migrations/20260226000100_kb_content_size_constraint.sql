-- HIGH-2: Add content size constraint to knowledge_base_content table
-- Prevents unbounded content from being stored and subsequently injected into system prompts
-- 50,000 chars is ~12,500 tokens, generous for any single knowledge entry

ALTER TABLE "knowledge_base_content"
ADD CONSTRAINT "knowledge_base_content_content_length"
CHECK (char_length(content) <= 50000);
