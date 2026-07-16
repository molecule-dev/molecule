# @molecule/app-tour

Tour core interface for molecule.dev.

Provides a standardized API for onboarding walkthrough and guided
tour UI components. Bond a provider (e.g. `@molecule/app-tour-shepherd`)
to supply the concrete implementation.

## Quick Start

```typescript
import { requireProvider, setProvider } from '@molecule/app-tour'
import { provider } from '@molecule/app-tour-shepherd'

setProvider(provider) // once, at startup (bonds.ts)

const tour = requireProvider().createTour({
  steps: [
    { target: '[data-mol-id="editor"]', title: 'Editor', content: 'Write code here',
      action: () => renderTourStep(tour.getCurrentStep()) },
  ],
  onComplete: () => markTourSeen(),
})
tour.start()
```

## Type
`core`

## Installation
```bash
npm install @molecule/app-tour
```

## API

### Interfaces

#### `TourInstance`

A live tour instance returned by the provider.

```typescript
interface TourInstance {
  /**
   * Starts the tour from the beginning.
   */
  start(): void

  /**
   * Advances to the next step.
   */
  next(): void

  /**
   * Goes back to the previous step.
   */
  previous(): void

  /**
   * Cancels the tour without completing it.
   */
  cancel(): void

  /**
   * Marks the tour as complete and triggers the onComplete callback.
   */
  complete(): void

  /**
   * Checks whether the tour is currently running.
   *
   * @returns `true` if the tour is active.
   */
  isActive(): boolean

  /**
   * Returns the index of the current step.
   *
   * @returns Zero-based index of the current step.
   */
  getCurrentStep(): number
}
```

#### `TourOptions`

Configuration options for creating a tour.

```typescript
interface TourOptions {
  /** Steps to display in the tour. */
  steps: TourStep[]

  /** Callback when the tour is completed. */
  onComplete?: () => void

  /** Callback when the tour is cancelled. */
  onCancel?: () => void

  /** Whether to show a progress indicator. Defaults to `true`. */
  showProgress?: boolean

  /** Whether to show navigation buttons. Defaults to `true`. */
  showButtons?: boolean

  /** Whether to display a backdrop overlay. Defaults to `true`. */
  overlay?: boolean
}
```

#### `TourProvider`

Tour provider interface.

All tour providers must implement this interface to create
and manage onboarding walkthrough / guided tour UI.

```typescript
interface TourProvider {
  /** Provider name identifier. */
  readonly name: string

  /**
   * Creates a new tour instance.
   *
   * @param options - Configuration for the tour.
   * @returns A tour instance for controlling the walkthrough.
   */
  createTour(options: TourOptions): TourInstance
}
```

#### `TourStep`

A single step in a guided tour.

```typescript
interface TourStep {
  /** CSS selector for the target element to highlight. */
  target: string

  /** Title of the tour step. */
  title: string

  /** Content/description body for the step. */
  content: string

  /** Preferred placement of the tooltip relative to the target. */
  placement?: 'top' | 'bottom' | 'left' | 'right'

  /** Action to perform when the step is shown. */
  action?: () => void

  /** Async function that runs before the step is displayed. */
  beforeShow?: () => Promise<void>
}
```

### Functions

#### `getProvider()`

Retrieves the bonded tour provider, or `null` if none is bonded.

```typescript
function getProvider(): TourProvider | null
```

**Returns:** The active tour provider, or `null`.

#### `hasProvider()`

Checks whether a tour provider has been bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a tour provider is available.

#### `requireProvider()`

Retrieves the bonded tour provider, throwing if none is configured.

```typescript
function requireProvider(): TourProvider
```

**Returns:** The active tour provider.

#### `setProvider(provider)`

Registers a tour provider as the active singleton.

```typescript
function setProvider(provider: TourProvider): void
```

- `provider` — The tour provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Tour | `@molecule/app-tour-shepherd` |

## Injection Notes

- **The provider manages tour STATE — it does not draw the overlay.** The
  bundled bond tracks the active step and fires each step's `action` plus
  `onComplete`/`onCancel`; the highlight/tooltip UI is the consumer's to
  render from `getCurrentStep()` and the step's `target`/`title`/`content`.
  Don't expect `start()` alone to put anything on screen.
- The instance has NO change subscription — drive re-renders from the
  per-step `action` callbacks (or wrap `next`/`previous`), not by polling.
- `target` is a CSS selector: prefer stable `[data-mol-id="…"]` selectors
  over styling class names (class strings are ClassMap-bond-owned and
  swappable).
- Step `title`/`content` are UI text — source them via
  `t('key', values, { defaultValue })`, and style the rendered tour UI with
  `getClassMap()` from `@molecule/app-ui`.
- **Wire the bond at startup** — {@link requireProvider} throws until
  `setProvider` has been called.
