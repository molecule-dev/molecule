# @molecule/app-date-range-picker-default

Default provider for \@molecule/app-date-range-picker.

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
npm install @molecule/app-date-range-picker-default
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-date-range-picker` ^1.0.0
