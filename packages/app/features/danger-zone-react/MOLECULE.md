# @molecule/app-danger-zone-react

React destructive-action primitives.

Exports:
- `<DangerZoneSection>` — Card with title/description/button for delete/reset/revoke.
- `<ConfirmDialog>` — standalone "Are you sure?" modal.

## Quick Start

```tsx
import { ConfirmDialog, DangerZoneSection } from '@molecule/app-danger-zone-react'

<DangerZoneSection
  title="Delete account"
  description="This permanently removes your account and all data."
  actionLabel="Delete account"
  onAction={() => setConfirmOpen(true)}
/>

<ConfirmDialog
  open={confirmOpen}
  onClose={() => setConfirmOpen(false)}
  title="Delete account?"
  description="This action cannot be undone."
  confirmLabel="Delete"
  onConfirm={handleDelete}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-danger-zone-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
