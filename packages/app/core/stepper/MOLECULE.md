# @molecule/app-stepper

Stepper core interface for molecule.dev.

Provides a standardized API for multi-step wizard / stepper UI
components. Bond a provider (e.g. `@molecule/app-stepper-default`)
to supply the concrete implementation.

## Type
`core`

## Installation
```bash
npm install @molecule/app-stepper
```

## Usage

```typescript
import { requireProvider } from '@molecule/app-stepper'

const stepper = requireProvider().createStepper({
  steps: [
    { label: 'Account' },
    { label: 'Profile' },
    { label: 'Review' },
  ],
})
stepper.next()
```

## API

### Interfaces

#### `Step`

A single step in a stepper wizard.

```typescript
interface Step {
  /** Display label for the step. */
  label: string

  /** Optional description or help text. */
  description?: string

  /** Optional icon identifier. */
  icon?: string

  /** Whether this step can be skipped. Defaults to `false`. */
  optional?: boolean

  /** Error message to display on the step. */
  error?: string

  /** Whether this step has been completed. */
  completed?: boolean
}
```

#### `StepperInstance`

A live stepper instance returned by the provider.

```typescript
interface StepperInstance {
  /**
   * Advances to the next step.
   */
  next(): void

  /**
   * Goes back to the previous step.
   */
  previous(): void

  /**
   * Jumps to a specific step by index.
   *
   * @param step - Zero-based step index.
   */
  goTo(step: number): void

  /**
   * Returns the index of the currently active step.
   *
   * @returns Zero-based index of the active step.
   */
  getActiveStep(): number

  /**
   * Checks whether all steps have been completed.
   *
   * @returns `true` if every step is marked as completed.
   */
  isComplete(): boolean

  /**
   * Validates the current step.
   *
   * @returns `true` if the current step passes validation.
   */
  validate(): boolean

  /**
   * Destroys the stepper instance and cleans up resources.
   */
  destroy(): void
}
```

#### `StepperOptions`

Configuration options for creating a stepper.

```typescript
interface StepperOptions {
  /** Steps to display. */
  steps: Step[]

  /** Index of the initially active step. Defaults to `0`. */
  activeStep?: number

  /** Layout orientation. Defaults to `'horizontal'`. */
  orientation?: 'horizontal' | 'vertical'

  /** Callback when the active step changes. */
  onStepChange?: (step: number) => void

  /** Whether steps must be completed in order. Defaults to `false`. */
  linear?: boolean
}
```

#### `StepperProvider`

Stepper provider interface.

All stepper providers must implement this interface to create
and manage multi-step wizard UI.

```typescript
interface StepperProvider {
  /** Provider name identifier. */
  readonly name: string

  /**
   * Creates a new stepper instance.
   *
   * @param options - Configuration for the stepper.
   * @returns A stepper instance for managing navigation.
   */
  createStepper(options: StepperOptions): StepperInstance
}
```

### Functions

#### `getProvider()`

Retrieves the bonded stepper provider, or `null` if none is bonded.

```typescript
function getProvider(): StepperProvider | null
```

**Returns:** The active stepper provider, or `null`.

#### `hasProvider()`

Checks whether a stepper provider has been bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a stepper provider is available.

#### `requireProvider()`

Retrieves the bonded stepper provider, throwing if none is configured.

```typescript
function requireProvider(): StepperProvider
```

**Returns:** The active stepper provider.

#### `setProvider(provider)`

Registers a stepper provider as the active singleton.

```typescript
function setProvider(provider: StepperProvider): void
```

- `provider` — The stepper provider implementation to bond.
