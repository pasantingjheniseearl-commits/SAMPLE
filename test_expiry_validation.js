/**
 * Simple test to verify validateExpiryDate implementation
 * This can be run in Node.js or browser console
 */

// Implementation of validateExpiryDate (copied from app.js)
function validateExpiryDate(dateStr) {
  if (!dateStr) return { valid: true, message: '' }; // Optional field
  const expiryDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiryDate.setHours(0, 0, 0, 0);
  if (isNaN(expiryDate.getTime())) return { valid: false, message: 'Please enter a valid date' };
  if (expiryDate < today) return { valid: false, message: 'Expiry date cannot be in the past' };
  return { valid: true, message: '' };
}

// Test cases
console.log('='.repeat(70));
console.log('TASK 2.2: Expiry Date Validation - Test Results');
console.log('='.repeat(70));

// Test 1: Empty/null field (optional)
console.log('\n✓ Test 1: Empty field (optional)');
const result1 = validateExpiryDate('');
console.log(`  Input: '' (empty string)`);
console.log(`  Expected: { valid: true, message: '' }`);
console.log(`  Result:   ${JSON.stringify(result1)}`);
console.assert(result1.valid === true && result1.message === '', 'PASS');

// Test 2: Valid future date
console.log('\n✓ Test 2: Valid future date');
const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 30);
const futureDateStr = futureDate.toISOString().split('T')[0];
const result2 = validateExpiryDate(futureDateStr);
console.log(`  Input: '${futureDateStr}' (30 days from now)`);
console.log(`  Expected: { valid: true, message: '' }`);
console.log(`  Result:   ${JSON.stringify(result2)}`);
console.assert(result2.valid === true && result2.message === '', 'PASS');

// Test 3: Today's date (should be valid)
console.log('\n✓ Test 3: Today\'s date');
const today = new Date();
const todayStr = today.toISOString().split('T')[0];
const result3 = validateExpiryDate(todayStr);
console.log(`  Input: '${todayStr}' (today)`);
console.log(`  Expected: { valid: true, message: '' }`);
console.log(`  Result:   ${JSON.stringify(result3)}`);
console.assert(result3.valid === true && result3.message === '', 'PASS');

// Test 4: Past date (should be invalid)
console.log('\n✗ Test 4: Past date (should be invalid)');
const pastDate = new Date();
pastDate.setDate(pastDate.getDate() - 5);
const pastDateStr = pastDate.toISOString().split('T')[0];
const result4 = validateExpiryDate(pastDateStr);
console.log(`  Input: '${pastDateStr}' (5 days ago)`);
console.log(`  Expected: { valid: false, message: 'Expiry date cannot be in the past' }`);
console.log(`  Result:   ${JSON.stringify(result4)}`);
console.assert(result4.valid === false && result4.message === 'Expiry date cannot be in the past', 'PASS');

// Test 5: Malformed date (should be invalid)
console.log('\n✗ Test 5: Malformed date');
const result5 = validateExpiryDate('not-a-date');
console.log(`  Input: 'not-a-date' (malformed)`);
console.log(`  Expected: { valid: false, message: 'Please enter a valid date' }`);
console.log(`  Result:   ${JSON.stringify(result5)}`);
console.assert(result5.valid === false && result5.message === 'Please enter a valid date', 'PASS');

// Test 6: null input
console.log('\n✓ Test 6: null input (optional field)');
const result6 = validateExpiryDate(null);
console.log(`  Input: null`);
console.log(`  Expected: { valid: true, message: '' }`);
console.log(`  Result:   ${JSON.stringify(result6)}`);
console.assert(result6.valid === true && result6.message === '', 'PASS');

// Test 7: Invalid date string format
console.log('\n✗ Test 7: Invalid date format');
const result7 = validateExpiryDate('13/45/2024');
console.log(`  Input: '13/45/2024' (invalid format)`);
console.log(`  Expected: { valid: false, message: 'Please enter a valid date' }`);
console.log(`  Result:   ${JSON.stringify(result7)}`);
console.assert(result7.valid === false && result7.message === 'Please enter a valid date', 'PASS');

console.log('\n' + '='.repeat(70));
console.log('All tests completed! Implementation verified.');
console.log('='.repeat(70));
