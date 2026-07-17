/**
 * BARCODE SCANNER PARSER
 * Converts 14-digit barcodes to 8-digit SKUs
 * 
 * Barcode Format: 02050-XXXXXXXX-C (14 digits)
 * - First 5: 02050 (prefix - SKIP)
 * - Next 8: XXXXXXXX (SKU - EXTRACT)
 * - Last 1: C (check digit - SKIP)
 * 
 * Result: 8-digit SKU extracted from middle
 */

function parseScannedInput(raw) {
  // Validate input
  if (!raw || typeof raw !== 'string') {
    console.warn('[parseScannedInput] Invalid input:', raw);
    return { mode: 'manual', sku: '' };
  }
  
  const trimmed = (raw || '').trim();
  
  // Remove all dashes, spaces, and special characters - keep only digits
  const digitsOnly = trimmed.replace(/[\s\-\.]/g, '');
  
  console.log('[parseScannedInput] Input:', trimmed, '| Digits:', digitsOnly, '| Length:', digitsOnly.length);
  
  // Check if it matches 14-digit barcode pattern: 02050 + 8 digits + 1 check digit = 14 total
  // Pattern: /^02050\d{9}$/ means: starts with 02050, followed by exactly 9 more digits (8 SKU + 1 check)
  if (/^02050\d{9}$/.test(digitsOnly)) {
    // Valid barcode format detected
    // Extract middle 8 digits: skip first 5 (02050), take next 8, skip last 1
    // String indices: 0-4 (02050), 5-12 (XXXXXXXX), 13 (check digit)
    const productCode = digitsOnly.slice(5, 13);
    
    console.log('[parseScannedInput] Barcode detected! Extracted SKU:', productCode);
    
    return { 
      mode: 'barcode', 
      sku: productCode.toUpperCase(),
      fullBarcode: digitsOnly,
      extractedAt: new Date().toISOString()
    };
  }
  
  // Not a valid barcode — treat as manually-typed SKU
  console.log('[parseScannedInput] Manual SKU entry detected:', trimmed);
  
  return { 
    mode: 'manual', 
    sku: trimmed.toUpperCase(),
    extractedAt: new Date().toISOString()
  };
}

// Expose globally for use in app.js
window.parseScannedInput = parseScannedInput;

// Also expose a diagnostic function for testing
window.testBarcodeParser = function(testInput) {
  console.group('🧪 Barcode Parser Test');
  console.log('Input:', testInput);
  const result = parseScannedInput(testInput);
  console.log('Result:', result);
  console.groupEnd();
  return result;
};

// Log that parser loaded successfully
console.log('[parseScannedInput.js] ✓ Barcode parser loaded and ready');
