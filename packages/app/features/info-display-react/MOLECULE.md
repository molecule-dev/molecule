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
npm install @molecule/app-info-display-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `DefinitionField`

A single label/value pair rendered inside a DefinitionList.

```typescript
interface DefinitionField {
  /** Label text (usually `t('...')`). */
  label: ReactNode
  /** Rendered value. */
  value: ReactNode
  /** Optional icon rendered to the left of the label. */
  icon?: ReactNode
}
```

#### `DefinitionListProps`

```typescript
interface DefinitionListProps {
  /** Fields to render. */
  fields: DefinitionField[]
  /** Grid column count. */
  columns?: 1 | 2 | 3
  /** Extra classes. */
  className?: string
}
```

#### `InfoCardProps`

```typescript
interface InfoCardProps {
  /** Card heading. */
  title: ReactNode
  /** Optional leading icon. */
  icon?: ReactNode
  /** Optional right-side header actions (edit button, overflow menu). */
  actions?: ReactNode
  /** Structured fields to display. */
  fields: DefinitionField[]
  /** Grid column count — `1` stacks labels above values, `2+` puts labels beside values. */
  columns?: 1 | 2 | 3
  /** Extra classes on the outer Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
```

### Functions

#### `DefinitionList(props)`

Structured label/value pair list. Use standalone or inside
`<InfoCard>`. Apps pass already-formatted values (dates, currency,
status pills, etc.) as ReactNodes.

```typescript
function DefinitionList({
  fields,
  columns = 1,
  className,
}: DefinitionListProps): JSX.Element
```

- `props` — Component props (see {@link DefinitionListProps}).

#### `InfoCard(props)`

Card wrapping a `<DefinitionList>` of metadata fields.

Used all over CRM/helpdesk/finance detail pages (CompanyInfoCard,
DealInfoCard, TicketDetailsCard, TransactionDetailsCard) — same shape
everywhere, only the fields differ.

```typescript
function InfoCard({
  title,
  icon,
  actions,
  fields,
  columns = 1,
  className,
  dataMolId,
}: InfoCardProps): JSX.Element
```

- `props` — Component props (see {@link InfoCardProps}).

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

Purely presentational: pass already-formatted / already-translated
ReactNodes as labels and values. `getClassMap()` requires a bonded
ClassMap (e.g. `@molecule/app-ui-tailwind`) — there is no other wiring.
`columns={1}` stacks label above value; `2`/`3` arrange fields in a grid.
