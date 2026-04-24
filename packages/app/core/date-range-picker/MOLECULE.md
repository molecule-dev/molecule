# @molecule/app-date-range-picker

Date range picker core interface for molecule.dev.

Provides a standardized API for date range selection UI components.
Bond a provider (e.g. `@molecule/app-date-range-picker-default`) to
supply the concrete implementation.

## Quick Start

```typescript
import { requireProvider } from '@molecule/app-date-range-picker'

const picker = requireProvider().createPicker({
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-01-31'),
  onChange: (range) => console.log(range),
})
```

## Type
`core`

## Installation
```bash
npm install @molecule/app-date-range-picker
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

  /** Locale string for date formatting (e.g. `'en-US'`). */
  locale?: string

  /** Whether to select a single date instead of a range. Defaults to `false`. */
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
