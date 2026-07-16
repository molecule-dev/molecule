# @molecule/app-faceted-search-react

`@molecule/app-faceted-search-react` — composable building blocks
for pinned faceted filter bars across property / catalog / report
pages.

- `<SegmentedControl>` — pill toggle group (Buy / Rent / All).
- `<FilterPill>` — outlined pill trigger + dropdown panel; children
  become the panel content.
- `<FacetedSearchBar>` — fixed-position horizontal container that wraps
  the row of primitives.

Each filter pill owns its dropdown content so consumers can drop in
range sliders, checkbox lists, selects, etc.

## Quick Start

```tsx
import {
  FacetedSearchBar,
  SegmentedControl,
  FilterPill,
} from '@molecule/app-faceted-search-react'

// PriceRangePanel / MoreFiltersPanel are your own panel components.
<FacetedSearchBar topOffsetPx={64}>
  <SegmentedControl
    value={listingType}
    onChange={setListingType}
    options={[{ value: 'buy', label: 'Buy' }, { value: 'rent', label: 'Rent' }]}
  />
  <FilterPill label="Price" active={hasPriceFilter}>
    <PriceRangePanel filters={filters} onChange={onFilterChange} />
  </FilterPill>
  <FilterPill leadingIcon="tune" label="Filters" hideChevron panelAlign="right">
    <MoreFiltersPanel filters={filters} onChange={onFilterChange} />
  </FilterPill>
</FacetedSearchBar>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-faceted-search-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `FacetedSearchBarProps`

```typescript
interface FacetedSearchBarProps {
  children: ReactNode
  /** Sticky top offset (px). Defaults to 64 (i.e. below a 16-unit top nav). */
  topOffsetPx?: number
  className?: string
}
```

#### `FilterPillProps`

```typescript
interface FilterPillProps {
  label: ReactNode
  /** Highlight pill when a filter value is applied. */
  active?: boolean
  /** Pill body — typically the dropdown panel content. */
  children?: ReactNode
  /** Hide chevron (e.g. "More filters" pill uses a tune icon instead). */
  hideChevron?: boolean
  /** Leading icon (material-symbols name). */
  leadingIcon?: string
  /** Panel position relative to the trigger. */
  panelAlign?: 'left' | 'right'
  dataMolId?: string
}
```

#### `SegmentedControlProps`

```typescript
interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[]
  value: T
  onChange: (next: T) => void
  className?: string
}
```

### Functions

#### `FacetedSearchBar({
  children,
  topOffsetPx = 64,
  className,
})`

Sticky filter-bar container.

```typescript
function FacetedSearchBar({
  children,
  topOffsetPx = 64,
  className,
}: FacetedSearchBarProps): JSX.Element
```

#### `FilterPill({
  label,
  active,
  children,
  hideChevron,
  leadingIcon,
  panelAlign = 'left',
  dataMolId,
})`

Pill button + dropdown panel.

```typescript
function FilterPill({
  label,
  active,
  children,
  hideChevron,
  leadingIcon,
  panelAlign = 'left',
  dataMolId,
}: FilterPillProps): JSX.Element
```

#### `SegmentedControl({
  options,
  value,
  onChange,
  className,
})`

Pill segmented control.

```typescript
function SegmentedControl({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>): JSX.Element
```

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

- **The bar is `position: fixed`, not sticky.** It overlays the page at
  `top: topOffsetPx` and reserves NO layout space — add matching top
  padding to the content below it.
- **Styling prereqs:** these components emit Tailwind + Material-3 token
  class literals (`bg-surface-container-high`, `ring-primary`,
  `text-on-primary`, `border-outline-variant/20`, …). They only style
  correctly with a Tailwind-based ClassMap bond whose theme defines the
  M3 color tokens (the molecule scaffold default). On other ClassMap
  bonds the pills lose surfaces/rings but remain functional.
- **Icon font prereq:** `leadingIcon` and the chevron render
  `material-symbols-outlined` glyph names — without the Material Symbols
  font loaded they appear as raw text like "expand_more".
- The horizontal overflow uses a `hide-scrollbar` class that no package
  defines — define it in your app CSS (webkit-scrollbar none +
  scrollbar-width none) or scrollbars show; purely cosmetic.
- `FilterPill` closes on outside mousedown; it does not trap focus.
  Pill labels arrive via props — pass already-translated strings.
