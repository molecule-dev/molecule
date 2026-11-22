/**
 * React's `chat:voice` region of ChatPanel.tsx (lines 1203–1346): dictation —
 * the browser's Web Speech service, the bonded on-device fallback, the `/mic`
 * engine picker's state and the region's three effects.
 *
 * Every fallback path lives in the shared `ChatDictationController`
 * (`@molecule/app-ide-panel-logic/panels`); this slice keeps only what React
 * keeps — the values it renders, the once-read engine catalog and the stable
 * controller — and hands the controller the composer, auto-fix and popup
 * callbacks it needs, so the DOM and the effect order do not move. The stored
 * state React reads in its `useState` initializers is read here at
 * construction, which is the same moment: before any mount effect runs.
 *
 * `#effect chat:voice:1` (`dictation.mount()`) and `#effect chat:voice:2`
 * (`dictation.restoreSavedEngine()`) are mount-only in React, so their work is
 * the {@link ChatVoice.mount} pass at this slice's position in the mount
 * ledger, and the registered entries keep React's positions in the effect
 * ledger. `#effect chat:voice:3` is a cleanup-only effect: it registers the
 * unmount that stops recognition ({@link ChatDictationController.dispose}).
 *
 * @module
 */

import { DestroyRef, inject, Injectable, Injector, signal } from '@angular/core'

import type { VoiceEngineDef } from '@molecule/app-ai-voice'
import {
  getProvider as getVoiceProvider,
  listVoiceEngines,
  selectVoiceEngine,
  voiceEngineCoversLanguage,
} from '@molecule/app-ai-voice'
import type { TranslateFunction } from '@molecule/app-i18n'
import {
  ChatDictationController,
  MIC_ENGINE_STORAGE_KEY,
  type SpeechRecognitionConstructor,
  WEB_SPEECH_DEAD_STORAGE_KEY,
} from '@molecule/app-ide-panel-logic/panels'

import { ChatAutoFix } from './chat-auto-fix.slice.js'
import { ChatComposer } from './chat-composer.slice.js'
import { ChatInnerState, registerChatEffect } from './chat-inner-state.js'
import { ChatOverlay } from './chat-overlay.slice.js'
import type { ChatSetState } from './chat-popups.slice.js'
import { ChatPopups } from './chat-popups.slice.js'
import { ChatSounds } from './chat-sounds.slice.js'

/** The identifiers other slices and sections read from the `chat:voice` slice. */
export interface ChatVoiceSlice {
  /**
   * React's mount I/O for the region: the two mount-only effects' bodies
   * (`dictation.mount()` then `dictation.restoreSavedEngine()`).
   */
  mount(): void

  /** React's `#effect chat:voice:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void; 2: () => void; 3: () => void }

  /** Whether dictation is listening right now. */
  readonly isListening: () => boolean
  /** The dictation error shown under the composer, or `null`. */
  readonly voiceError: () => string | null
  /** A non-error notice ("preparing dictation"), or `null`. */
  readonly voiceNotice: () => string | null
  /** The registered dictation engines. */
  readonly voiceEngines: () => readonly VoiceEngineDef[]
  /** The open `/mic` engine picker, or `null`. */
  readonly micPicker: () => { autoStart: boolean } | null
  /** Opens / closes the engine picker. */
  readonly setMicPicker: ChatSetState<{ autoStart: boolean } | null>
  /** The chosen dictation engine's id, or `null`. */
  readonly currentVoiceEngineId: () => string | null
  /** Why an engine cannot be used, when it cannot. */
  readonly voiceEngineDisabledReason: (definition: VoiceEngineDef) => 'browser' | 'language' | null
  /** Selects a dictation engine (and optionally starts listening). */
  readonly chooseVoiceEngine: (definition: VoiceEngineDef, autoStart: boolean) => void
  /** Starts or stops dictation. */
  readonly toggleVoice: () => void
  /** The dictation controller. */
  readonly dictation: ChatDictationController
}

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

/**
 * Looks the browser's Web Speech constructor up once, as React's state
 * initializer does.
 *
 * @returns The constructor, or undefined when the browser has none.
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
    // sessionStorage unavailable — same fallback as the controller keeps
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

/** React's `chat:voice` slice: dictation and the `/mic` engine picker's state. */
@Injectable()
export class ChatVoice implements ChatVoiceSlice {
  /** The shared state, read for the env and the slices the controller drives. */
  private readonly state = inject(ChatInnerState)

  /** The element injector `registerChatEffect` registers the region's effects in. */
  private readonly injector = inject(Injector)

  /** The ChatInner injector's destruction, where React's cleanup effect runs. */
  private readonly destroyRef = inject(DestroyRef)

  /**
   * The browser's Web Speech constructor, looked up once on construction
   * (React's `useState` initializer).
   */
  private readonly speechCtor = readSpeechRecognitionConstructor()

  /** The registered dictation engines, read once on construction. */
  private readonly engines: readonly VoiceEngineDef[] = listVoiceEngines()

  /** Whether dictation is listening right now. */
  readonly isListening = signal(false)

  /** The dictation error shown under the composer, or `null`. */
  readonly voiceError = signal<string | null>(null)

