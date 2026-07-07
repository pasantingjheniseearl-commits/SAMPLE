# E2E Testing Quick Guide - WMS

## Prerequisites
1. Open WMS application in browser
2. Open DevTools (F12) → Console tab
3. Log in as admin (first user = auto-approved admin)
4. Keep console visible during all tests

## Test 1-2: Transaction Modals

### Stock In Modal (Test 1)
```
1. Click "Stock In" in sidebar
2. In "Recent Intake Receipts" → click any transaction row
3. Modal opens with:
   ✓ Icon: fa-arrow-down-long (green)
   ✓ Quantity: +50 (green)
   ✓ Timestamp, SKU, Product, Location, Doc Ref, Operator, Notes
4. Click close (X) → modal closes
5. Click another row → modal updates
Result: PASS ✓ / FAIL ✗
```

### Stock Out Modal (Test 2)
```
1. Click "Stock Out" in sidebar
2. In "Recent Dispatch Shipments" → click any transaction row
3. Modal opens with:
   ✓ Icon: fa-arrow-up-long (ORANGE - different from Stock In)
   ✓ Quantity: -10 (red - different from Stock In)
   ✓ All fields displayed correctly
Result: PASS ✓ / FAIL ✗
```

## Test 3-9: Admin User Management

### Test 3: User Overview
```
1. Click "User Approvals" (admin sidebar)
2. Verify table shows all users:
   ✓ Full Name, Email, Joined, Status (badge), Role, Actions
   ✓ Status colors: Green=approved, Yellow=pending, Red=rejected
   ✓ Sorted by joined date (newest first)
Result: PASS ✓ / FAIL ✗
```

### Test 4: Delete User with Confirmation
```
1. Find a test user (NOT yourself)
2. Click "Remove" button → Modal appears
3. Modal shows: "Remove user \"[Name]\"?"
4. Click Cancel → Modal closes, user still exists
5. Click Remove again → Click Confirm → User deleted
6. Toast: "User removed successfully."
7. User disappears from table
Result: PASS ✓ / FAIL ✗
```

### Test 5: Cannot Delete Self
```
1. Find your own user row in User Approvals
2. Actions column shows: "Your account" (NOT delete button)
3. No delete button visible for your user
Result: PASS ✓ / FAIL ✗
```

### Test 6: Change User Role
```
1. Find test user with role "Operator"
2. Click role dropdown → Select "Administrator"
3. Toast: "Role updated to Administrator."
4. Table updates immediately
5. Refresh page → Role persists
Result: PASS ✓ / FAIL ✗
```

### Test 7: Cannot Change Own Role
```
1. Find your own user row
2. Role dropdown is DISABLED (grayed out)
3. Hover over dropdown → Tooltip: "Cannot change your own role"
4. Cannot click or change value
Result: PASS ✓ / FAIL ✗
```

### Test 8: Approve Pending User
```
1. Create new test account (register on login page)
2. Account should be "pending" (not auto-approved)
3. Log in as admin → User Approvals
4. Find pending user (yellow badge)
5. Click "Approve" → Toast: "User approved."
6. Badge changes to green (approved)
7. Test user can now sign in
Result: PASS ✓ / FAIL ✗
```

### Test 9: Reject Pending User
```
1. Create another test account
2. In User Approvals, find pending user
3. Click "Reject" → Toast: "User rejected."
4. Badge changes to red (rejected)
5. Rejected user cannot sign in
Result: PASS ✓ / FAIL ✗
```

## Test 10: No XSS Vulnerabilities

```
1. Create product with XSS payload in name:
   <script>alert('xss')</script>
2. Go to Inventory → Search for product
3. Product name shows as ESCAPED TEXT (literal <script>)
4. NO JavaScript alert() appears
5. Check Console → NO errors
6. Create user with XSS payload similar way
7. Same result: escaped, no execution
Result: PASS ✓ / FAIL ✗
```

## Test 11: No JavaScript Errors

```
1. DevTools Console already open
2. Clear console (use trash icon)
3. Test all features:
   - Click Stock In/Out transactions
   - Open User Approvals
   - Approve/reject users
   - Change roles
   - Delete test user
   - Switch themes
   - Search/filter
4. Watch Console during all operations
5. Expected: NO red error messages
Result: 
   Errors found: [count]
   Status: PASS ✓ / FAIL ✗
```

## Test 12: Data Integrity

```
1. Create Stock In transaction:
   - SKU: TEST-001, Qty: 50, Location: Rack A1
   - Doc Ref: PO-2024-TEST, Price: 250.00
2. Transaction appears in Stock In history
3. Note timestamp exactly
4. REFRESH PAGE (Ctrl+R or F5)
5. Go back to Stock In history
6. Find your transaction
7. Verify all data unchanged:
   ✓ Quantity: 50
   ✓ Doc Ref: PO-2024-TEST
   ✓ Timestamp exact
   ✓ All fields intact
Result: PASS ✓ / FAIL ✗
```

## Test 13: Multi-Tab Consistency (Optional)

```
1. Open WMS in TWO tabs (both logged in as admin)
2. Tab A: Go to User Approvals
3. Tab A: Click "Approve" on pending user → Toast appears
4. Tab B: Stay on User Approvals (DON'T refresh manually)
5. Wait 3 seconds
6. Tab B: User status should change to green automatically
7. Both tabs show same data without manual refresh
Result: PASS ✓ / FAIL ✗
```

## Test 14: Light Theme (Optional)

```
1. Click theme toggle (sun/moon icon in top right)
2. Page switches to light theme
3. Click Stock In transaction → Modal opens
4. Modal is readable in light theme (good contrast)
5. Go to User Approvals → Badges visible
6. Try delete → Modal appears, readable
7. All colors work in light theme
Result: PASS ✓ / FAIL ✗
```

## Test 15: Responsive Design (Optional)

```
1. Open DevTools (F12)
2. Click Device Toolbar icon (Ctrl+Shift+M)
3. Set width to 375px (mobile)
4. Stock In tab → Click transaction
5. Modal fits on screen, not cut off
6. All text readable
7. Close button (X) easy to tap
8. Go to User Approvals → Table scrolls
9. Delete user → Modal fits on mobile
Result: PASS ✓ / FAIL ✗
```

---

## SCORING

Count passing tests:

- **15/15 passed** → ✅ READY FOR PRODUCTION
- **14/15 passed** (optional test failed) → ✅ READY FOR PRODUCTION
- **13/14 passed** (1 core test failed) → ❌ FIX REQUIRED
- **Any <13** → ❌ REQUIRES FIXES

---

## CONSOLE ERROR DOCUMENTATION

If errors found, document:
- **Error message**: [Copy from console]
- **When it occurred**: [During which test]
- **Reproducible**: Yes / No
- **Severity**: Critical / Major / Minor

