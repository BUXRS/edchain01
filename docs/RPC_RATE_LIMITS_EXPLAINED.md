# What’s Happening: Infura Rate Limits & Logs

## Summary

When you run `next dev`, the app talks to **Infura** (Base Mainnet RPC). Infura’s free tier has strict **rate limits**. Your logs show:

1. **429 / “Too Many Requests”** – Infura is refusing some RPC calls.
2. **Background sync still finishing** – Issuer sync falls back to “verify existing DB issuers on-chain” and completes.
3. **Source map warnings** – Dev-only, no impact on behavior.

So: **the app is working** (pages load, issuers list returns), but **startup and background sync cause a burst of RPC calls** that hit Infura’s limits and produce the errors you see.

---

## What Happens Step by Step

### 1. Server starts

- Next.js starts.
- **Instrumentation** runs and starts the **blockchain indexer**.
- The indexer schedules a **“comprehensive full sync”** in the background (it does **not** block startup).

### 2. Full sync on startup

- Sync runs: **fetch all universities** from the chain (`fetchAllUniversities` → many `eth_call` / `getUniversity`).
- Infura quickly starts returning **429 Too Many Requests**.
- You see:
  - `JsonRpcProvider failed to detect network... retry in 1s`
  - `[fetchUniversityFromBlockchain] Unexpected error fetching university 1: { ... "Too Many Requests" ... }`
  - `[fetchUniversityFromBlockchain] ⏳ Rate limit protection: waiting 54s before next fetch...`

So: **a lot of RPC calls at once** → Infura rate limit → those errors.

### 3. You open the Issuers page

- You request **GET /api/issuers?universityId=1**.
- The API **returns immediately** with DB data (we fixed this earlier so sync doesn’t block the response).
- In the **background**, the API triggers **sync issuers for university 1**:
  - Tries to fetch **IssuerUpdated** events with `eth_getLogs` over a **large block range** (default: last **1,000,000 blocks** in chunks of 10,000).
  - That’s up to **100 `eth_getLogs` requests** in a short time.
- Infura rate-limits again:
  - `[FetchIssuers] ⚠️ Rate limit detected (Infura -32005) for blocks 40465642-40475641`
  - `[FetchIssuers] Error ... Rate limit exceeded ...`

So: **event fetching is very RPC-heavy** and triggers more 429s.

### 4. Fallback path (why things still work)

- When **event fetch** fails with rate limit, the sync **does not** delete your DB issuers.
- It uses the **“empty event list but we have DB issuers”** path:
  - **Verify each existing DB issuer on-chain** (lighter `eth_call` per issuer).
- You see:
  - `[BlockchainSync] ⚠️ Event fetch returned 0 issuers but DB has 1 — verifying each on-chain to avoid false deactivation`
  - `[BlockchainSync] ✅ Completed on-chain verification for 1 issuers (empty event list)`

So: **sync completes using DB + on-chain checks**, and your **1 issuer stays in the list**. The 429s are from the **event scan**, not from the final result.

### 5. Source map messages

- Messages like:  
  `Invalid source map. Only conformant source maps can be used to find the original code. Cause: Error: sourceMapURL could not be parsed`
- These come from **Next.js/Turbopack** dev build and only affect **stack trace readability** in the terminal. They do **not** affect app behavior or RPC.

---

## Why It Happens

| Cause | Effect |
|-------|--------|
| **Infura free tier** | Strict rate limit (requests per second / per day). |
| **Full sync on startup** | Many `eth_call` / `getUniversity` in a short time → 429. |
| **Issuer event sync** | Up to 100 `eth_getLogs` (1M blocks in 10k chunks) → 429. |
| **Design** | Sync is correct: on rate limit it **falls back** and does **not** wipe DB data. |

So: **what’s happening** is “too many RPC calls in a short time,” and **why** is “Infura limits + aggressive sync (startup + large event range).”

---

## What You Can Do

1. **Use the app as-is**  
   Pages and issuer list work; the errors are mostly from background sync. You can ignore them if the UI is fine.

2. **Reduce RPC usage (recommended)**  
   - We can **shorten the default event scan** (e.g. last 50k blocks instead of 1M) so issuer sync does fewer `eth_getLogs` and hits the limit less often.  
   - Optionally **delay or skip** the full sync on startup when using Infura (or make it configurable).

3. **Change RPC provider**  
   Use another provider (e.g. Alchemy, QuickNode, Base public RPC) or a paid Infura plan for higher limits.

4. **Source maps**  
   Safe to ignore; or update Next.js/tooling later if you want cleaner stack traces.

If you want, we can apply the “smaller default block range for issuer event fetch” (and optionally a startup delay/skip) in code next.

---

## Is it OK now? Or better to change RPC?

**It's OK** in the sense that:
- No 429s in the latest run (rate-limit protection is doing its job).
- Fallback works: "Event fetch returned 0 revokers but DB has 1 — verifying each on-chain" then "Completed on-chain verification."
- Data is correct: your 1 revoker stays in the list.

**What was still wrong** (and is now fixed in code):
- **Revokers and Verifiers tabs took ~13 seconds** because the API was **awaiting** sync before returning. Those APIs now return **immediately** with DB data and run sync in the **background** (same as Issuers). After pulling the latest changes, Revokers/Verifiers should load in under a second.

**When to change RPC**
- **Stay on Infura** if: you're fine with rate-limit waits on startup and background sync; tabs load fast now.
- **Switch RPC** if: you want faster startup sync, fewer "waiting 44s/54s" messages, or higher limits. Options: Base public RPC, Alchemy, QuickNode, or paid Infura. Set `NEXT_PUBLIC_BASE_RPC_URL` (and any provider-specific env vars) in `.env.local`.

---

## Why dashboard shows 1 but Issuers page shows none (and Verifiers 0/3)

**Three different sources of truth:**

| Where | Source | What it shows |
|-------|--------|----------------|
| **Dashboard** (Total Degrees, Active Issuers, Active Revokers, Active Verifiers) | **Database** | Counts from `dashboard-stats`: `COUNT(*)` from `issuers` / `revokers` / `verifiers` where `university_id = session id`, `is_active = true`, `blockchain_verified = true`. So “1 issuer” means: there is at least one row in the DB for your university with those flags. |
| **Issuers / Revokers / Verifiers list pages** | **Database** | Same DB tables: `GET /api/issuers?universityId=…` (and revokers/verifiers) return **rows** for that university. They should match the dashboard counts. If the list is empty but the dashboard shows 1, the list API was likely failing (e.g. missing `status` column) and returning empty; that’s now fixed with a schema fallback. |
| **Verifiers page “Active Verifiers: 0/3”** | **Blockchain** | The “0” comes from **on-chain** `getVerifierCount(universityId)` (the contract), not from the DB. So the contract can say 0 while the DB has 1 verifier (e.g. added in DB but not yet on-chain, or sync lag). |

**Summary:**  
- Dashboard and list pages both use the **DB**.  
- **Web2-first:** Issuers/revokers with `blockchain_verified = false` are pending admin "Add to Chain"; sync does **not** look for them on-chain or deactivate them. They should agree after the issuers list fix (support for both `status` and `onboarding_status`).  
- The Verifiers page **“0/3”** is **on-chain**; “1” on the dashboard is **DB**. So it’s normal for those two to differ until verifiers are added on-chain and synced.
