# @molecule/app-tag-input-react

React tag-token input and tag-chip display.

Exports:
- `<TagChip>` — standalone labeled chip with optional remove button.
- `<TagInput>` — controlled tokenizer: Enter/, adds, Backspace on
  empty field removes the last token.

## Quick Start

```tsx
import { TagChip, TagInput } from '@molecule/app-tag-input-react'

// Controlled tag input
<TagInput
  value={tags}
  onChange={setTags}
  placeholder="Add a tag…"
  maxTags={10}
/>

// Standalone chip
<TagChip onRemove={() => removeTag('react')}>react</TagChip>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-tag-input-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
