# @molecule/app-copy-link-field-react

React copy-link field.

Exports `<CopyLinkField>` — read-only input + copy-to-clipboard button with "Copied!" feedback.

## Quick Start

```tsx
import { CopyLinkField } from '@molecule/app-copy-link-field-react'

<CopyLinkField
  label="Share link"
  value="https://example.com/invite/abc123"
  onCopy={() => console.log('copied')}
  feedbackMs={2000}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-copy-link-field-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `CopyLinkFieldProps`

```typescript
interface CopyLinkFieldProps {
  /** Value to display (and copy on click). */
  value: string
  /** Optional label above the field. */
  label?: string
  /** Called after a successful copy. */
  onCopy?: () => void
  /** How long the "Copied!" state lingers (ms). Defaults to 1500. */
  feedbackMs?: number
  /** Size of the copy button. Defaults to `'sm'`. */
  size?: 'sm' | 'md'
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `CopyLinkField(props)`

Read-only input + copy-to-clipboard button. Common in share-link
panels, API-key cards, webhook URLs.

```typescript
function CopyLinkField({
  value,
  label,
  onCopy,
  feedbackMs = 1500,
  size = 'sm',
  className,
}: CopyLinkFieldProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `props` — Component props (see {@link CopyLinkFieldProps}).

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

Copying uses `navigator.clipboard`, which exists only in secure contexts
(HTTPS / localhost) — elsewhere the button silently does nothing and
`onCopy` never fires. The input is read-only and selects its content on
focus, so manual Ctrl/Cmd+C still works as the fallback. Labels use
`copyLink.*` i18n keys (companion bond: `@molecule/app-locales-copy-link-field`).

## Translations

Translation strings are provided by `@molecule/app-locales-copy-link-field`.
