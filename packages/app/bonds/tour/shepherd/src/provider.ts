/**
 * Shepherd.js v15 tour provider implementation.
 *
 * Drives the real shepherd.js library: `createTour()` constructs a
 * `Shepherd.Tour`, maps each core {@link TourStep} onto a shepherd step
 * (`attachTo` from `target`/`placement`, `title`, `text` from `content`,
 * nav `buttons` gated on the resolved `showButtons` flag) and wires
 * `useModalOverlay` to the resolved `overlay` flag. `start`/`next`/`previous`/
 * `cancel`/`complete` delegate to the live tour instance, and the core's
 * step index / active state stay in sync with shepherd's `show`/`start`/
 * `complete`/`cancel` events. This is a real, rendering provider — not
 * headless state.
 *
 * @module
 */

import type {
  PopperPlacement,
  StepOptions,
  StepOptionsButton,
  Tour as ShepherdTour,
} from 'shepherd.js'
import Shepherd from 'shepherd.js'

import type { TourInstance, TourOptions, TourProvider, TourStep } from '@molecule/app-tour'

import type { ShepherdConfig } from './types.js'

/** English fallbacks for the nav-button labels when `ShepherdConfig.labels` omits one. */
const DEFAULT_LABELS = { back: 'Back', next: 'Next', done: 'Done' } as const

/**
 * Builds the nav buttons shepherd renders in a step's footer.
 *
 * `Back` appears on every step after the first, `Next` on every step before
 * the last, and `Done` on the last step. Each button drives the live tour
 * instance (`back()` / `next()` / `complete()`).
 *
 * @param tour - The live shepherd tour whose methods the buttons call.
 * @param index - Zero-based index of the step these buttons belong to.
 * @param total - Total number of steps in the tour.
 * @param labels - Resolved button labels (consumer-supplied, i18n'd, or the
 *   English defaults).
 * @returns The shepherd button descriptors for this step.
 */
function buildButtons(
  tour: ShepherdTour,
  index: number,
  total: number,
  labels: { back: string; next: string; done: string },
): StepOptionsButton[] {
  const buttons: StepOptionsButton[] = []

  if (index > 0) {
    buttons.push({ text: labels.back, secondary: true, action: () => tour.back() })
  }

  if (index < total - 1) {
    buttons.push({ text: labels.next, action: () => tour.next() })
  } else {
    buttons.push({ text: labels.done, action: () => tour.complete() })
  }

  return buttons
}

/**
 * Maps one core {@link TourStep} onto shepherd's {@link StepOptions}.
 *
 * `target` becomes `attachTo.element` (a CSS selector) and `placement` becomes
 * `attachTo.on` (defaulting to `'bottom'` so the tooltip anchors with an
 * arrow). `title` / `content` become shepherd's `title` / `text`. The step's
 * `action` fires from shepherd's per-step `when.show` hook, and `beforeShow`
 * maps to `beforeShowPromise` so shepherd awaits it before rendering.
 *
 * @param step - The core tour step to convert.
 * @param index - Zero-based index of the step (used for the shepherd id).
 * @param buttons - Pre-built nav buttons (empty when `showButtons` is false).
 * @returns Shepherd step options.
 */
function toStepOptions(step: TourStep, index: number, buttons: StepOptionsButton[]): StepOptions {
  const options: StepOptions = {
    id: `step-${index}`,
    title: step.title,
    text: step.content,
    attachTo: {
      element: step.target,
      on: (step.placement ?? 'bottom') as PopperPlacement,
    },
    buttons,
  }

  if (step.action) {
    // Fire the core step's `action` when shepherd shows the step. Arrow keeps
    // the core callback's own lexical `this`; shepherd binds `when` handlers to
    // the Step, which we intentionally do not use here.
    options.when = { show: () => step.action?.() }
  }

  if (step.beforeShow) {
    options.beforeShowPromise = () => step.beforeShow!()
  }

  return options
}

/**
 * Creates a Shepherd-based tour provider.
 *
 * @param config - Optional provider-level defaults for the resolved
 *   `overlay` / `showButtons` flags and the nav-button `labels`.
 * @returns A configured TourProvider.
 */
export function createProvider(config: ShepherdConfig = {}): TourProvider {
  return {
    name: 'shepherd',

    createTour(options: TourOptions): TourInstance {
      // Resolve the UI flags: per-tour option → provider-level default → `true`.
      // `overlay` feeds shepherd's `useModalOverlay`; `showButtons` gates whether
      // we build nav buttons at all.
      const overlay = options.overlay ?? config.overlay ?? true
      const showButtons = options.showButtons ?? config.showButtons ?? true
      const labels = {
        back: config.labels?.back ?? DEFAULT_LABELS.back,
        next: config.labels?.next ?? DEFAULT_LABELS.next,
        done: config.labels?.done ?? DEFAULT_LABELS.done,
      }

      // State the core contract exposes, kept in sync with shepherd's events.
      let active = false
      let currentStep = 0

      const tour = new Shepherd.Tour({
        useModalOverlay: overlay,
        defaultStepOptions: {
          scrollTo: true,
          cancelIcon: { enabled: true },
        },
      })

      const steps = options.steps
      const total = steps.length
      steps.forEach((step, index) => {
        const buttons = showButtons ? buildButtons(tour, index, total, labels) : []
        tour.addStep(toStepOptions(step, index, buttons))
      })

      // Keep the core's step index / active flag in lockstep with shepherd.
      tour.on('show', () => {
        const shown = tour.getCurrentStep()
        const index = shown ? tour.steps.indexOf(shown) : -1
        if (index >= 0) {
          currentStep = index
        }
      })
      tour.on('start', () => {
        active = true
        currentStep = 0
      })
      tour.on('complete', () => {
        active = false
        options.onComplete?.()
      })
      tour.on('cancel', () => {
        active = false
        options.onCancel?.()
      })

      return {
        start(): void {
          // Set state synchronously so `isActive()` is true immediately; the
          // async `start`/`show` events reconcile it as shepherd renders.
          active = true
          currentStep = 0
          void tour.start()
        },

        next(): void {
          // Honor the core contract's "no-op past the end" semantics: the last
          // step advances via the Done button / `complete()`, not `next()`. This
          // also stops a programmatic `next()` from silently auto-completing
          // (shepherd's own `next()` calls `complete()` at the end).
          if (!active || currentStep >= steps.length - 1) return
          tour.next()
        },

        previous(): void {
          if (!active) return
          tour.back()
        },

        cancel(): void {
          void tour.cancel()
        },

        complete(): void {
          tour.complete()
        },

        isActive(): boolean {
          return active
        },

        getCurrentStep(): number {
          return currentStep
        },

        hasOverlay(): boolean {
          return overlay
        },

        hasButtons(): boolean {
          return showButtons
        },
      }
    },
  }
}

/** Default Shepherd tour provider instance. */
export const provider: TourProvider = createProvider()
