# E2E Testing Checklist - WMS

**Tester Name**: ___________________  
**Test Date**: ___________________  
**Browser**: [ ] Chrome [ ] Firefox [ ] Safari [ ] Other: ______  
**Theme During Testing**: [ ] Dark [ ] Light [ ] Both  

---

## SECTION A: TRANSACTION MODALS (Tests 1-2)

### Test 1: Stock In Modal
- [ ] Navigate to Stock In tab
- [ ] Recent Intake Receipts table visible
- [ ] Click transaction row
- [ ] Modal opens successfully
- [ ] Icon shows: fa-arrow-down-long
- [ ] Icon color: GREEN (success color)
- [ ] Quantity displays with **+** prefix
- [ ] Quantity color: GREEN
- [ ] All fields visible:
  - [ ] Timestamp
  - [ ] Type: "Stock In"
  - [ ] SKU
  - [ ] Product
  - [ ] Quantity
  - [ ] Location
  - [ ] Doc Ref
  - [ ] Unit Price (₱ format)
  - [ ] Operator
  - [ ] Notes
- [ ] Close button (X) works
- [ ] Clicking different row updates modal data
- [ ] NO console errors
- **Status**: [ ] PASS [ ] FAIL

**Notes**: ________________________________________________

### Test 2: Stock Out Modal
- [ ] Navigate to Stock Out tab
- [ ] Recent Dispatch Shipments table visible
- [ ] Click transaction row
- [ ] Modal opens successfully
- [ ] Icon shows: fa-arrow-up-long (DIFFERENT from Stock In)
- [ ] Icon color: ORANGE (warning color) (DIFFERENT from Stock In)
- [ ] Quantity displays with **-** prefix (DIFFERENT from Stock In)
- [ ] Quantity color: RED (danger color) (DIFFERENT from Stock In)
- [ ] All fields visible with correct data
- [ ] Close button works
- [ ] Switching between Stock In and Stock Out shows different icons/colors
- [ ] NO console errors
- **Status**: [ ] PASS [ ] FAIL

**Notes**: ________________________________________________

---

## SECTION B: ADMIN USER MANAGEMENT (Tests 3-9)

### Test 3: Admin User Overview
- [ ] User Approvals tab visible in sidebar (admin-only)
- [ ] Can click User Approvals tab
- [ ] User table loads without errors
- [ ] All users from database displayed
- [ ] Table columns present:
  - [ ] Full Name
  - [ ] Email
  - [ ] Joined (date)
  - [ ] Status (badge)
  - [ ] Assigned Role
  - [ ] Actions
- [ ] Status badges show correct colors:
  - [ ] Green badge = Approved users
  - [ ] Yellow badge = Pending users
  - [ ] Red badge = Rejected users
- [ ] Table sorted by joined date (newest first)
- [ ] NO console errors
- **Status**: [ ] PASS [ ] FAIL

**Notes**: ________________________________________________

### Test 4: Admin Delete User (with Confirmation Modal)
- [ ] Select a test/non-self user
- [ ] Click "Remove" or "Delete" button
- [ ] Confirmation modal appears
- [ ] Modal shows user name in message
- [ ] Modal text: "Remove user \"[Name]\"? Their profile will be deactivated..."
- [ ] Cancel button present
- [ ] Confirm/Remove button present
- [ ] Click Cancel → Modal closes, user NOT deleted
- [ ] Click Remove again → Click Confirm → User deleted
- [ ] Toast notification appears: "User removed successfully."
- [ ] User disappears from table immediately
- [ ] Table refreshes automatically
- [ ] NO console errors
- **Status**: [ ] PASS [ ] FAIL

**Test User Deleted**: _________________ (user email/name)  
**Notes**: ________________________________________________

### Test 5: Admin Cannot Delete Self
- [ ] Find your own user in User Approvals table
- [ ] Look at Actions column for your user
- [ ] Delete/Remove button NOT visible for own user
- [ ] Instead shows: "Your account" or similar message
- [ ] Cannot click any delete action on own row
- [ ] Other users still show delete button
- [ ] NO console errors
- **Status**: [ ] PASS [ ] FAIL

