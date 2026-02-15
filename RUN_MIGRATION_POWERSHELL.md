# 🚀 Run Migration in PowerShell

## Problem
PowerShell's `curl` is an alias for `Invoke-WebRequest` which doesn't support `-X` flag.

## ✅ Solution: Use PowerShell Native Command

**Run this in PowerShell:**

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/migrate/full" -Method POST -ContentType "application/json"
```

**Or shorter version:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/migrate/full" -Method POST
```

**To see the response:**
```powershell
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/migrate/full" -Method POST
$response | ConvertTo-Json -Depth 10
```

---

## ✅ Alternative: Use Browser Console (EASIEST!)

Since your app is already running at `http://localhost:3000`:

1. **Open your browser** and go to `http://localhost:3000`
2. **Open Developer Console** (Press F12)
3. **Paste this code:**
```javascript
fetch('/api/migrate/full', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(data => {
  console.log('✅ Migration Complete!');
  console.log('Results:', data);
  console.log('Universities:', data.results?.universities);
  console.log('Degrees:', data.results?.degrees);
})
.catch(err => {
  console.error('❌ Error:', err);
  alert('Migration failed: ' + err.message);
});
```

4. **Press Enter** and watch the console!

---

## ✅ Alternative: Use curl.exe (Full Path)

If you have curl installed, use the full path:

```powershell
curl.exe -X POST http://localhost:3000/api/migrate/full
```

---

## 🎯 Recommended: Browser Console Method

The browser console method is easiest because:
- ✅ No PowerShell syntax issues
- ✅ You can see the response immediately
- ✅ You're already in the browser
- ✅ Works on any OS

**Just open F12 console and run the JavaScript code above!**
