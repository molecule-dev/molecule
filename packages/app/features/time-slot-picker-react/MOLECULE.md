# @molecule/app-time-slot-picker-react

Time-slot picker for delivery / appointment / reservation flows.

Exports `<TimeSlotPicker>` and the `TimeSlot` type.

## Quick Start

```tsx
import { useState } from 'react'

import { TimeSlotPicker } from '@molecule/app-time-slot-picker-react'

function DeliveryStep() {
  const [selectedSlot, setSelectedSlot] = useState<string | undefined>()
  const slots = [
    { id: 'am', label: '9:00–12:00', meta: '3 spots left' },
    { id: 'pm', label: '14:00–17:00', meta: 'Available' },
    { id: 'eve', label: '18:00–20:00', disabled: true, meta: 'Full' },
  ]
  return (
    <TimeSlotPicker
      slots={slots}
      selectedId={selectedSlot}
      onSelect={(slot) => setSelectedSlot(slot.id)}
      layout="grid"
      columns={3}
      title="Pick a delivery window"
    />
  )
}
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

#### `TimeSlotPickerProps`

Props for the {@link TimeSlotPicker} component.

```typescript
interface TimeSlotPickerProps {
  slots: TimeSlot[]
  /** Currently selected slot id. */
  selectedId?: string
  /** Called when an enabled slot is picked. */
  onSelect: (slot: TimeSlot) => void
  /** Layout — `'list'` stacks vertically (mobile), `'grid'` lays out in columns. */
  layout?: 'list' | 'grid'
  /** Grid column count (only for `layout='grid'`). */
  columns?: 2 | 3 | 4
  /** Optional title above the slots. */
  title?: ReactNode
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `TimeSlotPicker(props)`

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

- `props` — Component props (see {@link TimeSlotPickerProps}).

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

- Must render inside the app's i18n provider and with a ClassMap bond
  wired (`useTranslation()` / `getClassMap()` throw otherwise).
- The picker has NO date/timezone logic — `label`/`meta` are opaque
  strings. Format times in the user's locale AND timezone yourself
  before passing them; the component will happily display UTC labels
  to a local-time user.
- `layout="grid"` uses a FIXED column count (no breakpoint collapse) —
  choose `columns` for your narrowest supported viewport or switch to
  `layout="list"` on mobile.
- Selection is conveyed by `aria-checked` + bolder font only — add a
  selected surface via `className` logic in your wrapper if the state
  reads too subtle.
- Disabled slots are dimmed and non-clickable (`onSelect` never fires
  for them).

## Translations

Translation strings are provided by `@molecule/app-locales-time-slot-picker`.
