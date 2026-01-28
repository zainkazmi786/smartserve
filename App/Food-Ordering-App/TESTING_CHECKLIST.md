# Signup Screen Testing Checklist

## Pre-Testing Setup

- [ ] **Environment Setup**
  - [ ] Create `.env` file in root directory
  - [ ] Add `EXPO_PUBLIC_API_BASE_URL` with your API base URL
  - [ ] Restart Expo development server after creating `.env`
  - [ ] Verify API server is running and accessible

## API Integration Tests

### 1. Cafe Dropdown Loading
- [ ] **Test: Fetch Cafes on Screen Load**
  - [ ] Open Signup screen
  - [ ] Verify "Loading cafes..." indicator appears
  - [ ] Verify cafes load successfully from API
  - [ ] Check dropdown shows all active cafes

- [ ] **Test: Auto-Select Single Cafe**
  - [ ] If only one cafe exists in API response
  - [ ] Verify cafe is automatically selected
  - [ ] Verify dropdown shows selected cafe name

- [ ] **Test: Multiple Cafes**
  - [ ] If multiple cafes exist
  - [ ] Verify all cafes appear in dropdown
  - [ ] Verify user can select any cafe
  - [ ] Verify selected cafe shows checkmark

- [ ] **Test: No Cafes Available**
  - [ ] If API returns empty array or no active cafes
  - [ ] Verify "No cafes available" message
  - [ ] Verify dropdown is disabled
  - [ ] Verify signup button is disabled

- [ ] **Test: API Error Handling**
  - [ ] Disconnect from internet
  - [ ] Open Signup screen
  - [ ] Verify error alert appears
  - [ ] Verify error message is user-friendly
  - [ ] Reconnect and verify cafes load

### 2. Form Validation

- [ ] **Test: Empty Fields**
  - [ ] Try to submit with empty fields
  - [ ] Verify validation alert appears
  - [ ] Verify message: "Please fill in all details including cafe selection"

- [ ] **Test: Invalid Email**
  - [ ] Enter invalid email (e.g., "test", "test@", "@test.com")
  - [ ] Try to submit
  - [ ] Verify email validation alert appears

- [ ] **Test: Short Password**
  - [ ] Enter password less than 6 characters
  - [ ] Try to submit
  - [ ] Verify password length validation alert

- [ ] **Test: Missing Cafe Selection**
  - [ ] Fill all fields except cafe
  - [ ] Try to submit
  - [ ] Verify cafe selection validation

### 3. Registration API Call

- [ ] **Test: Successful Registration**
  - [ ] Fill all required fields correctly
  - [ ] Select a cafe
  - [ ] Submit form
  - [ ] Verify loading indicator on button
  - [ ] Verify success alert appears
  - [ ] Verify navigation to Login screen after OK

- [ ] **Test: Registration with Phone**
  - [ ] Fill form with phone number
  - [ ] Submit
  - [ ] Verify phone is sent in API request
  - [ ] Verify successful registration

- [ ] **Test: Registration without Phone**
  - [ ] Fill form without phone (optional field)
  - [ ] Submit
  - [ ] Verify registration still succeeds
  - [ ] Verify phone field is not sent or sent as undefined

- [ ] **Test: Duplicate Email**
  - [ ] Try to register with existing email
  - [ ] Verify error alert appears
  - [ ] Verify error message from API is displayed

- [ ] **Test: Network Error**
  - [ ] Disconnect internet
  - [ ] Fill form and submit
  - [ ] Verify error alert appears
  - [ ] Verify user-friendly error message

- [ ] **Test: Invalid API Response**
  - [ ] Mock API to return invalid response
  - [ ] Verify error handling works
  - [ ] Verify app doesn't crash

### 4. UI/UX Tests

- [ ] **Test: Loading States**
  - [ ] Verify loading indicator when fetching cafes
  - [ ] Verify button shows spinner during registration
  - [ ] Verify button is disabled during loading

- [ ] **Test: Password Visibility Toggle**
  - [ ] Click eye icon
  - [ ] Verify password becomes visible
  - [ ] Click again
  - [ ] Verify password is hidden

- [ ] **Test: Dropdown Modal**
  - [ ] Click dropdown button
  - [ ] Verify modal opens
  - [ ] Verify backdrop overlay appears
  - [ ] Click outside modal
  - [ ] Verify modal closes
  - [ ] Click close button
  - [ ] Verify modal closes

- [ ] **Test: Form Field Interactions**
  - [ ] Verify all input fields are editable
  - [ ] Verify keyboard types are correct (email, phone)
  - [ ] Verify placeholder text appears
  - [ ] Verify text color matches theme

### 5. Cross-Platform Tests

- [ ] **Test: Web Platform**
  - [ ] Run on web
  - [ ] Verify all functionality works
  - [ ] Verify API calls work
  - [ ] Check browser console for errors

- [ ] **Test: iOS Platform**
  - [ ] Run on iOS simulator/device
  - [ ] Verify all functionality works
  - [ ] Verify keyboard behavior
  - [ ] Verify modal animations

- [ ] **Test: Android Platform**
  - [ ] Run on Android emulator/device
  - [ ] Verify all functionality works
  - [ ] Verify keyboard behavior
  - [ ] Verify modal animations

### 6. API Request Verification

- [ ] **Test: Request Payload**
  - [ ] Use network inspector (React Native Debugger or browser DevTools)
  - [ ] Verify GET request to `/api/cafes`
  - [ ] Verify POST request to `/api/users/register`
  - [ ] Verify request body contains:
    - [ ] name (fullName)
    - [ ] email
    - [ ] phone (if provided)
    - [ ] password
    - [ ] cafe_id (selected cafe _id)

- [ ] **Test: Request Headers**
  - [ ] Verify Content-Type: application/json
  - [ ] Verify correct API base URL is used

- [ ] **Test: Response Handling**
  - [ ] Verify successful response structure
  - [ ] Verify error response handling
  - [ ] Verify token is received (check console/logs)

### 7. Edge Cases

- [ ] **Test: Very Long Names**
  - [ ] Enter very long name
  - [ ] Verify form handles it correctly

- [ ] **Test: Special Characters**
  - [ ] Enter special characters in name
  - [ ] Verify form accepts them

- [ ] **Test: Rapid Taps**
  - [ ] Rapidly tap signup button
  - [ ] Verify only one request is sent
  - [ ] Verify button is disabled during loading

- [ ] **Test: Screen Navigation**
  - [ ] Register successfully
  - [ ] Verify navigation to Login screen
  - [ ] Go back to Signup
  - [ ] Verify form is reset (or retains data based on design)

### 8. Environment Variable Tests

- [ ] **Test: .env File**
  - [ ] Verify `.env` file exists
  - [ ] Verify `EXPO_PUBLIC_API_BASE_URL` is set
  - [ ] Change API URL in `.env`
  - [ ] Restart Expo
  - [ ] Verify new URL is used

- [ ] **Test: Missing .env**
  - [ ] Remove `.env` file
  - [ ] Restart Expo
  - [ ] Verify default URL (localhost:3000) is used
  - [ ] Verify app doesn't crash

## Quick Smoke Test (5 minutes)

If you're short on time, test these critical paths:

1. ✅ Open Signup screen → Verify cafes load
2. ✅ Fill form → Submit → Verify success → Navigate to Login
3. ✅ Try invalid email → Verify validation
4. ✅ Try empty fields → Verify validation
5. ✅ Test on target platform (web/iOS/Android)

## Notes

- Test with real API server when possible
- Use network inspector to verify API calls
- Check console for any errors or warnings
- Test on actual devices for best results (especially for network calls)
