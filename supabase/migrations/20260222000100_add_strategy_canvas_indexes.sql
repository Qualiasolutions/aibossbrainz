-- Migration: Add optimized composite index for StrategyCanvas listing queries
-- The existing idx_strategy_canvas_user covers (userId, deletedAt) but listing
-- queries also ORDER BY updatedAt DESC. This index covers the full query pattern.

CREATE INDEX IF NOT EXISTS idx_strategy_canvas_userid_deletedat_updatedat
  ON "StrategyCanvas"("userId", "deletedAt", "updatedAt" DESC);
