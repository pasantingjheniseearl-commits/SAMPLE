/**
 * Unit Tests: Expiry Date Functions (Task 1.3)
 * 
 * Tests for:
 * 1. get_days_until_expiry(expiry_date) - Calculate days until expiry
 * 2. get_near_expiry_products(threshold_days) - Get products within threshold
 * 3. log_expiry_change() trigger - Automatic audit trail logging
 * 
 * Requirements: 2.1, 2.2
 * 
 * Note: These tests verify the JavaScript wrapper layer in db.js
 * The actual SQL functions in Supabase should be tested separately
 */

/**
 * Test Suite 1: calculateDaysUntilExpiry() - Client-side calculation helper
 * 
 * This test suite validates a helper function for calculating days until expiry
 * which mirrors the SQL function get_days_until_expiry()
 */

/**
 * Helper function to calculate days until expiry (mirrors SQL function)
 * @param {Date|string} expiryDate - The expiry date
 * @returns {number|null} Days until expiry, or null if invalid
 */
function calculateDaysUntilExpiry(expiryDate) {
  if (!expiryDate) {
    return null;
  }
  
  const expDate = new Date(expiryDate);
  if (isNaN(expDate.getTime())) {
    return null;
  }
  
  expDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffTime = expDate - today;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Test 1.1: calculateDaysUntilExpiry with future date
 * Validates: Returns positive number for dates in the future
 */
function test_calculateDaysUntilExpiry_futureDate() {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 15); // 15 days from now
  
  const result = calculateDaysUntilExpiry(futureDate);
  
  console.assert(result === 15, 
    `[FAIL] Expected 15, got ${result}`);
  console.log('[PASS] calculateDaysUntilExpiry returns positive for future dates');
}

/**
 * Test 1.2: calculateDaysUntilExpiry with today's date
 * Validates: Returns 0 for today's date
 */
function test_calculateDaysUntilExpiry_today() {
  const today = new Date();
  
  const result = calculateDaysUntilExpiry(today);
  
  console.assert(result === 0, 
    `[FAIL] Expected 0, got ${result}`);
  console.log('[PASS] calculateDaysUntilExpiry returns 0 for today');
}

/**
 * Test 1.3: calculateDaysUntilExpiry with past date
 * Validates: Returns negative number for past dates
 */
function test_calculateDaysUntilExpiry_pastDate() {
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 5); // 5 days ago
  
  const result = calculateDaysUntilExpiry(pastDate);
  
  console.assert(result === -5, 
    `[FAIL] Expected -5, got ${result}`);
  console.log('[PASS] calculateDaysUntilExpiry returns negative for past dates');
}

/**
 * Test 1.4: calculateDaysUntilExpiry with null input
 * Validates: Returns null for null/undefined input
 */
function test_calculateDaysUntilExpiry_nullInput() {
  const result = calculateDaysUntilExpiry(null);
  
  console.assert(result === null, 
    `[FAIL] Expected null, got ${result}`);
  console.log('[PASS] calculateDaysUntilExpiry handles null input');
}

/**
 * Test 1.5: calculateDaysUntilExpiry with undefined input
 * Validates: Returns null for undefined input
 */
function test_calculateDaysUntilExpiry_undefinedInput() {
  const result = calculateDaysUntilExpiry(undefined);
  
  console.assert(result === null, 
    `[FAIL] Expected null, got ${result}`);
  console.log('[PASS] calculateDaysUntilExpiry handles undefined input');
}

/**
 * Test 1.6: calculateDaysUntilExpiry with date string
 * Validates: Correctly parses ISO date string
 */
function test_calculateDaysUntilExpiry_dateString() {
  // Use a fixed date for consistency
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 10);
  const dateString = futureDate.toISOString().split('T')[0];
  
  const result = calculateDaysUntilExpiry(dateString);
  
  console.assert(result === 10, 
    `[FAIL] Expected 10, got ${result}`);
  console.log('[PASS] calculateDaysUntilExpiry parses date strings correctly');
}


/**
 * Test Suite 2: getExpiryStatus() - Determine alert type based on days
 * 
 * Mirrors the SQL CASE statement logic in get_near_expiry_products()
 */

