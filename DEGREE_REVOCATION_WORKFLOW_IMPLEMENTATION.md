# Degree Issuance & Revocation Workflow Implementation

## Summary

This document describes the implementation of the degree request and revocation request workflows aligned with the Core contract (Base chain 8453), using **blockchain as single source of truth** and **PostgreSQL as CQRS read model**. UI reads only from Postgres; wallet actions (request degree, request revocation, approve, reject, withdraw) are done on-chain by the user.

---

## Network & Contracts (Base)

| Role   | Address |
|--------|---------|
| Core   | `0xBb51Dc84f0b35d3344f777543CA6549F9427B313` |
| Reader | `0x41c5ad012b71706Fc2a9510A17bB1f8Df857D275` |
| Render | `0xC28ed1b3DD8AE49e7FC94cB15891524848f6ef42` |
| ChainId| 8453 |

Configured in `lib/contracts/abi.ts` (env overrides: `NEXT_PUBLIC_CORE_CONTRACT_ADDRESS`, etc.).

---

## 1. Database (Migration 029)

**Run:** `psql $DATABASE_URL -f scripts/029-degree-revocation-workflow-schema.sql`

- **degree_requests:** Added `requested_at`, `updated_at`, `chain_id`, `created_block_number`, `created_tx_hash`, `created_log_index`, `updated_*`, and optional `name_ar`/`name_en` (contract field names). Backfill `requested_at` from `created_at`.
- **revocation_requests:** Same provenance columns + `requested_at`, `updated_at`.
- **degree_request_approvals / revocation_request_approvals:** Added `chain_id`, `tx_hash`, `block_number`, `log_index` for audit.
- Indexes: `idx_degree_requests_requester`, `idx_degree_requests_recipient`, `idx_revocation_requests_requester`.

---

## 2. Indexer & Projectors

- **Indexer** (`lib/services/indexer/IndexerService.ts`): Subscribes to Core contract; polls `*` events. Diagnostics: logs raw log count per block range, decoded count, and **decode failures** (no silent catch).
- **EventProjector** (`lib/services/indexer/EventProjector.ts`):
  - **DegreeRequested:** Inserts/updates `degree_requests` with `recipient`, `requester`, provenance; status `PENDING`.
  - **RevocationRequested:** Inserts/updates `revocation_requests` with `token_id`, `requester`, provenance; status `PENDING`.
  - **DegreeRequestApproved:** Updates `approval_count` and `required_approvals`; inserts/updates `degree_request_approvals` with `verifier_address`, `tx_hash`, `block_number`, `log_index`.
  - **DegreeRequestRejected:** Sets `degree_requests.status = 'REJECTED'`.
  - **RevocationApproved:** Same pattern for revocation; **RevocationRejected** sets `revocation_requests.status = 'REJECTED'`.
  - **ApprovalWithdrawn:** Deletes approval row and decrements `approval_count` (degree or revocation per `isDegreeRequest`).
  - **ExpiredRequestCleaned:** Sets `status = 'EXPIRED'` for degree or revocation request.
  - **DegreeIssued:** Updates `degree_requests` (status `ISSUED`, `executed_at`, `token_id`); inserts/updates `degrees` with `request_id`.
  - **DegreeRevoked:** Updates `revocation_requests` (status `EXECUTED`); sets `degrees.is_revoked`, `revoked_by`, `revoked_at`.

Events are processed in order `(block_number, log_index)`. Idempotency: `(chain_id, tx_hash, log_index)` on `chain_events`.

---

## 3. Sync & Enrichment

- **realtime-sync** (`lib/services/realtime-sync.ts`): `syncDegreeRequest(requestId)` and `syncRevocationRequest(requestId)` use **blockchain** `getDegreeRequest` / `getRevocationRequest` (Core) and `getRequiredApprovals`, then resolve **blockchain university id → DB university id** and UPSERT into `degree_requests` / `revocation_requests` with full degree fields and status.
- **websocket-indexer** `syncAllRequestsFromEvents()`: Reads `DegreeRequested` / `RevocationRequested` from `chain_events` and calls the above sync for each request (enriches from chain).
- Comprehensive sync (`blockchain-sync.performComprehensiveFullSync`) runs `syncAllRequestsFromEvents()` so request rows get full fields from Core when possible.

---

## 4. Verification Threshold (Core Logic)

- `required approvals = getRequiredApprovals(universityId)`: if `verifierCount <= 2` then `1`, else `2`.
- Stored in `degree_requests.required_approvals` and `revocation_requests.required_approvals` (from approval events or sync). Shown in UI as `approvalsCount / required`.

---

## 5. APIs (DB-Only Reads)

- **GET /api/degree-requests**  
  Query: `universityId`, `status` (default `pending`), `requester` (wallet, for “my requests”).  
  Returns list from Postgres with `approvalProgress`, `university_name`, etc.

