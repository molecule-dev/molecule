# @molecule/app-inline-edit-react

Click-to-edit inline field. Renders the value as text; on click (or
Tab + Enter) swaps in an `<Input>` or `<Textarea>` with Save/Cancel
buttons. Enter submits (Cmd/Ctrl+Enter for the textarea variant),
Escape cancels.

## Quick Start

```tsx
import { InlineEdit } from '@molecule/app-inline-edit-react'

const deal = { title: 'Acme renewal' }

<InlineEdit
  value={deal.title}
  onSubmit={async (next) => { console.log('save', next) }}
  placeholder="Enter deal title"
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-inline-edit-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `InlineEditProps`

```typescript
interface InlineEditProps {
  /** Current value. */
  value: string
  /** Called when the user commits a new value. Return a Promise to block the UI while saving. */
  onSubmit: (next: string) => void | Promise<void>
  /** Render mode for the editor. */
  variant?: 'input' | 'textarea'
  /** Renderer for the read state — defaults to plain text. */
  renderRead?: (value: string) => ReactNode
  /** Placeholder when value is empty. */
  placeholder?: string
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `InlineEdit(props)`

Click-to-edit text. Renders the value as text by default; on click
(or focus via tab + Enter), swaps in an `<Input>` / `<Textarea>` for
inline editing. Enter submits, Escape cancels.

Common in titles, descriptions, table cells where modal-based forms
would be heavyweight.

```typescript
function InlineEdit({
  value,
  onSubmit,
  variant = 'input',
  renderRead,
  placeholder,
  className,
}: InlineEditProps): ReactNode
```

- `props` — Component props (see {@link InlineEditProps}).

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

- Requires `@molecule/app-react`'s `I18nProvider` (`useTranslation()`
  THROWS without it) and a bonded ClassMap; button labels come from the
  `@molecule/app-locales-inline-edit` companion bond.
- Return a Promise from `onSubmit` to disable the buttons while saving.
  If `onSubmit` REJECTS, the editor stays open with the draft intact but
  the error is not displayed — catch and surface errors inside your
  `onSubmit` (toast, form error, etc.).
- The draft re-syncs from `value` whenever the prop changes, including
  mid-edit — avoid mutating `value` while the user is typing.

## Translations

Translation strings are provided by `@molecule/app-locales-inline-edit`.