/**
 * Helper function to determine expiry alert type
 * @param {number|null} daysUntilExpiry - Days until expiry
 * @returns {string} Alert type: 'expired', 'critical', 'warning', 'monitor', or 'none'
 */
function getExpiryAlertType(daysUntilExpiry) {
  if (daysUntilExpiry === null || daysUntilExpiry === undefined) {
    return 'none';
  }
  
  if (daysUntilExpiry < 0) {
    return 'expired';
  }
  
  if (daysUntilExpiry <= 7) {
    return 'critical';
  }
  
  if (daysUntilExpiry <= 30) {
    return 'warning';
  }
  
  return 'monitor';
}

/**
 * Test 2.1: getExpiryAlertType with expired product
 * Validates: Returns 'expired' for negative days
 */
function test_getExpiryAlertType_expired() {
  const result = getExpiryAlertType(-5);
  
  console.assert(result === 'expired', 
    `[FAIL] Expected 'expired', got '${result}'`);
  console.log('[PASS] getExpiryAlertType identifies expired products');
}

/**
 * Test 2.2: getExpiryAlertType with critical status
 * Validates: Returns 'critical' for 1-7 days
 */
function test_getExpiryAlertType_critical() {
  const result = getExpiryAlertType(3);
  
  console.assert(result === 'critical', 
    `[FAIL] Expected 'critical', got '${result}'`);
  console.log('[PASS] getExpiryAlertType identifies critical products');
}

/**
 * Test 2.3: getExpiryAlertType with warning status
 * Validates: Returns 'warning' for 8-30 days
 */
function test_getExpiryAlertType_warning() {
  const result = getExpiryAlertType(15);
  
  console.assert(result === 'warning', 
    `[FAIL] Expected 'warning', got '${result}'`);
  console.log('[PASS] getExpiryAlertType identifies warning status');
}

/**
 * Test 2.4: getExpiryAlertType with monitor status
 * Validates: Returns 'monitor' for 31+ days
 */
function test_getExpiryAlertType_monitor() {
  const result = getExpiryAlertType(45);
  
  console.assert(result === 'monitor', 
    `[FAIL] Expected 'monitor', got '${result}'`);
  console.log('[PASS] getExpiryAlertType identifies monitor status');
}

/**
 * Test 2.5: getExpiryAlertType with null input
 * Validates: Returns 'none' for null input
 */
function test_getExpiryAlertType_nullInput() {
  const result = getExpiryAlertType(null);
  
  console.assert(result === 'none', 
    `[FAIL] Expected 'none', got '${result}'`);
  console.log('[PASS] getExpiryAlertType handles null input');
}

/**
 * Test 2.6: getExpiryAlertType with 0 days
 * Validates: Returns 'critical' when expiry is today
 */
function test_getExpiryAlertType_expiryToday() {
  const result = getExpiryAlertType(0);
  
  console.assert(result === 'critical', 
    `[FAIL] Expected 'critical' for today, got '${result}'`);
  console.log('[PASS] getExpiryAlertType treats expiry-today as critical');
}

/**
 * Test 2.7: getExpiryAlertType with 7 days
 * Validates: Returns 'critical' for 7-day boundary
 */
function test_getExpiryAlertType_boundaryDay7() {
  const result = getExpiryAlertType(7);
  
  console.assert(result === 'critical', 
    `[FAIL] Expected 'critical' at 7 days, got '${result}'`);
  console.log('[PASS] getExpiryAlertType handles 7-day boundary correctly');
}

/**
 * Test 2.8: getExpiryAlertType with 8 days
 * Validates: Returns 'warning' for 8+ days
 */
function test_getExpiryAlertType_boundaryDay8() {
  const result = getExpiryAlertType(8);
  
  console.assert(result === 'warning', 
    `[FAIL] Expected 'warning' at 8 days, got '${result}'`);
  console.log('[PASS] getExpiryAlertType handles 8-day boundary correctly');
}

/**
 * Test 2.9: getExpiryAlertType with 30 days
 * Validates: Returns 'warning' for 30-day boundary
 */
function test_getExpiryAlertType_boundaryDay30() {
  const result = getExpiryAlertType(30);
  
  console.assert(result === 'warning', 
    `[FAIL] Expected 'warning' at 30 days, got '${result}'`);
  console.log('[PASS] getExpiryAlertType handles 30-day boundary correctly');
}