  /** A non-error notice ("preparing dictation"), or `null`. */
  readonly voiceNotice = signal<string | null>(null)

  /** Whether the browser's speech service proved dead (drives the picker's disabled rows). */
  private readonly webSpeechDead = signal(readWebSpeechDead())

  /** The open `/mic` engine picker, or `null`. */
  readonly micPicker = signal<{ autoStart: boolean } | null>(null)

  /** The chosen dictation engine's id, or `null`. */
  readonly currentVoiceEngineId = signal<string | null>(readCurrentVoiceEngineId(this.engines))

  /** The dictation controller; every fallback path lives in it. */
  readonly dictation: ChatDictationController

  /** The registered dictation engines, as the picker reads them. */
  readonly voiceEngines = (): readonly VoiceEngineDef[] => this.engines

  /**
   * Wires the controller with React's exact callbacks and records React's three
   * effect positions.
   */
  constructor() {
    const translate: TranslateFunction = (key, values, options) =>
      this.state.env.t(key, values, options)
    this.dictation = new ChatDictationController({
      translate,
      speechRecognitionConstructor: this.speechCtor,
      engines: this.engines,
      selectEngine: selectVoiceEngine,
      engineCoversLanguage: voiceEngineCoversLanguage,
      getVoiceProvider,
      readInput: () => this.state.slice(ChatComposer).inputRef.current,
      writeInput: (value) => {
        this.state.slice(ChatComposer).setInputValue(value)
      },
      pushDictatedSnippet: (transcript) => {
        this.state.slice(ChatComposer).dictatedSnippetsRef.current.push(transcript)
      },
      onTranscriptInserted: () => {
        this.state.slice(ChatComposer).autoResize()
      },
      onDictationStart: () => {
        this.state.slice(ChatAutoFix).handleAutoFixPauseOnInput()
      },
      closeSiblingPopups: () => {
        const composer = this.state.slice(ChatComposer)
        composer.setCommandMenu(null)
        composer.setModelPicker(null)
        composer.setEffortPicker(null)
        this.state.slice(ChatSounds).setSoundsPicker(null)
        this.state.slice(ChatPopups).setFilePicker(null)
        this.state.slice(ChatOverlay).setPanelOverlay(null)
      },
      openMicPicker: () => {
        this.setMicPicker({ autoStart: true })
      },
      closeMicPicker: () => {
        this.setMicPicker(null)
      },
      setListening: (listening) => {
        this.isListening.set(listening)
      },
      setVoiceError: (message) => {
        this.voiceError.set(message)
      },
      setVoiceNotice: (message) => {
        this.voiceNotice.set(message)
      },
      setWebSpeechDead: (dead) => {
        this.webSpeechDead.set(dead)
      },
      setCurrentVoiceEngineId: (id) => {
        this.currentVoiceEngineId.set(id)
      },
    })
  }

  /** React's `#effect chat:voice:<n>` entry points, at React's positions. */
  readonly effects = {
    1: (): void => {
      registerChatEffect(this.injector, () => {
        // React's effect 1 restores the tab-wide dead-service flag and wires the
        // controller; its only run is the mount run, at this ledger position.
        this.dictation.mount()
      })
    },
    2: (): void => {
      registerChatEffect(this.injector, () => {
        // React's effect 2 restores the saved engine choice; its only run is the
        // mount run, right after effect 1.
        this.dictation.restoreSavedEngine()
      })
    },
    3: (): void => {
      // React's effect 3 is a cleanup-only effect: its body does nothing and its
      // cleanup stops recognition when the panel unmounts.
      this.destroyRef.onDestroy(() => {
        this.dictation.dispose()
      })
      registerChatEffect(this.injector, () => {
        // No body in React; the cleanup above is registered once.
      })
    },
  }

  /**
   * React's mount I/O for the region: both mount-only effects run at their own
   * ledger positions, so the engine choice restore lands where React's does.
   */
  mount(): void {
    // The mount runs are effects 1 and 2's first runs; nothing mounts here.
  }

  /** Opens / closes the engine picker (value or updater). */
  readonly setMicPicker: ChatSetState<{ autoStart: boolean } | null> = (next) => {
    this.micPicker.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /**
   * Why an engine can't be used here, or null when it can.
   *
   * @param definition - The engine to check.
   * @returns The reason, or null when the engine can be used.
   */
  voiceEngineDisabledReason(definition: VoiceEngineDef): 'browser' | 'language' | null {
    return this.dictation.voiceEngineDisabledReason(definition, this.webSpeechDead())
  }

  /**
   * Applies a picker choice: wires the engine, persists it, and (for a
   * mic-click-initiated pick) starts dictating immediately.
   *
   * @param definition - The engine the person chose.
   * @param autoStart - Whether to start dictating right after choosing.
   */
  chooseVoiceEngine(definition: VoiceEngineDef, autoStart: boolean): void {
    this.dictation.chooseVoiceEngine(definition, autoStart)
  }

  /** Starts or stops dictation from the mic button. */
  toggleVoice(): void {
    this.dictation.toggleVoice(this.isListening())
  }
}
