/**
 * React's `chat:voice` region of ChatPanel.tsx (lines 1203–1346): dictation —
 * the browser's Web Speech service, the bonded on-device fallback, the `/mic`
 * engine picker's state and the three mount effects.
 *
 * Every fallback path lives in the shared `ChatDictationController`; this slice
 * keeps only what React keeps (the rendered state, the engine catalog and the
 * stable controller) and hands the controller the composer and popup callbacks
 * it needs, so the DOM and the effect order do not move. The stored state React
 * reads in its `useState` initializers is read here at creation, which is the
 * same moment (before any mount effect).
 *
 * @module
 */

import type { VoiceEngineDef } from '@molecule/app-ai-voice'
import {
  getProvider as getVoiceProvider,
  listVoiceEngines,
  selectVoiceEngine,
  voiceEngineCoversLanguage,
} from '@molecule/app-ai-voice'
import {
  ChatDictationController,
  MIC_ENGINE_STORAGE_KEY,
  type SpeechRecognitionConstructor,
  WEB_SPEECH_DEAD_STORAGE_KEY,
} from '@molecule/app-ide-panel-logic/panels'

import type { ChatSetState } from './chat-popups.svelte.js'
import type { ChatContext } from './context.svelte.js'

/**
 * The browser globals a Web Speech constructor is exposed on (`webkit`-prefixed
 * in a browser that only ships the older name).
 */
interface SpeechRecognitionGlobals {
  /** The standard constructor, when the browser exposes it. */
  SpeechRecognition?: SpeechRecognitionConstructor
  /** The older `webkit`-prefixed constructor. */
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

/** The identifiers other slices and sections read from the `chat:voice` slice. */
export interface ChatVoiceSlice {
  /** The dictation controller (React's `dictationRef.current`). */
  readonly dictation: ChatDictationController
  /** Whether dictation is listening right now. */
  readonly isListening: boolean
  /** The dictation error line, or null. */
  readonly voiceError: string | null
  /** A secondary dictation notice (e.g. "preparing" while a model loads). */
  readonly voiceNotice: string | null
  /** The `/mic` engine picker, or null. */
  readonly micPicker: { autoStart: boolean } | null
  /** Opens or closes the engine picker. */
  readonly setMicPicker: ChatSetState<{ autoStart: boolean } | null>
  /** The registered dictation engines (empty when no catalog is bonded). */
  readonly voiceEngines: readonly VoiceEngineDef[]
  /** The chosen engine's id, or null when no choice was made. */
  readonly currentVoiceEngineId: string | null
  /** Why an engine cannot be used here, or null when it can. */
  readonly voiceEngineDisabledReason: (def: VoiceEngineDef) => 'browser' | 'language' | null
  /** Applies a picker choice: wires it, persists it, optionally starts. */
  readonly chooseVoiceEngine: (def: VoiceEngineDef, autoStart: boolean) => void
  /** Starts dictation, or stops the one running. */
  readonly toggleVoice: () => void

  /** React's mount I/O for the region — none: it declares state only. */
  mount(): void