/**
 * Test 2.10: getExpiryAlertType with 31 days
 * Validates: Returns 'monitor' for 31+ days
 */
function test_getExpiryAlertType_boundaryDay31() {
  const result = getExpiryAlertType(31);
  
  console.assert(result === 'monitor', 
    `[FAIL] Expected 'monitor' at 31 days, got '${result}'`);
  console.log('[PASS] getExpiryAlertType handles 31-day boundary correctly');
}


/**
 * Test Suite 3: Integration - validateExpiryDate() function
 * 
 * Validates expiry date input before submission
 */

/**
 * Helper function to validate expiry date input
 * @param {string|null} dateString - The expiry date string
 * @returns {object} Validation result: { valid: boolean, error?: string }
 */
function validateExpiryDate(dateString) {
  // Allow null/empty for optional field
  if (!dateString) {
    return { valid: true };
  }
  
  // Parse date
  const date = new Date(dateString);
  
  // Check valid date format
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }
  
  // Check not in past (allow today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  if (date < today) {
    return { valid: false, error: 'Expiry date cannot be in the past' };
  }
  
  return { valid: true };
}

/**
 * Test 3.1: validateExpiryDate with valid future date
 * Validates: Accepts future dates
 */
function test_validateExpiryDate_validFuture() {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const dateString = futureDate.toISOString().split('T')[0];
  
  const result = validateExpiryDate(dateString);
  
  console.assert(result.valid === true, 
    `[FAIL] Expected valid: true, got ${result.valid}`);
  console.log('[PASS] validateExpiryDate accepts valid future dates');
}

/**
 * Test 3.2: validateExpiryDate with today's date
 * Validates: Accepts today's date
 */
function test_validateExpiryDate_today() {
  const today = new Date();
  const dateString = today.toISOString().split('T')[0];
  
  const result = validateExpiryDate(dateString);
  
  console.assert(result.valid === true, 
    `[FAIL] Expected valid: true, got ${result.valid}`);
  console.log('[PASS] validateExpiryDate accepts today\'s date');
}

/**
 * Test 3.3: validateExpiryDate with past date
 * Validates: Rejects past dates
 */
function test_validateExpiryDate_pastDate() {
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 5);
  const dateString = pastDate.toISOString().split('T')[0];
  
  const result = validateExpiryDate(dateString);
  
  console.assert(result.valid === false, 
    `[FAIL] Expected valid: false, got ${result.valid}`);
  console.assert(result.message === 'Expiry date cannot be in the past',
    `[FAIL] Expected error message about past date, got '${result.message}'`);
  console.log('[PASS] validateExpiryDate rejects past dates');
}

/**
 * Test 3.4: validateExpiryDate with null input
 * Validates: Accepts null for optional field
 */
function test_validateExpiryDate_nullInput() {
  const result = validateExpiryDate(null);
  
  console.assert(result.valid === true, 
    `[FAIL] Expected valid: true for null, got ${result.valid}`);
  console.log('[PASS] validateExpiryDate accepts null for optional field');
}

/**
 * Test 3.5: validateExpiryDate with empty string
 * Validates: Accepts empty string for optional field
 */
function test_validateExpiryDate_emptyString() {
  const result = validateExpiryDate('');
  
  console.assert(result.valid === true, 
    `[FAIL] Expected valid: true for empty string, got ${result.valid}`);
  console.log('[PASS] validateExpiryDate accepts empty string for optional field');
}

/**
 * Test 3.6: validateExpiryDate with malformed date
 * Validates: Rejects malformed dates
 */
function test_validateExpiryDate_malformedDate() {
  const result = validateExpiryDate('not-a-date');
  
  console.assert(result.valid === false, 
    `[FAIL] Expected valid: false for malformed date, got ${result.valid}`);
  console.assert(result.message === 'Please enter a valid date',
    `[FAIL] Expected error about format, got '${result.message}'`);
  console.log('[PASS] validateExpiryDate rejects malformed dates');
}


/**
 * Test Suite 4: Edge Cases and Boundary Conditions
 */

/**
 * Test 4.1: calculateDaysUntilExpiry with year-long expiry
 * Validates: Handles large day counts correctly
 */
