# @molecule/app-plan-updated-page-react

`<PlanUpdated />` — post-purchase confirmation page.

Renders a thank-you headline + Return Home button after the user
completes a plan upgrade. Reads auth state to show a spinner while
the session is still hydrating, so the page is safe to navigate to
directly from a webhook redirect or fresh page load.

Replaces the byte-identical `pages/PlanUpdated.tsx` shipped by 76 of
the 115 flagship apps that have a paid-plan flow. All translation
keys come from `@molecule/app-locales-common` — no per-app locale
additions needed.

## Quick Start

```tsx
import { PlanUpdated } from '@molecule/app-plan-updated-page-react'

// In your router:
<Route path="/plan-updated" element={<PlanUpdated />} />
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-plan-updated-page-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-router-dom` ^6.0.0 || ^7.0.0
