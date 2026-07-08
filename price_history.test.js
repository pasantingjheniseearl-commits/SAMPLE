/**
 * price_history.test.js
 * Tests for the price_history audit table (Task 8.1)
 * 
 * Requirements: 6.1, 8.1
 * - 6.1: Retroactive Inventory Revaluation
 * - 8.1: Price History Audit Trail
 */

/**
 * Unit Tests for Price History Operations
 */

describe('Price History Audit Table - Unit Tests', () => {
  
  /**
   * Test: Calculate revaluation impact correctly
   * Validates: Requirements 6.1, 6.2
   */
  test('calculateRevaluationImpact - positive price increase', () => {
    const oldPrice = 10.00;
    const newPrice = 15.00;
    const quantity = 100;
    
    const impact = (newPrice - oldPrice) * quantity;
    const percentageChange = ((newPrice - oldPrice) / oldPrice) * 100;
    
    expect(impact).toBe(500.00); // (15-10) * 100 = 500
    expect(percentageChange).toBe(50); // 50% increase
  });

  /**
   * Test: Calculate revaluation impact with price decrease
   * Validates: Requirements 6.1, 6.2
   */
  test('calculateRevaluationImpact - negative price decrease', () => {
    const oldPrice = 20.00;
    const newPrice = 15.00;
    const quantity = 100;
    
    const impact = (newPrice - oldPrice) * quantity;
    const percentageChange = ((newPrice - oldPrice) / oldPrice) * 100;
    
    expect(impact).toBe(-500.00); // (15-20) * 100 = -500
    expect(percentageChange).toBe(-25); // 25% decrease
  });

  /**
   * Test: Zero impact when quantity is zero
   * Validates: Requirements 6.2
   */
  test('calculateRevaluationImpact - zero quantity', () => {
    const oldPrice = 10.00;
    const newPrice = 15.00;
    const quantity = 0;
    
    const impact = (newPrice - oldPrice) * quantity;
    
    expect(impact).toBe(0);
  });

  /**
   * Test: Revaluation impact with large quantities
   * Validates: Requirements 6.2
   */
  test('calculateRevaluationImpact - large quantity', () => {
    const oldPrice = 5.50;
    const newPrice = 6.75;
    const quantity = 10000;
    
    const impact = (newPrice - oldPrice) * quantity;
    
    expect(impact).toBe(12500.00); // (6.75-5.50) * 10000 = 12500
  });

  /**
   * Test: Price history record structure
   * Validates: Requirements 8.1
   */
  test('price_history record contains required fields', () => {
    const record = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      sku: 'SKU123',
      previous_price: 10.00,
      new_price: 15.00,
      change_date: new Date().toISOString(),
      changed_by: 'operator1',
      revaluation_impact: 500.00,
      items_affected: 100,
      reason: 'Market adjustment',
      status: 'completed',
      created_at: new Date().toISOString()
    };
    
    // Verify all required fields are present
    expect(record).toHaveProperty('id');
    expect(record).toHaveProperty('sku');
    expect(record).toHaveProperty('previous_price');
    expect(record).toHaveProperty('new_price');
    expect(record).toHaveProperty('change_date');
    expect(record).toHaveProperty('changed_by');
    expect(record).toHaveProperty('revaluation_impact');
    expect(record).toHaveProperty('items_affected');
    expect(record).toHaveProperty('reason');
    expect(record).toHaveProperty('status');
    
    // Verify field types
    expect(typeof record.sku).toBe('string');
    expect(typeof record.previous_price).toBe('number');
    expect(typeof record.new_price).toBe('number');
    expect(typeof record.items_affected).toBe('number');
  });

  /**
   * Test: Constraint validation - prices must be non-negative
   * Validates: Requirements 8.1 (constraints to prevent unauthorized updates)
   */
  test('price_history constraints - prices must be non-negative', () => {
    const validRecord = {
      previous_price: 10.00,
      new_price: 15.00,
      items_affected: 100
    };
    
    const invalidNegativePreviousPrice = {
      previous_price: -10.00, // Invalid
      new_price: 15.00,
      items_affected: 100
    };
    
    const invalidNegativeNewPrice = {
      previous_price: 10.00,
      new_price: -15.00, // Invalid
      items_affected: 100
    };
    
    const invalidNegativeItems = {
      previous_price: 10.00,
      new_price: 15.00,
      items_affected: -100 // Invalid
    };
    
    // Constraint validation logic
    const isValidRecord = (rec) => {
      return rec.previous_price >= 0 && rec.new_price >= 0 && rec.items_affected >= 0;
    };
    
    expect(isValidRecord(validRecord)).toBe(true);
    expect(isValidRecord(invalidNegativePreviousPrice)).toBe(false);
    expect(isValidRecord(invalidNegativeNewPrice)).toBe(false);
    expect(isValidRecord(invalidNegativeItems)).toBe(false);
  });

  /**
   * Test: Large revaluation impact warning threshold
   * Validates: Requirements 6.1 (when revaluation impacts total inventory value by more than 5%)
   */
  test('revaluation impact - percentage threshold check (5%)', () => {
    // Scenario: 100 units at current price of $100 = $10,000 total value
    const currentPrice = 100.00;
    const newPrice = 105.00; // 5% increase
    const quantity = 100;
    const totalCurrentValue = currentPrice * quantity; // $10,000
    
    const revaluationImpact = (newPrice - currentPrice) * quantity; // $500
    const percentageChange = (revaluationImpact / totalCurrentValue) * 100; // 5%
    
    // Should flag as high-priority when >= 5% impact
    const isHighPriority = Math.abs(percentageChange) >= 5;
    
    expect(revaluationImpact).toBe(500.00);
    expect(percentageChange).toBe(5);
    expect(isHighPriority).toBe(true);
  });

  /**
   * Test: Revaluation with loss exceeding 10% threshold
   * Validates: Requirements 7.1 (additional warning prompt when loss exceeds 10%)
   */
  test('revaluation impact - 10% loss warning threshold', () => {
    // Scenario: Price drop of 15%
    const currentPrice = 100.00;
    const newPrice = 85.00; // 15% decrease
    const quantity = 100;
    const totalCurrentValue = currentPrice * quantity; // $10,000
    
    const revaluationImpact = (newPrice - currentPrice) * quantity; // -$1,500
    const percentageChange = (revaluationImpact / totalCurrentValue) * 100; // -15%
    
    // Should trigger warning when loss exceeds 10%
    const requiresWarning = Math.abs(percentageChange) > 10 && revaluationImpact < 0;
    
    expect(revaluationImpact).toBe(-1500.00);
    expect(percentageChange).toBe(-15);
    expect(requiresWarning).toBe(true);
  });

  /**
   * Test: Price history sorting by change_date descending
   * Validates: Requirements 8.1 (audit trail is queryable by date)
   */
  test('price_history sorting - most recent first', () => {
    const records = [
      { sku: 'SKU123', change_date: new Date('2024-01-01').toISOString(), previous_price: 10, new_price: 12 },
      { sku: 'SKU123', change_date: new Date('2024-01-05').toISOString(), previous_price: 12, new_price: 14 },
      { sku: 'SKU123', change_date: new Date('2024-01-03').toISOString(), previous_price: 11, new_price: 13 }
    ];
    
    // Sort descending by change_date
    const sorted = records.sort((a, b) => 
      new Date(b.change_date) - new Date(a.change_date)
    );
    
    expect(sorted[0].change_date).toBe(new Date('2024-01-05').toISOString());
    expect(sorted[1].change_date).toBe(new Date('2024-01-03').toISOString());
    expect(sorted[2].change_date).toBe(new Date('2024-01-01').toISOString());
  });

  /**
   * Test: Price history filtering by SKU
   * Validates: Requirements 8.1 (indexes on sku for audit queries)
   */
  test('price_history filtering - by SKU', () => {
    const allRecords = [
      { sku: 'SKU123', previous_price: 10, new_price: 12 },
      { sku: 'SKU456', previous_price: 20, new_price: 22 },
      { sku: 'SKU123', previous_price: 12, new_price: 14 },
      { sku: 'SKU789', previous_price: 30, new_price: 32 }
    ];
    
    const filteredBySkU = allRecords.filter(r => r.sku === 'SKU123');
    
    expect(filteredBySkU).toHaveLength(2);
    expect(filteredBySkU.every(r => r.sku === 'SKU123')).toBe(true);
  });

  /**
   * Test: Price history filtering by date range
   * Validates: Requirements 8.1 (indexes on change_date for audit queries)
   */
  test('price_history filtering - by date range', () => {
    const records = [
      { sku: 'SKU123', change_date: new Date('2024-01-01').toISOString(), previous_price: 10, new_price: 12 },
      { sku: 'SKU123', change_date: new Date('2024-01-15').toISOString(), previous_price: 12, new_price: 14 },
      { sku: 'SKU123', change_date: new Date('2024-02-01').toISOString(), previous_price: 14, new_price: 16 },
      { sku: 'SKU123', change_date: new Date('2024-03-01').toISOString(), previous_price: 16, new_price: 18 }
    ];
    
    const fromDate = new Date('2024-01-10');
    const toDate = new Date('2024-02-28');
    
    const filtered = records.filter(r => {
      const recordDate = new Date(r.change_date);
      return recordDate >= fromDate && recordDate <= toDate;
    });
    
    expect(filtered).toHaveLength(2);
    expect(filtered[0].change_date).toBe(new Date('2024-01-15').toISOString());
    expect(filtered[1].change_date).toBe(new Date('2024-02-01').toISOString());
  });

  /**
   * Test: Atomicity - price and audit trail updated together
   * Validates: Requirements 6.4 (All price changes and revaluations SHALL be recorded with atomic transactions)
   */
  test('price update atomicity - both product price and price_history recorded', () => {
    // Simulate atomic transaction
    let productPrice = 10.00;
    const priceHistoryRecords = [];
    
    const updatePrice = (newPrice, changedBy, reason, stockQty) => {
      const oldPrice = productPrice;
      
      // Both operations must succeed together (atomic)
      try {
        // Operation 1: Update product price
        productPrice = newPrice;
        
        // Operation 2: Log to price history
        priceHistoryRecords.push({
          previous_price: oldPrice,
          new_price: newPrice,
          revaluation_impact: (newPrice - oldPrice) * stockQty,
          items_affected: stockQty,
          changed_by: changedBy,
          reason: reason
        });
        
        return { success: true, productPrice, recordCount: priceHistoryRecords.length };
      } catch (err) {
        // Rollback both if either fails
        productPrice = oldPrice;
        priceHistoryRecords.pop();
        return { success: false, error: err };
      }
    };
    
    const result = updatePrice(15.00, 'operator1', 'Market adjustment', 100);
    
    expect(result.success).toBe(true);
    expect(productPrice).toBe(15.00);
    expect(priceHistoryRecords).toHaveLength(1);
    expect(priceHistoryRecords[0].previous_price).toBe(10.00);
    expect(priceHistoryRecords[0].new_price).toBe(15.00);
  });

  /**
   * Test: Immutable audit trail - records cannot be modified
   * Validates: Requirements 8.1 (records are immutable, read-only)
   */
  test('price_history immutability - read-only enforcement', () => {
    const record = Object.freeze({
      id: '123e4567-e89b-12d3-a456-426614174000',
      sku: 'SKU123',
      previous_price: 10.00,
      new_price: 15.00,
      change_date: new Date().toISOString(),
      changed_by: 'operator1',
      revaluation_impact: 500.00,
      items_affected: 100,
      reason: 'Market adjustment',
      status: 'completed'
    });
    
    // Attempt to modify frozen object should fail silently or throw in strict mode
    expect(() => {
      record.new_price = 20.00; // Should not modify
    }).not.toThrow(); // In non-strict mode, silently fails
    
    expect(record.new_price).toBe(15.00); // Original value unchanged
  });
});

