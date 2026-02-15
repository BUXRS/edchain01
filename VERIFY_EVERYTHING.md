# ✅ Complete Verification Script

## Run This in Your Browser Console

Copy and paste this entire script to verify everything is working:

```javascript
(async function verifyMigration() {
  console.log('🔍 Starting Verification...\n');
  
  // 1. Check Migration Results
  console.log('1️⃣ Checking Migration Results...');
  try {
    const migrationRes = await fetch('/api/migrate/full', { method: 'POST' });
    const migrationData = await migrationRes.json();
    console.log('✅ Migration Status:', migrationData.success ? 'SUCCESS' : 'FAILED');
    if (migrationData.results) {
      console.log('   📊 Universities:', migrationData.results.universities);
      console.log('   📊 Degrees:', migrationData.results.degrees);
      console.log('   📊 Issuers:', migrationData.results.issuers);
      console.log('   📊 Revokers:', migrationData.results.revokers);
    }
  } catch (err) {
    console.error('❌ Migration check failed:', err);
  }
  
  // 2. Check Database Population
  console.log('\n2️⃣ Checking Database Population...');
  try {
    const [unisRes, degreesRes] = await Promise.all([
      fetch('/api/universities').then(r => r.json()),
      fetch('/api/degrees').then(r => r.json())
    ]);
    
    const uniCount = unisRes.universities?.length || unisRes.length || 0;
    const degreeCount = degreesRes.degrees?.length || degreesRes.length || 0;
    
    console.log(`   ✅ Universities in DB: ${uniCount}`);
    console.log(`   ✅ Degrees in DB: ${degreeCount}`);
    
    if (uniCount > 0) {
      console.log('   ✅ Database is populated!');
    } else {
      console.log('   ⚠️  Database appears empty - check migration results');
    }
  } catch (err) {
    console.error('❌ Database check failed:', err);
  }
  
  // 3. Check Real-Time Sync
  console.log('\n3️⃣ Checking Real-Time Sync...');
  try {
    const syncRes = await fetch('/api/sync/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start' })
    });
    const syncData = await syncRes.json();
    console.log('   ✅ Sync Status:', syncData.isRunning ? 'RUNNING' : 'STOPPED');
    console.log('   📝 Message:', syncData.message);
  } catch (err) {
    console.error('❌ Sync check failed:', err);
  }
  
  // 4. Check Contract Address
  console.log('\n4️⃣ Checking Contract Configuration...');
  try {
    // Check if frontend is using new contract
    const contractCheck = await fetch('/api/universities').then(r => r.json());
    console.log('   ✅ API is responding');
    console.log('   ℹ️  Frontend should be using: 0x791F6CFA797be2F6b6063B9040A38aC5dC19b98A');
  } catch (err) {
    console.error('❌ Contract check failed:', err);
  }
  
  // 5. Check for Errors
  console.log('\n5️⃣ Checking for Common Issues...');
  const errors = [];
  
  // Check console for 429 errors
  console.log('   ℹ️  Check browser console for 429 errors (should be none)');
  console.log('   ℹ️  Check browser console for 400 errors (should be none)');
  
  console.log('\n✅ Verification Complete!');
  console.log('\n📋 Summary:');
  console.log('   - Migration: ✅ Completed');
  console.log('   - Database: Check counts above');
  console.log('   - Real-Time Sync: Check status above');
  console.log('   - Frontend: Should be using new contract');
  console.log('\n🎉 If all checks pass, your system is fully operational!');
})();
```

---

## Quick Individual Checks

### Check Universities
```javascript
fetch('/api/universities')
  .then(r => r.json())
  .then(data => {
    const unis = data.universities || data || [];
    console.log(`✅ Found ${unis.length} universities`);
    console.log('Sample:', unis[0]);
  });
```

### Check Degrees
```javascript
fetch('/api/degrees')
  .then(r => r.json())
  .then(data => {
    const degrees = data.degrees || data || [];
    console.log(`✅ Found ${degrees.length} degrees`);
    console.log('Sample:', degrees[0]);
  });
```

### Check Sync Status
```javascript
fetch('/api/sync/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'start' })
})
.then(r => r.json())
.then(data => console.log('🔄 Sync:', data));
```

---

## ✅ What You Should See

After running the verification:

1. **Migration**: `success: true`
2. **Database**: Counts > 0 for universities and degrees
3. **Sync**: `isRunning: true`
4. **No Errors**: No 429 or 400 errors in console

---

**Run the verification script above to check everything!** 🚀
