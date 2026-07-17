# Barcode Scanner & Find Blocker - Troubleshooting Guide

## ✅ What Was Fixed

1. **Barcode Parser** - Enhanced with better logging and error handling
2. **Find Blocker** - Improved with capture phase and stopImmediatePropagation
3. **triggerMockScan** - Added detailed console logging for debugging

---

## 🧪 Testing & Debugging

### Step 1: Open Browser Console
Press `F12` to open Developer Tools → Go to **Console** tab

### Step 2: Test Barcode Parser

Run this in the console:

```javascript
// Test the parser directly
window.testBarcodeParser('02050-10153588-6')
```

**Expected output:**
```
Input: 02050-10153588-6
Result: {
  mode: "barcode",
  sku: "10153588",
  fullBarcode: "020501015358856",
  extractedAt: "2024-..."
}
```

### Step 3: Test Different Barcode Formats

```javascript
// Test with dashes
window.testBarcodeParser('02050-10153588-6')

// Test without dashes
window.testBarcodeParser('020501015358856')

// Test with spaces
window.testBarcodeParser('02050 10153588 6')

// Test manual SKU
window.testBarcodeParser('ABC12345')
```

### Step 4: Watch Console During Scan

1. Go to barcode scanner view
2. Open console (F12)
3. Type or scan a barcode
4. Watch the console logs:

```
[parseScannedInput.js] ✓ Barcode parser loaded and ready
[parseScannedInput] Input: 02050-10153588-6 | Digits: 020501015358856 | Length: 14
[parseScannedInput] Barcode detected! Extracted SKU: 10153588
[triggerMockScan] Processing barcode/SKU
  Raw input: 02050-10153588-6
  Parser result: {mode: "barcode", sku: "10153588", ...}
  Final SKU to lookup: 10153588 | Mode: barcode
  Product lookup result: {...product data...}
```

---

## 🔍 Debugging Barcode Extraction Issues

### Problem 1: Parser Says "Manual SKU" When It Should Say "Barcode"

**Cause**: Input format doesn't match the regex pattern

**Check**:
```javascript
// This should return TRUE if it's a valid barcode
/^02050\d{9}$/.test('020501015358856')
```

**Solutions**:
- Verify the barcode format is exactly: `02050` + 8 digits + 1 digit (14 total)
- Ensure no special characters (only dashes/spaces which are stripped)
- Check barcode scanner is configured to output the right format

### Problem 2: Extracted SKU is Wrong

**Cause**: String slicing is incorrect

**Check**:
```javascript
const digits = '020501015358856';
digits.slice(5, 13)  // Should return: 10153588
```

**Verify**:
- Slice(5,13) = positions 5-12 (8 characters)
- First 5 chars (0-4) = "02050" (SKIP)
- Next 8 chars (5-12) = "10153588" (EXTRACT)
- Last 1 char (13) = "6" (SKIP)

### Problem 3: Product Not Found After SKU Extraction

**Cause**: SKU doesn't exist in database

**Check**:
```javascript
// In console, run:
db.from('products').select('sku').eq('sku', '10153588').single()
```

**Solutions**:
- Verify the 8-digit SKU actually exists in your products table
- Check if SKU is uppercase/lowercase sensitive
- Try manual entry: type `10153588` directly to see if product exists

---

## 🚫 Debugging Find Popup Issue

### Problem 1: Ctrl+F Still Opens Find Dialog

**Cause**: Event listener not capturing the keydown event

**Check in Console**:
```javascript
// Is the scanner view actually active?
document.getElementById('view-barcode').classList.contains('active')  // Should be TRUE

// Try pressing Ctrl+F and check console for:
// [Global] Find popup blocked - scanner view active
```

**Solutions**:
1. Make sure you're actually on the barcode scanner view (click the barcode link in sidebar)
2. Check console for the blocking message
3. Try reloading the page (F5)

### Problem 2: Find Blocker Throws Error

**Check in Console**:
```javascript
// Should show no errors and return an object
window.parseScannedInput
```

**Check Event Listeners**:
```javascript
// Get the scanner input element
const input = document.getElementById('mock-scan-input');

// It should exist
console.log('Scanner input exists:', !!input);
```

### Problem 3: Toast Notification Doesn't Show

**Check**:
```javascript
// Try manually showing a toast
showToast('Test message', 'warning')
```

**Solutions**:
- Verify `#toast-container` element exists in HTML
- Check that showToast function is available globally
- Check CSS for toast styling

---

## 📋 Step-by-Step Verification Checklist

