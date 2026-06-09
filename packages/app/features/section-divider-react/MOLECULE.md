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
npm install @molecule/app-section-divider-react
```

## API

### Functions

#### `SectionDivider(root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .children
- `root0` — .align
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
