/**
 * `chat:sounds` — the per-device sound preferences and the `/sounds` picker
 * (React's three `chat:sounds` regions and their two effects, ported by unit
 * P3).
 *
 * Notification sounds are a PER-DEVICE, per-user preference — `localStorage`,
 * never project settings (the old project-level value is still read once by the
 * settings restore as a migration fallback when this device has no local
 * preference yet).
 *
 * @module
 */

import type { Accessor, Setter } from 'solid-js'
import { createEffect, createSignal, onMount } from 'solid-js'

import type { SoundEventType, SoundsConfig } from '@molecule/app-ide-panel-logic/panels'
import {
  cycleSoundsConfig,
  DEFAULT_SOUNDS_CONFIG,
  parseSoundsConfig,
  SOUNDS_STORAGE_KEY,
} from '@molecule/app-ide-panel-logic/panels'

import type { ChatInnerCtx, MutableRef, SliceEffects } from './context.js'

/** The `/sounds` picker's row cursor. */
export interface SoundsPicker {
  /** The highlighted row's index. */
  selectedIdx: number
}

/** What other slices read from `chat:sounds`. */
export interface ChatSoundsSlice {
  /** The sounds picker, or null when closed. */
  soundsPicker: Accessor<SoundsPicker | null>
  /** Opens, moves or closes the sounds picker. */
  setSoundsPicker: Setter<SoundsPicker | null>
  /** The per-event sound modes. */
  soundsConfig: Accessor<SoundsConfig>
  /** Replaces the sound modes. */
  setSoundsConfig: Setter<SoundsConfig>
  /** Whether the user changed the modes here (never overwritten by a hydrate). */
  soundsLocallySetRef: MutableRef<boolean>
  /** Cycles one event's (or every event's) mode and persists it. */
  cycleSoundMode: (eventType: SoundEventType | 'all') => Promise<void>
  /** The slice's effects, by ledger position. */
  effects: SliceEffects
}

/**
 * The sound modes this device starts with, read from its storage.
 * @returns The stored modes, or the defaults when nothing usable is stored.
 */
function readInitialSoundsConfig(): SoundsConfig {
  try {
    return parseSoundsConfig(localStorage.getItem(SOUNDS_STORAGE_KEY))
  } catch (_error) {
    // localStorage unavailable — fall through to the defaults.
  }
  return { ...DEFAULT_SOUNDS_CONFIG }
}

/**
 * Creates `chat:sounds`.
 * @param ctx - The inner ctx (the stream slice reads the config through its
 *   ref).
 * @returns The sounds slice.
 */
export function createChatSounds(ctx: ChatInnerCtx): ChatSoundsSlice {
  const [soundsPicker, setSoundsPicker] = createSignal<SoundsPicker | null>(null)
  const [soundsConfig, setSoundsConfig] = createSignal<SoundsConfig>(readInitialSoundsConfig())
  const soundsLocallySetRef: MutableRef<boolean> = { current: false }

  return {
    soundsPicker,
    setSoundsPicker,
    soundsConfig,
    setSoundsConfig,
    soundsLocallySetRef,
    /** Cycles a single sound event's mode and persists to this device. */
    cycleSoundMode: async (eventType) => {
      const updated = cycleSoundsConfig(soundsConfig(), eventType)
      setSoundsConfig(updated)
      // Per-device preference — localStorage, never a project PATCH (which also
      // makes /sounds fully usable for viewers).
      try {
        localStorage.setItem(SOUNDS_STORAGE_KEY, JSON.stringify(updated))
        soundsLocallySetRef.current = true
      } catch (_error) {
        // localStorage unavailable — the choice still applies for this session.
      }
    },
    effects: {
      // #effect chat:sounds:1
      1: () =>
        onMount(() => {
          try {
            soundsLocallySetRef.current = localStorage.getItem(SOUNDS_STORAGE_KEY) != null
          } catch (_error) {
            // localStorage unavailable — treat as unset; the project fallback may apply.
          }
        }),
      // #effect chat:sounds:2
      2: () => {
        // Keep the ref in sync so the streaming callback always sees the latest config.
        createEffect(() => {
          ctx.stream.soundsConfigRef.current = soundsConfig()
        })
      },
    },
  }
}
