# Phase 4B: Application shell

- Header now uses the shared controls and modal: brand, notifications, account.
  Search remains visible on desktop and available in preferences on mobile.
  Theme/audio use labeled switches. Existing action callbacks are retained.
- Mobile tabs use equal tracks with persistent labels and 44px minimum targets.
  Customer center: Cart. Admin center: POS. Domain route IDs are unchanged.
- Catalog, cart and POS actions are connected to their corresponding screens.
- Cart count is supplied by CustomerPortal. Opening More no longer unmounts the
  portal, so tab navigation preserves the current cart and filters.
- Customer identity changes remount CustomerPortal to clear local customer state.
- Cart strip clears navigation using a shared safe-area offset. Content reserves
  space for both controls. Modal surfaces remain above the navigation.

Development preview: `/shell-preview`. It uses the real Header and MobileBottomNav
with fictional local data. Preview dialogs do not execute sales or authentication.

Validation: 36 role/theme/viewport combinations (320 to 1024px), stable tab widths,
minimum target sizes, cart clearance and preview cart/POS dialogs passed in Chrome.
Existing suite: 35 passed, 28 database tests skipped. Production Vite build passed.
Scoped UI typecheck passed. Existing order-status errors remain outside this phase.
Authenticated live sales, native hardware back and physical device keyboard flows
were not exercised. No production deployment was performed.

Installed project skill: appllama-app-design-skill via the user-requested skills CLI.
