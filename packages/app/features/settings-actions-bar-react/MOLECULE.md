# @molecule/app-settings-actions-bar-react

Sticky Save/Cancel bar with "Saved" timestamp + loading state for settings and form pages.

## Quick Start

```tsx
import { SettingsActionsBar } from '@molecule/app-settings-actions-bar-react'

<SettingsActionsBar
  onSave={async () => saveProfile(formData)}
  onCancel={() => resetForm()}
  loading={isSaving}
  savedAt={lastSavedAt}
  error={saveError}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-settings-actions-bar-react
```

## API

### Functions

#### `SettingsActionsBar(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

Sticky bottom / inline Save-Cancel bar for settings and forms.

Features:
- Primary Save button with loading/disabled state.
- Optional Cancel button.
- "Saved Xm ago" status when `savedAt` is provided.
- Inline error text.
- Optional leading slot for custom status badges.

```typescript
function SettingsActionsBar({
  onSave,
  onCancel,
  loading,
  disabled,
  savedAt,
  error,
  sticky = true,
  leading,
  className,
}: SettingsActionsBarProps): JSX.Element
```

- `root0` — *
- `root0` — .onSave
- `root0` — .onCancel
- `root0` — .loading
- `root0` — .disabled
- `root0` — .savedAt
- `root0` — .error
- `root0` — .sticky
- `root0` — .leading
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
