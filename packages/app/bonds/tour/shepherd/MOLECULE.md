# @molecule/app-tour-shepherd

Shepherd.js provider for @molecule/app-tour.

Provides an in-memory tour implementation conforming to
the molecule tour provider interface.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-tour-shepherd
```

## Usage

```typescript
import { provider } from '@molecule/app-tour-shepherd'
import { setProvider } from '@molecule/app-tour'

setProvider(provider)
```

## API

### Interfaces

#### `ShepherdConfig`

Provider-specific configuration options.

```typescript
interface ShepherdConfig {
  /** Default overlay behavior. Defaults to `true`. */
  overlay?: boolean

  /** Default button visibility. Defaults to `true`. */
  showButtons?: boolean
}
```

### Functions

#### `createProvider(_config)`

Creates a Shepherd-based tour provider.

```typescript
function createProvider(_config?: ShepherdConfig): TourProvider
```

- `_config` — Optional provider configuration.

**Returns:** A configured TourProvider.

### Constants

#### `provider`

Default Shepherd tour provider instance.

```typescript
const provider: TourProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-tour` ^1.0.0
