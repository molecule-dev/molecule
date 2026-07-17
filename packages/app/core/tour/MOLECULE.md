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
npm install @molecule/app-tour @molecule/app-bond
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

  /**
   * Whether a backdrop overlay should be rendered for this tour.
   *
   * The provider tracks state only and draws nothing on screen — read this in
   * your render code to decide whether to paint the backdrop. Reflects the
   * resolved `overlay` value: the per-tour {@link TourOptions.overlay}, else
   * the provider's default, else `true`.
   *
   * @returns `true` if the consumer should render a backdrop overlay.
   */
  hasOverlay(): boolean

  /**
   * Whether navigation buttons (back / next / done) should be rendered.
   *
   * The provider draws no buttons itself — read this in your render code to
   * decide whether to paint the nav controls. Reflects the resolved
   * `showButtons` value: the per-tour {@link TourOptions.showButtons}, else the
   * provider's default, else `true`.
   *
   * @returns `true` if the consumer should render navigation buttons.
   */
  hasButtons(): boolean
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

  /**
   * Whether navigation buttons (back / next / done) should be rendered.
   * Defaults to `true`. Surfaced back to the consumer's render code via
   * {@link TourInstance.hasButtons}.
   */
  showButtons?: boolean

  /**
   * Whether a backdrop overlay should be rendered. Defaults to `true`.
   * Surfaced back to the consumer's render code via
   * {@link TourInstance.hasOverlay}.
   */
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

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0

### Runtime Dependencies

- `@molecule/app-bond`

- **The provider manages tour STATE — it does not draw the overlay.** The
  bundled bond tracks the active step and fires each step's `action` plus
  `onComplete`/`onCancel`; the highlight/tooltip UI is the consumer's to
  render from `getCurrentStep()` and the step's `target`/`title`/`content`.
  Don't expect `start()` alone to put anything on screen.
- **Read the `overlay`/`showButtons` intent back off the instance.** Because
  the provider draws nothing, `TourOptions.overlay`/`showButtons` are surfaced
  for the consumer via `hasOverlay()`/`hasButtons()` (resolved: per-tour
  option → provider default → `true`). Gate the backdrop and nav buttons your
  render code paints on those accessors rather than re-deriving the flags.
- The instance has NO change subscription — drive re-renders from the
  per-step `action` callbacks (or wrap `next`/`previous`), not by polling.
- `target` is a CSS selector: prefer stable `[data-mol-id="…"]` selectors
  over styling class names (class strings are ClassMap-bond-owned and
  swappable).
- Step `title`/`content` are UI text — source them via
  `t('key', values, { defaultValue })`, and style the rendered tour UI with
  `getClassMap()` from `@molecule/app-ui`.
- **Wire it with THIS package's `setProvider()` or `bond('tour', …)`.**
  `setProvider()` delegates into the shared `@molecule/app-bond` registry, so
  both write the same slot; {@link requireProvider} throws until one has run.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual onboarding flow, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip. The
provider only tracks state, so every checkpoint is about the overlay the app
RENDERS from `getCurrentStep()` — verify what's on screen, not just the calls:
- [ ] Starting the tour renders step 1's tooltip (its `title`/`content`)
  anchored to that step's `target` element, with the target highlighted /
  spotlighted. `start()` alone paints nothing — the per-step `action` is what
  draws the overlay, so confirm the anchored tooltip actually appears.
- [ ] `next` advances in order: the tooltip + highlight move to each step's
  `target` and the progress indicator updates (e.g. "2 of 5" — `getCurrentStep()`
  is zero-based, so it reads step+1 of `steps.length`). `previous` moves one
  step back. `next` on the LAST step does not wrap or auto-finish (the bond
  no-ops past the end), so a visible Done/Finish control must call `complete()`.
- [ ] Skip/close (`cancel()`) ends the tour immediately — the overlay and
  tooltip disappear, `isActive()` is false — and fires `onCancel`.
- [ ] Completing the last step fires `onComplete` and closes the tour (overlay
  and tooltip gone, `isActive()` false).
- [ ] Seen-once: a returning user who completed OR dismissed the tour is not
  shown it again after reload, while a fresh user is. The package has no
  built-in "seen" state — the app must persist a flag in `onComplete`/`onCancel`
  and gate `start()` on it; verify the persistence survives a reload.
- [ ] A step whose `target` selector matches no element is handled gracefully
  (the step is skipped or the tour ends) — it never crashes anchoring a tooltip
  to a null element (the bond keeps `target` as a plain string and never
  touches the DOM, so this guard lives in the app's render code).
- [ ] While the tour is active with `overlay` on (i.e. `hasOverlay()` is
  true), the backdrop blocks interaction outside the current step — clicks
  reach only the tour controls and the highlighted target; ending the tour
  restores normal interaction. A tour created with `overlay: false` reports
  `hasOverlay() === false` and your render code paints no backdrop. Likewise
  gate the nav buttons on `hasButtons()`.
