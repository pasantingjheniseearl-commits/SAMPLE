/**
 * WAVE 0: WMS Enhancements - Database Foundation Setup
 * 
 * This SQL script contains all migrations for Wave 0 database setup
 * Includes schemas for:
 * - Task 1.1-1.3: Expiration Date Tracking
 * - Task 8.1-8.2: Dynamic Price Updates
 * - Task 14.1-14.3: Online Users & Audit Trail
 * 
 * Created: 2025-01-17
 * Project: REMN-1603 WMS Enhancements
 * Database: Supabase PostgreSQL 17
 */

-- ============================================================================
-- FEATURE 1: EXPIRATION DATE TRACKING (Tasks 1.1-1.3)
-- ============================================================================

-- 1.1 Add expiry_date column to products table
ALTER TABLE IF EXISTS public.products
ADD COLUMN IF NOT EXISTS expiry_date DATE DEFAULT NULL;

-- 1.2 Create expiry_alerts table for audit trail
CREATE TABLE IF NOT EXISTS public.expiry_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(50) NOT NULL,
  product_name VARCHAR(255),
  expiry_date DATE NOT NULL,
  days_until_expiry INT,
  alert_type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  cleared_at TIMESTAMP,
  cleared_by VARCHAR(255),
  notes TEXT,
  FOREIGN KEY (sku) REFERENCES public.products(sku) ON DELETE CASCADE
);

-- 1.3 Create indexes for expiry date tracking
CREATE INDEX IF NOT EXISTS idx_expiry_date 
  ON public.products(expiry_date) 
  WHERE expiry_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expiry_alerts_sku 
  ON public.expiry_alerts(sku);

CREATE INDEX IF NOT EXISTS idx_expiry_alerts_status 
  ON public.expiry_alerts(status, alert_type);

CREATE INDEX IF NOT EXISTS idx_active_expiry 
  ON public.products(sku, expiry_date) 
  WHERE expiry_date IS NOT NULL;

-- 1.3a PostgreSQL Function: Calculate days until expiry
CREATE OR REPLACE FUNCTION public.get_days_until_expiry(expiry_date DATE)
RETURNS INT AS $$
BEGIN
  IF expiry_date IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN EXTRACT(DAY FROM expiry_date::timestamp - CURRENT_TIMESTAMP)::INT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 1.3b PostgreSQL Function: Get near-expiry products
