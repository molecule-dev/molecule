# @molecule/app-time-slot-picker-react

Time-slot picker for delivery / appointment / reservation flows.

Exports `<TimeSlotPicker>` and `TimeSlot` type.

## Quick Start

```tsx
import { TimeSlotPicker } from '@molecule/app-time-slot-picker-react'

const slots = [
  { id: 'am', label: '9:00–12:00', meta: '3 spots left' },
  { id: 'pm', label: '14:00–17:00', meta: 'Available' },
  { id: 'eve', label: '18:00–20:00', disabled: true, meta: 'Full' },
]

<TimeSlotPicker
  slots={slots}
  selectedId={selectedSlot}
  onSelect={(slot) => setSelectedSlot(slot.id)}
  layout="grid"
  title="Pick a delivery window"
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-time-slot-picker-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `TimeSlot`

Represents a single selectable time slot with an optional meta line and disabled state.

```typescript
interface TimeSlot {
  id: string
  /** Display label — `'14:00–16:00'`, `'Morning (9–12)'`, etc. */
  label: ReactNode
  /** Optional secondary line — date, fee, capacity. */
  meta?: ReactNode
  /** When true, slot is disabled (full / past / unavailable). */
  disabled?: boolean
}
```

### Functions

#### `TimeSlotPicker(root0, root0, root0, root0, root0, root0, root0, root0)`

Picker for delivery / appointment / reservation time slots. Each slot
shows a label + optional secondary meta (date, fee, remaining
capacity). Disabled slots are dimmed and not clickable.

```typescript
function TimeSlotPicker({
  slots,
  selectedId,
  onSelect,
  layout = 'list',
  columns = 2,
  title,
  className,
}: TimeSlotPickerProps): JSX.Element
```

- `root0` — *
- `root0` — .slots
- `root0` — .selectedId
- `root0` — .onSelect
- `root0` — .layout
- `root0` — .columns
- `root0` — .title
- `root0` — .className

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
