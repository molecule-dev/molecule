# @molecule/app-tag-input-react

React tag-token input and tag-chip display.

Exports:
- `<TagChip>` — standalone labeled chip with optional remove button.
- `<TagInput>` — controlled tokenizer: Enter, comma, or Tab adds the
  draft; blur commits a non-empty draft; Backspace on an empty field
  removes the last token.

## Quick Start

```tsx
import { useState } from 'react'

import { TagChip, TagInput } from '@molecule/app-tag-input-react'

function TagEditor() {
  const [tags, setTags] = useState<string[]>(['react'])
  return (
    <>
      <TagInput value={tags} onChange={setTags} placeholder="Add a tag…" maxTags={10} />
      <TagChip onRemove={() => setTags(tags.filter((t) => t !== 'react'))}>react</TagChip>
    </>
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-tag-input-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `TagChipProps`

Props for the {@link TagChip} component.

```typescript
interface TagChipProps {
  /** Visible tag text. */
  children: ReactNode
  /** Optional remove callback — renders an `×` button when provided. */
  onRemove?: () => void
  /** Optional click callback for the chip body. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}
```

#### `TagInputProps`

Props for the {@link TagInput} component.

```typescript
interface TagInputProps {
  /** Controlled list of tag values. */
  value: string[]
  /** Called whenever the tag list changes. */
  onChange: (next: string[]) => void
  /** Placeholder shown in the text input when no tokens exist yet. */
  placeholder?: string
  /**
   * Validate/transform an input before adding. Return `null` to reject.
   * Default trims whitespace and rejects empty + duplicate entries.
   */
  normalize?: (raw: string, current: string[]) => string | null
  /** Max tags allowed. When reached, further input is ignored. */
  maxTags?: number
  /** Extra classes on the outer wrapper. */
  className?: string
}
```

### Functions

#### `TagChip(props)`

Small labeled chip with an optional close button. Used inside
`<TagInput>` but also usable standalone as a label display element.

```typescript
function TagChip({ children, onRemove, onClick, className }: TagChipProps): JSX.Element
```

- `props` — Component props (see {@link TagChipProps}).

#### `TagInput(props)`

Tokenized tag-input with chip display. Commits the draft on Enter,
comma, or Tab AND on blur (clicking away with a non-empty draft adds
a tag); Backspace on an empty field removes the last token.

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

- `props` — Component props (see {@link TagInputProps}).

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

- Must render inside the app's i18n provider and with a ClassMap bond
  wired (`useTranslation()` / `getClassMap()` throw otherwise).
- Committing happens on Enter/comma/Tab AND on blur — clicking away
  with a non-empty draft adds a tag; keep that in mind in forms.
- Default `normalize` trims whitespace and rejects empties +
  duplicates; pass your own to lowercase, validate, or map values
  (return `null` to reject).
- When `maxTags` is reached further input is silently discarded (the
  draft clears, no error UI).
- `<TagChip>` ships no background surface of its own — add one via
  `className` if bare text chips are too subtle in your theme.

## Translations

Translation strings are provided by `@molecule/app-locales-tag-input`.
