# @molecule/app-settings-actions-bar-react

Sticky Save/Cancel bar with "Saved" timestamp + loading state for settings
and form pages.

Exports `<SettingsActionsBar>`. Props: `onSave` (required; sync or async),
`onCancel?` (Cancel hidden when omitted), `loading?` (disables Save and
shows "Saving…"), `disabled?`, `savedAt?` (epoch ms → "Saved 3m ago"),
`error?` (inline ReactNode), `sticky?` (default true), `leading?`
(slot before the status), `className?`.

## Quick Start

```tsx
import { useState } from 'react'

import { SettingsActionsBar } from '@molecule/app-settings-actions-bar-react'

function ProfileActions({ save, reset }: {
  save: () => Promise<void>
  reset: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  return (
    <SettingsActionsBar
      onSave={async () => {
        setSaving(true)
        try {
          await save()
          setSavedAt(Date.now())
        } finally {
          setSaving(false)
        }
      }}
      onCancel={reset}
      loading={saving}
      savedAt={savedAt}
    />
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-settings-actions-bar-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `SettingsActionsBarProps`

Props accepted by the {@link SettingsActionsBar} component.

```typescript
interface SettingsActionsBarProps {
  /** Called when Save is clicked. */
  onSave: () => void | Promise<void>
  /** Called when Cancel is clicked. Hides Cancel if omitted. */
  onCancel?: () => void
  /** When true, the Save button disables and shows a loading label. */
  loading?: boolean
  /** When true, the Save button is disabled without a loading label. */
  disabled?: boolean
  /** When set, shows a "Saved" badge with the relative time. Epoch ms. */
  savedAt?: number | null
  /** Error text rendered inline. */
  error?: ReactNode
  /** Sticky-to-bottom. Defaults to true. */
  sticky?: boolean
  /** Additional content rendered before the buttons (status indicator, last-edited info). */
  leading?: ReactNode
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `SettingsActionsBar(props)`

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

- `props` — Component props (see {@link SettingsActionsBarProps}).

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

- The bar ships with an opaque theme surface (`cm.surface`) + top border
  (`cm.borderT`), so when `sticky` is on, page content no longer shows
  through it while scrolling. Pass `className` to layer on more styling.
- The "Saved …" time is English-shorthand ("3m ago"), computed once per
  render — it does not tick while mounted; re-render (or bump `savedAt`)
  to refresh it.
- `error` renders as plain unstyled text — style/color the node yourself.
- Throws unless inside `<I18nProvider>` with a bonded ClassMap.
  Translations: `@molecule/app-locales-settings-actions-bar`.

## Translations

Translation strings are provided by `@molecule/app-locales-settings-actions-bar`.
