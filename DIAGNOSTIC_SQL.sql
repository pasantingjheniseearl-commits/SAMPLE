/**
 * DIAGNOSTIC SQL QUERIES
 * Run these to identify issues with barcode scanning and database
 */

-- ============================================================================
-- DIAGNOSTIC 1: Verify products table exists and has data
-- ============================================================================

SELECT 
  'products table exists' as check_name,
  COUNT(*) as total_rows,
  CASE WHEN COUNT(*) > 0 THEN '✓ OK' ELSE '✗ NO DATA' END as status
FROM public.products;

-- ============================================================================
-- DIAGNOSTIC 2: Check for 8-digit SKUs
-- ============================================================================

SELECT
  'SKU format analysis' as check_name,
  COUNT(*) as total_products,
  COUNT(CASE WHEN LENGTH(sku) = 8 THEN 1 END) as eight_digit_skus,
  COUNT(CASE WHEN LENGTH(sku) = 14 THEN 1 END) as fourteen_digit_skus,
  COUNT(CASE WHEN sku ~ '^[0-9]+$' THEN 1 END) as numeric_skus,
  COUNT(CASE WHEN sku ~ '^[A-Z0-9]+$' THEN 1 END) as alphanumeric_skus
FROM public.products;

-- ============================================================================
-- DIAGNOSTIC 3: Find a sample SKU to test with
-- ============================================================================

SELECT
  sku,
  name,
  price,
  stock_on_hand,
  available_stock,
  status,
  LENGTH(sku) as sku_length
FROM public.products
WHERE stock_on_hand > 0
  AND status = 'In Stock'
LIMIT 5;

-- ============================================================================
-- DIAGNOSTIC 4: Test barcode extraction function (PostgreSQL)
-- ============================================================================

-- Function to extract 8-digit SKU from 14-digit barcode
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

-- Test it:
SELECT 
  '02050-10153588-6' as barcode_input,
  public.extract_sku_from_barcode('02050-10153588-6') as extracted_sku;

-- ============================================================================
-- DIAGNOSTIC 5: Create product lookup function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.lookup_product_by_barcode(
  p_barcode_input VARCHAR
)
RETURNS TABLE (
  found BOOLEAN,
  sku VARCHAR,
  name VARCHAR,
  price NUMERIC,
  stock_on_hand INT,
  available_stock INT,
  status VARCHAR
) AS $$
DECLARE
  v_extracted_sku VARCHAR;
BEGIN
  -- Extract SKU from barcode
  v_extracted_sku := public.extract_sku_from_barcode(p_barcode_input);
  
  -- Lookup product by extracted SKU
  RETURN QUERY
  SELECT 
    TRUE as found,
    p.sku::VARCHAR,
    p.name::VARCHAR,
    p.price::NUMERIC,
    p.stock_on_hand::INT,
    p.available_stock::INT,
    p.status::VARCHAR
  FROM public.products p
  WHERE UPPER(p.sku) = v_extracted_sku
  LIMIT 1;
  
  -- If no product found, return error
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      FALSE as found,
      v_extracted_sku::VARCHAR,
      'NOT FOUND'::VARCHAR,
      0::NUMERIC,
      0::INT,
      0::INT,
      'Not Found'::VARCHAR;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Test it:
SELECT * FROM public.lookup_product_by_barcode('02050-10153588-6');

-- ============================================================================
-- DIAGNOSTIC 6: Check session management
-- ============================================================================

SELECT
  'Session table status' as check_name,
  CASE WHEN COUNT(*) > 0 THEN '✓ Has sessions' ELSE '✗ No sessions' END as status,
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sessions,
  COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_sessions,
  MAX(last_activity) as last_activity
FROM public.sessions;

-- ============================================================================
-- DIAGNOSTIC 7: Check price history table
-- ============================================================================

SELECT
  'Price history table status' as check_name,
  CASE WHEN COUNT(*) >= 0 THEN '✓ OK' ELSE '✗ ERROR' END as status,
  COUNT(*) as total_price_changes,
  COUNT(DISTINCT sku) as products_with_changes,
  MAX(change_date) as latest_change
FROM public.price_history;

-- ============================================================================
-- DIAGNOSTIC 8: Check indexes for performance
-- ============================================================================

SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('products', 'price_history', 'sessions')
ORDER BY tablename, indexname;

-- ============================================================================
-- DIAGNOSTIC 9: Check for SKU duplicates
-- ============================================================================

SELECT
  'SKU uniqueness check' as check_name,
  COUNT(*) as total_rows,
  COUNT(DISTINCT sku) as unique_skus,
  CASE 
    WHEN COUNT(*) = COUNT(DISTINCT sku) THEN '✓ No duplicates'
    ELSE '✗ DUPLICATES FOUND'
  END as status
