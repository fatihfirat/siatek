# Phase 4E — Customer order and delivery tracking

Development preview: `http://127.0.0.1:5174/orders-preview`.
The preview imports only the tracking components and fictional local fixtures;
it does not mount App, authentication, Firestore subscriptions or shopping services.
The production build excludes the preview. No live orders or statuses were changed.

## Changes

- CustomerPortal uses OrderTracking with shared OrderRow, Button, Select,
  TextInput, FeedbackState, Skeleton, Section, StatusBadge and Modal components.
- List shows order number, date, stored total, current status and one review action.
  Number search and status filtering distinguish an empty account from no matches.
- Detail separates current status from the next expected step. Products, stored
  financial amounts, payment method, actual receipt state, address and recorded
  chronological history have separate readable sections. Missing history and
  unknown status are explicitly identified; milestones and dates are not invented.
- Cancellation is terminal and separate from delivery progression. Alpha Teknik
  performs delivery; no carrier, invented tracking number or ETA is added.
- Receipt reporting and document access remain available inside detail through
  existing callbacks. The customer list no longer exposes thermal printing and
  external messaging controls. The existing document/receipt modules are unchanged.
- CustomerPortal filters all received orders by a nonempty matching customer email,
  including cached data, home counters and ancillary order selectors. Tracking
  repeats this check and resolves selected details from the current allowed list.
  Guest, loading, error/retry, empty and unavailable detail states are supported.
- useRealtimeData exposes order request loading/error state to the customer screen.
  Network and malformed-response failures no longer appear as a successful empty list.
- Shared Modal explicitly wraps Tab/Shift+Tab between visible controls. Native
  Escape, scroll locking and return-to-trigger behavior remain intact.

## Status compatibility evidence

`src/types.ts`, `src/db/schema.ts`, `src/utils/statusConfig.ts` and existing
`orderPhase3C.test.ts` describe pending, approved, preparing, ready,
out_for_delivery and delivered, with cancelled separate. The existing status
configuration already maps legacy shipped to out_for_delivery for display.
The new view preserves that read compatibility without rewriting stored values.
Unknown states are not displayed as pending.

Legacy shipped values remain in server types/notification text, administrator
operations, the old D3 view, document export and seed fixtures. Historical database
records were not inspected. No migration or mass rename was performed.

## Validation (2026-09-14)

- Full available Vitest suite: 47 passed, 28 database-dependent tests skipped.
  Four new tests cover ownership filtering, blank identity, legacy display,
  cancellation, unknown states and missing dates.
- `scripts/verify-orders.cjs`: 28 list/detail combinations, light/dark themes,
  320/360/390/412/768/1024/1440 widths. Also checks 44px controls, long text,
  filter reset, shipped display compatibility, cancellation, absent history,
  loading/error/retry/guest/other-customer cases, keyboard containment/return,
  Escape/close, short viewport and enlarged text. No API/Firestore requests or
  browser runtime errors in this isolated preview.
- Shared UI regression: 14 theme/viewport combinations passed, including modal,
  quantity controls, search, loading, toast and reduced motion.
- Shopping regression: 12 layouts and existing shopping interactions passed on
  rerun. First run failed an immediate repeated-add visibility assertion; it did
  not reproduce on a fresh run. No cart business logic changed in this phase.
- Vite production build passed. Source-entry TypeScript check (allowJs false,
  entry src/main.tsx) reports the same 15 pre-existing shipped errors, no new ones.
  This is not a successful full-project typecheck.
- Screenshots: `.artifacts/ui-phase4e`. Light/dark detail screenshots inspected.
- This directory has no Git repository metadata; a Git diff was unavailable.

## Remaining limitations

Email matching is a UI disclosure guard, not proof of backend authorization.
The existing `/api/orders` route also accepts name/phone ownership matches,
Firestore uses an unscoped order subscription, and the shared hook caches orders
without account scoping. Its REST fetch does not attach the stored authorization
header. These pre-existing transport/authorization issues require a separate,
coordinated authenticated API/Firestore/cache review before a pilot. Orders made
with an email different from the account email are intentionally hidden here.
No live database, authenticated persistence or server isolation test was performed.

Administrator order actions and the unused legacy OrderDetailModal remain outside
this customer migration. Their old behavior should not be inferred to match the
new tracking component. Native Android back, physical keyboards, real devices,
screen-reader testing and payment settlement were not verified. Browser viewport
and font-size checks do not substitute for those checks.

Next: Phase 4F only after the user's continuation request. No deployment or push.
