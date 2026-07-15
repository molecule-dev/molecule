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
npm install @molecule/app-tag-input-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Functions

#### `TagChip(root0, root0, root0, root0, root0)`

Small labeled chip with an optional close button. Used inside
`<TagInput>` but also usable standalone as a label display element.

```typescript
function TagChip({ children, onRemove, onClick, className }: TagChipProps): JSX.Element
```

- `root0` — *
- `root0` — .children
- `root0` — .onRemove
- `root0` — .onClick
- `root0` — .className

#### `TagInput(root0, root0, root0, root0, root0, root0, root0)`

Tokenized tag-input with chip display, Enter-to-add + Backspace-to-remove.

Controlled component — callers own the `value` array.

```typescript
function TagInput({
  value,
  onChange,
  placeholder,
  normalize = defaultNormalize,
  maxTags,
  className,
}: TagInputProps): JSX.Element
```

- `root0` — *
- `root0` — .value
- `root0` — .onChange
- `root0` — .placeholder
- `root0` — .normalize
- `root0` — .maxTags
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
