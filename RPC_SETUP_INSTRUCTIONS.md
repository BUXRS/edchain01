# 🔌 RPC Setup Instructions - Infura Integration

## ✅ Changes Completed

I've updated your project with an **upgradable RPC configuration system** using **Infura as the primary provider**. Here's what was done:

### 1. ✅ Created Centralized RPC Configuration
- **File**: `lib/config/rpc-config.ts`
- Centralized RPC configuration management
- Support for multiple providers (primary + fallbacks)
- Environment-based configuration

### 2. ✅ Created RPC Provider Manager
- **File**: `lib/config/rpc-provider.ts`
- Smart RPC selection with automatic failover
- Health monitoring
- Performance tracking

### 3. ✅ Updated All RPC Usage
- **lib/blockchain.ts** - Uses centralized RPC
- **lib/services/indexer/IndexerService.ts** - Uses centralized RPC
- **lib/services/indexer/ReconcilerService.ts** - Uses centralized RPC
- **lib/services/auto-sync-worker.ts** - Uses centralized RPC

### 4. ✅ Created Health Check Endpoint
- **File**: `app/api/rpc/health/route.ts`
- Monitor RPC provider status
- Access at: `http://localhost:3000/api/rpc/health`

### 5. ✅ Created Environment Template
- **File**: `.env.example`
- Complete documentation for RPC configuration

---

## 🚀 Next Steps: Configure Infura RPC

### Step 1: Infura is Already Configured

Your project is now configured to use **Infura as the primary RPC provider** with the following credentials:

- **API Key**: `00f809ca00af49fbada21a49181eadc1`
- **HTTPS URL**: `https://base-mainnet.infura.io/v3/00f809ca00af49fbada21a49181eadc1`

### Step 2: Update `.env.local` (Optional - Already Set as Default)

The Infura URL is already set as the default in the code. However, you can explicitly set it in `.env.local`:

```env
# Primary RPC - Infura (Already configured as default)
BASE_RPC_HTTP_URL=https://base-mainnet.infura.io/v3/00f809ca00af49fbada21a49181eadc1
BASE_RPC_WS_URL=wss://base-mainnet.infura.io/v3/00f809ca00af49fbada21a49181eadc1

# OR use NEXT_PUBLIC prefix (works for both client and server)
# NEXT_PUBLIC_BASE_RPC_URL=https://base-mainnet.infura.io/v3/00f809ca00af49fbada21a49181eadc1

# OR use INFURA_BASE_RPC_URL (alternative)
# INFURA_BASE_RPC_URL=https://base-mainnet.infura.io/v3/00f809ca00af49fbada21a49181eadc1
# INFURA_BASE_WS_URL=wss://base-mainnet.infura.io/v3/00f809ca00af49fbada21a49181eadc1
```

**Note**: The Infura URL is already hardcoded as the default, so it will work even without setting environment variables.

### Step 3: Restart Dev Server

```bash
# Stop current server (Ctrl+C)
# Then restart:
pnpm run dev
```

### Step 4: Verify It Works

1. **Check terminal logs** - You should see:
   ```
   [IndexerService] Using Infura as primary RPC provider
   ```
   (May show polling mode if WebSocket not supported - this is normal for Infura)

2. **Check RPC health**:
   ```bash
   curl http://localhost:3000/api/rpc/health
   ```
   Should show Infura as current provider

3. **Check sync** - Universities should sync successfully without rate limit errors

---

## 📊 How to Upgrade in the Future

### Upgrade Infura Tier

1. **Upgrade on Infura dashboard** (Free → Growth → Scale tier)
2. **Get new API key** (if needed)
3. **Update `.env.local`**:
   ```env
   BASE_RPC_HTTP_URL=https://base-mainnet.infura.io/v3/NEW_KEY
   BASE_RPC_WS_URL=wss://base-mainnet.infura.io/v3/NEW_KEY
   ```
4. **Restart server** - Done! No code changes needed.

### Add Fallback Provider

1. **Get Alchemy API key** (optional, for redundancy)
2. **Add to `.env.local`**:
   ```env
   ALCHEMY_BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
   ALCHEMY_BASE_WS_URL=wss://base-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
   ```
3. **Restart server** - System will automatically use Alchemy if Infura fails

### Switch Primary Provider

Just change the `BASE_RPC_HTTP_URL` in `.env.local`:
```env
# Switch from Infura to Alchemy (if needed)
BASE_RPC_HTTP_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
```

---

## 🔍 Monitoring

### Check RPC Status

Visit: `http://localhost:3000/api/rpc/health`

Response:
```json
{
  "success": true,
  "current": {
    "name": "Infura",
    "httpUrl": "https://base-mainnet.infura.io/v3/00f809ca00af49fbada21a49181eadc1",
    "wsUrl": "wss://base-mainnet.infura.io/v3/00f809ca00af49fbada21a49181eadc1"
  },
  "providers": [
    {
      "name": "Infura",
      "healthy": true,
      "failures": 0,
      "responseTime": 150
    }
  ]
}
```

---

## 🎯 Benefits

✅ **Zero Code Changes** - Upgrade by changing environment variables  
✅ **Automatic Failover** - System switches to backup if primary fails  
✅ **Health Monitoring** - Know which providers are healthy  
✅ **Easy Scaling** - Add more providers as needed  
✅ **Cost Optimization** - Use free tier for dev, scale for production  

---

## 📝 Current Configuration

Your project now uses:
- **Centralized RPC config** (`lib/config/rpc-config.ts`)
- **Smart provider manager** (`lib/config/rpc-provider.ts`)
- **Automatic failover** (if configured)
- **Health monitoring** (optional)

**All RPC calls** now go through the centralized system, making upgrades seamless.

---

## ⚠️ Important Notes

1. **Keep your API key secret** - Never commit `.env.local` to git
2. **Free tier limits** - Infura free tier: 100,000 requests/day
3. **WebSocket support** - Infura may use polling mode (this is normal and expected)
4. **Rate limits** - With Infura, you won't hit rate limits in development

---

## 🆘 Troubleshooting

### Still Getting Rate Limits?
- ✅ Verify API key is correct in `.env.local` (or using default)
- ✅ Check you're using Infura URL (default is already set)
- ✅ Restart dev server after changing `.env.local`

### WebSocket Not Working?
- ✅ This is normal - Infura may use polling mode instead of WebSocket
- ✅ The system automatically falls back to HTTP polling (this is expected)
- ✅ Look for "using polling mode" in logs (this is correct behavior)

### Need Help?
- Check Infura docs: https://docs.infura.io/
- Check RPC health: `/api/rpc/health`
- Review logs for RPC errors

---

## ✅ Ready to Use!

Infura is already configured as the default RPC provider! The system will automatically use:
- **Primary**: Infura (`https://base-mainnet.infura.io/v3/00f809ca00af49fbada21a49181eadc1`)
- **Fallback**: Base public (if Infura fails)

Everything will work automatically. The system is now fully upgradable and ready to scale! 🚀
