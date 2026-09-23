# Alpha Teknik UI Foundation

Phase 4A establishes reusable components without migrating business screens.
Preview: development only, `/design-system`. Uses fictional local data and does
not mount App, authentication, realtime subscriptions, or backend requests.

## Design decisions

- Existing React, Tailwind, Lucide and theme selectors are retained.
- Neutral surfaces, green primary actions, semantic info/warning/error colors.
- Existing surface tokens are reused. New component tokens live in `ui.css`.
- Body 16px, labels 14px, captions 13px, headings 18/24px.
- Spacing 4/8/12/16/24/32px; corner radius 8px.
- Controls 44px minimum, normally 48px. No changing width when loading.
- Native modal dialog provides focus containment and Escape; focus returns to
  the trigger. Mobile layout uses a bottom sheet with safe-area padding.
- Reduced motion is supported. Toast is a single persistent, dismissible slot.

## Components

`src/components/ui/index.tsx`: Button, IconButton, TextInput, NumberInput,
Select, Textarea, SearchInput, QuantityStepper, StatusBadge, Section, KPI,
ProductRow, OrderRow, Skeleton, FeedbackState, Modal, Toast.

Import components from this module to include their scoped styles. Keep business
rules and requests outside these components. Supply labels and status semantics
from the existing domain configuration when migrating screens.

## Verification and boundaries

`scripts/verify-ui.cjs` checks 320/360/390/412/768/1024/1440px in both themes,
quantity bounds, search, modal focus/Escape, loading, toast, and reduced motion.
It needs Playwright and Chrome. Use PLAYWRIGHT_MODULE to specify an existing
Playwright installation if it is not installed in the project.

Existing tests: 35 passed, 28 integration tests skipped. Vite production build
passed; no preview JavaScript chunk appears in the production build.
New UI components pass a scoped TypeScript check. Full project typecheck hits
memory limits; a source-only check reports 15 existing `shipped` status errors.

No production deployment. Header, mobile navigation and sticky cart coordination
remain Phase 4B. Existing screen modals, status colors, confetti and UI controls
are not migrated in this foundation change. Native Android back and physical
device keyboards require device verification before rolling out shared modals.
