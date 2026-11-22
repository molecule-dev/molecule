/**
 * `chat:voice` — dictation (the browser's speech service or a bonded on-device
 * provider) and the `/mic` engine picker (React's `chat:voice` region and its
 * three effects, ported by unit U12).
 *
 * The dictation machinery itself lives in the shared
 * `ChatDictationController` (`@molecule/app-ide-panel-logic`): the recognition
 * session, the restart/watchdog timers, the engine choice and the give-up
 * detection, driven through the composer and popup callbacks this slice hands
 * it. This slice keeps only the values the panel renders — the listening flag,
 * the error and notice lines, the dead-service flag, the open picker and the
 * chosen engine id — so the DOM and the effect order do not move from React's.
 *
 * Every rendered value and the saved choices are read where React's state
 * initializers read them (while the slice is created, during the panel's
 * render), so a mount behaves identically.
 *
 * @module
 */

import type { Accessor, Setter } from 'solid-js'
import { createSignal, onCleanup, onMount } from 'solid-js'

import type { VoiceEngineDef } from '@molecule/app-ai-voice'
import {
  getProvider as getVoiceProvider,
  listVoiceEngines,
  selectVoiceEngine,
  voiceEngineCoversLanguage,
} from '@molecule/app-ai-voice'
import type {
  DictationEngineDisabledReason,
  SpeechRecognitionConstructor,
} from '@molecule/app-ide-panel-logic/panels'
import {
  ChatDictationController,
  MIC_ENGINE_STORAGE_KEY,
  WEB_SPEECH_DEAD_STORAGE_KEY,
} from '@molecule/app-ide-panel-logic/panels'

import type { ChatInnerCtx, SliceEffects } from './context.js'

/** What other slices read from `chat:voice`. */
export interface ChatVoiceSlice {
  /** The dictation controller the region drives. */
  dictation: ChatDictationController
  /** Whether dictation is listening right now. */
  isListening: Accessor<boolean>
  /** Sets the listening flag. */
  setIsListening: Setter<boolean>
  /** The dictation error line, or null. */
  voiceError: Accessor<string | null>
  /** A secondary dictation notice (e.g. "preparing" while a model loads). */
  voiceNotice: Accessor<string | null>
  /** Sets the dictation notice. */
  setVoiceNotice: Setter<string | null>
  /** The registered dictation engines (empty when no catalog is bonded). */
  voiceEngines: Accessor<readonly VoiceEngineDef[]>
  /** The `/mic` engine picker, or null. */
  micPicker: Accessor<{ autoStart: boolean } | null>
  /** Opens or closes the engine picker. */
  setMicPicker: Setter<{ autoStart: boolean } | null>
  /** The chosen engine's id, or null when no choice was made. */
  currentVoiceEngineId: Accessor<string | null>
  /** Why an engine cannot be used here, or null when it can. */
  voiceEngineDisabledReason: (def: VoiceEngineDef) => DictationEngineDisabledReason
  /** Applies a picker choice: wires it, persists it, optionally starts. */
  chooseVoiceEngine: (def: VoiceEngineDef, autoStart: boolean) => void
  /** Starts dictation, or stops the one running. */
  toggleVoice: () => void
  /** The slice's effects, by ledger position. */
  effects: SliceEffects
}

/**
 * The tab-wide dead-service flag the panel starts with, read from the session
 * exactly as React's state initializer reads it.
 * @returns True when this tab already proved the browser's service dead.
 */
function readInitialWebSpeechDead(): boolean {
  try {
    return sessionStorage.getItem(WEB_SPEECH_DEAD_STORAGE_KEY) === '1'
  } catch (_error) {
    // sessionStorage unavailable — the watchdog re-detects within one session
    return false
  }
}

/**
 * The engine choice the panel starts with: the saved id, when the catalog
 * registers it, else null.
 * @param engines - The registered engine catalog.
 * @returns The saved engine id, or null when none was saved for a live engine.
 */
function readInitialVoiceEngineId(engines: readonly VoiceEngineDef[]): string | null {
  if (engines.length === 0) return null
  try {
    const savedId = localStorage.getItem(MIC_ENGINE_STORAGE_KEY)
    return savedId && engines.some((engine) => engine.id === savedId) ? savedId : null
  } catch (_error) {
    // localStorage unavailable — no saved choice
    return null
  }
}

