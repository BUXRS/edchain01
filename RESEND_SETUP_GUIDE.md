# Resend Email Setup Guide

## ✅ **Your API Key is Configured**

Your Resend API key is already set in `.env.local`:
```
RESEND_API_KEY=re_885YZATV_9DUMx9KysvHjoxAyQGbeSiiH
```

## 🔍 **Current Email Configuration**

The email service is currently using:
- **FROM_EMAIL:** `BU Blockchain Degree <onboarding@resend.dev>` (test domain - no verification needed)

This should work immediately for testing!

## 🧪 **Test Email Sending**

### Option 1: Test via API Endpoint

Visit this URL in your browser (replace with your email):
```
http://localhost:3000/api/test-email?to=your-email@example.com
```

Or use curl:
```bash
curl "http://localhost:3000/api/test-email?to=your-email@example.com"
```

### Option 2: Register a University

Register a new university and check:
1. Server console logs for email status
2. Your email inbox (and spam folder)
3. Resend dashboard: https://resend.com/emails

## 📧 **Check Resend Dashboard**

1. Login to https://resend.com
2. Go to **Emails** section
3. Check recent emails and their delivery status
4. See any error messages

## 🔧 **Common Issues & Fixes**

### Issue 1: Domain Not Verified (if using bubd.io)

**Error:** "Domain not verified" or "Invalid from address"

**Solution:** Use test domain (already configured):
```env
RESEND_FROM_EMAIL=BU Blockchain Degree <onboarding@resend.dev>
```

### Issue 2: API Key Invalid

**Error:** "Invalid API key" or "Unauthorized"

**Solution:**
1. Check API key in Resend dashboard: https://resend.com/api-keys
2. Verify key is active
3. Make sure key has email sending permissions

### Issue 3: Email in Spam

**Solution:**
- Check spam/junk folder
- Use verified domain for better deliverability
- Add SPF/DKIM records (Resend provides these)

## 🎯 **For Production**

### Step 1: Verify Your Domain

1. Go to https://resend.com/domains
2. Click "Add Domain"
3. Enter: `bubd.io`
4. Add DNS records Resend provides:
   - SPF record
   - DKIM records
5. Wait for verification (usually a few minutes)

### Step 2: Update FROM_EMAIL

After domain is verified, update `.env.local`:
```env
RESEND_FROM_EMAIL=BU Blockchain Degree <noreply@bubd.io>
```

Or update `lib/services/email-service.tsx`:
```typescript
const FROM_EMAIL = "BU Blockchain Degree <noreply@bubd.io>"
```

## 📊 **Monitor Email Delivery**

1. **Resend Dashboard:** https://resend.com/emails
   - See all sent emails
   - Check delivery status
   - View error messages

2. **Server Logs:**
   - Look for `[EmailService]` messages
   - Check for errors or success confirmations

3. **Database:**
   ```sql
   SELECT * FROM activity_logs 
   WHERE action = 'email_failed' 
   ORDER BY created_at DESC;
   ```

## ✅ **Verification Checklist**

- [x] API key configured in `.env.local`
- [x] Email service using test domain (works without verification)
- [x] Error logging enabled
- [x] Test endpoint available (`/api/test-email`)

## 🚀 **Next Steps**

1. **Test email sending:**
   ```
   http://localhost:3000/api/test-email?to=your-email@example.com
   ```

2. **Check server logs** for email status

3. **Check Resend dashboard** for delivery status

4. **If working:** Register a university and verify email is received

5. **For production:** Verify `bubd.io` domain in Resend

---

**Your email service is configured and ready!** The test domain (`onboarding@resend.dev`) should work immediately without any domain verification.
