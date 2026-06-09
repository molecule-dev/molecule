# @molecule/app-search-autocomplete-react

Search input with typeahead suggestions.

Exports `<SearchAutocomplete>` and `SuggestionItem` type.

## Quick Start

```tsx
import { SearchAutocomplete } from '@molecule/app-search-autocomplete-react'

const [query, setQuery] = useState('')

<SearchAutocomplete
  value={query}
  onChange={setQuery}
  onSearch={async (q) => fetchUsers(q)}
  onSelect={(item) => navigate(`/users/${item.id}`)}
  placeholder="Search users…"
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-search-autocomplete-react
```

## API

### Interfaces

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

#### `SearchAutocomplete(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .value
- `root0` — .onChange
- `root0` — .onSearch
- `root0` — .suggestions
- `root0` — .onSelect
- `root0` — .placeholder
- `root0` — .debounceMs
- `root0` — .minChars
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
