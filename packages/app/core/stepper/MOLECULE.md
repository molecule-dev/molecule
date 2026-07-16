# @molecule/app-stepper

Stepper core interface for molecule.dev.

Provides a standardized API for multi-step wizard / stepper UI
components. Bond a provider (e.g. `@molecule/app-stepper-default`)
to supply the concrete implementation.

## Quick Start

```typescript
import { requireProvider, setProvider } from '@molecule/app-stepper'
import { provider } from '@molecule/app-stepper-default'

setProvider(provider) // once, at startup (bonds.ts)

const stepper = requireProvider().createStepper({
  steps: [{ label: 'Account' }, { label: 'Profile' }, { label: 'Review' }],
  onStepChange: (step) => rerender(step),
})
stepper.next()
```

## Type
`core`

## Installation
```bash
npm install @molecule/app-stepper
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

## Available Providers

| Provider | Package |
|----------|---------|
| Stepper | `@molecule/app-stepper-default` |

## Injection Notes

- **The instance is HEADLESS state, not UI.** `createStepper` returns a step
  state machine — nothing appears on screen. The app renders the step
  indicator and content itself, re-rendering from `onStepChange` /
  `getActiveStep()`; style via `getClassMap()` from `@molecule/app-ui` and
  run every label through `t('key', values, { defaultValue })`.
- **Wire the bond at startup** — {@link requireProvider} throws until
  `setProvider` has been called.
- Call `destroy()` when the owning screen unmounts.

## E2E Tests

Integration checklist — drive the real rendered wizard in the live preview
(no mocks), adapt each item to this app's actual steps/screens, and check
every box off one by one. A box you can't check is an integration bug to
fix — not a skip:
- [ ] The wizard renders every configured step, the active step is visually
  distinct (highlighted/current), and progress is shown (e.g. "Step 2 of 4"
  or a filled indicator) — the count/order on screen matches the `steps`
  config and `getActiveStep()`.
- [ ] NEXT advances one step (content + indicator update to the next step)
  and PREV/Back returns to the prior step; the first step offers no working
  Back and the last step shows a Finish/Submit action instead of Next.
- [ ] A step that gates on input blocks NEXT until it is valid/complete —
  leaving a required field empty keeps you on the step with a visible error
  and the incomplete step cannot be skipped past; a step marked `optional`,
  by contrast, CAN be advanced past without completing it.
- [ ] A `linear` stepper refuses to jump ahead — clicking an unreached
  future step in the indicator (or `goTo(futureIndex)`) does nothing and the
  active step stays put; you reach it only by completing the steps before
  it. A non-linear stepper lets you navigate directly to any step.
- [ ] Completing the final step fires the completion outcome (the form
  submits / a success screen appears) and `isComplete()` is true — the
  wizard doesn't advance past the end.
- [ ] Per-step data survives navigation: enter values on an early step, go
  forward, then Back — the earlier step's values are still there, not reset,
  and re-editing them and returning keeps the latest input.
