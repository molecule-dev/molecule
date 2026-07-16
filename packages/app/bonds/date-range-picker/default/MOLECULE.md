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
