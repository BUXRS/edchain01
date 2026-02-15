# ✅ Degrees Schema Fix - Column Mapping

## Problem

The code was trying to insert into columns that don't exist in the database:
- ❌ `recipient_wallet` → Should be `student_address`
- ❌ `faculty`, `faculty_ar` → Don't exist in degrees table
- ❌ `degree_level` → Should be `degree_type`
- ❌ `gpa` → Should be `cgpa`
- ❌ `graduation_year` → Should be `graduation_date` (DATE type)

## Database Schema (Actual)

From `scripts/000-recreate-complete-database.sql`:
```sql
CREATE TABLE degrees (
  id SERIAL PRIMARY KEY,
  token_id VARCHAR(78) UNIQUE,
  student_address VARCHAR(42) NOT NULL,  -- ✅ Correct column name
  university_id INTEGER REFERENCES universities(id),
  degree_type VARCHAR(100) NOT NULL,     -- ✅ Correct column name
  degree_type_ar VARCHAR(100),
  major VARCHAR(255) NOT NULL,
  major_ar VARCHAR(255),
  student_name VARCHAR(255) NOT NULL,
  student_name_ar VARCHAR(255),
  graduation_date DATE NOT NULL,         -- ✅ DATE type, not year
  honors VARCHAR(100),
  honors_ar VARCHAR(100),
  cgpa NUMERIC(5,2),                     -- ✅ cgpa, not gpa
  ...
)
```

## Fixes Applied

### 1. Fixed `syncDegreesForUniversity` Function

**File**: `lib/services/blockchain-sync.ts`

**Before:**
```typescript
INSERT INTO degrees (
  token_id, university_id, recipient_wallet, student_name, student_name_ar,
  faculty, faculty_ar, major, major_ar, degree_level, gpa, graduation_year,
  ...
)
```

**After:**
```typescript
INSERT INTO degrees (
  token_id, university_id, student_address, student_name, student_name_ar,
  degree_type, major, major_ar, graduation_date, cgpa,
  ...
)
```

### 2. Fixed `syncDegree` Function

Same fixes applied to the single degree sync function.

### 3. Data Mapping

- `degree.owner` → `student_address`
- `degree.degreeNameEn` or `degree.level` → `degree_type`
- `degree.year` → `graduation_date` (converted to DATE format: `YYYY-MM-DD`)
- `degree.gpa` → `cgpa`
- Removed `faculty` and `faculty_ar` (not in schema)

## Expected Behavior After Restart

**Server Logs Should Show:**
```
[BlockchainSync] Inserting degree 1 into database...
[BlockchainSync] ✅ Successfully inserted degree 1
[WebSocketIndexer] University 1 degrees: added=1, updated=0
```

**Database Should Have:**
```sql
SELECT token_id, student_address, student_name, degree_type, major, cgpa, graduation_date 
FROM degrees 
WHERE blockchain_verified = true;
-- Should return degree with token_id = 1
```

**API Should Return:**
```javascript
fetch('/api/degrees').then(r => r.json()).then(data => {
  console.log('Degrees:', data.degrees.length) // Should be 1
  console.log('First degree:', data.degrees[0])
})
```

## Column Mapping Summary

| Blockchain Field | Database Column | Notes |
|-----------------|----------------|-------|
| `degree.owner` | `student_address` | Wallet address of degree owner |
| `degree.nameEn` | `student_name` | English name |
| `degree.nameAr` | `student_name_ar` | Arabic name |
| `degree.degreeNameEn` or `degree.level` | `degree_type` | Degree type/level |
| `degree.majorEn` | `major` | Major field |
| `degree.majorAr` | `major_ar` | Arabic major |
| `degree.year` | `graduation_date` | Converted to DATE format |
| `degree.gpa` | `cgpa` | GPA value |
| `degree.isRevoked` | `is_revoked` | Revocation status |

---

**Status**: ✅ Fixed  
**Date**: 2026-01-25  
**Next Step**: Restart server to sync degrees with correct schema
