# Email Not Sending - Troubleshooting Guide

## 🔍 **Common Issues & Solutions**

### Issue 1: Domain Not Verified in Resend

**Problem:** The FROM_EMAIL uses `noreply@bubd.io`, but this domain might not be verified in your Resend account.

**Solution:**
1. Go to https://resend.com/domains
2. Check if `bubd.io` is verified
3. If not, either:
   - **Option A:** Verify the domain (add DNS records)
   - **Option B:** Use Resend's test domain temporarily

**Quick Fix - Use Test Domain:**
Update `lib/services/email-service.tsx`:
```typescript
const FROM_EMAIL = "BU Blockchain Degree <onboarding@resend.dev>"
```
(Resend allows `@resend.dev` for testing without domain verification)

### Issue 2: Invalid or Missing API Key

**Check:**
1. Verify `RESEND_API_KEY` in `.env.local` is correct
2. Check Resend dashboard: https://resend.com/api-keys
3. Make sure the key is active and has email sending permissions

### Issue 3: Email Going to Spam

**Check:**
- Check spam/junk folder
- Verify sender domain reputation
- Use a verified domain for better deliverability

### Issue 4: API Errors Not Visible

**Check Server Logs:**
After registration, check your server console/terminal for:
- `[EmailService] Attempting to send welcome email...`
- `[EmailService] Error sending welcome email:` (if failed)
- `[EmailService] Welcome email sent successfully` (if succeeded)

## 🔧 **Diagnostic Steps**

### Step 1: Check Email Service Configuration

```bash
# Check if RESEND_API_KEY is set
echo $RESEND_API_KEY
# Or check .env.local file
```

### Step 2: Test Email Sending

Create a test endpoint or check logs after registration.

### Step 3: Verify Resend Account

1. Login to https://resend.com
2. Check API keys: https://resend.com/api-keys
3. Check domains: https://resend.com/domains
4. Check email logs: https://resend.com/emails

## ✅ **Quick Fixes**

### Fix 1: Use Resend Test Domain (Temporary)

Update `lib/services/email-service.tsx` line 5:
```typescript
const FROM_EMAIL = "BU Blockchain Degree <onboarding@resend.dev>"
```

### Fix 2: Check Email in Activity Logs

After registration, check the database:
```sql
SELECT * FROM activity_logs 
WHERE action = 'email_failed' 
ORDER BY created_at DESC 
LIMIT 5;
```

This will show email errors if they occurred.

### Fix 3: Enable Better Logging

The code now logs email attempts. Check your server console for detailed error messages.

## 📧 **Alternative: Manual Email**

If emails aren't working, you can manually send credentials:

1. After registration, the password and token are generated
2. Check server logs for the credentials
3. Manually send them via your email client

## 🎯 **Next Steps**

1. Check server logs for email errors
2. Verify Resend domain setup
3. Test with `onboarding@resend.dev` (no domain verification needed)
4. Check Resend dashboard for email delivery status
