# Website audit — 17 November 2026

## Changes

- Failed mutations and user-triggered actions display an error popup. Vietnamese UI translates common server, permission, network and field-validation errors into actionable messages.
- Buyer, seller and admin notification controls show unread badges. Counts recover through REST, socket reconnect and periodic refresh; read/archive changes also refresh without sockets.
- The notification inbox has unread filtering and 20-item pagination. Local activity history is collapsed and stored per account, rather than shared across accounts on one device.
- Seller notification links can open public products from other shops. Sellers who bought an item get the buyer actions for their own purchase.
- Product draft/upload/submit confirmations describe the actual state rather than claiming an unpublished draft is already for sale.
- Admin navigation exposes **Giao dịch** directly. Payments, actual incoming receipts and ledger entries can be searched by reference or identifier and filtered by date. Receipt dates use the bank occurrence time; date boundaries use Vietnam time.
- Release checks now follow the current homepage layout and verify that background-removal assets load lazily and each deployed file stays within the hosting asset limit.

## Validation

- Existing backend suite: 31 suites, 340 tests passed.
- Added finance API coverage: authorization, literal reference search, identifiers, date boundaries, invalid dates, receipt matching and balanced ledger records.
- Browser integration covers seller/buyer/admin navigation, product publishing, checkout, payments, shipping, returns, disputes, refunds, payouts, reviews, chat, verification and account recovery.
- New notification/finance browser suite covers socket counts, pagination, read-all, Vietnamese error popup, account history isolation, seller public-product links, payment search, receipts, ledger and mobile layout.
- AI Stylist regression uses the real application adapter with a simulated paid provider.
- Production bundle, frontend lint and backend lint checked.
- Public deployed homepage, API health and public products returned HTTP 200 during the audit.

## Scope of verification

Authenticated workflows were verified with disposable MongoDB databases and test users. External image storage and paid providers are simulated in integration tests. This audit does not assert that a real bank transfer, email delivery or paid AI generation has been completed on the deployed site.

## Repeatable commands

Frontend: `npm run lint`, `npm run build`, `npm run test:release`, `npm run test:notifications-finance`, `npm run test:stylist`.

Full browser integration: set `SIFIT_BACKEND_DIR` to the backend checkout, then run `npm run test:integration`.

Backend: `node node_modules/jest/bin/jest.js --runInBand --silent`.