**Notes**: ________________________________________________

### Test 6: Admin Change User Role
- [ ] Find a test user with role "Operator"
- [ ] Locate "Assigned Role" column
- [ ] Role dropdown visible and clickable
- [ ] Click dropdown
- [ ] Options show: Operator, Administrator
- [ ] Select different role (e.g., Administrator)
- [ ] Role changes in table immediately
- [ ] Toast notification appears: "Role updated to [Role]."
- [ ] Refresh page (F5)
- [ ] Role change persists after refresh
- [ ] Change visible in other tabs (if multi-tab open)
- [ ] NO console errors
- **Status**: [ ] PASS [ ] FAIL

**Test User**: _________________ (user email)  
**Old Role**: _________________ **New Role**: _________________  
**Notes**: ________________________________________________

### Test 7: Admin Cannot Change Own Role
- [ ] Find your own user in User Approvals
- [ ] Look at "Assigned Role" column for your user
- [ ] Role dropdown is DISABLED (grayed out)
- [ ] Cannot click dropdown for own user
- [ ] Hover over dropdown
- [ ] Tooltip shows: "Cannot change your own role"
- [ ] Other users' dropdowns are enabled and work
- [ ] NO console errors
- **Status**: [ ] PASS [ ] FAIL

**Notes**: ________________________________________________

### Test 8: Admin Approve User
- [ ] Create new test user:
  - [ ] Register on login page
  - [ ] Choose username/password
  - [ ] Submit registration
  - [ ] Account created with status "pending"
- [ ] Log in as admin
- [ ] Go to User Approvals tab
- [ ] Find newly created user
- [ ] User has yellow badge (pending status)
- [ ] Click "Approve" button in Actions
- [ ] Toast appears: "User approved."
- [ ] User status badge changes from yellow to green
- [ ] Table refreshes
- [ ] Log out and test if new user can sign in
- [ ] New user can access WMS (approved)
- [ ] NO console errors
- **Status**: [ ] PASS [ ] FAIL

**Test User Created**: _________________ (username/email)  
**Notes**: ________________________________________________

### Test 9: Admin Reject User
- [ ] Create another test user (same as Test 8)
- [ ] Go to User Approvals as admin
- [ ] Find pending user
- [ ] User has yellow badge (pending status)
- [ ] Click "Reject" button in Actions
- [ ] Toast appears: "User rejected."
- [ ] User status badge changes from yellow to red
- [ ] Table updates immediately
- [ ] Log out and test if user can sign in
- [ ] User cannot sign in (access denied)
- [ ] NO console errors
- **Status**: [ ] PASS [ ] FAIL

**Test User Created**: _________________ (username/email)  
**Notes**: ________________________________________________

---

## SECTION C: SECURITY & ERROR HANDLING (Tests 10-11)

### Test 10: No XSS Vulnerabilities
- [ ] Open DevTools Console (F12)
- [ ] Clear all messages
- [ ] Create product with XSS payload in name:
  - [ ] Name: `<script>alert('xss')</script>`
  - [ ] Submit product creation
  - [ ] NO JavaScript alert() appears
  - [ ] Product appears in inventory
  - [ ] Name displays ESCAPED (shows literal text, not script)
- [ ] Create user with XSS payload in name:
  - [ ] Name: `"><script>alert('xss')</script>`
  - [ ] Register account
  - [ ] NO JavaScript alert() appears
  - [ ] User appears in list with escaped name
- [ ] Check Console:
  - [ ] NO red error messages
  - [ ] NO "Uncaught" exceptions
- [ ] Application works normally
- [ ] NO console errors
- **Status**: [ ] PASS [ ] FAIL

**XSS Payload Tested**: ________________________________________  
**Notes**: ________________________________________________

