/**
 * WAVE 2: SQL Functions for Price Operations (Task 8.2)
 * 
 * This SQL script implements:
 * - calculateRevaluationImpact(sku, newPrice): Calculate financial impact of price change
 * - updatePriceWithHistory(sku, newPrice, changedBy, reason): Atomic update with audit logging
 * 
 * Created: 2025-01-17
 * Project: REMN-1603 WMS Enhancements
 * Database: Supabase PostgreSQL 17
 * Requirements: 6.1, 6.2
 */

-- ============================================================================
-- FUNCTION: calculateRevaluationImpact
-- ============================================================================
-- 
-- PURPOSE: Calculate the financial impact of a price change
-- 
-- PARAMETERS:
--   p_sku: The product SKU identifier
--   p_new_price: The new unit price to apply
-- 
-- RETURNS: JSON object with:
--   impactAmount: The total revaluation amount (gain or loss)
--   itemsAffected: The quantity of items affected
--   percentageChange: The percentage change in total inventory value
-- 
-- BEHAVIOR:
--   - Retrieves current inventory quantity and price for the SKU
--   - Calculates impact as: (newPrice - currentPrice) × quantity
--   - Returns null if SKU not found
--   - Handles edge cases: zero quantity, missing product
-- 
-- REQUIREMENTS: 6.1, 6.2

CREATE OR REPLACE FUNCTION public.calculate_revaluation_impact(
  p_sku VARCHAR,
  p_new_price NUMERIC
)
RETURNS JSON AS $$
DECLARE
  v_current_price NUMERIC;
  v_stock_quantity INT;
  v_current_inventory_value NUMERIC;
  v_new_inventory_value NUMERIC;
  v_impact_amount NUMERIC;
  v_percentage_change NUMERIC;
