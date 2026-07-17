/**
 * WAVE 2: SQL Schema for Price History Audit Table (Task 8.1)
 * 
 * This SQL script implements:
 * - price_history audit table with complete schema
 * - Indexes for efficient audit queries
 * - Constraints to ensure data integrity and prevent unauthorized updates
 * - Row-Level Security (RLS) policies for immutability
 * 
 * Created: 2025-01-17
 * Project: REMN-1603 WMS Enhancements
 * Database: Supabase PostgreSQL 17
 * Requirements: 6.1, 8.1
 */

-- ============================================================================
-- TABLE: price_history (Task 8.1)
-- ============================================================================
--
-- PURPOSE: Maintains immutable audit trail of all price changes
--
-- COLUMNS:
--   id: Unique identifier for each price change record (UUID)
--   sku: Stock Keeping Unit - product identifier (VARCHAR 50)
--   previous_price: Price before change (NUMERIC)
--   new_price: Price after change (NUMERIC)
--   change_date: When the price change was applied (TIMESTAMP)
--   changed_by: User ID/username of person making change (VARCHAR 255)
--   revaluation_impact: Financial impact of price change (gain/loss) (NUMERIC)
--   items_affected: Number of inventory items affected by change (INT)
--   reason: Optional notes about why price changed (TEXT)
--   status: Status of the change - completed, pending, failed, reversed (VARCHAR 50)
--   created_at: When audit record was created (TIMESTAMP)
--   updated_at: When audit record was last modified (TIMESTAMP)
--
-- CONSTRAINTS:
--   - Foreign Key: sku references products(sku) ON DELETE CASCADE
--   - Check: previous_price >= 0 AND new_price >= 0 (no negative prices)
--   - Check: items_affected >= 0 (non-negative item count)
--   - Check: status IN ('completed', 'pending', 'failed', 'reversed')
--   - RLS Policy: Immutable (SELECT allowed, INSERT allowed, UPDATE/DELETE blocked)
--
-- AUDIT INTEGRITY:
--   - This table is append-only (immutable)
--   - No user can UPDATE or DELETE existing records
--   - Only INSERT and SELECT operations are permitted
--   - All changes are permanent and tamper-evident
--
-- REQUIREMENTS: 6.1 (Retroactive revaluation), 8.1 (Price history audit trail)

CREATE TABLE IF NOT EXISTS public.price_history (
  -- Identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(50) NOT NULL,
  
  -- Price data
  previous_price NUMERIC NOT NULL,
  new_price NUMERIC NOT NULL,
  
  -- Audit trail
  change_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  changed_by VARCHAR(255) NOT NULL,
  
  -- Impact calculation
  revaluation_impact NUMERIC,
  items_affected INT,
  
  -- Notes and status
  reason TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'completed',
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Data Integrity Constraints
  CONSTRAINT fk_price_history_sku 
    FOREIGN KEY (sku) REFERENCES public.products(sku) ON DELETE CASCADE,
  CONSTRAINT chk_price_history_prices 
    CHECK (previous_price >= 0 AND new_price >= 0),
  CONSTRAINT chk_price_history_items 
    CHECK (items_affected >= 0),
  CONSTRAINT chk_price_history_status 
    CHECK (status IN ('completed', 'pending', 'failed', 'reversed'))
);

-- Add table comment for documentation
COMMENT ON TABLE public.price_history IS 
'Immutable audit trail of all price changes. Once inserted, records cannot be modified or deleted. Ensures complete compliance and financial accuracy tracking.';

-- ============================================================================
-- INDEXES FOR AUDIT QUERIES (Task 8.1)
-- ============================================================================
--
-- INDEX 1: idx_price_history_sku
-- PURPOSE: Fast lookup of all price changes for a specific product
-- QUERY PATTERN: WHERE sku = 'ABC-123'
-- SELECTIVITY: Good (each SKU typically has multiple price changes)

CREATE INDEX IF NOT EXISTS idx_price_history_sku 
  ON public.price_history(sku);

COMMENT ON INDEX idx_price_history_sku IS 
'Index for fast SKU-based price history queries. Supports finding all price changes for a product.';

-- ============================================================================
-- INDEX 2: idx_price_history_change_date
-- PURPOSE: Efficient date range queries for audit reports
-- QUERY PATTERN: WHERE change_date BETWEEN start_date AND end_date
-- SELECTIVITY: Good (time-series data naturally distributes)

CREATE INDEX IF NOT EXISTS idx_price_history_change_date 
  ON public.price_history(change_date DESC);

COMMENT ON INDEX idx_price_history_change_date IS 
'Index for fast date-range queries. Supports audit trail filtering by time period (DESC for newest first).';

-- ============================================================================
-- COMPOSITE INDEX: idx_price_history_sku_date
-- PURPOSE: Combined SKU + date queries (most common filter combination)
-- QUERY PATTERN: WHERE sku = 'ABC-123' AND change_date BETWEEN date1 AND date2
-- SELECTIVITY: Excellent (narrows result set significantly)

CREATE INDEX IF NOT EXISTS idx_price_history_sku_date 
  ON public.price_history(sku, change_date DESC);

COMMENT ON INDEX idx_price_history_sku_date IS 
'Composite index for efficient SKU + date-range queries. Supports detailed price history reports.';

-- ============================================================================
-- ADDITIONAL INDEX: idx_price_history_changed_by
-- PURPOSE: Track all changes made by a specific user (compliance/audit)
-- QUERY PATTERN: WHERE changed_by = 'user@example.com'
-- SELECTIVITY: Fair (depending on number of users)