### Test 11: No JavaScript Errors
- [ ] Open DevTools Console (F12)
- [ ] Click "Clear Console" icon (trash)
- [ ] Perform ALL operations while watching console:
  - [ ] Click Stock In transactions (multiple)
  - [ ] Click Stock Out transactions (multiple)
  - [ ] Open User Approvals tab
  - [ ] Approve a pending user
  - [ ] Reject a pending user
  - [ ] Change a user's role
  - [ ] Delete a test user (with confirmation)
  - [ ] Toggle between tabs
  - [ ] Toggle theme (dark ↔ light)
  - [ ] Perform searches/filters in Inventory
  - [ ] Edit own profile
- [ ] During all operations:
  - [ ] NO red error messages in Console
  - [ ] NO "Uncaught" exceptions
  - [ ] NO undefined variable errors
  - [ ] NO 404 errors for resources
  - [ ] Network tab shows successful requests (200 status)
- [ ] All operations complete successfully
- [ ] Application remains responsive
- **Status**: [ ] PASS [ ] FAIL

**Errors Found**: [ ] None [ ] Yes: ___________  
**Error Count**: _________  
**Error Details** (if any): ________________________________________

---

## SECTION D: DATA INTEGRITY (Test 12)

### Test 12: Data Integrity
- [ ] Create Stock In transaction with specific details:
  - [ ] SKU: TEST-PERSIST-001
  - [ ] Product: Test Data Product
  - [ ] Quantity: 50
  - [ ] Location: Rack A1
  - [ ] Doc Ref: PO-2024-PERSIST
  - [ ] Unit Price: 250.00
  - [ ] Notes: "E2E Test - DO NOT DELETE"
- [ ] Transaction appears in Stock In history table
- [ ] Note the EXACT timestamp
- [ ] **Refresh page** (Press Ctrl+R or F5)
- [ ] Wait for page to fully load
- [ ] Go back to Stock In tab
- [ ] Go to Recent Intake Receipts section
- [ ] Search for transaction (by SKU or Doc Ref)
- [ ] Transaction still visible
- [ ] Verify data unchanged:
  - [ ] SKU: TEST-PERSIST-001
  - [ ] Product: Test Data Product
  - [ ] Quantity: 50
  - [ ] Location: Rack A1
  - [ ] Doc Ref: PO-2024-PERSIST
  - [ ] Timestamp EXACTLY same (no change)
  - [ ] Operator: correct logged-in user
- [ ] All fields display correctly
- [ ] NO data loss or corruption
- [ ] Transaction stored in database (persisted)
- **Status**: [ ] PASS [ ] FAIL

**Transaction Details**:  
- SKU: _________________________
- Timestamp: _________________________
- Doc Ref: _________________________

**Notes**: ________________________________________________

---

## SECTION E: OPTIONAL TESTS (Tests 13-15)

### Test 13: Multi-Tab Consistency
- [ ] Open WMS in **TWO browser tabs**
- [ ] Both tabs: Log in as admin
- [ ] Both tabs: Go to User Approvals
- [ ] **Tab A**: Find a pending user (yellow badge)
- [ ] **Tab A**: Click "Approve" button
- [ ] **Tab A**: Toast confirms "User approved."
- [ ] **Tab B**: Stay on User Approvals (**DO NOT** manually refresh)
- [ ] **Tab B**: Wait 3-5 seconds
- [ ] **Tab B**: User status should AUTO-UPDATE to green (approved)
- [ ] Both tabs show identical data without manual refresh
- [ ] Realtime Supabase subscriptions working
- [ ] NO console errors
- **Status**: [ ] PASS [ ] FAIL [ ] SKIPPED

**Notes**: ________________________________________________

### Test 14: Light Theme Testing
- [ ] Click theme toggle button (sun/moon icon in top bar)
- [ ] Page switches to Light Theme
- [ ] Theme persists (check sidebar, cards, tables)
- [ ] Navigation to Stock In tab
- [ ] Click a Stock In transaction
- [ ] Modal opens with light theme styling
- [ ] Modal text is readable (good contrast)
- [ ] Go to User Approvals tab
- [ ] User table visible with light styling
- [ ] Status badges visible:
  - [ ] Green badge (approved) readable
  - [ ] Yellow badge (pending) readable
  - [ ] Red badge (rejected) readable
