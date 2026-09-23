# Phase 4C — Three reference screens

Development preview: `/reference-preview`.

The approved roadmap places a visual review after the customer home, product
catalog and administrator home references. This phase implements those references
with fictional local data and the shared Phase 4A controls and Phase 4B navigation.
It does not migrate the authenticated business screens or execute backend actions.

- Customer home: search, active order, quick actions and frequent products.
- Catalog: Turkish search, category filters, stock labels, quantity selection,
  persistent add button, cart count and removable local cart items.
- Administrator home: four summary values, pending tasks, quick actions and recent
  activity. Guest state hides administrator values.
- Preview controls expose light/dark, loading, empty, error and guest states.
- Actions outside the three reference screens open clearly labeled preview
  placeholders. Authentication, barcode capture, order details, quotes and POS
  remain future-phase flows. Refresh clears the local demonstration cart.

Validation: `scripts/verify-reference.cjs` passes 42 screen/theme/viewport cases
(320, 360, 390, 412, 768, 1024, 1440), control target sizes, Turkish SKU search,
repeat addition, unavailable stock, cart/navigation clearance, filter reset,
guest administrator isolation and retry. No browser runtime errors observed.
Screenshots are in `.artifacts/ui-phase4c`. Scoped UI TypeScript check passes.
Vite production build passes; reference JavaScript is development-only.
Physical device, native back, live sales and release performance are not tested.

Next gate: visual review of the three references, followed by Phase 4D customer
shopping flow migration. No production deployment was performed.