- [ ] Browser console shows: `[parseScannedInput.js] ✓ Barcode parser loaded`
- [ ] `window.parseScannedInput` function exists (type in console)
- [ ] `window.testBarcodeParser('02050-10153588-6')` returns correct SKU
- [ ] Scanner input element exists: `document.getElementById('mock-scan-input')`
- [ ] Barcode view element exists: `document.getElementById('view-barcode')`
- [ ] On barcode scanner view, `document.getElementById('view-barcode').classList.contains('active')` = TRUE
- [ ] Pressing Ctrl+F shows console message: `[Global] Find popup blocked`
- [ ] Pressing Ctrl+F shows toast: "Find is disabled during barcode scanning mode"
- [ ] Product exists in database for test SKU
- [ ] Typing barcode shows product details

---

## 🔧 Manual Testing Workflow

### Test 1: Barcode Scanning
1. Navigate to Barcode Scanner view
2. Have a product with SKU `10153588` in database
3. Type or scan: `02050-10153588-6`
4. Press Enter or click "Scan Code" button
5. **Expected**: Product appears with all details
6. **Check Console**: All logs show correct extraction

### Test 2: Manual SKU Entry
1. Navigate to Barcode Scanner view
2. Type: `10153588` (just the 8-digit SKU)
3. Press Enter
4. **Expected**: Same product appears
5. **Check Console**: Shows `mode: "manual"`

### Test 3: Find Popup Blocking
1. Navigate to Barcode Scanner view
2. Click in the barcode scanner input field
3. Press Ctrl+F (Windows/Linux) or Cmd+F (Mac)
4. **Expected**: 
   - Find dialog DOES NOT open
   - Toast shows: "Find is disabled during barcode scanning"
   - Console shows: "[Global] Find popup blocked - scanner view active"
5. Leave barcode view, press Ctrl+F
6. **Expected**: Normal Find dialog appears

### Test 4: Not Found Handling
1. Navigate to Barcode Scanner view
2. Type: `NONEXISTENT`
3. Press Enter
4. **Expected**: Error message appears
5. **Check Console**: Shows `Product lookup result: null`

---

## 📊 Expected Console Output

### Successful Barcode Scan:
```
[parseScannedInput] Input: 02050-10153588-6 | Digits: 020501015358856 | Length: 14
[parseScannedInput] Barcode detected! Extracted SKU: 10153588
[triggerMockScan] Processing barcode/SKU
  Raw input: 02050-10153588-6
  Parser result: {mode: "barcode", sku: "10153588", ...}
  Final SKU to lookup: 10153588 | Mode: barcode
  Product lookup result: {sku: "10153588", name: "...", ...}
✓ Scanner: Scanned 10153588 successfully
```

### Successful Find Blocking:
```
[Scanner] Find popup blocked - barcode scanning active
⚠ Find is disabled during barcode scanning
```

---

## 🆘 Emergency Checks

If nothing is working, verify these in console:

```javascript
// 1. Check if parseScannedInput loaded
typeof window.parseScannedInput === 'function' ? '✓' : '✗'

// 2. Check if app.js loaded (showToast should exist)
typeof window.showToast === 'function' ? '✓' : '✗'

// 3. Check if HTML elements exist
[
  document.getElementById('mock-scan-input'),
  document.getElementById('mock-scan-btn'),
  document.getElementById('mock-scan-result'),
  document.getElementById('view-barcode')
].map(el => el ? '✓' : '✗')

// 4. Manual test of extraction
window.parseScannedInput('02050-10153588-6')

// 5. Manual test of Find blocking
document.dispatchEvent(new KeyboardEvent('keydown', {
  key: 'f',
  ctrlKey: true,
  bubbles: true,
  cancelable: true
}))
```

---

## 📞 Quick Fixes

### Fix 1: Hard Refresh Page
Press `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac) to clear cache and reload

### Fix 2: Check Console for Errors
Open F12 → Console tab → Look for RED errors

### Fix 3: Verify HTML Script Order
Open `index.html` and confirm:
```html
<script src="parseScannedInput.js"></script>
<script src="app.js"></script>
```
(parseScannedInput MUST come first)

### Fix 4: Test in Incognito Mode
Sometimes browser extensions interfere - test in private/incognito window

### Fix 5: Try Different Browser
Test in Chrome, Firefox, Safari, or Edge to verify compatibility

---

## 📝 Success Indicators

✅ **Barcode extraction working if**:
- Console shows: `[parseScannedInput] Barcode detected! Extracted SKU: XXXXXXXX`
- Product details appear on screen
- Toasts show: `Scanner: Scanned XXXXXXXX successfully`

✅ **Find blocker working if**:
- Ctrl+F/Cmd+F pressed → NO Find dialog appears
- Toast shows: "Find is disabled during barcode scanning"
- Console shows: `[Global] Find popup blocked`

---

## 🚀 Next Steps

Once verified working:

1. **Test with actual barcode scanner hardware** - Connect your warehouse scanner
2. **Test with different barcode formats** - If you have variations
3. **Test on tablets/mobile** - Used in warehouse
4. **User training** - Show operators how to use
5. **Production deployment** - Roll out to all terminals

---

**Last Updated**: 2024
**Status**: Troubleshooting Guide Complete ✅
