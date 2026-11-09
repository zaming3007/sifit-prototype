# Sifit frontend

React 19 + Vite + Tailwind frontend for the Sifit second-hand fashion marketplace.

Google sign-in uses Google Identity Services and the existing backend session. Configure `GOOGLE_CLIENT_ID` in the backend `.env`; the frontend obtains the public client ID and one-use nonce from `/auth/google/config`. See `C:/Sifit-backend/GOOGLE_SIGNIN.md`. Run `node scripts/verify-google-auth.mjs` for the isolated browser test (Google UI/key source simulated, real RSA verification and Sifit API).
It uses the Express/MongoDB backend in `C:\Sifit-backend`.

## Local development

1. Configure and start the backend as described in its README. MongoDB must support transactions (replica set or Atlas).
2. Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` to your backend API URL (default: `http://localhost:5000/api/v1`).
3. Backend `FRONTEND_URL` and `SOCKET_CORS_ORIGIN` must match the exact frontend origin, including port. Use the same hostname (`localhost` or `127.0.0.1`) for both apps so refresh cookies work.
4. Run `npm install` and `npm run dev`.

Optional `VITE_SOCKET_URL` overrides the Socket.IO origin. Otherwise it uses the API origin.
`VITE_PUBLIC_SITE_URL` configures the public site URL encoded in the footer QR.

## API integration

- `src/services/apiClient.js`: Axios, bearer token kept in memory, shared refresh-token request, HttpOnly refresh cookie and session expiration.
- `src/services/*`: backend API contracts; `src/utils/normalizers.js` and `orderService.js` adapt server documents to views.
- `AppContext`: public catalogue, authentication, buyer orders/cart/wishlist, conversations and realtime messages.
- Seller Studio: own drafts (including rejected/pending), multipart image upload/removal, submit for admin moderation, seller orders, shipping quotes/shipments, shop profile, verification requests, earnings and payout history.
- Checkout: the backend checks out the whole cart and splits it by seller. Remove unwanted items explicitly; checkout never silently removes unselected items. Totals, commissions and payment status come from the server. Idempotency keys survive retries in the current mounted form.
- Buyer account: persistent address book, payment attempts, cancellation, shipment tracking, verified-delivery receipt confirmation, reviews per order item, disputes and password changes.
- Admin: live dashboard, user suspension/reactivation, product moderation, orders, message report resolution, shop verification and dispute review/resolution.
- Wishlist and notification screens use persistent server data; notification preferences and read/archive actions use REST.
- Chat uses REST history and persistence plus Socket.IO events. Reconnect reloads history, older messages use cursor pagination, and failed sends retain the input/idempotency key. Message reports use the message-report API.

Accounts have a distinct `BUYER`, `SELLER`, or `ADMIN` role. Signup persists the buyer/seller selection; login and session restoration open the matching interface. The API enforces role and resource ownership. Public signup cannot create admins.

Catalogue filters operate on the backend. Public shops now show all available products through pagination, with keyword search, combined category/brand/size/condition/price filters and price/date sorting. Filter options come from the entire shop. Shop links retain filters, sorting, product pages and review tabs/pages across reload and Back/Forward. Reviews load lazily in pages; follow, wishlist, cart and product navigation remain available. Run `node scripts/verify-shop-catalog.mjs` for the isolated browser flow, and see `C:/Sifit-backend/SHOP_CATALOG.md`. Unsupported product fields such as material are not sent as if the backend persisted them; material keywords search descriptions instead.

## Current backend limitations

Structured bargaining uses **Mặc Cả** on product details and **Đề nghị giá** in buyer navigation/Seller Studio. Sellers accept or reject; buyers can withdraw, inspect history and apply accepted prices in the cart. Accepted offers last 24 hours to start checkout and do not hold stock. Checkout consumes each selected offer once and calculates payment/commission amounts on the server. Chat remains available through **Nhắn tin cho shop**. Run `node scripts/verify-offers.mjs` for the isolated real browser flow; see `C:/Sifit-backend/OFFERS.md` for API rules and indexes.

Payments support PayOS QR through the backend, signature-verified webhooks, persistent bank receipts and server reconciliation. Sellers book shipping externally, save tracking details and confirm handover. Buyers confirm receipt; admins explicitly complete orders and approve payouts after protection/verification checks. Payouts use bank transfers recorded by admins with transaction references; approval alone never marks a real payout paid. Simulator providers remain isolated in tests. See `C:/Sifit-backend/PAYOS_SETUP.md`. There is no COD/VNPAY/Momo integration.

