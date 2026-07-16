# @molecule/app-medication-row-react

Medication record row — drug name + dosage/form, instructions, prescriber,
days-of-supply and refills-remaining readouts, optional pill-color dot and
right-side actions.

Exports `<MedicationRow>`. Props: `name`, `dosage?`, `form?`, `color?` (any
CSS color — renders a 24px dot), `instructions?`, `prescriber?`,
`supplyDays?`, `refills?`, `actions?` (Mark taken / Refill / Edit buttons),
`className?`. Used in medication-reminder, patient-facing health portals,
pharmacy dashboards.

## Quick Start

```tsx
import { MedicationRow } from '@molecule/app-medication-row-react'

<MedicationRow
  name="Lisinopril"
  dosage="10mg"
  form="tablet"
  color="#4ade80"
  instructions="Take with water in the morning"
  prescriber="Dr. Sarah Chen"
  supplyDays={14}
  refills={2}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-medication-row-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `MedicationRowProps`

```typescript
interface MedicationRowProps {
  /** Drug name. */
  name: ReactNode
  /** Dosage display ("10mg", "1 tablet"). */
  dosage?: ReactNode
  /** Form (tablet, capsule, liquid, etc.). */
  form?: ReactNode
  /** Optional accent color (typically used to differentiate pill colors). */
  color?: string
  /** Instructions text ("Take with food"). */
  instructions?: ReactNode
  /** Prescriber display. */
  prescriber?: ReactNode
  /** Days of supply remaining. */
  supplyDays?: number
  /** Refills remaining. */
  refills?: number
  /** Right-side actions (Mark taken, Refill, Edit). */
  actions?: ReactNode
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `MedicationRow(props)`

Medication record row — drug name, dosage/form, instructions,
prescriber, supply countdown, refills remaining. Used in
medication-reminder, patient-facing health portals, pharmacy
dashboards.

```typescript
function MedicationRow({
  name,
  dosage,
  form,
  color,
  instructions,
  prescriber,
  supplyDays,
  refills,
  actions,
  className,
}: MedicationRowProps): JSX.Element
```

- `props` — Component props (see {@link MedicationRowProps}).

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

- The "Prescribed by" / "N day supply" / "N refills" labels route through
  `t()` under the `medication.` prefix. The companion
  `@molecule/app-locales-medication-row` bond currently ships only
  `medication.prescribedBy` — `medication.supplyDays` and
  `medication.refills` fall back to English until the bond gains them.
- Fields you pass are rendered as-is (ReactNode) — format dosage/dates and
  translate free text yourself.
- No `data-mol-id` prop. Renders inside `<Card>` from `@molecule/app-ui-react`;
  a ClassMap bond must be wired.

## Translations

Translation strings are provided by `@molecule/app-locales-medication-row`.
