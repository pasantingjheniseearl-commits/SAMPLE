/**
 * Test Suite for Price Operation Functions (Task 8.2)
 * 
 * Tests SQL functions:
 * - calculate_revaluation_impact(sku, newPrice)
 * - update_price_with_history(sku, newPrice, changedBy, reason)
 * 
 * And JavaScript wrapper methods in WMSDatabase:
 * - calculateRevaluationImpact()
 * - updatePriceWithHistory()
 * 
 * REQUIREMENTS: 6.1, 6.2, 6.3, 6.4
 */

/**
 * Test Case 1: calculateRevaluationImpact with price increase
 * Scenario: Product SKU-001 currently has 100 units at $10 each
 * New price: $15 per unit
 * Expected: impactAmount = $500 (100 × $5), itemsAffected = 100, percentageChange = 50%
 */
async function test_calculateRevaluationImpact_increase() {
  console.log('\n[TEST 1] calculateRevaluationImpact - Price Increase');
  
  try {
    // Setup: Create test product
    await WMSDatabase.saveProduct({
      sku: 'TEST-SKU-001',
      name: 'Test Product A',
      category: 'Electronics',
      price: 10.00,
      stock_on_hand: 100,
      reorder_level: 15,
      location: 'Rack A1'
    });
    
    // Execute: Calculate impact for price increase
    const impact = await WMSDatabase.calculateRevaluationImpact('TEST-SKU-001', 15.00);
    
    // Verify
    console.log('Result:', impact);
    console.assert(impact !== null, 'Impact should not be null');
    console.assert(impact.impactAmount === 500.00, `Expected impactAmount 500.00, got ${impact.impactAmount}`);
    console.assert(impact.itemsAffected === 100, `Expected itemsAffected 100, got ${impact.itemsAffected}`);
    console.assert(impact.percentageChange === 50.00, `Expected percentageChange 50.00, got ${impact.percentageChange}`);
    console.log('✓ PASSED: Price increase calculation correct');
  } catch (err) {
    console.error('✗ FAILED:', err.message);
  }
}

/**
 * Test Case 2: calculateRevaluationImpact with price decrease
 * Scenario: Product has 50 units at $20 each
 * New price: $15 per unit
 * Expected: impactAmount = -$250 (50 × -$5), itemsAffected = 50, percentageChange = -25%
 */
async function test_calculateRevaluationImpact_decrease() {
  console.log('\n[TEST 2] calculateRevaluationImpact - Price Decrease');
  
  try {
    // Setup: Create test product
    await WMSDatabase.saveProduct({
      sku: 'TEST-SKU-002',
      name: 'Test Product B',
      category: 'Office Supply',
      price: 20.00,
      stock_on_hand: 50,
      reorder_level: 10,
      location: 'Rack B1'
    });
    
    // Execute: Calculate impact for price decrease
    const impact = await WMSDatabase.calculateRevaluationImpact('TEST-SKU-002', 15.00);
    
    // Verify
    console.log('Result:', impact);
    console.assert(impact !== null, 'Impact should not be null');
    console.assert(impact.impactAmount === -250.00, `Expected impactAmount -250.00, got ${impact.impactAmount}`);
    console.assert(impact.itemsAffected === 50, `Expected itemsAffected 50, got ${impact.itemsAffected}`);
    console.assert(impact.percentageChange === -25.00, `Expected percentageChange -25.00, got ${impact.percentageChange}`);
    console.log('✓ PASSED: Price decrease calculation correct');
  } catch (err) {
    console.error('✗ FAILED:', err.message);
  }
}

/**
 * Test Case 3: calculateRevaluationImpact with zero quantity
 * Scenario: Product has 0 stock
 * New price: any value
 * Expected: impactAmount = 0, itemsAffected = 0, percentageChange = 0
 */
