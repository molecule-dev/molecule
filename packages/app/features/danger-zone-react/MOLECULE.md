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

### Interfaces

#### `ConfirmDialogProps`

```typescript
interface ConfirmDialogProps {
  /** Whether the dialog is open. */
  open: boolean
  /** Called when the dialog should close (escape, backdrop, cancel). */
  onClose: () => void
  /** Title. */
  title: ReactNode
  /** Body / warning text. */
  description: ReactNode
  /** Confirm-button label (e.g. "Delete"). */
  confirmLabel?: ReactNode
  /** Cancel-button label. */
  cancelLabel?: ReactNode
  /** Called when the user confirms. */
  onConfirm: () => void | Promise<void>
  /** Is the confirm action destructive? Defaults to true. */
  destructive?: boolean
  /** Extra body content between description and footer. */
  children?: ReactNode
  /** Disables both buttons. Set it yourself while your `onConfirm` promise is pending — the dialog does not track it and does not auto-close. */
  loading?: boolean
}
```

#### `DangerZoneSectionProps`

```typescript
interface DangerZoneSectionProps {
  /** Section title. */
  title: ReactNode
  /** Explanation of the destructive action. */
  description: ReactNode
  /** Label on the action button (e.g. "Delete account"). */
  actionLabel: ReactNode
  /** Called when the button is clicked. */
  onAction: () => void
  /** When true, the button disables and shows a loading label. */
  loading?: boolean
  /** When true, the button is disabled without loading. */
  disabled?: boolean
  /** Additional content between description and button (e.g. a confirm-text input). */
  children?: ReactNode
  /** Extra classes on the Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
```

### Functions

#### `ConfirmDialog(props)`

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

- `props` — Component props (see {@link ConfirmDialogProps}).

#### `DangerZoneSection(props)`

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

- `props` — Component props (see {@link DangerZoneSectionProps}).

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

`<ConfirmDialog>` does NOT track `onConfirm`'s promise and does NOT close
itself on confirm: set `loading` yourself while the action runs, then call
`onClose()` when it settles — otherwise users can double-fire the
destructive action or be left staring at an open dialog. Cancel/Confirm
fall back to the `confirm.*` i18n keys (companion bond:
`@molecule/app-locales-danger-zone`); pass `confirmLabel`/`cancelLabel`
for action-specific wording ("Delete", "Revoke"). `destructive` (default
true) only switches the confirm button color.
