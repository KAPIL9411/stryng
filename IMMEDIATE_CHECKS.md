# ⚡ Immediate Checks - Address Not Saving

## Quick Diagnostic (Do This First!)

### 1. Open Browser Console (F12)
- Press `F12` in your browser
- Go to **Console** tab
- Try saving an address
- **Look for any red errors**

### 2. Check These Common Issues:

#### ❌ Are you logged in?
```
Error: "User not authenticated"
Fix: Log in first at /login
```

#### ❌ Are all required fields filled?
```
Error: "Missing required fields: ..."
Fix: Fill in all fields marked with *
```

#### ❌ Is phone number 10 digits?
```
Error: "Please enter a valid 10-digit phone number"
Fix: Enter exactly 10 digits (e.g., 9876543210)
```

#### ❌ Is pincode 6 digits?
```
Error: "Please enter a valid 6-digit pincode"
Fix: Enter exactly 6 digits (e.g., 110001)
```

#### ❌ Is Supabase connected?
```
Error: "Failed to fetch" or network error
Fix: Check internet connection and Supabase status
```

## Test Data (Copy & Paste)

Use this to test:
```
Full Name: John Doe
Phone: 9876543210
Pincode: 110001
Address Line 1: 123 Main Street
City: New Delhi
State: Delhi
```

## What You Should See in Console

When you click "Save Address", you should see:
```
Form submitted with data: {...}
Adding new address
addAddress called with data: {...}
User: {id: "...", email: "..."}
```

## If You See Nothing in Console

1. **Hard refresh the page:**
   - Windows: `Ctrl + F5`
   - Mac: `Cmd + Shift + R`

2. **Clear browser cache:**
   - Windows: `Ctrl + Shift + Delete`
   - Mac: `Cmd + Shift + Delete`

3. **Restart dev server:**
   ```bash
   # Stop (Ctrl+C)
   npm run dev
   ```

## Quick Test

1. Go to `/addresses`
2. Click "Add New Address"
3. Fill the form with test data above
4. Open Console (F12)
5. Click "Save Address"
6. **Copy everything from console**
7. Share it with me

## Most Likely Issues

### 1. Not Logged In (90% of cases)
**Symptom:** "User not authenticated"  
**Fix:** Log in first

### 2. Validation Error (5% of cases)
**Symptom:** "Missing required fields" or "Invalid phone/pincode"  
**Fix:** Fill all fields correctly

### 3. Database Issue (5% of cases)
**Symptom:** Supabase error  
**Fix:** Check database table exists

---

**Do the Quick Test above and share the console output!**
