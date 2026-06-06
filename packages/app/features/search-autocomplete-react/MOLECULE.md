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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
