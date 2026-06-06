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
npm install @molecule/app-copy-link-field-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
