/**
 * React's two `chat:overlay` regions of ChatPanel.tsx (lines 1190–1201 and
 * 1727–1754): the closeable panel overlay above the composer (`/skills`,
 * `/scripts`, `/settings`, `/test`), the search seed a trailing query carries,
 * the one opener that closes every sibling popup first, and `#effect
 * chat:overlay:1` — the window `keydown` listener that closes the dialog on
 * Escape from anywhere inside it.
 *
 * The listener follows React's `[panelOverlay]` dependency: it is attached
 * while the overlay is open and removed when it closes or the panel is
 * destroyed, which is what React's effect cleanup does on the next run and on
 * unmount.
 *
 * @module
 */

import { DestroyRef, inject, Injectable, Injector, signal } from '@angular/core'

import { ChatComposer } from './chat-composer.slice.js'
import { ChatInnerState, registerChatEffect } from './chat-inner-state.js'
import type { ChatSetState } from './chat-popups.slice.js'
import { ChatSounds } from './chat-sounds.slice.js'

/** The overlay variants `/skills`, `/scripts`, `/settings` and `/test` open. */
export type PanelOverlayVariant = 'skills' | 'scripts' | 'settings' | 'tests'

/** The identifiers other slices and sections read from the `chat:overlay` slice. */
export interface ChatOverlaySlice {
  /** React's mount I/O for the region (the region has none). */
  mount(): void

  /** React's `#effect chat:overlay:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void }

  /** The open overlay variant, or `null`. */
  readonly panelOverlay: () => PanelOverlayVariant | null
  /** Opens / closes the overlay. */
  readonly setPanelOverlay: ChatSetState<PanelOverlayVariant | null>
  /** The overlay's search seed. */
  readonly panelOverlayQuery: () => string
  /** Opens one overlay variant (closing every sibling popup first). */
  readonly openPanelOverlay: (variant: PanelOverlayVariant, query?: string) => void
}

/** React's `chat:overlay` slice: the dialog's state and its Escape listener. */
@Injectable()
export class ChatOverlay implements ChatOverlaySlice {
  /** The shared state, read for the slices the opener and the listener touch. */
  private readonly state = inject(ChatInnerState)

  /** The element injector `registerChatEffect` registers the listener in. */
  private readonly injector = inject(Injector)

  /** The panel's destroy hook, which drops the listener React's cleanup removes. */
  private readonly destroyRef = inject(DestroyRef)

  /** The open overlay variant, or `null`. */
  readonly panelOverlay = signal<PanelOverlayVariant | null>(null)

  /** The overlay's search seed. */
  readonly panelOverlayQuery = signal('')

  /** Removes the listener the current run attached, when one is attached. */
  private removeKeyListener: (() => void) | null = null

  /** Drops the listener on destroy, as React's effect cleanup does on unmount. */
  constructor() {
    this.destroyRef.onDestroy(() => this.detachKeyListener())
  }

  /** React's mount I/O for the region: the listener is `#effect chat:overlay:1`. */
  mount(): void {
    // No mount I/O outside the effect: the listener attaches on the effect's
    // first run, which the registration below performs.
  }

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

  /**
   * React's effect ledger for this slice: `#effect chat:overlay:1` keeps one
   * window `keydown` listener attached while the overlay is open.
   */
  readonly effects = {
    1: (): void => {
      registerChatEffect(this.injector, () => {
        this.detachKeyListener()
        if (this.panelOverlay() === null) return
        const handler = (event: KeyboardEvent): void => {
          if (event.key === 'Escape') this.setPanelOverlay(null)
        }
        window.addEventListener('keydown', handler)
        this.removeKeyListener = (): void => window.removeEventListener('keydown', handler)
      })
    },
  }

  /** Removes the listener the current run attached, if any. */
  private detachKeyListener(): void {
    this.removeKeyListener?.()
    this.removeKeyListener = null
  }
}