CREATE OR REPLACE FUNCTION public.get_near_expiry_products(threshold_days INT DEFAULT 30)
RETURNS TABLE (
  sku VARCHAR,
  name VARCHAR,
  expiry_date DATE,
  days_until_expiry INT,
  stock_on_hand INT,
  alert_type VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.sku::VARCHAR,
    p.name::VARCHAR,
    p.expiry_date,
    public.get_days_until_expiry(p.expiry_date)::INT as days_until_expiry,
    p.stock_on_hand,
    CASE
      WHEN public.get_days_until_expiry(p.expiry_date) < 0 THEN 'expired'::VARCHAR
      WHEN public.get_days_until_expiry(p.expiry_date) <= 7 THEN 'critical'::VARCHAR
      WHEN public.get_days_until_expiry(p.expiry_date) <= 30 THEN 'warning'::VARCHAR
      ELSE 'monitor'::VARCHAR
    END as alert_type
  FROM public.products p
  WHERE p.expiry_date IS NOT NULL
    AND public.get_days_until_expiry(p.expiry_date) <= threshold_days
  ORDER BY p.expiry_date ASC;
END;
$$ LANGUAGE plpgsql;

-- 1.3c Trigger Function: Log expiry status changes
CREATE OR REPLACE FUNCTION public.log_expiry_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.expiry_date IS DISTINCT FROM NEW.expiry_date) THEN
    INSERT INTO public.expiry_alerts 
      (sku, product_name, expiry_date, days_until_expiry, alert_type, status)
    VALUES (
      NEW.sku,
      NEW.name,
      NEW.expiry_date,
      CASE WHEN NEW.expiry_date IS NOT NULL THEN public.get_days_until_expiry(NEW.expiry_date) ELSE NULL END,
      CASE
        WHEN NEW.expiry_date IS NULL THEN 'cleared'
        WHEN public.get_days_until_expiry(NEW.expiry_date) < 0 THEN 'expired'
        WHEN public.get_days_until_expiry(NEW.expiry_date) <= 7 THEN 'critical'
        WHEN public.get_days_until_expiry(NEW.expiry_date) <= 30 THEN 'warning'
        ELSE 'monitor'
      END,
      'active'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1.3d Create trigger for automatic expiry logging
DROP TRIGGER IF EXISTS trg_expiry_change ON public.products;
CREATE TRIGGER trg_expiry_change
AFTER UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.log_expiry_change();


-- ============================================================================
-- FEATURE 2: DYNAMIC PRICE UPDATES (Tasks 8.1-8.2)
-- ============================================================================

-- 8.1 Create price_history table for audit trail
-- Columns: id, sku, previous_price, new_price, change_date, changed_by, revaluation_impact, items_affected, reason, status
CREATE TABLE IF NOT EXISTS public.price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(50) NOT NULL,
  previous_price NUMERIC NOT NULL,
  new_price NUMERIC NOT NULL,
  change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  changed_by VARCHAR(255) NOT NULL,
  revaluation_impact NUMERIC,
  items_affected INT,
  reason TEXT,
  status VARCHAR(50) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Data integrity constraints
  CONSTRAINT fk_price_history_sku 
    FOREIGN KEY (sku) REFERENCES public.products(sku) ON DELETE CASCADE,
  CONSTRAINT chk_price_history_prices 
    CHECK (previous_price >= 0 AND new_price >= 0),
  CONSTRAINT chk_price_history_items 
    CHECK (items_affected >= 0),
  -- Prevent direct updates to this table (immutable audit trail)
  CONSTRAINT chk_price_history_status 
    CHECK (status IN ('completed', 'pending', 'failed', 'reversed'))
);

-- 8.2 Create indexes for price_history (for audit queries)
CREATE INDEX IF NOT EXISTS idx_price_history_sku 
  ON public.price_history(sku);

CREATE INDEX IF NOT EXISTS idx_price_history_change_date 
  ON public.price_history(change_date);

-- 8.3 Enable RLS policies on price_history
-- This table is immutable - users can INSERT new records but cannot UPDATE or DELETE existing ones
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to view completed price history records (SELECT)
CREATE POLICY price_history_select ON public.price_history
  FOR SELECT
  USING (status = 'completed');

-- Policy: Allow authorized users to INSERT new price history records
-- (Note: This is more permissive - in production, restrict by user role via auth.users)
CREATE POLICY price_history_insert ON public.price_history
  FOR INSERT
  WITH CHECK (status IN ('completed', 'pending'));

-- Policy: Prevent any UPDATE operations (audit trail immutability)
CREATE POLICY price_history_no_update ON public.price_history
  FOR UPDATE
  USING (FALSE);

-- Policy: Prevent any DELETE operations (audit trail immutability)
CREATE POLICY price_history_no_delete ON public.price_history
  FOR DELETE
  USING (FALSE);

