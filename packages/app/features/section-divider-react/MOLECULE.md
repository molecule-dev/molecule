# @molecule/app-section-divider-react

Horizontal divider with optional centered label.

Exports `<SectionDivider>`.

## Quick Start

```tsx
import { SectionDivider } from '@molecule/app-section-divider-react'

<SectionDivider>OR</SectionDivider>

<SectionDivider align="start">Today</SectionDivider>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-section-divider-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `SectionDividerProps`

Props accepted by the {@link SectionDivider} component.

```typescript
interface SectionDividerProps {
  /** Centered label text. */
  children?: ReactNode
  /** Where to align the label. Defaults to `'center'`. */
  align?: 'start' | 'center' | 'end'
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `SectionDivider(props)`

Horizontal divider with an optional centered label, common as
"OR" between auth options, "Today" between feed days, "—" between
sections.

```typescript
function SectionDivider({
  children,
  align = 'center',
  className,
}: SectionDividerProps): JSX.Element
```

- `props` — Component props (see {@link SectionDividerProps}).

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

- Requires a bonded ClassMap (`setClassMap()` at startup) — rendering
  throws otherwise. No i18n dependency (the label is your own ReactNode —
  translate it upstream).
- `align` positions the label: `'center'` (default) draws lines on both
  sides; `'start'` / `'end'` put the label at that edge with a single
  line filling the rest.
- Lines use `currentColor` at 20% opacity, so they inherit the local text
  color in both light and dark themes.
