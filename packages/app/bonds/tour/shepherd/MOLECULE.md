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
