# @molecule/app-tour-shepherd

Shepherd.js v15 tour provider for `@molecule/app-tour`.

A real, rendering tour provider: `createTour()` builds a live
`Shepherd.Tour` from the core tour options and shepherd draws the actual
step tooltips, highlight, and modal overlay on screen. `start` / `next` /
`previous` / `cancel` / `complete` drive the shepherd instance, and the
core's active-state + step index stay in sync with shepherd's events. This
replaces the previous headless step-state machine — the package now depends
on and uses shepherd.js, as its name promises.

## Quick Start

```typescript
// REQUIRED — also `import 'shepherd.js/dist/css/shepherd.css'` in your app
// entry (see @remarks), or the tooltip/buttons/overlay render unstyled.
import { provider } from '@molecule/app-tour-shepherd'
import { setProvider, requireProvider } from '@molecule/app-tour'

setProvider(provider) // once, at startup (bonds.ts)

const tour = requireProvider().createTour({
  steps: [
    { target: '[data-mol-id="editor"]', title: 'Editor', content: 'Write code here' },
  ],
  onComplete: () => markTourSeen(),
})
tour.start() // shepherd renders the anchored tooltip + overlay
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-tour-shepherd @molecule/app-tour shepherd.js
```

## API

### Interfaces

#### `ShepherdConfig`

Provider-level defaults for the Shepherd tour provider.

`overlay` sets the default for shepherd's modal backdrop (`useModalOverlay`)
and the resolved `hasOverlay()` flag; `showButtons` sets whether nav buttons
are rendered and the resolved `hasButtons()` flag. A per-tour
`TourOptions.overlay` / `TourOptions.showButtons` overrides them; if neither
is set, both default to `true`. `labels` provides the nav-button text.

```typescript
interface ShepherdConfig {
  /**
   * Default for the modal backdrop / `hasOverlay()` when a tour does not set
   * `overlay`. Feeds shepherd's `useModalOverlay`. Defaults to `true`.
   */
  overlay?: boolean

  /**
   * Default for whether nav buttons render / `hasButtons()` when a tour does
   * not set `showButtons`. Defaults to `true`.
   */
  showButtons?: boolean

  /**
   * Labels for the rendered nav buttons. Supply translated strings; each
   * omitted label falls back to its English default.
   */
  labels?: ShepherdLabels
}
```

#### `ShepherdLabels`

Labels for the nav buttons shepherd renders in each step's footer.

shepherd.js draws real buttons, so the bond has to supply their text. These
are user-facing strings — pass them already translated, e.g.
`{ back: t('tour.back', {}, { defaultValue: 'Back' }), … }`. Any label left
unset falls back to its English default (`Back` / `Next` / `Done`).

```typescript
interface ShepherdLabels {
  /** Label for the "back" button (shown on every step after the first). Defaults to `Back`. */
  back?: string

  /** Label for the "next" button (shown on every step before the last). Defaults to `Next`. */
  next?: string

  /** Label for the "done" button (shown on the last step). Defaults to `Done`. */
  done?: string
}
```

### Functions

#### `createProvider(config)`

Creates a Shepherd-based tour provider.

```typescript
function createProvider(config?: ShepherdConfig): TourProvider
```

- `config` — Optional provider-level defaults for the resolved `overlay` / `showButtons` flags and the nav-button `labels`.

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
- `shepherd.js`

- **Import shepherd's stylesheet yourself** — this package does not:
  `import 'shepherd.js/dist/css/shepherd.css'` in your app entry. Without it
  the tooltip, buttons, arrow, and modal overlay render unstyled/invisible
  (same as quill/photoswipe's theme CSS).
- **Browser-only.** `start()` runs `new Shepherd.Tour(...).start()`, which
  needs a live DOM — start tours in a client-only effect, never during SSR.
- **Step mapping.** Each core `TourStep` maps to a
  shepherd step: `target` → `attachTo.element` (CSS selector), `placement` →
  `attachTo.on` (defaults to `'bottom'` so the tooltip anchors with an
  arrow), `title` → `title`, `content` → `text`, `action` → shepherd's
  per-step `when.show` hook, `beforeShow` → `beforeShowPromise`.
- **`overlay` → `useModalOverlay`.** The resolved `overlay` flag (per-tour
  `TourOptions.overlay` → provider default → `true`) becomes shepherd's
  `useModalOverlay`, so the darkened backdrop is rendered by shepherd itself
  and mirrored on `hasOverlay()`.
- **`showButtons` gates the nav buttons.** When the resolved `showButtons`
  flag is true, each step gets `Back` / `Next` (or `Done` on the last step)
  buttons that drive the tour; when false, no buttons are added.
  `hasButtons()` mirrors the flag.
- **Button labels are UI text.** shepherd renders the buttons, so the bond
  supplies their labels via `ShepherdConfig.labels` — pass translated strings
  (`createProvider({ labels: { next: t('tour.next', {}, { defaultValue: 'Next' }) } })`);
  omitted labels fall back to English `Back` / `Next` / `Done`. Step
  `title`/`content` are the consumer's to i18n via `t('key', v, { defaultValue })`.
- **`target`** is a CSS selector: prefer stable `[data-mol-id="…"]` selectors
  over styling class names (class strings are ClassMap-bond-owned and swappable).
- **Wire it** with `setProvider()` from `@molecule/app-tour` or
  `bond('tour', provider)` — both write the same registry slot.

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