- **GET /api/degree-requests/[requestId]**  
  Returns one degree request with **approvals** (verifier_address, approved_at, tx_hash, block_number, log_index).

- **GET /api/revocation-requests**  
  Same query params; `requester` for “my revocation requests”.

- **GET /api/revocation-requests/[requestId]**  
  One revocation request with approvals.

UI must **not** fetch display data from chain; only use these APIs (and existing university/degree APIs). Wallet actions (request degree, request revocation, approve, reject, withdraw) are done in the UI by calling the Core contract with the user’s signer.

---

## 6. Stakeholders & Auth (To Complete)

- **Degree Issuing Requester:** Must be **issuer** on-chain for at least one university (`Core.issuers[universityId][wallet]` or Reader `isIssuer(universityId, wallet)`). Can call `Core.requestDegree(...)` only.
- **Degree Revoking Requester:** Must be **revoker** on-chain for at least one university. Can call `Core.requestRevocation(tokenId)` only.
- **Verifier:** On-chain `Core.isVerifier[universityId][wallet]` or Reader `isVerifierAccount`. Can approve/reject/withdraw for that university’s requests.
- **University Admin:** Existing admin; sees unified “Pending Requests” (degree + revocation) for their university.

Auth/session: support Web2 (email/password) + wallet connect + SIWE; then resolve roles from DB mirror (and optional fast chain check). Gate: enable nothing until wallet is verified and role membership is confirmed. If the wallet has multiple universities, show a **university selector** and store **activeUniversityId** in session.

---

## 7. UI Deliverables (To Implement)

- **Issuing Requester UI:**  
  - Form matching `requestDegree(universityId, recipient, nameAr, nameEn, facultyAr, facultyEn, majorAr, majorEn, degreeNameAr, degreeNameEn, gpa, year)`.  
  - Submit = wallet tx only; then show “submitted” and reflect status from DB (poll or real-time).  
  - “My Requests” list: filter by `requester` wallet; statuses PENDING / REJECTED / ISSUED / EXPIRED; show `approval_count`/`required_approvals` and list of approvers (from `/api/degree-requests/[requestId]`).

- **Revoking Requester UI:**  
  - Form: `tokenId` + optional off-chain reason (DB only). Submit = `requestRevocation(tokenId)` via wallet.  
  - “My Revocation Requests” with same status and approval tracking.

- **Verifier Dashboard:**  
  - Pending degree + revocation requests for their university (from DB).  
  - Each card: requester, recipient (degree) or tokenId (revocation), full degree fields for degree request, createdAt, approvalsCount/required, list of approvers + timestamps + tx hashes, “Already approved by you?”  
  - Actions: Approve / Reject / Withdraw approval (wallet txs only).

- **University Admin:**  
  - Unified “Pending Requests” view (degree + revocation) from DB.  
  - Per request: who initiated, reason (if stored), status transitions, tx hashes, verifiers who approved, threshold met, if issued show tokenId/degree; if revoked show revoke details.  
  - Links: BaseScan (txHash, tokenId), OpenSea (Base collection/token). “View NFT” / “Download” using Render/metadata from DB (no chain read in UI).

---

## 8. Real-Time UI Updates

- Use **SWR** (or similar) with a short refresh interval for request lists and detail, **or** add SSE/WebSocket that broadcasts DB change events per `universityId`.
- Do **not** refresh UI by reading from chain.

---

## 9. Acceptance Criteria (Target)

1. Issuing requester submits degree request on-chain → indexer/projector writes to `degree_requests` → verifiers see it in their dashboard.
2. Verifier A approves → DB updates approvals → Verifier B sees updated approvals/status without chain read.
3. When approvals meet required, last approval tx emits DegreeIssued → projector sets request ISSUED and inserts/updates degree → admin sees full timeline.
4. Revocation requester submits → same mirroring → after threshold, DegreeRevoked reflected in DB and UI.
5. Admin dashboard: pending requests, full audit trail (who, when, tx hashes), threshold status, final outcome.

---

## 10. Files Touched

- `scripts/029-degree-revocation-workflow-schema.sql` – migration
- `lib/services/indexer/EventProjector.ts` – all workflow events + fixes
- `lib/services/indexer/IndexerService.ts` – diagnostics for decode failures
- `lib/services/realtime-sync.ts` – syncDegreeRequest/syncRevocationRequest from Core + DB university id
- `app/api/degree-requests/route.ts` – requester filter, DB-only
- `app/api/degree-requests/[requestId]/route.ts` – single request + approvals
- `app/api/revocation-requests/route.ts` – requester filter, DB-only
- `app/api/revocation-requests/[requestId]/route.ts` – single request + approvals

Contract ABIs and addresses: `lib/contracts/abi.ts`, `abi-core.ts`, `abi-reader.ts` (already aligned with Core/Reader/Render).
