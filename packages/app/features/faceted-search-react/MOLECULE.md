# @molecule/app-faceted-search-react

`@molecule/app-faceted-search-react` — composable building blocks
for sticky faceted filter bars across property / catalog / report
pages.

- `<SegmentedControl>` — pill toggle group (Buy / Rent / All).
- `<FilterPill>` — outlined pill trigger + dropdown panel; children
  become the panel content.
- `<FacetedSearchBar>` — sticky horizontal container that wraps the
  row of primitives.

Generalised from the SearchFilterBar pattern in the property-listing
flagship and various per-app filter bars (Tickets, Tasks, Tags,
Notifications, etc.). Each filter pill owns its dropdown content so
consumers can drop in range sliders, checkbox lists, selects, etc.

## Quick Start

```tsx
import {
  FacetedSearchBar,
  SegmentedControl,
  FilterPill,
} from '@molecule/app-faceted-search-react'

<FacetedSearchBar>
  <SegmentedControl
    value={listingType}
    onChange={setListingType}
    options={[{ value: 'buy', label: 'Buy' }, { value: 'rent', label: 'Rent' }]}
  />
  <FilterPill label={priceLabel} active={!!filters.min_price}>
    <PriceRangePanel filters={filters} onChange={onFilterChange} />
  </FilterPill>
  <FilterPill leadingIcon="tune" label="Filters" hideChevron panelAlign="right">
    <MoreFiltersPanel ... />
  </FilterPill>
</FacetedSearchBar>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-faceted-search-react
```

## API

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