  /** React's `#effect chat:voice:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void; 2: () => void; 3: () => void }
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
 * Looks the browser's Web Speech constructor up once, as React's state
 * initializer does.
 *
 * @returns The constructor, or undefined when the browser has none.
 */
function readSpeechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined
  const globals: SpeechRecognitionGlobals = window as SpeechRecognitionGlobals
  return globals.SpeechRecognition ?? globals.webkitSpeechRecognition
}

/**
 * Reads the tab-wide dead-service flag, exactly as React's state initializer
 * does.
 *
 * @returns Whether this browser's speech service was proven dead in this tab.
 */
function readWebSpeechDead(): boolean {
  try {
    return sessionStorage.getItem(WEB_SPEECH_DEAD_STORAGE_KEY) === '1'
  } catch (_error) {
    // sessionStorage unavailable — same fallback as the ref the region keeps
    return false
  }
}

/**
 * Reads the saved engine choice, exactly as React's state initializer does: the
 * stored id when the catalog still offers it, else null.
 *
 * @param engines - The registered engine catalog.
 * @returns The saved engine id, or null.
 */
function readCurrentVoiceEngineId(engines: readonly VoiceEngineDef[]): string | null {
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
 * Creates the `chat:voice` slice.
 *
 * @param ctx - The shared chat context (the composer, auto-fix and the sibling
 *   popups the dictation controller drives).
 * @returns The rendered state, the controller and React's three effects.
 */
export function createChatVoice(ctx: ChatContext): ChatVoiceSlice {
  const speechCtor = readSpeechRecognitionConstructor()
  let isListening = $state(false)
  let voiceError = $state<string | null>(null)
  let webSpeechDead = $state(readWebSpeechDead())
  let voiceNotice = $state<string | null>(null)

  // The catalog is React's `useState` initializer: read once, never re-read.
  const voiceEngines: readonly VoiceEngineDef[] = listVoiceEngines()
  let micPicker = $state.raw<{ autoStart: boolean } | null>(null)
  let currentVoiceEngineId = $state<string | null>(readCurrentVoiceEngineId(voiceEngines))

  /**
   * Closes every sibling composer popup before the mic picker opens (popups are
   * one at a time).
   */
  const closeDictationPopups = (): void => {
    ctx.composer.setCommandMenu(null)
    ctx.composer.setModelPicker(null)
    ctx.composer.setEffortPicker(null)
    ctx.sounds.setSoundsPicker(null)
    ctx.popups.setFilePicker(null)
    ctx.overlay.setPanelOverlay(null)
  }

  /** Opens the engine picker from a mic click (choose, then start dictating). */
  const openDictationMicPicker = (): void => {
    micPicker = { autoStart: true }
  }

  /** Closes the engine picker. */
  const closeDictationMicPicker = (): void => {
    micPicker = null
  }

  const dictation = new ChatDictationController({
    // React's stable `t` callback: the controller always calls the latest one.
    translate: (key, values, options) => ctx.env.t(key, values, options),
    speechRecognitionConstructor: speechCtor,
    engines: voiceEngines,
    selectEngine: selectVoiceEngine,
    engineCoversLanguage: voiceEngineCoversLanguage,
    getVoiceProvider,
    readInput: () => ctx.composer.inputRef.current,
    writeInput: (value) => {
      ctx.composer.setInputValue(value)
    },
    pushDictatedSnippet: (transcript) => {
      ctx.composer.dictatedSnippetsRef.current.push(transcript)
    },
    onTranscriptInserted: () => {
      ctx.composer.autoResize()
    },
    onDictationStart: () => {
      ctx.autoFix.handleAutoFixPauseOnInput()
    },
    closeSiblingPopups: closeDictationPopups,
    openMicPicker: openDictationMicPicker,
    closeMicPicker: closeDictationMicPicker,
    setListening: (listening) => {
      isListening = listening
    },
    setVoiceError: (message) => {
      voiceError = message
    },
    setVoiceNotice: (message) => {
      voiceNotice = message
    },
    setWebSpeechDead: (dead) => {
      webSpeechDead = dead
    },
    setCurrentVoiceEngineId: (id) => {
      currentVoiceEngineId = id
    },
  })

  return {
    dictation,
    get isListening(): boolean {
      return isListening
    },
    get voiceError(): string | null {
      return voiceError
    },
    get voiceNotice(): string | null {
      return voiceNotice
    },
    get micPicker(): { autoStart: boolean } | null {
      return micPicker
    },
    setMicPicker(
      value:
        | { autoStart: boolean }
        | null
        | ((previous: { autoStart: boolean } | null) => { autoStart: boolean } | null),
    ): void {
      micPicker = resolveState(micPicker, value)
    },
    get voiceEngines(): readonly VoiceEngineDef[] {
      return voiceEngines
    },
    get currentVoiceEngineId(): string | null {
      return currentVoiceEngineId
    },
    voiceEngineDisabledReason(def: VoiceEngineDef): 'browser' | 'language' | null {
      return dictation.voiceEngineDisabledReason(def, webSpeechDead)
    },
    chooseVoiceEngine(def: VoiceEngineDef, autoStart: boolean): void {
      dictation.chooseVoiceEngine(def, autoStart)
    },
    toggleVoice(): void {
      dictation.toggleVoice(isListening)
    },
    mount(): void {
      // React's region declares state and effects; there is no mount I/O.
    },
    effects: {
      1: (): void => {
        // #effect chat:voice:1 — restores the tab-wide dead-service flag.
        $effect(() => {
          dictation.mount()
        })
      },
      2: (): void => {
        // #effect chat:voice:2 — restores the saved engine choice.
        $effect(() => {
          dictation.restoreSavedEngine()
        })
      },
      3: (): void => {
        // #effect chat:voice:3 — stops recognition on unmount.
        $effect(() => () => {
          dictation.dispose()
        })
      },
    },
  }
}