-- 8.2a PostgreSQL Function: Get price history for a SKU
CREATE OR REPLACE FUNCTION public.get_price_history(p_sku VARCHAR)
RETURNS TABLE (
  id UUID,
  sku VARCHAR,
  previous_price NUMERIC,
  new_price NUMERIC,
  change_date TIMESTAMP,
  changed_by VARCHAR,
  revaluation_impact NUMERIC,
  items_affected INT,
  reason TEXT,
  status VARCHAR,
  price_change_percent NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ph.id,
    ph.sku,
    ph.previous_price,
    ph.new_price,
    ph.change_date,
    ph.changed_by,
    ph.revaluation_impact,
    ph.items_affected,
    ph.reason,
    ph.status,
    CASE WHEN ph.previous_price > 0 
      THEN ((ph.new_price - ph.previous_price) / ph.previous_price * 100)::NUMERIC 
      ELSE NULL::NUMERIC 
    END as price_change_percent
  FROM public.price_history ph
  WHERE ph.sku = p_sku
    AND ph.status = 'completed'
  ORDER BY ph.change_date DESC;
END;
$$ LANGUAGE plpgsql;

-- 8.2b PostgreSQL Function: Get total revaluation impact
CREATE OR REPLACE FUNCTION public.get_total_revaluation_impact(start_date TIMESTAMP DEFAULT NULL)
RETURNS TABLE (
  total_updates INT,
  total_revaluation_impact NUMERIC,
  avg_price_change_percent NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INT as total_updates,
    COALESCE(SUM(ph.revaluation_impact), 0)::NUMERIC as total_revaluation_impact,
    CASE WHEN COUNT(*) > 0 THEN 
      AVG(CASE WHEN ph.previous_price > 0 
        THEN ((ph.new_price - ph.previous_price) / ph.previous_price * 100) 
        ELSE 0 
      END)::NUMERIC
      ELSE 0::NUMERIC
    END as avg_price_change_percent
  FROM public.price_history ph
  WHERE ph.status = 'completed'
    AND (start_date IS NULL OR ph.change_date >= start_date);
END;
$$ LANGUAGE plpgsql;

-- 8.2c PostgreSQL Function: Calculate revaluation impact for a price change
CREATE OR REPLACE FUNCTION public.calculate_revaluation_impact(
  p_sku VARCHAR,
  p_new_price NUMERIC
)
RETURNS TABLE (
  impact_amount NUMERIC,
  items_affected INT,
  percentage_change NUMERIC,
  current_price NUMERIC,
  new_price NUMERIC
) AS $$
DECLARE
  v_current_price NUMERIC;
  v_stock_qty INT;
  v_impact NUMERIC;
  v_pct_change NUMERIC;
BEGIN
  -- Get current price and stock quantity
  SELECT price, stock_on_hand INTO v_current_price, v_stock_qty
  FROM public.products
  WHERE sku = p_sku;
  
  IF NOT FOUND THEN
    -- Return zeros if product not found
    RETURN QUERY SELECT 0::NUMERIC, 0::INT, 0::NUMERIC, NULL::NUMERIC, p_new_price::NUMERIC;
    RETURN;
  END IF;
  
  -- Calculate impact: (new - old) * quantity
  v_impact := (p_new_price - COALESCE(v_current_price, 0)) * COALESCE(v_stock_qty, 0);
  
  -- Calculate percentage change
  IF v_current_price > 0 THEN
    v_pct_change := ((p_new_price - v_current_price) / v_current_price) * 100;
  ELSE
    v_pct_change := 0;
  END IF;
  
  RETURN QUERY SELECT v_impact, v_stock_qty, v_pct_change, v_current_price, p_new_price;
END;
$$ LANGUAGE plpgsql;

-- 8.2d PostgreSQL Function: Atomically update price and log to price_history
CREATE OR REPLACE FUNCTION public.update_price_with_history(
  p_sku VARCHAR,
  p_new_price NUMERIC,
  p_changed_by VARCHAR,
  p_change_reason VARCHAR
)
RETURNS TABLE (
  success BOOLEAN,
  old_price NUMERIC,
  new_price NUMERIC,
  impact_amount NUMERIC,
  items_affected INT,
  percentage_change NUMERIC,
  history_id UUID,
  timestamp TIMESTAMP,
  error TEXT
) AS $$
DECLARE
  v_old_price NUMERIC;
  v_stock_qty INT;
  v_impact NUMERIC;
  v_pct_change NUMERIC;
  v_history_id UUID;
  v_error_msg TEXT;
BEGIN
  -- Get current price and stock for this SKU
  SELECT price, stock_on_hand INTO v_old_price, v_stock_qty
  FROM public.products
  WHERE sku = p_sku;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::NUMERIC, p_new_price, 0::NUMERIC, 0::INT, 0::NUMERIC, NULL::UUID, CURRENT_TIMESTAMP, 'Product not found'::TEXT;
    RETURN;
  END IF;
  
  -- Calculate impact
  v_impact := (p_new_price - COALESCE(v_old_price, 0)) * COALESCE(v_stock_qty, 0);
  
  IF v_old_price > 0 THEN
    v_pct_change := ((p_new_price - v_old_price) / v_old_price) * 100;
  ELSE
    v_pct_change := 0;
  END IF;
  
  BEGIN
    -- Insert audit record first
    INSERT INTO public.price_history (
      id, sku, previous_price, new_price, change_date, changed_by, 
      revaluation_impact, items_affected, reason, status
    )
    VALUES (
      gen_random_uuid(), p_sku, v_old_price, p_new_price, CURRENT_TIMESTAMP, p_changed_by,
      v_impact, v_stock_qty, p_change_reason, 'completed'
    )
    RETURNING id INTO v_history_id;
    
    -- Update product price
    UPDATE public.products
    SET price = p_new_price, updated_at = CURRENT_TIMESTAMP
    WHERE sku = p_sku;
    
    -- Return success
    RETURN QUERY SELECT TRUE, v_old_price, p_new_price, v_impact, v_stock_qty, v_pct_change, v_history_id, CURRENT_TIMESTAMP, NULL::TEXT;
    
  EXCEPTION WHEN OTHERS THEN
    v_error_msg := SQLERRM;
    RETURN QUERY SELECT FALSE, v_old_price, p_new_price, v_impact, v_stock_qty, v_pct_change, NULL::UUID, CURRENT_TIMESTAMP, v_error_msg::TEXT;
  END;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- FEATURE 3: ONLINE USERS & AUDIT SCHEMA (Tasks 14.1-14.3)
-- ============================================================================

-- 14.1 Create sessions table for real-time user tracking
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  session_id VARCHAR(500) NOT NULL UNIQUE,
  login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_action VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  status VARCHAR(50) DEFAULT 'active'
);

-- 14.2 Create user_actions table for audit trail
CREATE TABLE IF NOT EXISTS public.user_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  action_type VARCHAR(100) NOT NULL,
  action_details JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  session_id VARCHAR(500)
);