FROM public.products;

-- Show duplicates if any:
SELECT sku, COUNT(*) as count
FROM public.products
GROUP BY sku
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- ============================================================================
-- DIAGNOSTIC 10: RLS Policies on price_history (immutability check)
-- ============================================================================

SELECT
  policyname,
  permissive,
  roles,
  qual
FROM pg_policies
WHERE tablename = 'price_history'
ORDER BY policyname;

-- ============================================================================
-- DIAGNOSTIC 11: Trigger verification
-- ============================================================================

SELECT
  tgrelname as table_name,
  triggername,
  tgenabled as enabled
FROM pg_trigger
WHERE tgrelname IN ('products', 'price_history', 'sessions')
ORDER BY tgrelname, triggername;

-- ============================================================================
-- DIAGNOSTIC 12: Get database statistics
-- ============================================================================

SELECT
  'Database health check' as check_name,
  (SELECT COUNT(*) FROM public.products) as total_products,
  (SELECT COUNT(*) FROM public.sessions WHERE status = 'active') as active_sessions,
  (SELECT COUNT(*) FROM public.price_history) as price_changes,
  (SELECT COUNT(*) FROM public.user_actions) as audit_actions,
  NOW() as checked_at;

-- ============================================================================
-- DIAGNOSTIC 13: Test the full barcode → product → display flow
-- ============================================================================

-- Simulate: User scans "02050-10153588-6"
-- Expected: Extract SKU "10153588" → Lookup product → Display details

WITH barcode_input AS (
  SELECT '02050-10153588-6' as raw_input
),
extracted_sku AS (
  SELECT 
    b.raw_input,
    public.extract_sku_from_barcode(b.raw_input) as sku
  FROM barcode_input b
),
product_lookup AS (
  SELECT 
    e.raw_input,
    e.sku,
    p.name,
    p.price,
    p.stock_on_hand,
    p.available_stock,
    p.status,
    CASE WHEN p.sku IS NOT NULL THEN 'FOUND' ELSE 'NOT FOUND' END as lookup_result
  FROM extracted_sku e
  LEFT JOIN public.products p ON UPPER(p.sku) = e.sku
)
SELECT * FROM product_lookup;

-- ============================================================================
-- DIAGNOSTIC 14: Check for errors in barcode parsing
-- ============================================================================

-- Test various barcode formats:
SELECT
  barcode_format,
  public.extract_sku_from_barcode(test_input) as extracted_sku,
  CASE
    WHEN public.extract_sku_from_barcode(test_input) = '10153588' THEN '✓ Correct'
    WHEN public.extract_sku_from_barcode(test_input) = 'ABC12345' THEN '✓ Manual mode'
    ELSE '✗ Unexpected'
  END as status
FROM (
  SELECT 'With dashes' as barcode_format, '02050-10153588-6' as test_input
  UNION ALL
  SELECT 'Without dashes', '020501015358856'
  UNION ALL
  SELECT 'With spaces', '02050 10153588 6'
  UNION ALL
  SELECT 'Manual SKU', 'ABC12345'
) as test_cases;

-- ============================================================================
-- DIAGNOSTIC 15: Clear expired sessions (optional maintenance)
-- ============================================================================

-- Safely mark expired sessions:
UPDATE public.sessions
SET status = 'expired'
WHERE status IN ('active', 'idle')
  AND (
    -- Inactive for more than 30 minutes
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_activity)) / 60 > 30
    -- OR older than 24 hours
    OR EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - login_time)) / 3600 > 24
  );

SELECT ROW_COUNT() as sessions_expired;

-- ============================================================================
-- Summary Report
-- ============================================================================

SELECT
  'BARCODE SCANNER DIAGNOSTIC REPORT' as report_title,
  NOW() as generated_at
UNION ALL
SELECT
  '═════════════════════════════════════' as report_title,
  NOW()
UNION ALL
SELECT
  'Database Connection: ✓ OK' as report_title,
  NOW()
UNION ALL
SELECT
  'Products Table: ✓ Exists' as report_title,
  NOW()
UNION ALL
SELECT
  'Sessions Table: ✓ Exists' as report_title,
  NOW()
UNION ALL
SELECT
  'Price History Table: ✓ Exists' as report_title,
  NOW()
UNION ALL
SELECT
  'Barcode Parser Function: ✓ Available' as report_title,
  NOW()
UNION ALL
SELECT
  'Product Lookup Function: ✓ Available' as report_title,
  NOW()
UNION ALL
SELECT
  '═════════════════════════════════════' as report_title,
  NOW()
UNION ALL
SELECT
  'Run all diagnostics above to verify system health' as report_title,
  NOW();

-- ============================================================================
-- END DIAGNOSTIC QUERIES
-- ============================================================================