Personal profiles support editing name and phone, previewing/uploading/replacing/removing an avatar, and syncing the saved details to account navigation for buyers, sellers and admins. Email and role remain read-only. Avatar uploads accept JPEG, PNG or WebP up to 5 MB and use the backend Cloudinary configuration. Run `node scripts/verify-profile.mjs` for isolated API/browser coverage (disposable database, simulated image storage).

Product reports are available from product details. Users select a reason, describe the issue and view their report history, including after a listing is hidden. Admins use **Báo cáo sản phẩm** to filter, inspect snapshots, resolve reports or warn/block/unblock reporting privileges. Limits are enforced in the backend: one pending report per account/product, 3 in 10 minutes and 10 in 24 hours. Run `node scripts/verify-product-reports.mjs` for the isolated browser flow with real API, notifications and database transactions. See `C:/Sifit-backend/PRODUCT_REPORTS.md`.

Buyers can follow/unfollow public shops and open **Shop đang theo dõi** from account navigation. The page contains a paginated shop list and a feed of available products from followed shops. New-product alerts are sent only after first admin approval, with per-shop and global opt-outs. Shop links survive reloads, and notifications open the related product. Run `node scripts/verify-shop-follows.mjs` for the isolated real API/browser flow, including mobile layouts. See `C:/Sifit-backend/SHOP_FOLLOWS.md`.

The backend has no AI stylist or advertising-package API. AI clearly shows unavailable status, and fake package actions have been removed. Public guide copy does not assume a fixed commission rate. Newsletter interest and language preferences remain explicitly local browser preferences.

Seller images require configured Cloudinary credentials during normal development. A failed upload retains the already-created draft so it can be retried without creating another product.

Buyer orders show the saved recipient/address, the reservation/payment deadline and the post-delivery protection deadline in Vietnam time (UTC+7). Expired reservations disable payment in the UI. The backend now automatically reconciles payments and cancels eligible unpaid expired orders, releasing reserved inventory; notification delivery also runs periodically. Ambiguous PayOS receipts stay reserved for review. See `C:/Sifit-backend/BACKGROUND_JOBS.md` for defaults and operational checks.

Paid orders in PAID/PROCESSING/SHIPPED state can open an ITEM_NOT_RECEIVED case before verified delivery. Other reasons require an active post-delivery protection window. Unpaid, cancelled, refunded and expired post-delivery cases are rejected, and an active case disables a duplicate submission. Opening a case only requests admin review; it never automatically refunds payment.

Completed verified purchases support per-product review creation/editing/removal, up to five JPEG/PNG/WebP images (5 MB each), and one shop rating per order. Edit deadlines come from backend REVIEW_EDIT_WINDOW_DAYS. Deleted reviews cannot be edited or recreated. Image uploads require Cloudinary; a failed image upload preserves the saved review text for retry. Buyer-order responses batch their review/case metadata so each order card does not fetch the entire review history separately.

## Verification

```text
npm run build
npm run lint
npm run test:integration
```

`test:integration` (also `test:ui`) starts the actual backend on port 5017, Vite on 5187 and a disposable MongoDB replica set. It uses the installed backend dependencies and Chrome by default. Set `SIFIT_BACKEND_DIR` or `SIFIT_BROWSER_CHANNEL` when needed. No browser API routes are mocked; only external Cloudinary storage is replaced inside this test process. It does not use the configured development database. Screenshots go into ignored `artifacts/integration/`.

Run `npm test` in the backend directory for its Jest/Supertest suite.
# Vai trò và giao diện tài khoản

- `BUYER`: giao diện mua sắm, giỏ hàng, đơn mua, yêu thích, chat và thông báo.
- `SELLER`: trung tâm người bán riêng, quản lý shop, sản phẩm, đơn bán, giao hàng, doanh thu, chat và thông báo; không hiển thị thanh mua sắm và giỏ hàng.
- `ADMIN`: trung tâm quản trị riêng. Không có lựa chọn đăng ký admin công khai.

Đăng ký gửi vai trò đã chọn tới backend. Đăng nhập, khôi phục phiên và truy cập URL trực tiếp đều dựa trên vai trò thực tế từ backend. Người bán đã từng mua hàng trước khi chuyển vai trò có mục “Đơn mua trước đây” để tiếp tục xử lý các đơn cũ. Backend cần chạy migration theo hướng dẫn trong `C:/Sifit-backend/README.md` trước khi dùng với dữ liệu `USER` cũ.
