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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
