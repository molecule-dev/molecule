# @molecule/app-date-range-picker-default

Default provider for `@molecule/app-date-range-picker`.

Provides an in-memory date range picker implementation conforming to
the molecule date range picker provider interface.

## Quick Start

```typescript
import { provider } from '@molecule/app-date-range-picker-default'
import { setProvider } from '@molecule/app-date-range-picker'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-date-range-picker-default @molecule/app-date-range-picker
```

## API

### Interfaces

#### `DefaultDateRangeConfig`

Provider-specific configuration options.

```typescript
interface DefaultDateRangeConfig {
  /** Default locale for date formatting. Defaults to `'en-US'`. */
  locale?: string
}
```

### Functions

#### `createProvider(_config)`

Creates a default date range picker provider.

```typescript
function createProvider(_config?: DefaultDateRangeConfig): DateRangePickerProvider
```

- `_config` — Optional provider configuration.

**Returns:** A configured DateRangePickerProvider.

### Constants

#### `provider`

Default date range picker provider instance.

```typescript
const provider: DateRangePickerProvider
```

## Core Interface
Implements `@molecule/app-date-range-picker` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-date-range-picker'
import { provider } from '@molecule/app-date-range-picker-default'

export function setupDateRangePickerDefault(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-date-range-picker` ^1.0.0

### Runtime Dependencies

- `@molecule/app-date-range-picker`

This default instance is a plain range store: it does NOT validate or
clamp — `minDate`/`maxDate` are carried for YOUR UI to enforce, inverted
ranges (start after end) are stored as-is, and `singleDate` mode is not
implemented. `clear()` resets the value WITHOUT firing `onChange` (only
`setValue()` notifies) — trigger your own refresh after clearing. The
`createProvider({ locale })` config knob is currently ignored; format
dates with `@molecule/app-i18n` in your rendering layer.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual calendar/preset UI and whatever the selected
range filters, and check every box off one by one. A box you can't check is
an integration bug to fix — not a skip:
- [ ] Selecting a start date then an end date produces a valid range with
  `startDate <= endDate`, that exact range shows in the input/display, and it
  fires once via `onChange` with a `{ startDate, endDate }` payload.
- [ ] Picking an end earlier than the start never yields an inverted range —
  the UI either swaps them (start stays <= end) or blocks the pick; confirm by
  reading both the displayed range and the `onChange` payload.
- [ ] Each exposed preset sets the correct range: a "Last 7 days" preset
  selects today-minus-6 through today (inclusive), and the calendar + display
  reflect that span.
- [ ] `minDate`/`maxDate` bounds hold in the UI — a date outside the allowed
  window can't be picked (it renders out-of-range/greyed), and any disabled
  dates are non-selectable.
- [ ] If the app uses single-date mode (`singleDate: true`), picking one day
  sets `startDate` and `endDate` to that same day and `onChange` fires with a
  same-day range — no second click required.
- [ ] The selected range drives its consumer: the filtered list/report/chart
  that reads the range re-queries and shows only rows within it — change the
  range and the results change with it.
- [ ] Clearing resets the selection — the display empties, `getValue()` returns
  `null`, and the dependent view returns to its unfiltered/default state.