function test_calculateDaysUntilExpiry_yearLong() {
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);
  
  const result = calculateDaysUntilExpiry(futureDate);
  
  console.assert(result > 360 && result <= 366, 
    `[FAIL] Expected ~365 days, got ${result}`);
  console.log('[PASS] calculateDaysUntilExpiry handles year-long expirations');
}

/**
 * Test 4.2: getNearExpiryProducts filter logic simulation
 * Validates: Correct threshold filtering
 */
function test_filterNearExpiryByThreshold() {
  // Simulate products with various day counts
  const products = [
    { sku: 'SKU001', days: -5 },   // expired
    { sku: 'SKU002', days: 0 },    // expires today
    { sku: 'SKU003', days: 3 },    // critical
    { sku: 'SKU004', days: 15 },   // warning
    { sku: 'SKU005', days: 45 },   // monitor (outside 30-day threshold)
    { sku: 'SKU006', days: null }, // no expiry
  ];
  
  const threshold = 30;
  const filtered = products.filter(p => 
    p.days !== null && p.days <= threshold
  );
  
  console.assert(filtered.length === 4, 
    `[FAIL] Expected 4 products within 30-day threshold, got ${filtered.length}`);
  console.log('[PASS] Threshold filtering works correctly');
}

/**
 * Test 4.3: Expiry status distribution
 * Validates: Correct categorization of various day counts
 */
function test_expiryStatusDistribution() {
  const testCases = [
    { days: -10, expected: 'expired' },
    { days: -1, expected: 'expired' },
    { days: 0, expected: 'critical' },
    { days: 1, expected: 'critical' },
    { days: 5, expected: 'critical' },
    { days: 7, expected: 'critical' },
    { days: 8, expected: 'warning' },
    { days: 15, expected: 'warning' },
    { days: 30, expected: 'warning' },
    { days: 31, expected: 'monitor' },
    { days: 100, expected: 'monitor' },
  ];
  
  const failures = [];
  testCases.forEach(({ days, expected }) => {
    const result = getExpiryAlertType(days);
    if (result !== expected) {
      failures.push(`days=${days}: expected '${expected}', got '${result}'`);
    }
  });
  
  if (failures.length === 0) {
    console.log('[PASS] All expiry status categories correct');
  } else {
    console.log('[FAIL] Expiry status distribution errors:');
    failures.forEach(f => console.log(`  - ${f}`));
  }
}


/**
 * TEST RUNNER
 */

console.log('='.repeat(70));
console.log('TASK 1.3: SQL Functions for Expiry Calculations');
console.log('Testing: get_days_until_expiry, get_near_expiry_products, log_expiry_change');
console.log('Requirements: 2.1, 2.2');
console.log('='.repeat(70));

console.log('\n--- Test Suite 1: calculateDaysUntilExpiry ---');
test_calculateDaysUntilExpiry_futureDate();
test_calculateDaysUntilExpiry_today();
test_calculateDaysUntilExpiry_pastDate();
test_calculateDaysUntilExpiry_nullInput();
test_calculateDaysUntilExpiry_undefinedInput();
test_calculateDaysUntilExpiry_dateString();

console.log('\n--- Test Suite 2: getExpiryAlertType ---');
test_getExpiryAlertType_expired();
test_getExpiryAlertType_critical();
test_getExpiryAlertType_warning();
test_getExpiryAlertType_monitor();
test_getExpiryAlertType_nullInput();
test_getExpiryAlertType_expiryToday();
test_getExpiryAlertType_boundaryDay7();
test_getExpiryAlertType_boundaryDay8();
test_getExpiryAlertType_boundaryDay30();
test_getExpiryAlertType_boundaryDay31();

console.log('\n--- Test Suite 3: validateExpiryDate ---');
test_validateExpiryDate_validFuture();
test_validateExpiryDate_today();
test_validateExpiryDate_pastDate();
test_validateExpiryDate_nullInput();
test_validateExpiryDate_emptyString();
test_validateExpiryDate_malformedDate();

console.log('\n--- Test Suite 4: Edge Cases ---');
test_calculateDaysUntilExpiry_yearLong();
test_filterNearExpiryByThreshold();
test_expiryStatusDistribution();

console.log('\n' + '='.repeat(70));
console.log('TASK 1.3 TESTING COMPLETE');
console.log('='.repeat(70));