- [ ] Click delete user → Modal appears in light theme
- [ ] Modal is readable, buttons visible
- [ ] NO color contrast issues
- [ ] All elements styled correctly for light theme
- [ ] NO console errors
- **Status**: [ ] PASS [ ] FAIL [ ] SKIPPED

**Notes**: ________________________________________________

### Test 15: Responsive Design (Mobile)
- [ ] Open DevTools (F12)
- [ ] Click Device Toolbar icon (Ctrl+Shift+M)
- [ ] Set viewport to **375px width** (mobile)
- [ ] Navigate to Stock In tab
- [ ] Click a Stock In transaction
- [ ] Modal opens
- [ ] Modal content visible:
  - [ ] NOT cut off horizontally
  - [ ] NOT cut off vertically
  - [ ] All fields readable on 375px screen
  - [ ] Close button (X) accessible
  - [ ] Cannot scroll horizontally inside modal
- [ ] Go to User Approvals tab
- [ ] User Approvals table:
  - [ ] Table loads (may scroll horizontally)
  - [ ] Readable on 375px
  - [ ] Action buttons visible (Approve, Reject, Delete)
- [ ] Click Delete on a test user
- [ ] Confirmation modal appears
- [ ] Modal fits on 375px viewport
- [ ] Buttons are touch-friendly (>44px tall)
- [ ] Can tap Close (X), Cancel, Confirm
- [ ] NO layout breaking
- [ ] NO horizontal scroll unless necessary
- [ ] NO console errors
- **Status**: [ ] PASS [ ] FAIL [ ] SKIPPED

**Mobile Viewport**: 375px x [auto]  
**Notes**: ________________________________________________

---

## FINAL SUMMARY

### Test Results Tally

| Test | Status |
|------|--------|
| 1. Stock In Modal | [ ] PASS [ ] FAIL |
| 2. Stock Out Modal | [ ] PASS [ ] FAIL |
| 3. User Overview | [ ] PASS [ ] FAIL |
| 4. Delete User | [ ] PASS [ ] FAIL |
| 5. Cannot Delete Self | [ ] PASS [ ] FAIL |
| 6. Change User Role | [ ] PASS [ ] FAIL |
| 7. Cannot Change Own Role | [ ] PASS [ ] FAIL |
| 8. Approve User | [ ] PASS [ ] FAIL |
| 9. Reject User | [ ] PASS [ ] FAIL |
| 10. No XSS | [ ] PASS [ ] FAIL |
| 11. No JS Errors | [ ] PASS [ ] FAIL |
| 12. Data Integrity | [ ] PASS [ ] FAIL |
| 13. Multi-Tab Sync (Opt.) | [ ] PASS [ ] FAIL [ ] SKIP |
| 14. Light Theme (Opt.) | [ ] PASS [ ] FAIL [ ] SKIP |
| 15. Responsive (Opt.) | [ ] PASS [ ] FAIL [ ] SKIP |

### Score Calculation

```
Core Tests (1-12): ____ / 12 passed
Optional Tests (13-15): ____ / 3 passed (if attempted)

Total: ____ / 15 passed
```

### Overall Result

- [ ] ✅ **READY FOR PRODUCTION** (14-15 tests passed, core tests all pass)
- [ ] ⚠️ **CONDITIONAL READY** (1-2 minor issues found, documented)
- [ ] ❌ **NOT READY** (Critical issues found, requires fixes)

### Critical Issues Found
(None / describe below)

_________________________________________________________________

_________________________________________________________________

### Minor Issues / Warnings
(None / describe below)

_________________________________________________________________

_________________________________________________________________

### Recommendations
(None / describe below)

_________________________________________________________________

_________________________________________________________________

### Tester Sign-Off

**Tester**: ____________________________  
**Date**: ____________________________  
**Time**: ____________________________  
**Browser/Platform**: ____________________________  
**Overall Assessment**: ____________________________  

