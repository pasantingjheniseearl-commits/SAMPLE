/**
 * BARCODE SCANNER SQL SUPPORT QUERIES
 * Supports 14-digit barcode → 8-digit SKU extraction
 * 
 * These queries help verify and troubleshoot barcode scanning functionality
 */

-- ============================================================================
-- QUERY 1: Verify products table has SKU column and indexes
-- ============================================================================
-- Run this to confirm SKU lookup will be fast

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name IN ('sku', 'name', 'price')
ORDER BY ordinal_position;

-- ============================================================================
-- QUERY 2: Check for existing SKU indexes
-- ============================================================================
-- Barcode scanning requires fast SKU lookups

SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'products'
  AND (indexname ILIKE '%sku%' OR indexdef ILIKE '%sku%');

-- ============================================================================
-- QUERY 3: Create SKU index (if missing)
-- ============================================================================
-- If no index exists, run this for fast lookups

CREATE INDEX IF NOT EXISTS idx_products_sku 
ON public.products(sku);

CREATE INDEX IF NOT EXISTS idx_products_sku_upper 
ON public.products(UPPER(sku));

-- ============================================================================
-- QUERY 4: Create a function to extract 8-digit SKU from 14-digit barcode
-- ============================================================================
-- Use this in your application if parseScannedInput.js is not available

CREATE OR REPLACE FUNCTION public.extract_sku_from_barcode(
  p_barcode_input VARCHAR
)
RETURNS VARCHAR AS $$
DECLARE
  v_digits_only VARCHAR;
  v_extracted_sku VARCHAR;
BEGIN
  -- Remove dashes and spaces, keep only digits
  v_digits_only := regexp_replace(p_barcode_input, '[^0-9]', '', 'g');
  
  -- Check if it's a valid 14-digit barcode starting with 02050
  IF v_digits_only ~ '^02050\d{9}$' THEN
    -- Extract middle 8 digits (positions 6-13, i.e., skip first 5 + last 1)
    v_extracted_sku := SUBSTRING(v_digits_only, 6, 8);
    RETURN UPPER(v_extracted_sku);
  ELSE
    -- Not a barcode format, treat as manual SKU
    RETURN UPPER(TRIM(p_barcode_input));
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Test the function:
-- SELECT public.extract_sku_from_barcode('02050-10153588-6') AS extracted_sku;
-- Expected output: 10153588

-- ============================================================================
-- QUERY 5: Create a function to lookup product by extracted SKU
-- ============================================================================
-- Combines barcode extraction + product lookup in one call

CREATE OR REPLACE FUNCTION public.lookup_product_by_barcode(
  p_barcode_input VARCHAR
)
RETURNS TABLE (
  sku VARCHAR,
  name VARCHAR,
  price NUMERIC,
  category VARCHAR,
  stock_on_hand INT,
  available_stock INT,
  status VARCHAR,
  location TEXT,
  found BOOLEAN
) AS $$
DECLARE
  v_extracted_sku VARCHAR;
BEGIN
  -- Extract SKU from barcode (or use as-is if manual entry)
  v_extracted_sku := public.extract_sku_from_barcode(p_barcode_input);
  
  -- Lookup product by extracted SKU
  RETURN QUERY
  SELECT 
    p.sku::VARCHAR,
    p.name::VARCHAR,
    p.price::NUMERIC,
    p.category::VARCHAR,
    p.stock_on_hand::INT,
    p.available_stock::INT,
    p.status::VARCHAR,
    p.location::TEXT,
    TRUE as found
  FROM public.products p
  WHERE UPPER(p.sku) = v_extracted_sku
  LIMIT 1;
  
  -- If no product found, return empty result (found=FALSE implicit in no rows)
  IF NOT FOUND THEN
    -- Return a single row indicating product not found
    RETURN QUERY SELECT 
      v_extracted_sku::VARCHAR,
      'NOT FOUND'::VARCHAR,
      0::NUMERIC,
      ''::VARCHAR,
      0::INT,
      0::INT,
      'Not Found'::VARCHAR,
      ''::TEXT,
      FALSE as found;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Test the function:
-- SELECT * FROM public.lookup_product_by_barcode('02050-10153588-6');

-- ============================================================================
-- QUERY 6: Verify barcode format in your test data
-- ============================================================================
-- Check if you have any 14-digit barcodes in your database