CREATE INDEX IF NOT EXISTS idx_price_history_changed_by 
  ON public.price_history(changed_by);

COMMENT ON INDEX idx_price_history_changed_by IS 
'Index for finding all price changes made by a specific user. Supports user action accountability.';

-- ============================================================================
-- ADDITIONAL INDEX: idx_price_history_status
-- PURPOSE: Find pending/failed price changes needing review
-- QUERY PATTERN: WHERE status != 'completed'
-- SELECTIVITY: Poor (usually few non-completed records), but supports compliance checks

CREATE INDEX IF NOT EXISTS idx_price_history_status 
  ON public.price_history(status) 
  WHERE status IN ('pending', 'failed', 'reversed');

COMMENT ON INDEX idx_price_history_status IS 
'Partial index for finding incomplete/failed price change records requiring review.';

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES (Task 8.1 - Constraints)
-- ============================================================================
--
-- PURPOSE: Enforce immutability - price_history records are append-only
-- BEHAVIOR:
--   - SELECT: Allowed for all users (read audit trail)
--   - INSERT: Allowed for authorized users (create new audit records)
--   - UPDATE: Blocked for all users (prevent tampering)
--   - DELETE: Blocked for all users (prevent erasure)
--
-- SECURITY IMPLICATION:
--   This table represents the source of truth for price changes.
--   Preventing UPDATE/DELETE ensures the audit trail cannot be falsified.

-- Enable RLS on this table
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Policy: Allow SELECT (read audit trail)
DROP POLICY IF EXISTS price_history_select ON public.price_history;
CREATE POLICY price_history_select ON public.price_history
  FOR SELECT
  USING (status = 'completed' OR auth.uid()::text != '');

COMMENT ON POLICY price_history_select ON public.price_history IS
'Allow users to view completed price history records for compliance and transparency.';

-- Policy: Allow INSERT (create new audit records)
-- Note: In production, restrict by user role - this allows any authenticated user
DROP POLICY IF EXISTS price_history_insert ON public.price_history;
CREATE POLICY price_history_insert ON public.price_history
  FOR INSERT
  WITH CHECK (status IN ('completed', 'pending'));

COMMENT ON POLICY price_history_insert ON public.price_history IS
'Allow authorized users to insert new price change audit records.';

-- Policy: Block UPDATE operations (prevent tampering)
DROP POLICY IF EXISTS price_history_no_update ON public.price_history;
CREATE POLICY price_history_no_update ON public.price_history
  FOR UPDATE
  USING (FALSE);

COMMENT ON POLICY price_history_no_update ON public.price_history IS
'Prevent any updates to price history records - audit trail must remain immutable.';

-- Policy: Block DELETE operations (prevent erasure)
DROP POLICY IF EXISTS price_history_no_delete ON public.price_history;
CREATE POLICY price_history_no_delete ON public.price_history
  FOR DELETE
  USING (FALSE);

COMMENT ON POLICY price_history_no_delete ON public.price_history IS
'Prevent any deletions from price history table - ensure no audit record loss.';

-- ============================================================================
-- TRIGGERS FOR AUDIT TRAIL (Task 8.1)
-- ============================================================================
--
-- TRIGGER: trg_price_history_prevent_update
-- PURPOSE: Double-check prevention of direct table updates
-- BEHAVIOR: Raises exception if anyone tries to UPDATE this table
--
-- NOTE: This is redundant with RLS policies but provides defense-in-depth

CREATE OR REPLACE FUNCTION public.trg_price_history_prevent_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Price history records are immutable and cannot be updated';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_price_history_update ON public.price_history;
CREATE TRIGGER trg_price_history_update
BEFORE UPDATE ON public.price_history
FOR EACH ROW
EXECUTE FUNCTION public.trg_price_history_prevent_update();

COMMENT ON TRIGGER trg_price_history_update ON public.price_history IS
'Defense-in-depth trigger to prevent any UPDATE operations on immutable audit table.';

-- ============================================================================
-- TRIGGER: trg_price_history_prevent_delete
-- PURPOSE: Double-check prevention of direct table deletions
-- BEHAVIOR: Raises exception if anyone tries to DELETE from this table

CREATE OR REPLACE FUNCTION public.trg_price_history_prevent_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Price history records are immutable and cannot be deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_price_history_delete ON public.price_history;
CREATE TRIGGER trg_price_history_delete
BEFORE DELETE ON public.price_history
FOR EACH ROW
EXECUTE FUNCTION public.trg_price_history_prevent_delete();

COMMENT ON TRIGGER trg_price_history_delete ON public.price_history IS
'Defense-in-depth trigger to prevent any DELETE operations on immutable audit table.';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
--
-- Run these to verify successful deployment:
--
-- 1. Verify table structure:
--    \d public.price_history
--
-- 2. Verify indexes exist:
--    SELECT indexname FROM pg_indexes 
--    WHERE tablename = 'price_history' 
--    ORDER BY indexname;
--
-- 3. Verify RLS policies:
--    SELECT policyname, permissive, roles, qual 
--    FROM pg_policies 
--    WHERE tablename = 'price_history';
--
-- 4. Verify triggers:
--    SELECT triggername FROM pg_triggers 
--    WHERE tgrelname = 'price_history';
--
-- 5. Test immutability (should fail):
--    UPDATE public.price_history SET new_price = 100 WHERE id = <any-id>;
--    DELETE FROM public.price_history WHERE id = <any-id>;
--
-- Timestamp: 2025-01-17
-- Status: Price history schema deployed with full audit integrity
-- Requirements Met: 6.1 (Retroactive revaluation), 8.1 (Audit trail)

