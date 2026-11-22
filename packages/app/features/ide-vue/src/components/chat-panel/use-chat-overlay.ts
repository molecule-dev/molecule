/**
 * `chat:overlay` — the closeable panel overlay (`/skills`, `/scripts`,
 * `/settings`, `/test`), ported from React's two `chat:overlay` regions.
 *
 * The overlay is mutually exclusive with the model / effort / sounds pickers and
 * the command menu: opening it closes every sibling popup first, so only one
 * popup owns the region above the composer at a time. `panelOverlayQuery` seeds
 * the skills / scripts search from a `/skills <query>` invocation.
 *
 * @module
 */

import { onMounted, onUnmounted, type Ref, ref, watch } from 'vue'

import type { ChatCtx, ChatEffect, SetState } from './context.js'

/** The overlay variants `/skills`, `/scripts`, `/settings` and `/test` open. */
export type PanelOverlayVariant = 'skills' | 'scripts' | 'settings' | 'tests'

/** What the `chat:overlay` slice exposes. */
export interface ChatOverlaySlice {
  /** The open overlay variant, or `null`. */
  readonly panelOverlay: Ref<PanelOverlayVariant | null>
  /** Opens / closes the overlay. */
  readonly setPanelOverlay: SetState<PanelOverlayVariant | null>
  /** The overlay's search seed. */
  readonly panelOverlayQuery: Ref<string>
  /** Opens one overlay variant (closing every sibling popup first). */
  readonly openPanelOverlay: (variant: PanelOverlayVariant, query?: string) => void
  /** The region's effects, in React's order. */
  readonly effects: {
    /** `#effect chat:overlay:1`. */
    readonly 1: ChatEffect
  }
}

/**
 * Wraps a ref in React's `setState` shape: a value, or an updater of the
 * previous value.
 *
 * @param target - The ref the state lives in.
 * @returns The setter.
 */
function makeSetter<T>(target: Ref<T>): SetState<T> {
  return (value) => {
    target.value = typeof value === 'function' ? (value as (previous: T) => T)(target.value) : value
  }
}

/**
 * Builds the `chat:overlay` slice.
 *
 * @param ctx - The panel context (the sibling popups the overlay closes).
 * @returns The overlay slice.
 */
export function createChatOverlay(ctx: ChatCtx): ChatOverlaySlice {
  const panelOverlay = ref<PanelOverlayVariant | null>(null)
  const setPanelOverlay = makeSetter(panelOverlay)
  const panelOverlayQuery = ref('')

  /**
   * Opens one overlay variant, closing every sibling popup first so overlays
   * never stack (the model picker / sounds picker each own this region
   * exclusively).
   *
   * @param variant - The variant to open.
   * @param query - The search seed (from a `/skills <query>` invocation).
   */
  const openPanelOverlay = (variant: PanelOverlayVariant, query = ''): void => {
    ctx.composer.setModelPicker(null)
    ctx.composer.setEffortPicker(null)
    ctx.sounds.setSoundsPicker(null)
    ctx.composer.setCommandMenu(null)
    panelOverlayQuery.value = query
    setPanelOverlay(variant)
  }

  const effects: ChatOverlaySlice['effects'] = {
    1: () => {
      // Escape closes the overlay from anywhere inside it — including the
      // embedded card's own search input. A dialog is a WAI-ARIA widget, so
      // its key listener lives here rather than on a static element.
      let attached = false
      const handler = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') setPanelOverlay(null)
      }
      const sync = (value: PanelOverlayVariant | null): void => {
        if (value !== null && !attached) {
          window.addEventListener('keydown', handler)
          attached = true
        } else if (value === null && attached) {
          window.removeEventListener('keydown', handler)
          attached = false
        }
      }
      onMounted(() => {
        sync(panelOverlay.value)
      })
      watch(
        panelOverlay,
        (value) => {
          sync(value)
        },
        { flush: 'post' },
      )
      onUnmounted(() => {
        if (!attached) return
        window.removeEventListener('keydown', handler)
        attached = false
      })
    },
  }

  return {
    panelOverlay,
    setPanelOverlay,
    panelOverlayQuery,
    openPanelOverlay,
    effects,
  }
}
