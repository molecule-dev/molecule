# @molecule/app-date-range-picker

Date range picker core interface for molecule.dev.

Framework-agnostic contract for date-range selection **state** (start/end,
min/max clamps, presets, single-date mode). Bond a provider (e.g.
`@molecule/app-date-range-picker-default`) to supply the logic; your UI
renders the calendar/presets and feeds selections into the instance.

## Quick Start

```typescript
import { setProvider, requireProvider } from '@molecule/app-date-range-picker'
import { provider } from '@molecule/app-date-range-picker-default'

setProvider(provider)                    // once, at app startup (bonds.ts)

const picker = requireProvider().createPicker({
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-01-31'),
  presets: [{ label: t('dates.last30', undefined, { defaultValue: 'Last 30 days' }), range: last30 }],
  onChange: (range) => loadReport(range),
})
```

## Type
`core`

## Installation
```bash
npm install @molecule/app-date-range-picker @molecule/app-bond
```

## API

### Interfaces

#### `DatePreset`

A named preset date range for quick selection.

```typescript
interface DatePreset {
  /** Display label for the preset (e.g. "Last 7 days"). */
  label: string

  /** The date range this preset represents. */
  range: DateRange
}
```

#### `DateRange`

A date range with start and end dates.

```typescript
interface DateRange {
  /** Start date of the range. */
  startDate: Date

  /** End date of the range. */
  endDate: Date
}
```

#### `DateRangeInstance`

A live date range picker instance returned by the provider.

```typescript
interface DateRangeInstance {
  /**
   * Returns the currently selected date range.
   *
   * @returns The selected date range, or `null` if none selected.
   */
  getValue(): DateRange | null

  /**
   * Sets the selected date range programmatically.
   *
   * @param range - The date range to set.
   */
  setValue(range: DateRange): void

  /**
   * Clears the current selection.
   */
  clear(): void

  /**
   * Opens the picker UI.
   */
  open(): void

  /**
   * Closes the picker UI.
   */
  close(): void

  /**
   * Destroys the picker instance and cleans up resources.
   */
  destroy(): void
}
```

#### `DateRangeOptions`

Configuration options for creating a date range picker.

```typescript
interface DateRangeOptions {
  /** Initial start date. */
  startDate?: Date

  /** Initial end date. */
  endDate?: Date

  /** Minimum selectable date. */
  minDate?: Date

  /** Maximum selectable date. */
  maxDate?: Date

  /** Quick-select preset date ranges. */
  presets?: DatePreset[]

  /** Callback when the selected range changes. */
  onChange?: (range: DateRange) => void

  /**
   * Select a single date instead of a range. When `true`, one selection sets
   * both `startDate` and `endDate` to the same day. Defaults to `false`.
   */
  singleDate?: boolean
}
```

#### `DateRangePickerProvider`

Date range picker provider interface.

All date range picker providers must implement this interface
to create and manage date range selection UI.

```typescript
interface DateRangePickerProvider {
  /** Provider name identifier. */
  readonly name: string

  /**
   * Creates a new date range picker instance.
   *
   * @param options - Configuration for the picker.
   * @returns A picker instance for managing the selection.
   */
  createPicker(options: DateRangeOptions): DateRangeInstance
}
```

### Functions

#### `getProvider()`

Retrieves the bonded date range picker provider, or `null` if none is bonded.

```typescript
function getProvider(): DateRangePickerProvider | null
```

**Returns:** The active date range picker provider, or `null`.

#### `hasProvider()`

Checks whether a date range picker provider has been bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a date range picker provider is available.

#### `requireProvider()`

Retrieves the bonded date range picker provider, throwing if none is configured.

```typescript
function requireProvider(): DateRangePickerProvider
```

**Returns:** The active date range picker provider.

#### `setProvider(provider)`

Registers a date range picker provider as the active singleton.

```typescript
function setProvider(provider: DateRangePickerProvider): void
```

- `provider` — The date range picker provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Date Range Picker | `@molecule/app-date-range-picker-default` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0

### Runtime Dependencies

- `@molecule/app-bond`

- **The instance is headless — it renders no calendar.** Render your own
  calendar/preset UI (styled via `getClassMap()`/`cm.*`, all labels through
  `t('key', values, { defaultValue })`) and drive the instance; `onChange` fires
  with a `{ startDate, endDate }` range.
- **Wire with THIS package's `setProvider()` or `bond('date-range-picker', …)`** —
  `setProvider()` delegates into the shared `@molecule/app-bond` registry, so both
  write the same slot; `requireProvider()` throws until one has run.
- **There is no `locale` option** — the instance is a pure value store of
  `Date` objects and emits no formatted/labelled output, so a locale knob here
  would be inert. Format displayed dates in your rendering layer with the i18n
  layer (`formatDate` from `@molecule/app-i18n`), never `toLocaleDateString`
  with a hardcoded locale.
- Send API-bound dates as ISO strings; the server must re-validate the range
  (order, bounds) — client clamping via `minDate`/`maxDate` is UX, not a boundary.

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
