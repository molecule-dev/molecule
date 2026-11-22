/**
 * `chat:voice` — dictation, ported from React's `chat:voice` region: the
 * microphone intent, the browser recognition session and its watchdogs, the
 * on-device fallback's flags, the `/mic` engine picker, and the notices the UI
 * shows while dictation starts or fails.
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

import { onMounted, onUnmounted, type Ref, ref } from 'vue'

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

import type { ChatCtx, ChatEffect, MutableRef, SetState } from './context.js'

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

/** What the `chat:voice` slice exposes. */
export interface ChatVoiceSlice {
  /** Whether dictation is listening right now. */
  readonly isListening: Ref<boolean>
  /** The dictation error shown under the composer, or `null`. */
  readonly voiceError: Ref<string | null>
  /** A non-error notice ("preparing dictation"), or `null`. */
  readonly voiceNotice: Ref<string | null>
  /** Whether the browser's Web Speech service has proven dead in this tab. */
  readonly webSpeechDead: Ref<boolean>
  /** The open `/mic` engine picker, or `null`. */
  readonly micPicker: Ref<{ autoStart: boolean } | null>
  /** Opens / closes the engine picker. */
  readonly setMicPicker: SetState<{ autoStart: boolean } | null>
  /** The chosen dictation engine's id, or `null`. */
  readonly currentVoiceEngineId: Ref<string | null>
  /** The registered dictation engines (empty when no catalog is bonded). */
  readonly voiceEngines: Ref<readonly VoiceEngineDef[]>
  /** The stable dictation controller, kept in a plain ref as React's useRef is. */
  readonly dictation: MutableRef<ChatDictationController | null>
  /** Why an engine cannot be used, when it cannot. */
  readonly voiceEngineDisabledReason: (definition: VoiceEngineDef) => 'browser' | 'language' | null
  /** Selects a dictation engine (and optionally starts listening). */
  readonly chooseVoiceEngine: (definition: VoiceEngineDef, autoStart: boolean) => void
  /** Starts or stops dictation. */
  readonly toggleVoice: () => void
  /** The region's effects, in React's order. */
  readonly effects: {
    /** `#effect chat:voice:1` — restores the tab-wide dead-service flag. */
    readonly 1: ChatEffect
    /** `#effect chat:voice:2` — restores the saved engine choice. */
    readonly 2: ChatEffect
    /** `#effect chat:voice:3` — stops recognition on unmount. */
    readonly 3: ChatEffect
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
 * Looks the browser's Web Speech constructor up once, as React's state
 * initializer does.
 *
 * @returns The constructor, or `undefined` when the browser has none.
 */
function readSpeechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined
  const globals = window as SpeechRecognitionGlobals
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
    // sessionStorage unavailable — same fallback as the controller's own read
    return false
  }
}

/**
 * Reads the saved engine choice, exactly as React's state initializer does: the
 * stored id when the catalog still offers it, else `null`.
 *
 * @param engines - The registered engine catalog.
 * @returns The saved engine id, or `null`.
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
 * Builds the `chat:voice` slice.
 *
 * @param ctx - The panel context (the composer, auto-fix and the sibling popups
 *   the dictation controller drives).
 * @returns The voice slice.
 */
export function createChatVoice(ctx: ChatCtx): ChatVoiceSlice {
  const speechCtor = readSpeechRecognitionConstructor()
  const isListening = ref(false)
  const setIsListening = makeSetter(isListening)
  const voiceError = ref<string | null>(null)
  const webSpeechDead = ref(readWebSpeechDead())
  const voiceNotice = ref<string | null>(null)
  const setVoiceNotice = makeSetter(voiceNotice)

  const voiceEngines = ref<readonly VoiceEngineDef[]>(listVoiceEngines())
  const micPicker = ref<{ autoStart: boolean } | null>(null)
  const setMicPicker = makeSetter(micPicker)
  const currentVoiceEngineId = ref<string | null>(readCurrentVoiceEngineId(voiceEngines.value))
  const setCurrentVoiceEngineId = makeSetter(currentVoiceEngineId)

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

  /**
   * Opens the engine picker from a mic click (choose, then start dictating).
   */
  const openDictationMicPicker = (): void => {
    setMicPicker({ autoStart: true })
  }

  /**
   * Closes the engine picker.
   */
  const closeDictationMicPicker = (): void => {
    setMicPicker(null)
  }

  const dictation: MutableRef<ChatDictationController | null> = { current: null }
  if (dictation.current === null) {
    dictation.current = new ChatDictationController({
      translate: ctx.env.t,
      speechRecognitionConstructor: speechCtor,
      engines: voiceEngines.value,
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
        setIsListening(listening)
      },
      setVoiceError: (message) => {
        voiceError.value = message
      },
      setVoiceNotice: (message) => {
        setVoiceNotice(message)
      },
      setWebSpeechDead: (dead) => {
        webSpeechDead.value = dead
      },
      setCurrentVoiceEngineId: (id) => {
        setCurrentVoiceEngineId(id)
      },
    })
  }
  const controller = dictation.current

  /**
   * Why an engine can't be used here, or null when it can.
   *
   * @param definition - The engine to check.
   * @returns The reason, or `null` when the engine can be used.
   */
  const voiceEngineDisabledReason = (definition: VoiceEngineDef): 'browser' | 'language' | null =>
    controller.voiceEngineDisabledReason(definition, webSpeechDead.value)

  /**
   * Applies a picker choice: wires the engine, persists it, and (for a
   * mic-click-initiated pick) starts dictating immediately.
   *
   * @param definition - The chosen engine.
   * @param autoStart - Whether dictation starts at once.
   */
  const chooseVoiceEngine = (definition: VoiceEngineDef, autoStart: boolean): void => {
    controller.chooseVoiceEngine(definition, autoStart)
  }

  /**
   * Starts or stops dictation from the mic button.
   */
  const toggleVoice = (): void => {
    controller.toggleVoice(isListening.value)
  }

  return {
    isListening,
    voiceError,
    voiceNotice,
    webSpeechDead,
    micPicker,
    setMicPicker,
    currentVoiceEngineId,
    voiceEngines,
    dictation,
    voiceEngineDisabledReason,
    chooseVoiceEngine,
    toggleVoice,
    effects: {
      1: () => {
        onMounted(() => {
          controller.mount()
        })
      },
      2: () => {
        onMounted(() => {
          controller.restoreSavedEngine()
        })
      },
      3: () => {
        onUnmounted(() => {
          controller.dispose()
        })
      },
    },
  }
}
