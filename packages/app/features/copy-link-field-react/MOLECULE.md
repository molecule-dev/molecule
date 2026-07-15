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

### Functions

#### `CopyLinkField(root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .value
- `root0` — .label
- `root0` — .onCopy
- `root0` — .feedbackMs
- `root0` — .size
- `root0` — .className

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
