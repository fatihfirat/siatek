# Phase 4D — Customer shopping flow

The live CustomerPortal now uses ShoppingCatalog and ShoppingCheckout. The
customer account entry in App uses CustomerAccount. QuickQuoteModal uses the
shared accessible dialog and labeled form controls.

- Search retains the existing Turkish fuzzy matching, SKU/barcode matching,
  category/subcategory filtering, stock filtering and pagination.
- Product detail shows available description, identifiers, image, stock, price
  and related products from the same category. No fabricated recommendations.
- Add remains visible after purchase. Repeated/bulk additions merge by product
  ID and respect available stock and minimum quantities. Guests cannot add.
- The cart supports quantity editing, removal, clearing, saved delivery addresses,
  labeled contact fields, payment selection and the existing pricing/tax rules.
- A synchronous submission lock prevents simultaneous submissions. A rejected or
  uncertain API response retains the cart and does not create a fallback order
  in Firestore. A confirmed response retains the existing asynchronous mirror.
- Success shows the returned order number and links to order history. Quote
  failures remain in the form rather than silently closing it.
- The account view exposes the signed-in customer's identity, orders, quotes and
  account security, without an administrator shortcut.

## Validation

`/shopping-preview` mounts the real customer components with a local simulated
shopping service and blocks live API fetches. It is development-only. Its ancillary
account/security and legacy home actions are not a full application simulation.

`scripts/verify-shopping.cjs` passed 8 catalog theme/width cases and 4 checkout
width cases, detail opening, repeat addition, cart retention through account
navigation, failed-save retention, double submission, successful cart clearing,
quote empty state and guest price/action gating. Screenshots were inspected.

Existing suite plus cart tests: 39 passed, 28 database tests skipped. Four service
confirmation tests also passed. Vite production build passed. Source-only type
check still reports the same 15 pre-existing `shipped` status errors; no additional
errors were introduced.

No production deployment or real sales were performed. Native Android back,
physical device keyboard behavior and live backend persistence were not verified.
The client submission lock is not server-side idempotency across devices or
retries. Existing server inventory concurrency and persistence are unchanged.

Next phase: 4E order tracking and delivery presentation.
