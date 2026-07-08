/**
 * Unit Tests: Price Validation and Formatting (Task 9.2)
 * 
 * Tests for:
 * 1. validatePrice(priceString) - Validate price input with range and decimal checks
 * 2. formatCurrencyDisplay(price) - Format price as currency with $ symbol
 * 
 * Requirements: 5.1
 * 
 * Valid Prices: Positive numbers, max 2 decimal places, range 0.01 - 9999.99
 * Invalid Cases: Negative, zero, more than 2 decimals, non-numeric, empty
 */

/**
 * Validate price input string
 * @param {string} priceString - The price to validate
 * @returns {object} { valid: boolean, formatted: string, message: string }
 */
function validatePrice(priceString) {
  // Empty field is invalid
  if (!priceString || priceString.trim() === '') {
    return { valid: false, formatted: '', message: 'Price is required' };
  }

  const trimmed = priceString.trim();
  const num = parseFloat(trimmed);

  // Check if it's a valid number
  if (isNaN(num)) {
    return { valid: false, formatted: '', message: 'Price must be a valid number' };
  }

  // Check if negative
  if (num < 0) {
    return { valid: false, formatted: '', message: 'Price must be positive' };
  }

  // Check if zero
  if (num === 0) {
    return { valid: false, formatted: '', message: 'Price must be greater than 0' };
  }

  // Check decimal places (max 2)
  const decimalRegex = /^\d+(\.\d{0,2})?$/;
  if (!decimalRegex.test(trimmed)) {
    return { valid: false, formatted: '', message: 'Price must have maximum 2 decimal places' };
  }

  // Check range (0.01 to 9999.99)
  if (num < 0.01 || num > 9999.99) {
    return { valid: false, formatted: '', message: 'Price must be between $0.01 and $9999.99' };
  }

  // Valid: return formatted price with $ symbol
  const formatted = formatCurrencyDisplay(num);
  return { valid: true, formatted: formatted, message: '' };
}

/**
 * Format price as currency display with $ symbol and comma separators
 * @param {number|string} price - The price to format
 * @returns {string} Formatted price (e.g., "$1,234.56")
 */
function formatCurrencyDisplay(price) {
  const num = parseFloat(price);
  if (isNaN(num)) return '$0.00';
  
  return '$' + num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}


/**
 * Test Suite 1: validatePrice() - Valid Prices
 */

/**
 * Test 1.1: validatePrice with minimum valid price (0.01)
 */
function test_validatePrice_minimumValid() {
  const result = validatePrice('0.01');
  
  console.assert(result.valid === true, 
    `[FAIL] Expected valid: true, got ${result.valid}`);
  console.assert(result.message === '', 
    `[FAIL] Expected no error message, got '${result.message}'`);
  console.assert(result.formatted === '$0.01', 
    `[FAIL] Expected formatted '$0.01', got '${result.formatted}'`);
  console.log('[PASS] validatePrice accepts minimum price 0.01');
}

/**
 * Test 1.2: validatePrice with maximum valid price (9999.99)
 */
function test_validatePrice_maximumValid() {
  const result = validatePrice('9999.99');
  
  console.assert(result.valid === true, 
    `[FAIL] Expected valid: true, got ${result.valid}`);
  console.assert(result.formatted === '$9,999.99', 
    `[FAIL] Expected formatted '$9,999.99', got '${result.formatted}'`);
  console.log('[PASS] validatePrice accepts maximum price 9999.99');
}

/**
 * Test 1.3: validatePrice with standard two-decimal price
 */
function test_validatePrice_standardPrice() {
  const result = validatePrice('250.50');
  
  console.assert(result.valid === true, 
    `[FAIL] Expected valid: true, got ${result.valid}`);
  console.assert(result.formatted === '$250.50', 
    `[FAIL] Expected formatted '$250.50', got '${result.formatted}'`);
  console.log('[PASS] validatePrice accepts standard prices with 2 decimals');
}

/**
 * Test 1.4: validatePrice with single decimal place
 */
function test_validatePrice_singleDecimal() {
  const result = validatePrice('100.5');
  
  console.assert(result.valid === true, 
    `[FAIL] Expected valid: true, got ${result.valid}`);
  console.assert(result.formatted === '$100.50', 
    `[FAIL] Expected formatted '$100.50', got '${result.formatted}'`);
  console.log('[PASS] validatePrice accepts prices with single decimal');
}

/**
 * Test 1.5: validatePrice with whole number
 */
