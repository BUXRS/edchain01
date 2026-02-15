# University Admin Enhancement – Phase 1 (Done)

## Summary

Phase 1 adds **pending onboarding** (roles awaiting on-chain activation), **dashboard “Pending activation”**, and **congratulation emails** when issuer/revoker/verifier are activated.

## 1. API: Pending onboarding

- **`GET /api/university/pending-onboarding`**  
  Returns issuers, revokers, and verifiers for the logged-in university where:
  - `pending_wallet_address` is set (wallet submitted)
  - Not yet active on-chain (e.g. `status = 'pending_activation'` or `'pending_blockchain'`)

Response shape: `{ issuers, revokers, verifiers, all, totalPending }`.  
`all` is a single list sorted by `wallet_submitted_at` (newest first).

## 2. Dashboard: “Pending activation” section

- On the **university dashboard** (`/university`), when `totalPendingOnboarding > 0`:
  - A card **“Pending activation”** is shown.
  - Table columns: Name, Email, Role, Wallet (truncated), **Action**.
  - **“Activate on-chain”** button per row:
    1. Uses university admin wallet (MetaMask): `grantIssuer` / `grantRevoker` / `addVerifier` with `universityId` and the row’s `walletAddress`.
    2. On success, calls:
       - `POST /api/issuers/:id/activate` or
       - `POST /api/revokers/:id/activate` or
       - `POST /api/verifiers/:id/activate`
       with body `{ walletAddress }`.
    3. Backend updates DB (e.g. `wallet_address`, `status = 'active'`, `blockchain_verified`) and sends the **congratulation email** to the issuer/revoker/verifier.
  - Data is refreshed (pending onboarding, stats, metrics) and a success toast is shown.

So: as soon as someone submits their wallet in onboarding, the university admin sees them in “Pending activation” and can complete activation in one click (MetaMask tx + DB + email).

## 3. Congratulation email on activation

- **`sendRoleActivationEmail`** in `lib/services/email-service.tsx`:
  - Used for **issuer**, **revoker**, and **verifier** after they are activated on-chain.
  - Params: `to`, `roleName`, `universityName`, `personName`, `walletAddress`, `role`.
  - Email includes:
    - “Account activated” message
    - Role label (e.g. Degree Issuer / Revoker / Verifier)
    - Wallet address
    - **Sign-in link** (issuer/revoker/verifier login URL) and “Sign in and get started”.

- **Issuer activate** (`app/api/issuers/[id]/activate/route.ts`):
  - Accepts optional body `{ walletAddress, txHash }`.
  - Resolves final wallet from body or DB (`pending_wallet_address` or `wallet_address`).
  - Updates `issuers`: `wallet_address`, clear `pending_wallet_address`, `status = 'active'`, `is_active`, `blockchain_verified`, `tx_hash`.
  - Calls `sendRoleActivationEmail(..., role: 'issuer')`.

- **Revoker activate** (`app/api/revokers/[id]/activate/route.ts`):
  - Same pattern: optional `walletAddress`/`txHash`, resolve wallet from body or DB.
  - Updates `revokers` (same fields; revokers use `status` not `onboarding_status`).
  - Calls `sendRoleActivationEmail(..., role: 'revoker')`.

- **Verifier activate** (`app/api/verifiers/[id]/activate/route.ts`):
  - Already called `sendRoleActivationEmail`; it now uses the new shared implementation in `email-service.tsx`.

## 4. Smart contract (unchanged)

- **Issuer:** `grantIssuer(universityId, issuer)` / `revokeIssuer(universityId, issuer)`.
- **Revoker:** `grantRevoker(universityId, revoker)` / `revokeRevoker(universityId, revoker)`.
- **Verifier:** `addVerifier(universityId, verifier)` / `removeVerifier(universityId, verifier)` (in Core/abi-core).
- There is **no “change wallet”** function; to change a wallet you revoke the old address and grant/add the new one (two steps).

## 5. Files touched

- `app/api/university/pending-onboarding/route.ts` (new)
- `app/university/page.tsx` (pending-onboarding SWR, me SWR, useContract, “Pending activation” card and Activate flow)
- `lib/services/email-service.tsx` (`sendRoleActivationEmail`)
- `app/api/issuers/[id]/activate/route.ts` (body + DB + email)
- `app/api/revokers/[id]/activate/route.ts` (body + DB + email; use `status`)

## Phase 2 (Backend – Done)

- **Activate routes secured:** `POST /api/issuers/[id]/activate`, `POST /api/revokers/[id]/activate`, `POST /api/verifiers/[id]/activate` now use `requireUniversity` and verify the role's `university_id` matches the session. Only the owning university can activate.
- **University-scoped suspend:** `POST /api/university/issuers/[id]/suspend`, `POST /api/university/revokers/[id]/suspend`, `POST /api/university/verifiers/[id]/suspend` — body optional `{ txHash }`, sets `is_active = false`, `status = 'suspended'`.
- **University-scoped delete (soft):** `DELETE /api/university/issuers/[id]`, `DELETE /api/university/revokers/[id]`, `DELETE /api/university/verifiers/[id]` — set `is_active = false`, `status = 'inactive'`. Call after revoking on-chain if the role was active.
- **Dashboard activate call:** University dashboard "Activate on-chain" now sends `credentials: "include"` when calling the activate APIs.

## Next (Phase 2+ UX)

- **University login:** Improve UX (layout, validation, messaging).
- **Dashboard:** Richer visuals, notifications, daily digest.
- **Manage:** Suspend (revoke on-chain + deactivate in DB), delete, and “change wallet” (revoke old + grant/add new) for issuers/revokers/verifiers.
