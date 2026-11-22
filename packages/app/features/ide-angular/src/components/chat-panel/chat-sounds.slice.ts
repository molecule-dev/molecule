/**
 * React's three `chat:sounds` regions of ChatPanel.tsx (lines 1185–1188,
 * 1681–1704, 1881–1904): the `/sounds` picker's state, the per-device
 * notification-sound preference, and the mode cycle that persists it.
 *
 * Notification sounds are a per-device, per-user preference — `localStorage`,
 * never project settings (the old project-level value is read once as a
 * migration fallback by the `chat:models` hydrate). React reads the stored
 * preference in a state initializer (render time) and latches the "set on this
 * device" flag in its first effect; this slice reads the same key at
 * construction and latches the flag on the first run of `#effect
 * chat:sounds:1`, whose registration position is React's. `#effect
 * chat:sounds:2` mirrors every change into the stream handler's ref so the
 * streaming callback never reads a stale config.
 *
 * @module
 */

import { inject, Injectable, Injector, signal } from '@angular/core'

import {
  cycleSoundsConfig,
  DEFAULT_SOUNDS_CONFIG,
  parseSoundsConfig,
  type SoundEventType,
  SOUNDS_STORAGE_KEY,
  type SoundsConfig,
} from '@molecule/app-ide-panel-logic/panels'

import { ChatInnerState, registerChatEffect } from './chat-inner-state.js'
import type { ChatSetState } from './chat-popups.slice.js'
import { ChatStream } from './chat-stream.slice.js'

/**
 * Reads this device's stored sound preference, exactly as React's state
 * initializer does: the parsed value, or the defaults when storage is
 * unavailable or holds garbage.
 *
 * @returns The preference to start with.
 */
function readStoredSoundsConfig(): SoundsConfig {
  try {
    return parseSoundsConfig(localStorage.getItem(SOUNDS_STORAGE_KEY))
  } catch (_error) {
    // localStorage unavailable — fall through to the defaults.
  }
  return { ...DEFAULT_SOUNDS_CONFIG }
}

/** The `/sounds` picker's state. */
export interface SoundsPicker {
  /** The highlighted row. */
  selectedIdx: number
}

/** The identifiers other slices and sections read from the `chat:sounds` slice. */
export interface ChatSoundsSlice {
  /** React's mount I/O for the region (its I/O runs on the first effect run). */
  mount(): void

  /** React's `#effect chat:sounds:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void; 2: () => void }

  /** The notification-sound preference. */
  readonly soundsConfig: () => SoundsConfig
  /** Sets the preference. */
  readonly setSoundsConfig: ChatSetState<SoundsConfig>
  /** The open sounds picker, or `null`. */
  readonly soundsPicker: () => SoundsPicker | null
  /** Opens / closes the sounds picker. */
  readonly setSoundsPicker: ChatSetState<SoundsPicker | null>
  /** Whether the user set the preference here (so a server read must not override it). */
  readonly soundsLocallySetRef: { current: boolean }
  /** Cycles one event's mode (or every event's) and persists it. */
  readonly cycleSoundMode: (eventType: SoundEventType | 'all') => Promise<void>
}

/** React's `chat:sounds` slice: the picker state and the stored preference. */
@Injectable()
export class ChatSounds implements ChatSoundsSlice {
  /** The shared state, read for the stream handler's ref. */
  private readonly state = inject(ChatInnerState)

  /** The element injector `registerChatEffect` registers updates in. */
  private readonly injector = inject(Injector)

  /** The notification-sound preference (React's state initializer, read on construction). */
  readonly soundsConfig = signal<SoundsConfig>(readStoredSoundsConfig())

  /** The open sounds picker, or `null`. */
  readonly soundsPicker = signal<SoundsPicker | null>(null)

  /** Whether the user set the preference here (React's ref, initial `false`). */
  readonly soundsLocallySetRef: { current: boolean } = { current: false }

  /** React's mount I/O for the region: its work runs on the first effect run. */
  mount(): void {
    // `chat:sounds` has no mount I/O outside its effects: the stored value is
    // read at construction and the flags are latched by `effects.1`/`effects.2`.
  }

  /** Sets the preference (value or updater). */
  readonly setSoundsConfig: ChatSetState<SoundsConfig> = (next) => {
    this.soundsConfig.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** Opens / closes the sounds picker (value or updater). */
  readonly setSoundsPicker: ChatSetState<SoundsPicker | null> = (next) => {
    this.soundsPicker.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /**
   * Cycles one sound event's mode (or every event's) and persists the choice to
   * this device.
   *
   * @param eventType - The event to cycle, or `'all'`.
   * @returns A promise that settles once the choice is applied.
   */
  async cycleSoundMode(eventType: SoundEventType | 'all'): Promise<void> {
    const updated = cycleSoundsConfig(this.soundsConfig(), eventType)
    this.setSoundsConfig(updated)
    // Per-device preference — localStorage, never a project PATCH (see the
    // module note; this also makes /sounds fully usable for viewers).
    try {
      localStorage.setItem(SOUNDS_STORAGE_KEY, JSON.stringify(updated))
      this.soundsLocallySetRef.current = true
    } catch (_error) {
      // localStorage unavailable — the choice still applies for this session.
    }
  }

  /**
   * React's effect ledger for this slice: `#effect chat:sounds:1` latches the
   * device-set flag, `#effect chat:sounds:2` keeps the stream ref in step.
   */
  readonly effects = {
    1: (): void => {
      registerChatEffect(this.injector, () => {
        try {
          this.soundsLocallySetRef.current = localStorage.getItem(SOUNDS_STORAGE_KEY) != null
        } catch (_error) {
          // localStorage unavailable — treat as unset; the project fallback may apply.
        }
      })
    },
    2: (): void => {
      registerChatEffect(this.injector, () => {
        // Keep the stream handler's ref in sync so it always sees the latest
        // config (React's effect on `[soundsConfig]`, which also runs at mount).
        this.state.slice(ChatStream).soundsConfigRef.current = this.soundsConfig()
      })
    },
  }
}