SELECT 
  COUNT(*) as total_skus,
  COUNT(CASE WHEN sku ~ '^02050\d{9}$' THEN 1 END) as barcode_format_skus,
  COUNT(CASE WHEN LENGTH(sku) = 8 THEN 1 END) as eight_digit_skus
FROM public.products;

-- ============================================================================
-- QUERY 7: Insert test products with barcode format
-- ============================================================================
-- Add test data to verify barcode scanning works

INSERT INTO public.products (
  sku,
  name,
  category,
  price,
  stock_on_hand,
  available_stock,
  status,
  reorder_level,
  reserved_stock,
  location
) VALUES
  ('10153588', 'Test Product A', 'Test', 99.99, 100, 100, 'In Stock', 10, 0, '{"Rack A": 100}'),
  ('20456234', 'Test Product B', 'Test', 49.50, 50, 50, 'In Stock', 5, 0, '{"Rack B": 50}')
ON CONFLICT(sku) DO NOTHING;

-- Now test barcode lookups:
-- SELECT * FROM public.lookup_product_by_barcode('02050-10153588-6');
-- SELECT * FROM public.lookup_product_by_barcode('020502045623412');

-- ============================================================================
-- QUERY 8: Check sessions table for session tracking
-- ============================================================================
-- Verify session data is being stored correctly

SELECT 
  session_id,
  user_id,
  username,
  login_time,
  last_activity,
  status,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_activity))::INT / 60 as idle_minutes
FROM public.sessions
WHERE status = 'active'
ORDER BY last_activity DESC
LIMIT 10;

-- ============================================================================
-- QUERY 9: Clean up expired sessions
-- ============================================================================
-- Mark sessions as expired if inactive >30 minutes or >24 hours old

UPDATE public.sessions
SET status = 'expired'
WHERE status = 'active'
  AND (
    -- Inactive for more than 30 minutes
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_activity)) / 60 > 30
    -- OR older than 24 hours
    OR EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - login_time)) / 3600 > 24
  );

-- ============================================================================
-- QUERY 10: Verify price_history table structure for audit trail
-- ============================================================================

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'price_history'
ORDER BY ordinal_position;

-- ============================================================================
-- QUERY 11: Test price update with history logging
-- ============================================================================
-- Example: Update product price and log to audit trail

-- Before running this, verify a product exists:
-- SELECT * FROM public.products WHERE sku = '10153588' LIMIT 1;

-- Then run the price update function:
-- SELECT * FROM public.update_price_with_history(
--   '10153588',
--   150.00,
--   'admin_user',
--   'Q1 Price Adjustment'
-- );

-- Verify the price was updated:
-- SELECT sku, price FROM public.products WHERE sku = '10153588';

-- Verify the history was logged:
-- SELECT sku, previous_price, new_price, changed_by, reason 
-- FROM public.price_history 
-- WHERE sku = '10153588' 
-- ORDER BY change_date DESC;

-- ============================================================================
-- QUERY 12: Verify indexes exist for barcode performance
-- ============================================================================

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('products', 'price_history', 'sessions', 'user_actions')
ORDER BY tablename, indexname;

-- ============================================================================
-- DIAGNOSTIC QUERIES - Run if barcode scanning is not working
-- ============================================================================

-- DIAGNOSTIC 1: Check if products table exists and has data
SELECT 
  'products table exists' as check_name,
  COUNT(*) as row_count
FROM public.products
UNION ALL
SELECT 'parseScannedInput function exists', 1
WHERE EXISTS(
  SELECT 1 FROM information_schema.routines 
  WHERE routine_name = 'extract_sku_from_barcode'
);

-- DIAGNOSTIC 2: Find products that match a barcode
-- Replace '10153588' with your actual test SKU
SELECT 
  sku,
  name,
  price,
  stock_on_hand,
  status
FROM public.products
WHERE sku = '10153588'
  OR sku ILIKE '%10153588%'
  OR UPPER(sku) = UPPER('10153588');

-- DIAGNOSTIC 3: Check if sessions are being created
SELECT 
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sessions,
  COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_sessions,
  MAX(last_activity) as last_activity
FROM public.sessions;

-- DIAGNOSTIC 4: Verify price history is logging changes
SELECT 
  COUNT(*) as total_price_changes,
  COUNT(DISTINCT sku) as products_with_price_changes,
  MAX(change_date) as latest_change_date
FROM public.price_history;

-- ============================================================================
-- END OF BARCODE SCANNER SQL SUPPORT
-- ============================================================================