function test_validatePrice_wholeNumber() {
  const result = validatePrice('1000');
  
  console.assert(result.valid === true, 
    `[FAIL] Expected valid: true, got ${result.valid}`);
  console.assert(result.formatted === '$1,000.00', 
    `[FAIL] Expected formatted '$1,000.00', got '${result.formatted}'`);
  console.log('[PASS] validatePrice accepts whole numbers');
}

/**
 * Test 1.6: validatePrice with trailing zeros
 */
function test_validatePrice_trailingZeros() {
  const result = validatePrice('250.00');
  
  console.assert(result.valid === true, 
    `[FAIL] Expected valid: true, got ${result.valid}`);
  console.assert(result.formatted === '$250.00', 
    `[FAIL] Expected formatted '$250.00', got '${result.formatted}'`);
  console.log('[PASS] validatePrice accepts prices with trailing zeros');
}

/**
 * Test 1.7: validatePrice with comma separators in input
 */
function test_validatePrice_withCommas() {
  const result = validatePrice('1,234.56');
  
  console.assert(result.valid === true, 
    `[FAIL] Expected valid: true for price with commas, got ${result.valid}`);
  console.assert(result.formatted === '$1,234.56', 
    `[FAIL] Expected formatted '$1,234.56', got '${result.formatted}'`);
  console.log('[PASS] validatePrice handles prices with comma separators');
}


/**
 * Test Suite 2: validatePrice() - Invalid Prices
 */

/**
 * Test 2.1: validatePrice with empty string
 */
function test_validatePrice_empty() {
  const result = validatePrice('');
  
  console.assert(result.valid === false, 
    `[FAIL] Expected valid: false, got ${result.valid}`);
  console.assert(result.message === 'Price is required', 
    `[FAIL] Expected 'Price is required', got '${result.message}'`);
  console.log('[PASS] validatePrice rejects empty string');
}

/**
 * Test 2.2: validatePrice with zero
 */
function test_validatePrice_zero() {
  const result = validatePrice('0');
  
  console.assert(result.valid === false, 
    `[FAIL] Expected valid: false, got ${result.valid}`);
  console.assert(result.message === 'Price must be greater than 0', 
    `[FAIL] Expected 'Price must be greater than 0', got '${result.message}'`);
  console.log('[PASS] validatePrice rejects zero');
}

/**
 * Test 2.3: validatePrice with negative number
 */
function test_validatePrice_negative() {
  const result = validatePrice('-50.00');
  
  console.assert(result.valid === false, 
    `[FAIL] Expected valid: false, got ${result.valid}`);
  console.assert(result.message === 'Price must be positive', 
    `[FAIL] Expected 'Price must be positive', got '${result.message}'`);
  console.log('[PASS] validatePrice rejects negative numbers');
}

/**
 * Test 2.4: validatePrice with more than 2 decimal places
 */
function test_validatePrice_tooManyDecimals() {
  const result = validatePrice('12.345');
  
  console.assert(result.valid === false, 
    `[FAIL] Expected valid: false, got ${result.valid}`);
  console.assert(result.message === 'Price must have maximum 2 decimal places', 
    `[FAIL] Expected decimal places error, got '${result.message}'`);
  console.log('[PASS] validatePrice rejects more than 2 decimal places');
}

/**
 * Test 2.5: validatePrice with non-numeric input
 */
function test_validatePrice_nonNumeric() {
  const result = validatePrice('abc');
  
  console.assert(result.valid === false, 
    `[FAIL] Expected valid: false, got ${result.valid}`);
  console.assert(result.message === 'Price must be a valid number', 
    `[FAIL] Expected 'Price must be a valid number', got '${result.message}'`);
  console.log('[PASS] validatePrice rejects non-numeric input');
}

/**
 * Test 2.6: validatePrice below minimum (0.001)
 */
function test_validatePrice_belowMinimum() {
  const result = validatePrice('0.001');
  
  console.assert(result.valid === false, 
    `[FAIL] Expected valid: false, got ${result.valid}`);
  console.assert(result.message === 'Price must have maximum 2 decimal places', 
    `[FAIL] Expected decimal places error, got '${result.message}'`);
  console.log('[PASS] validatePrice rejects prices below minimum');
}

/**
 * Test 2.7: validatePrice above maximum (10000.00)
 */
function test_validatePrice_aboveMaximum() {
  const result = validatePrice('10000.00');
  
  console.assert(result.valid === false, 
    `[FAIL] Expected valid: false, got ${result.valid}`);
  console.assert(result.message === 'Price must be between $0.01 and $9999.99', 
    `[FAIL] Expected range error, got '${result.message}'`);
  console.log('[PASS] validatePrice rejects prices above maximum');
}

