# @molecule/app-tour-shepherd

Headless tour provider for `@molecule/app-tour` — Shepherd-STYLE step
sequencing without the shepherd.js library.

IMPORTANT: this bond renders NO tour UI — no overlay, tooltip, highlight,
or buttons appear on screen, and it does not depend on or use shepherd.js.
It is an in-memory step-state machine: it tracks the active step and fires
each step's `action` plus `onComplete`/`onCancel`. Render the tooltip /
highlight UI yourself from `getCurrentStep()` and the step's
`target`/`title`/`content` — style it via `getClassMap()` from
`@molecule/app-ui` and run step text through
`t('key', values, { defaultValue })`.

## Quick Start

```typescript
import { provider } from '@molecule/app-tour-shepherd'
import { setProvider, requireProvider } from '@molecule/app-tour'

setProvider(provider) // once, at startup (bonds.ts)

const tour = requireProvider().createTour({
  steps: [
    { target: '[data-mol-id="editor"]', title: 'Editor', content: 'Write code here',
      action: () => renderTourStep(tour.getCurrentStep()) },
  ],
  onComplete: () => markTourSeen(),
})
tour.start() // fires step 0's action — YOUR action callback draws the UI
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-tour-shepherd @molecule/app-tour
```

## API

### Interfaces

#### `ShepherdConfig`

Provider-specific configuration options.

Reserved — the current implementation consumes NO configuration; these
fields have no effect (there is no built-in overlay or button UI to
configure — see the module notes).

```typescript
interface ShepherdConfig {
  /** Reserved. Not consumed — this provider draws no overlay. */
  overlay?: boolean

  /** Reserved. Not consumed — this provider draws no buttons. */
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

## Core Interface
Implements `@molecule/app-tour` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-tour'
import { provider } from '@molecule/app-tour-shepherd'

export function setupTourShepherd(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-tour` ^1.0.0

### Runtime Dependencies

- `@molecule/app-tour`

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
- [ ] While the tour is active with `overlay` on, the backdrop blocks
  interaction outside the current step — clicks reach only the tour controls
  and the highlighted target; ending the tour restores normal interaction.
