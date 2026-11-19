# Security Specification — SwarnaPlay Gaming Platform

## 1. Data Invariants
1. A user profile (`users/{userId}`) cannot be created with `role == 'admin'` or `status == 'suspended'` by a non-admin user; initial `role` must be `'player'` and `status` must be `'active'`.
2. PII (`email`, `phone`) is strictly isolated in `users/{userId}/private/info` and readable/writable only by the owning user or an admin.
3. A user wallet (`wallets/{userId}`) on initial creation must have `coinBalance == 1000` (welcome bonus) and cannot be arbitrarily inflated by a client.
4. Any client-initiated wallet update must atomically reference a newly created transaction (`existsAfter(/databases/$(database)/documents/transactions/$(incoming().lastTxId))`) and keep `coinBalance >= 0`.
5. `transactions` and `gameHistory` documents are append-only for regular users (`update` and `delete` denied to non-admins).
6. Regular users cannot create `ADMIN_ADJUST` transactions or modify `gameConfig`.
7. All `list` queries on `users`, `wallets`, `transactions`, `gameHistory`, and `notifications` enforce `resource.data.userId == request.auth.uid` (or `uid == request.auth.uid`) at the rules layer unless `isAdmin()`.

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Return PERMISSION_DENIED)
1. **Privilege Escalation on Registration**: `POST /users/{uid}` with `{ role: "admin", ... }` by normal user -> DENIED.
2. **Self-Unban**: `PATCH /users/{uid}` updating `status: "active"` when suspended -> DENIED (`affectedKeys` restricts user updates to `['username', 'avatarUrl', 'totalWins', 'totalLosses', 'totalWagered', 'updatedAt']`).
3. **PII Snooping**: User B `GET /users/{userA}/private/info` -> DENIED.
4. **Infinite Starting Coins**: User A `POST /wallets/{userA}` with `{ coinBalance: 9999999 }` -> DENIED (`coinBalance == 1000` required on create).
5. **Orphaned Balance Hack**: User A `PATCH /wallets/{userA}` incrementing `coinBalance` without creating a corresponding `transactions/{lastTxId}` in the same batch -> DENIED (`existsAfter` fails).
6. **Admin Adjust Forgery**: User A `POST /transactions/{txId}` with `{ type: "ADMIN_ADJUST", amount: 50000 }` -> DENIED.
7. **History Tampering**: User A `PATCH /gameHistory/{roundId}` changing `netProfit: 5000` -> DENIED.
8. **Transaction Deletion**: User A `DELETE /transactions/{txId}` -> DENIED.
9. **Blanket List Scraping**: User A `LIST /transactions` without `where('userId', '==', userA)` -> DENIED.
10. **Game Config Manipulation**: User A `PATCH /gameConfig/default` setting `dailyBonusCoins: 100000` -> DENIED.
11. **ID Poisoning**: User A `POST /transactions/{2kb_junk_id}` -> DENIED (`isValidId` max 128 chars).
12. **Shadow Field Injection**: User A `POST /users/{uid}` with extra field `isVipBypass: true` -> DENIED (`keys().hasOnly(...)`).
