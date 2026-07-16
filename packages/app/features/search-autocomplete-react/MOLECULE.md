# @molecule/app-search-autocomplete-react

Search input with a typeahead suggestion popover.

Exports `<SearchAutocomplete>` and the `SuggestionItem<T>` type
(`{ id, label, meta?, data? }`). Two data modes — pass ONE of:
`onSearch(query)` (async fetch, debounced; default 200 ms) or
`suggestions` (caller-controlled list). Other props: `value` / `onChange`
(controlled input), `onSelect(item)`, `placeholder?` (defaults to the
translated `search.placeholder`), `debounceMs?`, `minChars?` (default 1),
`className?`.

## Quick Start

```tsx
import { useState } from 'react'

import { SearchAutocomplete } from '@molecule/app-search-autocomplete-react'
import type { SuggestionItem } from '@molecule/app-search-autocomplete-react'

function UserSearch({ fetchUsers, onPick }: {
  fetchUsers: (q: string) => Promise<SuggestionItem<{ id: string }>[]>
  onPick: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  return (
    <SearchAutocomplete
      value={query}
      onChange={setQuery}
      onSearch={fetchUsers}
      onSelect={(item) => (item.data ? onPick(item.data.id) : undefined)}
      placeholder="Search users…"
    />
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-search-autocomplete-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `SearchAutocompleteProps`

Props accepted by the {@link SearchAutocomplete} component.

```typescript
interface SearchAutocompleteProps<T = unknown> {
  /** Current input value. */
  value: string
  /** Called whenever the input changes. */
  onChange: (value: string) => void
  /** Async search function — receives the query, returns suggestions. */
  onSearch?: (query: string) => Promise<SuggestionItem<T>[]> | SuggestionItem<T>[]
  /** Optional pre-computed suggestion list (when caller controls fetching). */
  suggestions?: SuggestionItem<T>[]
  /** Called when the user picks a suggestion. */
  onSelect: (item: SuggestionItem<T>) => void
  /** Placeholder. */
  placeholder?: string
  /** Debounce ms for `onSearch`. Defaults to 200. */
  debounceMs?: number
  /** Min chars before suggestions appear. Defaults to 1. */
  minChars?: number
  /** Extra classes on the wrapper. */
  className?: string
}
```

#### `SuggestionItem`

A single suggestion entry returned by `onSearch` or passed via `suggestions`.

```typescript
interface SuggestionItem<T = unknown> {
  id: string
  label: ReactNode
  /** Optional secondary line / category. */
  meta?: ReactNode
  /** Original payload for the selection callback. */
  data?: T
}
```

### Functions

#### `SearchAutocomplete(props)`

Search input with a typeahead suggestions popover. Pass either
`onSearch` (async fetch with debounce) or `suggestions` (controlled).

```typescript
function SearchAutocomplete({
  value,
  onChange,
  onSearch,
  suggestions: controlledSuggestions,
  onSelect,
  placeholder,
  debounceMs = 200,
  minChars = 1,
  className,
}: SearchAutocompleteProps<T>): JSX.Element
```

- `props` — Component props (see {@link SearchAutocompleteProps}).

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

- Throws unless rendered inside `<I18nProvider>` (from
  `@molecule/app-react`) with a bonded ClassMap.
- Suggestion selection is MOUSE-ONLY: no arrow-key/Enter navigation is
  implemented. Add your own key handling when keyboard support matters.
- Rapid typing can apply an out-of-order `onSearch` result (no request
  cancellation) — keep `onSearch` fast or raise `debounceMs`.
- The popover surface uses `var(--color-surface)` with a WHITE fallback
  and black-alpha borders — define `--color-surface` (dark themes) or the
  dropdown stays light.
- Default placeholder translations: `@molecule/app-locales-search-autocomplete`.

## Translations

Translation strings are provided by `@molecule/app-locales-search-autocomplete`.