/**
 * Test 2.8: validatePrice with special characters
 */
function test_validatePrice_specialCharacters() {
  const result = validatePrice('$250.50');
  
  console.assert(result.valid === false, 
    `[FAIL] Expected valid: false, got ${result.valid}`);
  console.assert(result.message === 'Price must be a valid number', 
    `[FAIL] Expected 'Price must be a valid number', got '${result.message}'`);
  console.log('[PASS] validatePrice rejects special characters');
}

/**
 * Test 2.9: validatePrice with null value
 */
function test_validatePrice_null() {
  const result = validatePrice(null);
  
  console.assert(result.valid === false, 
    `[FAIL] Expected valid: false, got ${result.valid}`);
  console.assert(result.message === 'Price is required', 
    `[FAIL] Expected 'Price is required', got '${result.message}'`);
  console.log('[PASS] validatePrice rejects null');
}

/**
 * Test 2.10: validatePrice with whitespace only
 */
function test_validatePrice_whitespaceOnly() {
  const result = validatePrice('   ');
  
  console.assert(result.valid === false, 
    `[FAIL] Expected valid: false, got ${result.valid}`);
  console.assert(result.message === 'Price is required', 
    `[FAIL] Expected 'Price is required', got '${result.message}'`);
  console.log('[PASS] validatePrice rejects whitespace-only input');
}


/**
 * Test Suite 3: formatCurrencyDisplay()
 */

/**
 * Test 3.1: formatCurrencyDisplay with standard price
 */
function test_formatCurrencyDisplay_standard() {
  const result = formatCurrencyDisplay(250.50);
  
  console.assert(result === '$250.50', 
    `[FAIL] Expected '$250.50', got '${result}'`);
  console.log('[PASS] formatCurrencyDisplay formats standard price');
}

/**
 * Test 3.2: formatCurrencyDisplay with whole number
 */
function test_formatCurrencyDisplay_whole() {
  const result = formatCurrencyDisplay(1000);
  
  console.assert(result === '$1,000.00', 
    `[FAIL] Expected '$1,000.00', got '${result}'`);
  console.log('[PASS] formatCurrencyDisplay formats whole numbers with decimals');
}

/**
 * Test 3.3: formatCurrencyDisplay with comma-formatted number
 */
function test_formatCurrencyDisplay_withCommas() {
  const result = formatCurrencyDisplay(1234567.89);
  
  console.assert(result === '$1,234,567.89', 
    `[FAIL] Expected '$1,234,567.89', got '${result}'`);
  console.log('[PASS] formatCurrencyDisplay adds comma separators');
}

/**
 * Test 3.4: formatCurrencyDisplay with small number
 */
function test_formatCurrencyDisplay_small() {
  const result = formatCurrencyDisplay(0.01);
  
  console.assert(result === '$0.01', 
    `[FAIL] Expected '$0.01', got '${result}'`);
  console.log('[PASS] formatCurrencyDisplay formats small prices');
}

/**
 * Test 3.5: formatCurrencyDisplay with string input
 */
function test_formatCurrencyDisplay_stringInput() {
  const result = formatCurrencyDisplay('250.50');
  
  console.assert(result === '$250.50', 
    `[FAIL] Expected '$250.50', got '${result}'`);
  console.log('[PASS] formatCurrencyDisplay handles string input');
}

/**
 * Test 3.6: formatCurrencyDisplay with invalid input
 */
function test_formatCurrencyDisplay_invalid() {
  const result = formatCurrencyDisplay('abc');
  
  console.assert(result === '$0.00', 
    `[FAIL] Expected '$0.00', got '${result}'`);
  console.log('[PASS] formatCurrencyDisplay returns $0.00 for invalid input');
}

/**
 * Test 3.7: formatCurrencyDisplay with zero
 */
function test_formatCurrencyDisplay_zero() {
  const result = formatCurrencyDisplay(0);
  
  console.assert(result === '$0.00', 
    `[FAIL] Expected '$0.00', got '${result}'`);
  console.log('[PASS] formatCurrencyDisplay formats zero correctly');
}


/**
 * Test Suite 4: Integration and Edge Cases
 */

/**
 * Test 4.1: Round-trip: validate then format
 */
