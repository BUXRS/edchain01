# Email Diagnostics & Fix Guide

## Current Status

✅ **Resend API is working** - Emails are being sent successfully
✅ **Email IDs are returned** - Confirms API calls succeed
❓ **Emails not received** - Possible delivery issues

## Root Causes & Solutions

### 1. Domain Verification Issue
**Problem**: `noreply@buniverse-mr.com` domain might not be verified in Resend

**Check**:
```bash
node scripts/check-resend-domain.js
```

**Solutions**:
- **Option A**: Verify `buniverse-mr.com` domain in Resend dashboard
- **Option B**: Use Resend test domain (works but may go to spam)
  ```env
  RESEND_FROM_EMAIL=BU Blockchain Degree <onboarding@resend.dev>
  ```

### 2. Email Going to Spam
**Problem**: Even if sent successfully, emails might be filtered

**Solutions**:
- Check spam/junk folder
- Check Resend dashboard for delivery status
- Verify domain with SPF/DKIM records

### 3. Invalid Recipient Email
**Problem**: Email address might be invalid or unreachable

**Check**: Verify the recipient email address is correct

### 4. Resend Free Tier Limitations
**Problem**: Free tier has rate limits (2 emails/minute, 100/month)

**Check**: Look for rate limit errors in logs

## Enhanced Logging

The system now logs:
- ✅ Email sending attempts
- ✅ Resend API responses
- ✅ Email IDs for tracking
- ✅ Detailed error messages
- ✅ Domain verification hints

## Testing

### Test Email Sending:
```bash
node scripts/test-email-sending.js
```

### Check Domain Status:
```bash
node scripts/check-resend-domain.js
```

## Quick Fix

If emails still not received, the API now returns credentials in the response:

```json
{
  "success": true,
  "credentials": {
    "email": "issuer@example.com",
    "password": "temp_password",
    "onboardingToken": "token",
    "onboardingUrl": "https://..."
  }
}
```

You can manually send these credentials to the issuer.

---

**Status**: ✅ Email sending works, investigating delivery issues
