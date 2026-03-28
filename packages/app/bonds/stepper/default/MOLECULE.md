# @molecule/app-stepper-default

Default provider for @molecule/app-stepper.

Provides an in-memory stepper implementation with step navigation,
validation, and linear mode support.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-stepper-default
```

## Usage

```typescript
import { provider } from '@molecule/app-stepper-default'
import { setProvider } from '@molecule/app-stepper'

setProvider(provider)
```

## API

### Interfaces

#### `DefaultStepperConfig`

Provider-specific configuration options.

```typescript
interface DefaultStepperConfig {
  /** Default orientation. Defaults to `'horizontal'`. */
  orientation?: 'horizontal' | 'vertical'
}
```

### Functions

#### `createProvider(_config)`

Creates a default stepper provider.

```typescript
function createProvider(_config?: DefaultStepperConfig): StepperProvider
```

- `_config` — Optional provider configuration.

**Returns:** A configured StepperProvider.

### Constants

#### `provider`

Default stepper provider instance.

```typescript
const provider: StepperProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-stepper` ^1.0.0