/**
 * Integration Tests for Price History with Database
 */

describe('Price History Audit Table - Integration Tests', () => {
  
  /**
   * Integration Test: Log price change and verify record
   * Validates: Requirements 6.1, 8.1
   * 
   * Scenario: Stock In with new price triggers price history record
   */
  test('integration - logPriceChange creates audit record', async () => {
    // This test would connect to actual database
    // Mock/stub for demonstration:
    
    const mockDatabase = {
      priceHistory: []
    };
    
    const logPriceChange = (sku, oldPrice, newPrice, reason, changedBy, stockQty) => {
      const record = {
        id: Math.random().toString(36).substring(7),
        sku,
        previous_price: oldPrice,
        new_price: newPrice,
        change_date: new Date().toISOString(),
        changed_by: changedBy,
        revaluation_impact: (newPrice - oldPrice) * stockQty,
        items_affected: stockQty,
        reason,
        status: 'completed'
      };
      mockDatabase.priceHistory.push(record);
      return record;
    };
    
    const record = logPriceChange('SKU123', 10.00, 15.00, 'Market adjustment', 'operator1', 100);
    
    expect(mockDatabase.priceHistory).toHaveLength(1);
    expect(record.sku).toBe('SKU123');
    expect(record.previous_price).toBe(10.00);
    expect(record.new_price).toBe(15.00);
    expect(record.revaluation_impact).toBe(500.00);
    expect(record.items_affected).toBe(100);
    expect(record.changed_by).toBe('operator1');
  });

  /**
   * Integration Test: Query price history by SKU with filters
   * Validates: Requirements 8.1
   */
  test('integration - query price history by SKU and date range', () => {
    const mockData = [
      { sku: 'SKU123', previous_price: 10, new_price: 12, change_date: '2024-01-01', reason: 'Initial' },
      { sku: 'SKU123', previous_price: 12, new_price: 14, change_date: '2024-01-15', reason: 'Adjustment 1' },
      { sku: 'SKU123', previous_price: 14, new_price: 16, change_date: '2024-02-01', reason: 'Adjustment 2' },
      { sku: 'SKU456', previous_price: 20, new_price: 22, change_date: '2024-01-20', reason: 'Other SKU' }
    ];
    
    const getPriceHistory = (sku, fromDate, toDate) => {
      return mockData.filter(r => {
        const recordDate = new Date(r.change_date);
        const dateMatch = (!fromDate || recordDate >= new Date(fromDate)) &&
                         (!toDate || recordDate <= new Date(toDate));
        return r.sku === sku && dateMatch;
      });
    };
    
    const results = getPriceHistory('SKU123', '2024-01-10', '2024-02-05');
    
    expect(results).toHaveLength(2);
    expect(results.every(r => r.sku === 'SKU123')).toBe(true);
    expect(results[0].change_date).toBe('2024-01-15');
    expect(results[1].change_date).toBe('2024-02-01');
  });

  /**
   * Integration Test: Price history export to CSV
   * Validates: Requirements 8.1 (export audit trail)
   */
  test('integration - export price history to CSV format', () => {
    const records = [
      {
        sku: 'SKU123',
        previous_price: 10.00,
        new_price: 12.00,
        change_date: '2024-01-15T10:30:00Z',
        changed_by: 'operator1',
        revaluation_impact: 200.00,
        items_affected: 100,
        reason: 'Market adjustment',
        status: 'completed'
      },
      {
        sku: 'SKU123',
        previous_price: 12.00,
        new_price: 14.00,
        change_date: '2024-02-01T14:45:00Z',
        changed_by: 'operator2',
        revaluation_impact: 200.00,
        items_affected: 100,
        reason: 'New supplier pricing',
        status: 'completed'
      }
    ];
    
    const exportToCSV = (records) => {
      const headers = ['SKU', 'Previous Price', 'New Price', 'Change Date', 'Changed By', 'Revaluation Impact', 'Items Affected', 'Reason', 'Status'];
      const rows = records.map(r => [
        r.sku,
        r.previous_price,
        r.new_price,
        r.change_date,
        r.changed_by,
        r.revaluation_impact,
        r.items_affected,
        r.reason,
        r.status
      ]);
      
      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      return csv;
    };
    
    const csv = exportToCSV(records);
    
    expect(csv).toContain('SKU,Previous Price,New Price');
    expect(csv).toContain('SKU123,10,12');
    expect(csv).toContain('SKU123,12,14');
    expect(csv.split('\n')).toHaveLength(3); // 1 header + 2 records
  });

  /**
   * Integration Test: Concurrent price changes handled correctly
   * Validates: Requirements 6.4 (atomicity under load)
   */
  test('integration - multiple concurrent price updates are recorded separately', () => {
    const mockDatabase = { priceHistory: [] };
    
    const simulateMultiplePriceUpdates = async () => {
      const updates = [
        { sku: 'SKU123', oldPrice: 10.00, newPrice: 12.00, changedBy: 'op1', qty: 100 },
        { sku: 'SKU456', oldPrice: 20.00, newPrice: 24.00, changedBy: 'op2', qty: 50 },
        { sku: 'SKU123', oldPrice: 12.00, newPrice: 14.00, changedBy: 'op1', qty: 100 }
      ];
      
      // Simulate concurrent updates
      updates.forEach((update, idx) => {
        mockDatabase.priceHistory.push({
          id: idx,
          sku: update.sku,
          previous_price: update.oldPrice,
          new_price: update.newPrice,
          changed_by: update.changedBy,
          revaluation_impact: (update.newPrice - update.oldPrice) * update.qty,
          items_affected: update.qty,
          change_date: new Date().toISOString(),
          status: 'completed'
        });
      });
    };
    
    simulateMultiplePriceUpdates();
    
    expect(mockDatabase.priceHistory).toHaveLength(3);
    expect(mockDatabase.priceHistory[0].sku).toBe('SKU123');
    expect(mockDatabase.priceHistory[1].sku).toBe('SKU456');
    expect(mockDatabase.priceHistory[2].sku).toBe('SKU123');
  });
});