async function test_calculateRevaluationImpact_zero_quantity() {
  console.log('\n[TEST 3] calculateRevaluationImpact - Zero Quantity');
  
  try {
    // Setup: Create test product with zero stock
    await WMSDatabase.saveProduct({
      sku: 'TEST-SKU-003',
      name: 'Test Product C (Empty)',
      category: 'Electronics',
      price: 25.00,
      stock_on_hand: 0,
      reorder_level: 10,
      location: 'Rack C1'
    });
    
    // Execute: Calculate impact for price change with zero stock
    const impact = await WMSDatabase.calculateRevaluationImpact('TEST-SKU-003', 35.00);
    
    // Verify
    console.log('Result:', impact);
    console.assert(impact !== null, 'Impact should not be null');
    console.assert(impact.impactAmount === 0.00, `Expected impactAmount 0.00, got ${impact.impactAmount}`);
    console.assert(impact.itemsAffected === 0, `Expected itemsAffected 0, got ${impact.itemsAffected}`);
    console.assert(impact.percentageChange === 0.00, `Expected percentageChange 0.00, got ${impact.percentageChange}`);
    console.log('✓ PASSED: Zero quantity calculation correct');
  } catch (err) {
    console.error('✗ FAILED:', err.message);
  }
}

/**
 * Test Case 4: calculateRevaluationImpact with non-existent SKU
 * Scenario: SKU doesn't exist in database
 * Expected: null response
 */
async function test_calculateRevaluationImpact_not_found() {
  console.log('\n[TEST 4] calculateRevaluationImpact - SKU Not Found');
  
  try {
    // Execute: Calculate impact for non-existent SKU
    const impact = await WMSDatabase.calculateRevaluationImpact('NONEXISTENT-SKU', 50.00);
    
    // Verify
    console.log('Result:', impact);
    console.assert(impact === null, `Expected null for non-existent SKU, got ${JSON.stringify(impact)}`);
    console.log('✓ PASSED: Non-existent SKU returns null');
  } catch (err) {
    console.error('✗ FAILED:', err.message);
  }
}

/**
 * Test Case 5: updatePriceWithHistory - Successful atomic update
 * Scenario: Update product price and verify both price and history record created
 * Expected: success=true, prices updated, history record created
 * REQUIREMENTS: 6.3, 6.4 (Atomic transaction, audit trail)
 */
async function test_updatePriceWithHistory_success() {
  console.log('\n[TEST 5] updatePriceWithHistory - Successful Atomic Update');
  
  try {
    // Setup: Create test product
    await WMSDatabase.saveProduct({
      sku: 'TEST-SKU-005',
      name: 'Test Product E',
      category: 'Furniture',
      price: 100.00,
      stock_on_hand: 25,
      reorder_level: 5,
      location: 'Rack E1'
    });
    
    // Execute: Atomic price update with history
    const result = await WMSDatabase.updatePriceWithHistory(
      'TEST-SKU-005',
      125.00,
      'test_user',
      'Q1 2025 price review'
    );
    
    // Verify: Result indicates success
    console.log('Update Result:', result);
    console.assert(result.success === true, `Expected success=true, got ${result.success}`);
    console.assert(result.old_price === 100.00, `Expected old_price 100.00, got ${result.old_price}`);
    console.assert(result.new_price === 125.00, `Expected new_price 125.00, got ${result.new_price}`);
    console.assert(result.impact_amount === 625.00, `Expected impact_amount 625.00, got ${result.impact_amount}`);
    console.assert(result.items_affected === 25, `Expected items_affected 25, got ${result.items_affected}`);
    console.assert(result.percentage_change === 25.00, `Expected percentage_change 25.00, got ${result.percentage_change}`);
    console.assert(result.history_id !== null, 'Expected history_id to be created');
    
    // Verify: Product price was actually updated
    const updatedProduct = await WMSDatabase.getProduct('TEST-SKU-005');
    console.assert(updatedProduct.price === 125.00, `Expected product price 125.00, got ${updatedProduct.price}`);
    console.log('✓ PASSED: Price update and history creation successful');
  } catch (err) {
    console.error('✗ FAILED:', err.message);
  }
}

