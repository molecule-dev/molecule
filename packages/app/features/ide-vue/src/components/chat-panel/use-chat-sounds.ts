/**
 * `chat:sounds` — the notification-sound preference, ported from React's three
 * `chat:sounds` regions: its stored value (a per-device preference, never a
 * project setting), the `/sounds` picker's state, and the mode cycle.
 *
 * The preference is read from localStorage at creation (React's state
 * initializer, which runs before mount work), the "set on this device" flag is
 * latched by the mount effect, and the stream's ref copy follows every change.
 * The store is keyed by React's own `SOUNDS_STORAGE_KEY`.
 *
 * @module
 */

import { onMounted, type Ref, ref, watch } from 'vue'

import {
  cycleSoundsConfig,
  DEFAULT_SOUNDS_CONFIG,
  parseSoundsConfig,
  type SoundEventType,
  SOUNDS_STORAGE_KEY,
  type SoundsConfig,
} from '@molecule/app-ide-panel-logic/panels'

import type { ChatCtx, ChatEffect, MutableRef, SetState } from './context.js'

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
 * Reads the device's stored sound preference, exactly as React's state
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

/** What the `chat:sounds` slice exposes. */
export interface ChatSoundsSlice {
  /** The open sounds picker, or `null`. */
  readonly soundsPicker: Ref<SoundsPicker | null>
  /** Opens / closes the sounds picker. */
  readonly setSoundsPicker: SetState<SoundsPicker | null>
  /** The notification-sound preference. */
  readonly soundsConfig: Ref<SoundsConfig>
  /** Sets the preference. */
  readonly setSoundsConfig: SetState<SoundsConfig>
  /** Whether the user set the preference here (so a server read must not override it). */
  readonly soundsLocallySetRef: MutableRef<boolean>
  /** Cycles one event's mode (or every event's) and persists it. */
  readonly cycleSoundMode: (eventType: SoundEventType | 'all') => Promise<void>
  /** The region's effects, in React's order. */
  readonly effects: {
    /** `#effect chat:sounds:1`. */
    readonly 1: ChatEffect
    /** `#effect chat:sounds:2`. */
    readonly 2: ChatEffect
  }
}

/**
 * Builds the `chat:sounds` slice.
 *
 * @param ctx - The panel context (the stream slice whose ref follows the config).
 * @returns The sounds slice.
 */
export function createChatSounds(ctx: ChatCtx): ChatSoundsSlice {
  const soundsPicker = ref<SoundsPicker | null>(null)
  const setSoundsPicker = makeSetter(soundsPicker)
  const soundsConfig = ref<SoundsConfig>(readStoredSoundsConfig())
  const setSoundsConfig = makeSetter(soundsConfig)
  const soundsLocallySetRef: MutableRef<boolean> = { current: false }

  /**
   * Cycles one sound event's mode (or every event's) and persists the choice to
   * this device.
   *
   * @param eventType - The event to cycle, or `'all'`.
   * @returns A promise that settles once the choice is applied.
   */
  const cycleSoundMode = async (eventType: SoundEventType | 'all'): Promise<void> => {
    const updated = cycleSoundsConfig(soundsConfig.value, eventType)
    setSoundsConfig(updated)
    // Per-device preference — localStorage, never a project PATCH.
    try {
      localStorage.setItem(SOUNDS_STORAGE_KEY, JSON.stringify(updated))
      soundsLocallySetRef.current = true
    } catch (_error) {
      // localStorage unavailable — the choice still applies for this session.
    }
  }

  return {
    soundsPicker,
    setSoundsPicker,
    soundsConfig,
    setSoundsConfig,
    soundsLocallySetRef,
    cycleSoundMode,
    effects: {
      1: () => {
        // Whether this device already holds a local preference (so the legacy
        // project-level value must not override it).
        onMounted(() => {
          try {
            soundsLocallySetRef.current = localStorage.getItem(SOUNDS_STORAGE_KEY) != null
          } catch (_error) {
            // localStorage unavailable — treat as unset; the project fallback may apply.
          }
        })
      },
      2: () => {
        // Keep the stream handler's ref in sync so it always sees the latest config.
        onMounted(() => {
          ctx.stream.soundsConfigRef.current = soundsConfig.value
        })
        watch(
          soundsConfig,
          (config) => {
            ctx.stream.soundsConfigRef.current = config
          },
          { flush: 'post' },
        )
      },
    },
  }
}
