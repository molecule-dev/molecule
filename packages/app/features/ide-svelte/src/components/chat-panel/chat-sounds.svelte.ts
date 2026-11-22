/**
 * React's three `chat:sounds` regions of ChatPanel.tsx (lines 1184–1187,
 * 1680–1703, 1880–1903): the `/sounds` picker's row cursor, the per-device
 * sound modes, the mount latch that records whether this device already holds
 * a preference, the stream handler's config ref, and the action that cycles one
 * event's mode and persists it to this device.
 *
 * Sounds are a per-device preference kept in localStorage — mounting reads the
 * key twice (React's state initializer and its mount effect), exactly as the
 * two regions do.
 *
 * @module
 */

import {
  cycleSoundsConfig,
  DEFAULT_SOUNDS_CONFIG,
  parseSoundsConfig,
  type SoundEventType,
  SOUNDS_STORAGE_KEY,
  type SoundsConfig,
} from '@molecule/app-ide-panel-logic/panels'

import type { ChatSetState } from './chat-popups.svelte.js'
import type { ChatContext, MutableRef } from './context.svelte.js'

/** The `/sounds` picker's row cursor. */
export interface SoundsPicker {
  /** The highlighted row's index. */
  selectedIdx: number
}

/** The identifiers other slices and sections read from the `chat:sounds` slice. */
export interface ChatSoundsSlice {
  /** The sounds picker, or null when closed. */
  readonly soundsPicker: SoundsPicker | null
  /** Opens, moves or closes the sounds picker. */
  readonly setSoundsPicker: ChatSetState<SoundsPicker | null>
  /** The per-event sound modes. */
  readonly soundsConfig: SoundsConfig
  /** Replaces the sound modes. */
  readonly setSoundsConfig: ChatSetState<SoundsConfig>
  /** Whether the user changed the modes here (never overwritten by a hydrate). */
  readonly soundsLocallySetRef: MutableRef<boolean>
  /** Cycles one event's (or every event's) mode and persists it. */
  readonly cycleSoundMode: (eventType: SoundEventType | 'all') => Promise<void>

  /** React's mount I/O for the region: the storage latch (effect 1). */
  mount(): void

  /** React's `#effect chat:sounds:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void; 2: () => void }
}

/**
 * Resolves React's `SetStateAction<T>` argument against the latest value.
 *
 * @param previous - The latest value.
 * @param value - The React setter argument: a value or an updater.
 * @returns The next value.
 */
function resolveState<T>(previous: T, value: T | ((previous: T) => T)): T {
  return typeof value === 'function' ? (value as (previous: T) => T)(previous) : value
}

/**
 * Reads this device's stored sound modes, or the defaults when the key is
 * absent or storage is unavailable (React's state initializer).
 *
 * @returns The per-event sound modes to start with.
 */
function readSoundsConfig(): SoundsConfig {
  try {
    return parseSoundsConfig(localStorage.getItem(SOUNDS_STORAGE_KEY))
  } catch (_error) {
    // localStorage unavailable — fall through to the defaults.
  }
  return { ...DEFAULT_SOUNDS_CONFIG }
}

/**
 * Creates the `chat:sounds` slice.
 *
 * @param ctx - The shared chat context.
 * @returns The picker state, the device modes and the three effects.
 */
export function createChatSounds(ctx: ChatContext): ChatSoundsSlice {
  let soundsPicker = $state.raw<SoundsPicker | null>(null)
  let soundsConfig = $state.raw<SoundsConfig>(readSoundsConfig())
  /** React's `soundsLocallySetRef` — a local change is never overwritten. */
  const soundsLocallySetRef: MutableRef<boolean> = { current: false }

  /**
   * React's `setSoundsConfig`.
   *
   * @param value - The next modes, or an updater of the latest ones.
   */
  const setSoundsConfig = (
    value: SoundsConfig | ((previous: SoundsConfig) => SoundsConfig),
  ): void => {
    soundsConfig = resolveState(soundsConfig, value)
  }

  return {
    get soundsPicker(): SoundsPicker | null {
      return soundsPicker
    },
    setSoundsPicker(
      value: SoundsPicker | null | ((previous: SoundsPicker | null) => SoundsPicker | null),
    ): void {
      soundsPicker = resolveState(soundsPicker, value)
    },
    get soundsConfig(): SoundsConfig {
      return soundsConfig
    },
    setSoundsConfig,
    soundsLocallySetRef,
    async cycleSoundMode(eventType: SoundEventType | 'all'): Promise<void> {
      const updated = cycleSoundsConfig(soundsConfig, eventType)
      setSoundsConfig(updated)
      // Per-device preference — localStorage, never a project PATCH (this also
      // makes /sounds fully usable for viewers).
      try {
        localStorage.setItem(SOUNDS_STORAGE_KEY, JSON.stringify(updated))
        soundsLocallySetRef.current = true
      } catch (_error) {
        // localStorage unavailable — the choice still applies for this session.
      }
    },
    mount(): void {
      // React's region declares state and effects; there is no mount I/O.
    },
    effects: {
      1: (): void => {
        $effect(() => {
          try {
            soundsLocallySetRef.current = localStorage.getItem(SOUNDS_STORAGE_KEY) != null
          } catch (_error) {
            // localStorage unavailable — treat as unset; the project fallback may apply.
          }
        })
      },
      2: (): void => {
        $effect(() => {
          // Keep the ref in sync so the streaming callback always sees the
          // latest config.
          ctx.stream.soundsConfigRef.current = soundsConfig
        })
      },
    },
  }
}
