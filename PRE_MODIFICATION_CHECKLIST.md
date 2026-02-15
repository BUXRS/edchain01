# Pre-Modification Checklist

**Use this checklist BEFORE making ANY changes to the codebase.**

---

## 🔍 Step 1: Smart Contract Compatibility Check

### Review Smart Contract ABI
- [ ] Open `lib/contracts/abi.ts`
- [ ] Identify relevant functions for your change
- [ ] Check function signatures and parameters
- [ ] Note any constraints or requirements

### Check for Conflicts
- [ ] Will this change conflict with contract logic?
- [ ] Does contract support this operation?
- [ ] Are there any restrictions in the contract?

### If Conflicts Found:
- [ ] **STOP** - Don't proceed
- [ ] Document the conflict
- [ ] Notify with impact analysis
- [ ] Wait for approval/guidance

---

## 🔍 Step 2: Impact Analysis

### Smart Contract Impact
- [ ] Requires contract change?
- [ ] New function needed?
- [ ] Breaking change?
- [ ] Migration required?

### Database Impact
- [ ] Schema change needed?
- [ ] New tables/columns?
- [ ] Migration script?
- [ ] Data sync required?

### App Impact
- [ ] UI changes?
- [ ] API changes?
- [ ] Breaking changes?
- [ ] User flow affected?

### Document Findings
```markdown
## Change: [Description]

### Smart Contract Impact:
[Details]

### Database Impact:
[Details]

### App Impact:
[Details]

### Recommendations:
[Expert advice]
```

---

## 🔍 Step 3: Implementation Checks

### Blockchain-First Pattern
- [ ] Will this read from blockchain first?
- [ ] Is database only used as cache/fallback?
- [ ] Does blockchain state take precedence?

### Simultaneous Sync
- [ ] Will blockchain writes trigger DB sync?
- [ ] Is sync immediate (after confirmation)?
- [ ] Are errors handled gracefully?

### Protocol Choice
- [ ] WebSocket for real-time updates?
- [ ] REST API for standard operations?
- [ ] Webhook for external notifications?

### Contract Upgrade Support
- [ ] Works with contract address changes?
- [ ] Feature detection before use?
- [ ] Backward compatibility maintained?

### OpenSea Buttons
- [ ] Are BaseScan buttons paired with OpenSea?
- [ ] OpenSea only for NFTs (not transactions)?

### Issuer-Revoker Symmetry
- [ ] Does this affect issuers?
- [ ] If yes, will same change be applied to revokers?
- [ ] Is code structure identical?
- [ ] Is UI/UX consistent?

---

## ✅ Final Check

Before committing:

- [ ] All checklist items completed
- [ ] Smart contract compatibility verified
- [ ] Impact analysis documented
- [ ] Blockchain-first pattern followed
- [ ] Simultaneous sync implemented
- [ ] Protocol choice is optimal
- [ ] Upgrade support included
- [ ] OpenSea buttons added (if applicable)
- [ ] Issuer-revoker symmetry maintained
- [ ] Code tested and working

---

## 🚨 If Any Check Fails

1. **STOP** implementation
2. **DOCUMENT** the issue
3. **NOTIFY** with:
   - What you're trying to do
   - What check failed
   - Impact analysis
   - Recommendations

4. **WAIT** for approval before proceeding

---

**Remember:** Blockchain is truth. Everything else is a mirror. 🔗