/**
 * The browser's Web Speech constructor, looked up once, like React's state
 * initializer (`window.SpeechRecognition ?? window.webkitSpeechRecognition`).
 * @returns The constructor, or undefined when the browser has none.
 */
function readSpeechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined
  const globals: typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  } = window
  return globals.SpeechRecognition ?? globals.webkitSpeechRecognition
}

/**
 * Creates `chat:voice`.
 * @param ctx - The inner ctx (the composer, auto-fix and popup slices the
 *   controller drives).
 * @returns The voice slice.
 */
export function createChatVoice(ctx: ChatInnerCtx): ChatVoiceSlice {
  const engines = listVoiceEngines()
  const speechRecognitionConstructor = readSpeechRecognitionConstructor()
  const [isListening, setIsListening] = createSignal(false)
  const [voiceError, setVoiceError] = createSignal<string | null>(null)
  // The same flag for rendering (the /mic picker's disabled native row): read
  // from the session once on mount, and set again wherever the controller sets it.
  const [webSpeechDead, setWebSpeechDead] = createSignal(readInitialWebSpeechDead())
  // Secondary (non-error) notice: "preparing dictation" while the model loads
  const [voiceNotice, setVoiceNotice] = createSignal<string | null>(null)
  // autoStart: opened from a mic click (start dictating right after choosing)
  // vs from /mic (just a settings change).
  const [micPicker, setMicPicker] = createSignal<{ autoStart: boolean } | null>(null)
  // The chosen engine's id for rendering (the picker's "current" row): read
  // once on mount from the same saved choice the restore effect applies.
  const [currentVoiceEngineId, setCurrentVoiceEngineId] = createSignal<string | null>(
    readInitialVoiceEngineId(engines),
  )

  const dictation = new ChatDictationController({
    translate: ctx.env.t,
    speechRecognitionConstructor,
    engines,
    selectEngine: selectVoiceEngine,
    engineCoversLanguage: voiceEngineCoversLanguage,
    getVoiceProvider,
    readInput: () => ctx.composer.inputRef.current,
    writeInput: (value) => ctx.composer.setInputValue(value),
    pushDictatedSnippet: (transcript) => {
      ctx.composer.dictatedSnippetsRef.current.push(transcript)
    },
    onTranscriptInserted: () => ctx.composer.autoResize(),
    onDictationStart: () => ctx.autoFix.handleAutoFixPauseOnInput(),
    // Popups are one-at-a-time — every sibling closes before the picker opens.
    closeSiblingPopups: () => {
      ctx.composer.setCommandMenu(null)
      ctx.composer.setModelPicker(null)
      ctx.composer.setEffortPicker(null)
      ctx.sounds.setSoundsPicker(null)
      ctx.popups.setFilePicker(null)
      ctx.overlay.setPanelOverlay(null)
    },
    openMicPicker: () => setMicPicker({ autoStart: true }),
    closeMicPicker: () => setMicPicker(null),
    setListening: setIsListening,
    setVoiceError,
    setVoiceNotice,
    setWebSpeechDead,
    setCurrentVoiceEngineId,
  })

  return {
    dictation,
    isListening,
    setIsListening,
    voiceError,
    voiceNotice,
    setVoiceNotice,
    voiceEngines: () => engines,
    micPicker,
    setMicPicker,
    currentVoiceEngineId,
    // React's render reads the dead-service flag from its state, not the
    // controller's copy, so the picker's native row reacts to the same signal.
    voiceEngineDisabledReason: (def) => dictation.voiceEngineDisabledReason(def, webSpeechDead()),
    chooseVoiceEngine: (def, autoStart) => dictation.chooseVoiceEngine(def, autoStart),
    toggleVoice: () => dictation.toggleVoice(isListening()),
    effects: {
      // #effect chat:voice:1
      1: () => {
        onMount(() => dictation.mount())
      },
      // #effect chat:voice:2
      2: () => {
        onMount(() => dictation.restoreSavedEngine())
      },
      // #effect chat:voice:3 — stop recognition on unmount.
      3: () => {
        onCleanup(() => dictation.dispose())
      },
    },
  }
}