-- 14.3 Create indexes for sessions and actions
CREATE INDEX IF NOT EXISTS idx_sessions_active 
  ON public.sessions(status) 
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_sessions_user 
  ON public.sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_session_id 
  ON public.sessions(session_id);

CREATE INDEX IF NOT EXISTS idx_user_actions_user 
  ON public.user_actions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_actions_timestamp 
  ON public.user_actions(timestamp);

CREATE INDEX IF NOT EXISTS idx_user_actions_action 
  ON public.user_actions(action_type);

CREATE INDEX IF NOT EXISTS idx_user_actions_session 
  ON public.user_actions(session_id);

-- 14.2a PostgreSQL Function: Initialize session (create new session)
CREATE OR REPLACE FUNCTION public.initializeSession(
  p_user_id VARCHAR,
  p_ip_address VARCHAR
)
RETURNS VARCHAR AS $$
DECLARE
  v_session_id VARCHAR;
  v_uuid UUID;
BEGIN
  v_session_id := 'sess_' || gen_random_uuid()::text;
  v_uuid := gen_random_uuid();
  
  INSERT INTO public.sessions (id, user_id, username, session_id, ip_address, status)
  VALUES (v_uuid, p_user_id, '', v_session_id, p_ip_address, 'active');
  
  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- 14.2a.1 PostgreSQL Function: Create session (backward compatibility)
CREATE OR REPLACE FUNCTION public.create_session(
  p_user_id VARCHAR,
  p_username VARCHAR,
  p_ip_address VARCHAR
)
RETURNS UUID AS $$
DECLARE
  v_session_id VARCHAR;
  v_uuid UUID;
BEGIN
  v_session_id := 'sess_' || gen_random_uuid()::text;
  v_uuid := gen_random_uuid();
  
  INSERT INTO public.sessions (id, user_id, username, session_id, ip_address, status)
  VALUES (v_uuid, p_user_id, p_username, v_session_id, p_ip_address, 'active');
  
  RETURN v_uuid;
