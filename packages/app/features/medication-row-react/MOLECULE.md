# @molecule/app-medication-row-react

Medication record row.

Exports `<MedicationRow>`.

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
npm install @molecule/app-medication-row-react
```

## API

### Functions

#### `MedicationRow(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .name
- `root0` — .dosage
- `root0` — .form
- `root0` — .color
- `root0` — .instructions
- `root0` — .prescriber
- `root0` — .supplyDays
- `root0` — .refills
- `root0` — .actions
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
