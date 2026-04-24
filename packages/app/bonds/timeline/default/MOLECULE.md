# @molecule/app-timeline-default

Default provider for \@molecule/app-timeline.

Provides an in-memory timeline implementation with sorting
and item management.

## Quick Start

```typescript
import { provider } from '@molecule/app-timeline-default'
import { setProvider } from '@molecule/app-timeline'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-timeline-default
```

## API

### Interfaces

#### `DefaultTimelineConfig`

Provider-specific configuration options.

```typescript
interface DefaultTimelineConfig {
  /** Default orientation. Defaults to `'vertical'`. */
  orientation?: 'vertical' | 'horizontal'

  /** Whether to sort items by date. Defaults to `true`. */
  sortByDate?: boolean
}
```

### Functions

#### `createProvider(config)`

Creates a default timeline provider.

```typescript
function createProvider(config?: DefaultTimelineConfig): TimelineProvider
```

- `config` — Optional provider configuration.

**Returns:** A configured TimelineProvider.

### Constants

#### `provider`

Default timeline provider instance.

```typescript
const provider: TimelineProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-timeline` ^1.0.0
