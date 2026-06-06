# @molecule/app-info-display-react

React InfoCard and DefinitionList for structured label/value metadata.

Exports:
- `<InfoCard>` — Card-wrapped DefinitionList with title, icon, actions.
- `<DefinitionList>` — standalone label/value grid.
- `DefinitionField` type.

## Quick Start

```tsx
import { InfoCard, DefinitionList } from '@molecule/app-info-display-react'

<InfoCard
  title="Company Details"
  fields={[
    { label: 'Industry', value: 'Technology' },
    { label: 'Founded', value: '2018' },
    { label: 'Employees', value: '120–150' },
  ]}
  columns={2}
  dataMolId="company-info-card"
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-info-display-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
