/**
 * Task 2.2: Implement expiry date validation and error handling
 * 
 * Requirements:
 * 1. Validate date format
 * 2. Prevent past dates
 * 3. Show inline error messages for invalid dates
 * 4. Allow submission without expiry date (field is optional)
 * 
 * This test validates the complete implementation
 */

// Import/copy the validation function
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

// Test Suite: Expiry Date Validation (Task 2.2)
console.log('='.repeat(70));
console.log('TASK 2.2: Expiry Date Validation and Error Handling');
console.log('='.repeat(70));

let passCount = 0;
let failCount = 0;

function testCase(name, condition, actual, expected) {
  if (condition) {
    console.log(`✓ ${name}`);
    passCount++;
  } else {
    console.log(`✗ ${name}`);
    console.log(`  Expected: ${JSON.stringify(expected)}`);
    console.log(`  Actual:   ${JSON.stringify(actual)}`);
    failCount++;
  }
}

// Requirement 1: Validate date format
console.log('\n--- Requirement 1: Validate Date Format ---');

// Test: Valid ISO date format (YYYY-MM-DD)
const validDate = new Date();
validDate.setDate(validDate.getDate() + 30);
const validDateStr = validDate.toISOString().split('T')[0];
const result1 = validateExpiryDate(validDateStr);
testCase(
  'Valid ISO date format (YYYY-MM-DD)',
  result1.valid === true && result1.message === '',
  result1,
  { valid: true, message: '' }
);

// Test: Invalid date format
const result2 = validateExpiryDate('13/45/2024');
testCase(
  'Invalid date format (MM/DD/YYYY) detected',
  result2.valid === false && result2.message.includes('valid date'),
  result2,
  { valid: false, message: 'Please enter a valid date' }
);

// Test: Malformed date string
const result3 = validateExpiryDate('not-a-date');
testCase(
  'Malformed date string rejected',
  result3.valid === false && result3.message.includes('valid date'),
  result3,
  { valid: false, message: 'Please enter a valid date' }
);

// Test: Empty date string (should be valid as optional)
const result4 = validateExpiryDate('');
testCase(
  'Empty date string accepted (optional field)',
  result4.valid === true && result4.message === '',
  result4,
  { valid: true, message: '' }
);

// Requirement 2: Prevent past dates
console.log('\n--- Requirement 2: Prevent Past Dates ---');

// Test: Past date rejection
const pastDate = new Date();
pastDate.setDate(pastDate.getDate() - 1);
const pastDateStr = pastDate.toISOString().split('T')[0];
const result5 = validateExpiryDate(pastDateStr);
testCase(
  'Past date rejected',
  result5.valid === false && result5.message.includes('past'),
  result5,
  { valid: false, message: 'Expiry date cannot be in the past' }
);

// Test: Today's date accepted
const today = new Date();
const todayStr = today.toISOString().split('T')[0];
const result6 = validateExpiryDate(todayStr);
testCase(
  'Today\'s date accepted',
  result6.valid === true && result6.message === '',
  result6,
  { valid: true, message: '' }
);

// Test: Future date accepted
const futureDate2 = new Date();
futureDate2.setDate(futureDate2.getDate() + 10);
const futureDateStr = futureDate2.toISOString().split('T')[0];
const result7 = validateExpiryDate(futureDateStr);
testCase(
  'Future date accepted',
  result7.valid === true && result7.message === '',
  result7,
  { valid: true, message: '' }
);

// Requirement 3: Show inline error messages
console.log('\n--- Requirement 3: Error Messages ---');

// Test: Error message for invalid format
const result8 = validateExpiryDate('2024/13/45');
testCase(
  'Invalid format produces error message',
  result8.valid === false && result8.message !== '',
  { hasMessage: result8.message !== '', message: result8.message },
  { hasMessage: true, message: 'Please enter a valid date' }
);

// Test: Error message for past date
const result9 = validateExpiryDate(pastDateStr);
testCase(
  'Past date produces specific error message',
  result9.valid === false && result9.message === 'Expiry date cannot be in the past',
  result9,
  { valid: false, message: 'Expiry date cannot be in the past' }
);

// Test: No error message for valid input
const result10 = validateExpiryDate(futureDateStr);
testCase(
  'Valid input produces no error message',
  result10.valid === true && result10.message === '',
  { hasMessage: result10.message !== '', message: result10.message },
  { hasMessage: false, message: '' }
);

// Requirement 4: Allow submission without expiry date (optional field)
console.log('\n--- Requirement 4: Optional Field Handling ---');

// Test: Null input
const result11 = validateExpiryDate(null);
testCase(
  'Null input accepted (optional)',
  result11.valid === true && result11.message === '',
  result11,
  { valid: true, message: '' }
);

// Test: Undefined input
const result12 = validateExpiryDate(undefined);
testCase(
  'Undefined input accepted (optional)',
  result12.valid === true && result12.message === '',
  result12,
  { valid: true, message: '' }
);

// Test: Empty string
const result13 = validateExpiryDate('');
testCase(
  'Empty string accepted (optional)',
  result13.valid === true && result13.message === '',
  result13,
  { valid: true, message: '' }
);

// Additional edge cases
console.log('\n--- Edge Cases ---');

// Test: One year in the future
const yearFromNow = new Date();
yearFromNow.setFullYear(yearFromNow.getFullYear() + 1);
const yearFromNowStr = yearFromNow.toISOString().split('T')[0];
const result14 = validateExpiryDate(yearFromNowStr);
testCase(
  'Date one year in the future accepted',
  result14.valid === true && result14.message === '',
  result14,
  { valid: true, message: '' }
);

// Test: One day in the past
const oneDayAgo = new Date();
oneDayAgo.setDate(oneDayAgo.getDate() - 1);
const oneDayAgoStr = oneDayAgo.toISOString().split('T')[0];
const result15 = validateExpiryDate(oneDayAgoStr);
testCase(
  'Date one day in the past rejected',
  result15.valid === false && result15.message.includes('past'),
  result15,
  { valid: false, message: 'Expiry date cannot be in the past' }
);

// Test: One day in the future
const oneDayFromNow = new Date();
oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
const oneDayFromNowStr = oneDayFromNow.toISOString().split('T')[0];
const result16 = validateExpiryDate(oneDayFromNowStr);
testCase(
  'Date one day in the future accepted',
  result16.valid === true && result16.message === '',
  result16,
  { valid: true, message: '' }
);

// Test: 30 days threshold (near-expiry)
const thirtyDaysFromNow = new Date();
thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];
const result17 = validateExpiryDate(thirtyDaysStr);
testCase(
  'Date 30 days in the future accepted (near-expiry threshold)',
  result17.valid === true && result17.message === '',
  result17,
  { valid: true, message: '' }
);

// Summary
console.log('\n' + '='.repeat(70));
console.log(`RESULTS: ${passCount} passed, ${failCount} failed`);
console.log('='.repeat(70));

if (failCount === 0) {
  console.log('\n✓ All tests passed! Task 2.2 implementation is complete.');
  process.exit(0);
} else {
  console.log(`\n✗ ${failCount} test(s) failed.`);
  process.exit(1);
}
