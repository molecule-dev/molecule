/**
 * State for the panel dialog and its seeded search query.
 *
 * @module
 */

import { inject, Injectable, signal } from '@angular/core'

import { ChatComposer } from './chat-composer.slice.js'
import { ChatInnerState } from './chat-inner-state.js'
import type { ChatSetState } from './chat-popups.slice.js'
import { ChatSounds } from './chat-sounds.slice.js'

/** The overlay variants `/skills`, `/scripts`, `/settings` and `/test` open. */
export type PanelOverlayVariant = 'skills' | 'scripts' | 'settings' | 'tests'

/** The identifiers other slices and sections read from the `chat:overlay` slice. */
export interface ChatOverlaySlice {
  /** The open overlay variant, or `null`. */
  readonly panelOverlay: () => PanelOverlayVariant | null
  /** Opens / closes the overlay. */
  readonly setPanelOverlay: ChatSetState<PanelOverlayVariant | null>
  /** The overlay's search seed. */
  readonly panelOverlayQuery: () => string
  /** Opens one overlay variant (closing every sibling popup first). */
  readonly openPanelOverlay: (variant: PanelOverlayVariant, query?: string) => void
}

/** The panel dialog's state. */
@Injectable()
export class ChatOverlay implements ChatOverlaySlice {
  /** The shared state, read for the slices the opener and the listener touch. */
  private readonly state = inject(ChatInnerState)

  /** The open overlay variant, or `null`. */
  readonly panelOverlay = signal<PanelOverlayVariant | null>(null)

  /** The overlay's search seed. */
  readonly panelOverlayQuery = signal('')

  /** Opens / closes the overlay (value or updater). */
  readonly setPanelOverlay: ChatSetState<PanelOverlayVariant | null> = (next) => {
    this.panelOverlay.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /**
   * React's `openPanelOverlay`: closes any sibling popup so overlays never
   * stack, seeds the card's search, then opens the variant.
   *
   * @param variant - The overlay to open.
   * @param query - The search seed a trailing `/skills <query>` carries.
   */
  openPanelOverlay(variant: PanelOverlayVariant, query = ''): void {
    // Close any sibling popup so overlays never stack (matches how the model
    // picker / sounds picker each own this region exclusively).
    const composer = this.state.slice(ChatComposer)
    composer.setModelPicker(null)
    composer.setEffortPicker(null)
    this.state.slice(ChatSounds).setSoundsPicker(null)
    composer.setCommandMenu(null)
    this.panelOverlayQuery.set(query)
    this.setPanelOverlay(variant)
  }
}