BEGIN
  -- Get current product data
  SELECT 
    COALESCE(p.price, 0),
    COALESCE(p.stock_on_hand, 0)
  INTO v_current_price, v_stock_quantity
  FROM public.products p
  WHERE p.sku = p_sku;
  
  -- If product not found, return null
  IF v_current_price IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Calculate inventory values
  v_current_inventory_value := v_current_price * v_stock_quantity;
  v_new_inventory_value := p_new_price * v_stock_quantity;
  
  -- Calculate impact amount (gain/loss)
  v_impact_amount := v_new_inventory_value - v_current_inventory_value;
  
  -- Calculate percentage change
  IF v_current_inventory_value = 0 THEN
    -- If current inventory value is 0, set percentage to 0 (or NULL if quantity is also 0)
    v_percentage_change := CASE 
      WHEN v_stock_quantity = 0 THEN 0
      ELSE NULL
    END;
  ELSE
    v_percentage_change := (v_impact_amount / v_current_inventory_value) * 100;
  END IF;
  
  -- Return result as JSON object
  RETURN json_build_object(
    'impactAmount', ROUND(v_impact_amount::NUMERIC, 2),
    'itemsAffected', v_stock_quantity,
    'percentageChange', ROUND(v_percentage_change::NUMERIC, 2)
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.calculate_revaluation_impact(VARCHAR, NUMERIC) IS 
'Calculate the financial impact (gain/loss) of applying a new price to existing inventory';


-- ============================================================================
-- FUNCTION: updatePriceWithHistory
-- ============================================================================
-- 
-- PURPOSE: Atomically update a product price and log the change to history
-- 
-- PARAMETERS:
--   p_sku: The product SKU identifier
--   p_new_price: The new unit price to apply
--   p_changed_by: Username of the person making the change
--   p_change_reason: Optional reason for the price change
-- 
-- RETURNS: JSON object with status and transaction data:
--   success: boolean indicating if update succeeded
--   old_price: The price before update
--   new_price: The price after update
--   impact_amount: The revaluation impact calculated
--   items_affected: The quantity of items affected
--   percentage_change: The percentage change in inventory value
--   history_id: UUID of the price_history record created
--   timestamp: ISO timestamp of when change was applied
-- 
-- BEHAVIOR:
--   - Uses PostgreSQL transaction semantics to ensure atomicity
--   - Validates that product exists before attempting update
--   - Calculates revaluation impact using calculate_revaluation_impact()
--   - Updates products.price for the SKU
--   - Inserts record into price_history audit table
--   - Rolls back entire transaction if any step fails
--   - Returns success=false if product not found
-- 
-- REQUIREMENTS: 6.1, 6.2, 6.3, 6.4

CREATE OR REPLACE FUNCTION public.update_price_with_history(
  p_sku VARCHAR,
  p_new_price NUMERIC,
  p_changed_by VARCHAR DEFAULT 'System',
  p_change_reason VARCHAR DEFAULT 'Price adjustment'
)
RETURNS JSON AS $$
DECLARE
  v_old_price NUMERIC;
  v_stock_quantity INT;
  v_product_name VARCHAR;
  v_impact_json JSON;
  v_impact_amount NUMERIC;
  v_items_affected INT;
  v_percentage_change NUMERIC;
  v_history_id UUID;
  v_current_inventory_value NUMERIC;
  v_new_inventory_value NUMERIC;
BEGIN
  -- Verify product exists and capture current state
  SELECT 
    COALESCE(p.price, 0),
    COALESCE(p.stock_on_hand, 0),
    p.name
  INTO v_old_price, v_stock_quantity, v_product_name
  FROM public.products p
  WHERE p.sku = p_sku;
  
  -- If product not found, return error
  IF v_product_name IS NULL THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', 'Product not found: ' || p_sku
    );
  END IF;
  
  -- Calculate revaluation impact
  v_impact_json := public.calculate_revaluation_impact(p_sku, p_new_price);
  
  IF v_impact_json IS NULL THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', 'Failed to calculate revaluation impact'
    );
  END IF;
  
  -- Extract impact data from JSON
  v_impact_amount := (v_impact_json->>'impactAmount')::NUMERIC;
  v_items_affected := (v_impact_json->>'itemsAffected')::INT;
  v_percentage_change := (v_impact_json->>'percentageChange')::NUMERIC;
  
  -- Calculate inventory values for audit trail
  v_current_inventory_value := v_old_price * v_stock_quantity;
  v_new_inventory_value := p_new_price * v_stock_quantity;
  
  -- Atomically: (1) Update product price
  UPDATE public.products
  SET 
    price = p_new_price,
    updated_at = CURRENT_TIMESTAMP
  WHERE sku = p_sku;
  
  -- Atomically: (2) Insert audit record into price_history
  INSERT INTO public.price_history (
    sku,
    old_price,
    new_price,
    stock_quantity,
    inventory_value_before,
    inventory_value_after,
    revaluation_gain_loss,
    changed_by,
    change_reason,
    change_date,
    approved
  ) VALUES (
    p_sku,
    v_old_price,
    p_new_price,
    v_stock_quantity,
    v_current_inventory_value,
    v_new_inventory_value,
    v_impact_amount,
    p_changed_by,
    p_change_reason,
    CURRENT_TIMESTAMP,
    TRUE
  )
  RETURNING id INTO v_history_id;
  
  -- Return success response with full transaction details
  RETURN json_build_object(
    'success', TRUE,
    'old_price', ROUND(v_old_price::NUMERIC, 2),
    'new_price', ROUND(p_new_price::NUMERIC, 2),
    'impact_amount', ROUND(v_impact_amount::NUMERIC, 2),
    'items_affected', v_items_affected,
    'percentage_change', ROUND(v_percentage_change::NUMERIC, 2),
    'history_id', v_history_id::TEXT,
    'timestamp', to_iso8601(CURRENT_TIMESTAMP)
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Return error response - transaction will be rolled back
  RETURN json_build_object(
    'success', FALSE,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_price_with_history(VARCHAR, NUMERIC, VARCHAR, VARCHAR) IS 
'Atomically update a product price and create an audit trail record in price_history';


-- ============================================================================
-- HELPER FUNCTION: to_iso8601
-- ============================================================================
-- 
-- PURPOSE: Convert PostgreSQL timestamp to ISO 8601 format
-- USAGE: SELECT to_iso8601(CURRENT_TIMESTAMP);

CREATE OR REPLACE FUNCTION public.to_iso8601(ts TIMESTAMP)
RETURNS TEXT AS $$
BEGIN
  RETURN to_char(ts, 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ============================================================================
-- MIGRATION VERIFICATION
-- ============================================================================

-- Run these verification queries to confirm successful deployment:
--
-- 1. Verify functions exist:
--    SELECT proname FROM pg_proc 
--    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
--    AND proname IN ('calculate_revaluation_impact', 'update_price_with_history', 'to_iso8601');
--
-- 2. Test calculateRevaluationImpact:
--    SELECT public.calculate_revaluation_impact('TEST-SKU', 50.00);
--
-- 3. Test updatePriceWithHistory (make sure product exists first):
--    SELECT public.update_price_with_history('TEST-SKU', 75.00, 'admin', 'Q1 Price Review');
--
-- 4. Verify price_history was populated:
--    SELECT sku, old_price, new_price, revaluation_gain_loss FROM public.price_history 
--    WHERE sku = 'TEST-SKU' ORDER BY change_date DESC LIMIT 5;
--
-- Timestamp: 2025-01-17
-- Status: Price operation functions deployed

