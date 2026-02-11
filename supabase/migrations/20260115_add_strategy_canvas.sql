-- Migration: Add StrategyCanvas table
-- Date: 2026-01-15
-- Description: Creates StrategyCanvas table for storing user strategy canvases (SWOT, BMC, etc.)

-- Create StrategyCanvas table
CREATE TABLE IF NOT EXISTS "StrategyCanvas" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "canvasType" TEXT NOT NULL CHECK ("canvasType" IN ('swot', 'bmc', 'journey', 'brainstorm', 'pestle', 'porter')),
    "name" TEXT NOT NULL DEFAULT 'Untitled Canvas',
    "data" JSONB DEFAULT '{}' NOT NULL,
    "isDefault" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "deletedAt" TIMESTAMP WITH TIME ZONE
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_strategy_canvas_user ON "StrategyCanvas"("userId", "deletedAt");
CREATE INDEX IF NOT EXISTS idx_strategy_canvas_type ON "StrategyCanvas"("userId", "canvasType", "deletedAt");
CREATE INDEX IF NOT EXISTS idx_strategy_canvas_default ON "StrategyCanvas"("userId", "isDefault") WHERE "deletedAt" IS NULL;

-- Comment on table
COMMENT ON TABLE "StrategyCanvas" IS 'Stores user strategy canvases (SWOT, BMC, Journey Maps, etc.)';