END;
$$ LANGUAGE plpgsql;

-- 14.2b PostgreSQL Function: End session (mark as terminated)
CREATE OR REPLACE FUNCTION public.endSession(
  p_session_id VARCHAR
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.sessions
  SET status = 'inactive',
      last_activity = CURRENT_TIMESTAMP
  WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- 14.2b.1 PostgreSQL Function: Update last activity
CREATE OR REPLACE FUNCTION public.updateLastActivity(
  p_session_id VARCHAR
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.sessions
  SET last_activity = CURRENT_TIMESTAMP
  WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- 14.2b.2 PostgreSQL Function: Update last activity (legacy - with action)
CREATE OR REPLACE FUNCTION public.update_last_activity(
  p_session_id VARCHAR,
  p_last_action VARCHAR
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.sessions
  SET last_activity = CURRENT_TIMESTAMP,
      last_action = p_last_action
  WHERE session_id = p_session_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 14.2c PostgreSQL Function: Get active sessions with user info
CREATE OR REPLACE FUNCTION public.getActiveSessions()
RETURNS TABLE (
  session_id VARCHAR,
  user_id VARCHAR,
  username VARCHAR,
  login_time TIMESTAMP,
  last_activity TIMESTAMP,
  last_action VARCHAR,
  time_online_minutes INT,
  idle_minutes INT,
  status VARCHAR,
  ip_address VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.session_id,
    s.user_id,
    s.username,
    s.login_time,
    s.last_activity,
    s.last_action,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - s.login_time))::INT / 60 as time_online_minutes,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - s.last_activity))::INT / 60 as idle_minutes,
    s.status,
    s.ip_address
  FROM public.sessions s
  WHERE s.status = 'active'
  ORDER BY s.last_activity DESC;
END;
$$ LANGUAGE plpgsql;

-- 14.2c.1 PostgreSQL Function: Get active sessions (legacy - with older filter)
CREATE OR REPLACE FUNCTION public.get_active_sessions()
RETURNS TABLE (
  user_id VARCHAR,
  username VARCHAR,
  login_time TIMESTAMP,
  last_activity TIMESTAMP,
  last_action VARCHAR,
  time_online_minutes INT,
  idle_minutes INT,
  status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.user_id,
    s.username,
    s.login_time,
    s.last_activity,
    s.last_action,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - s.login_time))::INT / 60 as time_online_minutes,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - s.last_activity))::INT / 60 as idle_minutes,
    s.status
  FROM public.sessions s
  WHERE s.status IN ('active', 'idle')
  ORDER BY s.last_activity DESC;
END;
$$ LANGUAGE plpgsql;

-- 14.2d PostgreSQL Function: Log user action
CREATE OR REPLACE FUNCTION public.log_user_action(
  p_user_id VARCHAR,
  p_username VARCHAR,
  p_action_type VARCHAR,
  p_action_details JSONB,
  p_session_id VARCHAR
)
RETURNS UUID AS $$
DECLARE
  v_uuid UUID;
BEGIN
  v_uuid := gen_random_uuid();
  
  INSERT INTO public.user_actions (id, user_id, username, action_type, action_details, timestamp, session_id)
  VALUES (v_uuid, p_user_id, p_username, p_action_type, p_action_details, CURRENT_TIMESTAMP, p_session_id);
  
  -- Update session last activity
  PERFORM public.update_last_activity(p_session_id, p_action_type);
  
  RETURN v_uuid;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verification queries to confirm successful deployment:
--
-- SELECT COUNT(*) as total_tables FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name IN 
-- ('expiry_alerts', 'price_history', 'sessions', 'user_actions');
--
-- SELECT proname FROM pg_proc WHERE pronamespace = 
-- (SELECT oid FROM pg_namespace WHERE nspname = 'public') 
-- AND proname LIKE 'get_%' OR proname LIKE 'create_%' OR proname LIKE 'log_%' OR proname LIKE 'update_%';
--
-- Timestamp: 2025-01-17
-- Status: All migrations applied successfully