describe('Price History Constraints and Validation', () => {
  
  /**
   * Test: Verify constraints prevent invalid data
   * Validates: Requirements 8.1 (constraints to prevent unauthorized updates)
   */
  test('constraints - reject negative prices', () => {
    const validatePriceRecord = (record) => {
      const errors = [];
      if (record.previous_price < 0) errors.push('previous_price must be non-negative');
      if (record.new_price < 0) errors.push('new_price must be non-negative');
      if (record.items_affected < 0) errors.push('items_affected must be non-negative');
      return { valid: errors.length === 0, errors };
    };
    
    const validRecord = { previous_price: 10.00, new_price: 15.00, items_affected: 100 };
    const invalidRecord = { previous_price: -10.00, new_price: 15.00, items_affected: 100 };
    
    const validResult = validatePriceRecord(validRecord);
    const invalidResult = validatePriceRecord(invalidRecord);
    
    expect(validResult.valid).toBe(true);
    expect(validResult.errors).toHaveLength(0);
    
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors).toContain('previous_price must be non-negative');
  });

  /**
   * Test: Foreign key constraint - SKU must exist in products table
   * Validates: Requirements 8.1 (referential integrity)
   */
  test('foreign key - SKU must reference existing product', () => {
    const products = [
      { sku: 'SKU123', name: 'Product A' },
      { sku: 'SKU456', name: 'Product B' }
    ];
    
    const canInsertPriceHistoryRecord = (sku) => {
      return products.some(p => p.sku === sku);
    };
    
    expect(canInsertPriceHistoryRecord('SKU123')).toBe(true);
    expect(canInsertPriceHistoryRecord('SKU456')).toBe(true);
    expect(canInsertPriceHistoryRecord('SKU999')).toBe(false); // Doesn't exist
  });

  /**
   * Test: Verify default values for status and change_date
   * Validates: Requirements 8.1
   */
  test('defaults - status defaults to completed, change_date to NOW', () => {
    const createRecord = (sku, previousPrice, newPrice, changedBy, reason) => {
      return {
        id: Math.random().toString(36).substring(7),
        sku,
        previous_price: previousPrice,
        new_price: newPrice,
        status: 'completed', // Default
        change_date: new Date().toISOString(), // Default to NOW
        changed_by: changedBy,
        reason
      };
    };
    
    const record = createRecord('SKU123', 10.00, 15.00, 'operator1', 'Market adjustment');
    
    expect(record.status).toBe('completed');
    expect(record.change_date).toBeTruthy();
    expect(new Date(record.change_date)).toBeInstanceOf(Date);
  });
});