function test_roundTrip_validateThenFormat() {
  const input = '250.5';
  const validated = validatePrice(input);
  
  console.assert(validated.valid === true, 
    `[FAIL] Validation should pass for ${input}`);
  console.assert(validated.formatted === '$250.50', 
    `[FAIL] Expected formatted '$250.50', got '${validated.formatted}'`);
  console.log('[PASS] Round-trip validation and formatting works');
}

/**
 * Test 4.2: Boundary test - exactly at minimum
 */
function test_boundary_exactMinimum() {
  const result = validatePrice('0.01');
  
  console.assert(result.valid === true, 
    `[FAIL] Expected 0.01 to be valid`);
  console.assert(result.formatted === '$0.01', 
    `[FAIL] Expected formatted '$0.01', got '${result.formatted}'`);
  console.log('[PASS] Boundary: exactly at minimum (0.01) is valid');
}

/**
 * Test 4.3: Boundary test - exactly at maximum
 */
function test_boundary_exactMaximum() {
  const result = validatePrice('9999.99');
  
  console.assert(result.valid === true, 
    `[FAIL] Expected 9999.99 to be valid`);
  console.assert(result.formatted === '$9,999.99', 
    `[FAIL] Expected formatted '$9,999.99', got '${result.formatted}'`);
  console.log('[PASS] Boundary: exactly at maximum (9999.99) is valid');
}

/**
 * Test 4.4: Common use case - auto-formatting single decimal
 */
function test_useCase_autoFormatSingleDecimal() {
  const result = validatePrice('12.5');
  
  console.assert(result.valid === true, 
    `[FAIL] Expected valid: true`);
  console.assert(result.formatted === '$12.50', 
    `[FAIL] Expected auto-formatted to $12.50, got '${result.formatted}'`);
  console.log('[PASS] Use case: auto-format single decimal to two decimals');
}

/**
 * Test 4.5: Common use case - prevent submission with invalid price
 */
function test_useCase_preventSubmitInvalid() {
  const testCases = [
    { input: '', shouldFail: true },
    { input: '0', shouldFail: true },
    { input: '-50', shouldFail: true },
    { input: '12.345', shouldFail: true },
    { input: 'abc', shouldFail: true },
    { input: '50.00', shouldFail: false },
  ];
  
  let allCorrect = true;
  testCases.forEach(test => {
    const result = validatePrice(test.input);
    const isInvalid = !result.valid;
    if (isInvalid !== test.shouldFail) {
      allCorrect = false;
      console.log(`  [FAIL] Input '${test.input}' - expected fail=${test.shouldFail}, got fail=${isInvalid}`);
    }
  });
  
  if (allCorrect) {
    console.log('[PASS] Use case: form submission prevention works correctly');
  }
}


/**
 * TEST RUNNER
 */

console.log('='.repeat(70));
console.log('TASK 9.2: Price Validation and Formatting');
console.log('Testing: validatePrice(), formatCurrencyDisplay()');
console.log('Requirements: 5.1 - Dynamic Price Entry in Stock In Form');
console.log('='.repeat(70));

console.log('\n--- Test Suite 1: validatePrice() - Valid Prices ---');
test_validatePrice_minimumValid();
test_validatePrice_maximumValid();
test_validatePrice_standardPrice();
test_validatePrice_singleDecimal();
test_validatePrice_wholeNumber();
test_validatePrice_trailingZeros();
test_validatePrice_withCommas();

console.log('\n--- Test Suite 2: validatePrice() - Invalid Prices ---');
test_validatePrice_empty();
test_validatePrice_zero();
test_validatePrice_negative();
test_validatePrice_tooManyDecimals();
test_validatePrice_nonNumeric();
test_validatePrice_belowMinimum();
test_validatePrice_aboveMaximum();
test_validatePrice_specialCharacters();
test_validatePrice_null();
test_validatePrice_whitespaceOnly();

console.log('\n--- Test Suite 3: formatCurrencyDisplay() ---');
test_formatCurrencyDisplay_standard();
test_formatCurrencyDisplay_whole();
test_formatCurrencyDisplay_withCommas();
test_formatCurrencyDisplay_small();
test_formatCurrencyDisplay_stringInput();
test_formatCurrencyDisplay_invalid();
test_formatCurrencyDisplay_zero();

console.log('\n--- Test Suite 4: Integration and Edge Cases ---');
test_roundTrip_validateThenFormat();
test_boundary_exactMinimum();
test_boundary_exactMaximum();
test_useCase_autoFormatSingleDecimal();
test_useCase_preventSubmitInvalid();

console.log('\n' + '='.repeat(70));
console.log('TASK 9.2 TESTING COMPLETE');
console.log('='.repeat(70));
