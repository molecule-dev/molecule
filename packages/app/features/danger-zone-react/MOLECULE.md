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
npm install @molecule/app-danger-zone-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Functions

#### `ConfirmDialog(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

Are-you-sure-style confirmation modal for destructive actions.

Use standalone (around delete buttons, revoke tokens, irreversible
migrations) or wrap DangerZoneSection's action with this dialog.

```typescript
function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  destructive = true,
  children,
  loading,
}: ConfirmDialogProps): JSX.Element
```

- `root0` — *
- `root0` — .open
- `root0` — .onClose
- `root0` — .title
- `root0` — .description
- `root0` — .confirmLabel
- `root0` — .cancelLabel
- `root0` — .onConfirm
- `root0` — .destructive
- `root0` — .children
- `root0` — .loading

#### `DangerZoneSection(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

Card-wrapped section for destructive actions — delete account,
reset data, revoke access. Uses the error/danger accent color and
puts the action on the right.

```typescript
function DangerZoneSection({
  title,
  description,
  actionLabel,
  onAction,
  loading,
  disabled,
  children,
  className,
  dataMolId,
}: DangerZoneSectionProps): JSX.Element
```

- `root0` — *
- `root0` — .title
- `root0` — .description
- `root0` — .actionLabel
- `root0` — .onAction
- `root0` — .loading
- `root0` — .disabled
- `root0` — .children
- `root0` — .className
- `root0` — .dataMolId

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`