/**
 * Test Case 6: updatePriceWithHistory - Non-existent SKU
 * Scenario: Try to update price for non-existent product
 * Expected: success=false with error message
 */
async function test_updatePriceWithHistory_not_found() {
  console.log('\n[TEST 6] updatePriceWithHistory - Non-existent SKU');
  
  try {
    // Execute: Try to update non-existent product
    const result = await WMSDatabase.updatePriceWithHistory(
      'DOES-NOT-EXIST',
      99.99,
      'test_user',
      'Test update'
    );
    
    // Verify
    console.log('Result:', result);
    console.assert(result.success === false, `Expected success=false, got ${result.success}`);
    console.assert(result.error !== undefined, 'Expected error message');
    console.assert(result.error.includes('not found') || result.error.includes('Product'), 
      `Expected "Product not found" error, got: ${result.error}`);
    console.log('✓ PASSED: Non-existent SKU handled gracefully');
  } catch (err) {
    console.error('✗ FAILED:', err.message);
  }
}

/**
 * Test Case 7: updatePriceWithHistory - Verify audit trail created
 * Scenario: Update price and verify price_history record contains all required fields
 * Expected: All fields populated correctly in price_history
 * REQUIREMENTS: 6.1 (Complete audit trail)
 */
async function test_updatePriceWithHistory_audit_trail() {
  console.log('\n[TEST 7] updatePriceWithHistory - Audit Trail Verification');
  
  try {
    // Setup: Create test product
    await WMSDatabase.saveProduct({
      sku: 'TEST-SKU-007',
      name: 'Audit Trail Test',
      category: 'Display',
      price: 50.00,
      stock_on_hand: 200,
      reorder_level: 20,
      location: 'Rack G1'
    });
    
    const oldPrice = 50.00;
    const newPrice = 65.00;
    
    // Execute: Update price
    const result = await WMSDatabase.updatePriceWithHistory(
      'TEST-SKU-007',
      newPrice,
      'compliance_officer',
      'Quarterly price adjustment'
    );
    
    console.assert(result.success === true, 'Price update should succeed');
    
    // Verify: Price history was recorded
    const history = await WMSDatabase.getPriceHistory('TEST-SKU-007');
    console.log('Price History Records:', history.length);
    
    if (history.length > 0) {
      const latestRecord = history[0];
      console.log('Latest History Record:', latestRecord);
      
      console.assert(latestRecord.sku === 'TEST-SKU-007', 'SKU mismatch in history');
      console.assert(latestRecord.old_price == oldPrice, 'Old price mismatch in history');
      console.assert(latestRecord.new_price == newPrice, 'New price mismatch in history');
      console.assert(latestRecord.stock_quantity === 200, 'Stock quantity mismatch in history');
      console.assert(latestRecord.changed_by === 'compliance_officer', 'User mismatch in history');
      console.assert(latestRecord.change_reason.includes('Quarterly'), 'Reason not recorded properly');
      console.log('✓ PASSED: Audit trail contains all required fields');
    } else {
      console.error('✗ FAILED: No history records found');
    }
  } catch (err) {
    console.error('✗ FAILED:', err.message);
  }
}

/**
 * Test Case 8: updatePriceWithHistory - Large quantity impact
 * Scenario: Update price for product with large stock quantity
 * Expected: Large revaluation impact calculated correctly
 * REQUIREMENTS: 6.2 (Accurate impact calculation)
 */
