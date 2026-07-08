// Price Validation Testing

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

function formatCurrencyDisplay(price) {
  const num = parseFloat(price);
  if (isNaN(num)) return '$0.00';
  
  return '$' + num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Test cases
const tests = [
  // Valid cases
  { input: '0.01', expected: true, description: 'Valid minimum price' },
  { input: '9999.99', expected: true, description: 'Valid maximum price' },
  { input: '12.99', expected: true, description: 'Valid standard price' },
  { input: '1000.5', expected: true, description: 'Valid price with single decimal' },
  { input: '100', expected: true, description: 'Valid whole number' },
  { input: '12', expected: true, description: 'Valid whole number (small)' },
  { input: '250.00', expected: true, description: 'Valid price with trailing zeros' },
  
  // Invalid cases
  { input: '', expected: false, description: 'Empty price' },
  { input: '0', expected: false, description: 'Zero price' },
  { input: '-10.00', expected: false, description: 'Negative price' },
  { input: '12.345', expected: false, description: 'More than 2 decimals' },
  { input: 'abc', expected: false, description: 'Non-numeric input' },
  { input: '10000.00', expected: false, description: 'Price exceeds maximum' },
  { input: '0.001', expected: false, description: 'Price below minimum' },
];

console.log('=== Price Validation Test Results ===\n');

let passCount = 0;
let failCount = 0;

tests.forEach((test, idx) => {
  const result = validatePrice(test.input);
  const passed = result.valid === test.expected;
  
  if (passed) {
    passCount++;
    console.log(`✓ Test ${idx + 1}: ${test.description}`);
    console.log(`  Input: "${test.input}" → Valid: ${result.valid}`);
    if (result.valid) {
      console.log(`  Formatted: ${result.formatted}`);
    }
  } else {
    failCount++;
    console.log(`✗ Test ${idx + 1}: ${test.description}`);
    console.log(`  Input: "${test.input}" → Expected: ${test.expected}, Got: ${result.valid}`);
    console.log(`  Message: ${result.message}`);
  }
  console.log();
});

console.log(`\n=== Summary ===`);
console.log(`Passed: ${passCount}/${tests.length}`);
console.log(`Failed: ${failCount}/${tests.length}`);