async function test_updatePriceWithHistory_large_impact() {
  console.log('\n[TEST 8] updatePriceWithHistory - Large Quantity Impact');
  
  try {
    // Setup: Create product with large stock
    await WMSDatabase.saveProduct({
      sku: 'TEST-SKU-008',
      name: 'High Volume Item',
      category: 'Networking',
      price: 10.00,
      stock_on_hand: 5000,
      reorder_level: 100,
      location: 'Rack H1'
    });
    
    // Execute: Update with significant price change
    const result = await WMSDatabase.updatePriceWithHistory(
      'TEST-SKU-008',
      12.50,
      'manager',
      'Cost increase pass-through'
    );
    
    // Verify
    console.log('Result:', result);
    console.assert(result.success === true, 'Update should succeed');
    console.assert(result.items_affected === 5000, `Expected 5000 items affected, got ${result.items_affected}`);
    
    // Impact should be: (12.50 - 10.00) × 5000 = 12,500
    console.assert(result.impact_amount === 12500.00, 
      `Expected impact_amount 12500.00, got ${result.impact_amount}`);
    console.assert(result.percentage_change === 25.00, 
      `Expected percentage_change 25.00, got ${result.percentage_change}`);
    console.log('✓ PASSED: Large quantity impact calculated correctly');
  } catch (err) {
    console.error('✗ FAILED:', err.message);
  }
}

/**
 * Test Case 9: updatePriceWithHistory - Loss scenario warning
 * Scenario: Apply significant price decrease (loss > 10%)
 * Expected: Loss correctly calculated, percentage change shows loss
 * REQUIREMENTS: 7.1 (Warning for large losses)
 */
async function test_updatePriceWithHistory_large_loss() {
  console.log('\n[TEST 9] updatePriceWithHistory - Large Loss Scenario');
  
  try {
    // Setup: Create product
    await WMSDatabase.saveProduct({
      sku: 'TEST-SKU-009',
      name: 'Clearance Item',
      category: 'Office Supply',
      price: 100.00,
      stock_on_hand: 300,
      reorder_level: 20,
      location: 'Rack I1'
    });
    
    // Execute: Steep price cut (50% off)
    const result = await WMSDatabase.updatePriceWithHistory(
      'TEST-SKU-009',
      50.00,
      'manager',
      'Clearance sale'
    );
    
    // Verify
    console.log('Result:', result);
    console.assert(result.success === true, 'Update should succeed');
    console.assert(result.impact_amount === -15000.00, 
      `Expected impact_amount -15000.00, got ${result.impact_amount}`);
    console.assert(result.percentage_change === -50.00, 
      `Expected percentage_change -50.00, got ${result.percentage_change}`);
    console.log('✓ PASSED: Large loss scenario handled correctly');
  } catch (err) {
    console.error('✗ FAILED:', err.message);
  }
}

/**
 * Run all test cases
 */
async function runAllTests() {
  console.log('='.repeat(70));
  console.log('PRICE OPERATIONS TEST SUITE (Task 8.2)');
  console.log('='.repeat(70));
  console.log('Testing: calculate_revaluation_impact() and update_price_with_history()');
  console.log('Requirements: 6.1, 6.2, 6.3, 6.4');
  console.log('='.repeat(70));
  
  // Run tests sequentially
  await test_calculateRevaluationImpact_increase();
  await test_calculateRevaluationImpact_decrease();
  await test_calculateRevaluationImpact_zero_quantity();
  await test_calculateRevaluationImpact_not_found();
  await test_updatePriceWithHistory_success();
  await test_updatePriceWithHistory_not_found();
  await test_updatePriceWithHistory_audit_trail();
  await test_updatePriceWithHistory_large_impact();
  await test_updatePriceWithHistory_large_loss();
  
  console.log('\n' + '='.repeat(70));
  console.log('TEST SUITE COMPLETE');
  console.log('='.repeat(70));
}

// Export for use in Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllTests,
    test_calculateRevaluationImpact_increase,
    test_calculateRevaluationImpact_decrease,
    test_calculateRevaluationImpact_zero_quantity,
    test_calculateRevaluationImpact_not_found,
    test_updatePriceWithHistory_success,
    test_updatePriceWithHistory_not_found,
    test_updatePriceWithHistory_audit_trail,
    test_updatePriceWithHistory_large_impact,
    test_updatePriceWithHistory_large_loss
  };
}

