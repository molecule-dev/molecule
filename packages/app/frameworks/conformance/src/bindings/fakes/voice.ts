/**
 * Binding-case fakes for one area: dictation. The browser's Web Speech API
 * (`window.SpeechRecognition`, which jsdom lacks), an on-device `AIVoiceProvider` bonded as
 * `ai-voice`, and a dictation engine catalog (`registerVoiceEngines`), all from
 * `@molecule/app-ai-voice` or the browser a component reads them from.
 *
 * A case seeds this area through `context.areas.voice`; `control` steps play the speech service
 * on the other side (named `voice.<event>`), each reaching the newest session: the last Web
 * Speech recognition started, or the last `startListening` call.
 * - `voice.start`: the service started (`onstart`; the provider reports `listening`).
 * - `voice.result(transcript, isFinal = true)`: a recognition result (`onresult` with every result
 *   of the session so far; the provider's `onTranscript`).
 * - `voice.error(code)`: an error (`onerror` with `error: code`; the provider's `onError`).
 * - `voice.end`: the session ended (`onend`; the provider reports `idle`).
 * - `voice.state(state)`: the provider's `onStateChange(state)`.
 *
 * Recorded: `speech.start` (with the recognition's `continuous`, `interimResults` and `lang` at
 * that moment), `speech.stop`, `speech.abort`, `voice.startListening`, `voice.stopListening`,
 * `voice.speak`, `voice.stopSpeaking`, `voice.dispose` and `voice.engine.create`. Reads
 * (`getState`, `isRecognitionSupported` …) are not: how often a component reads depends on how
 * often its framework renders.
 *
 * @module
 */

import type {
  AIVoiceProvider,
  VoiceEngineDef,
  VoiceEventHandlers,
  VoiceState,
} from '@molecule/app-ai-voice'
import { registerVoiceEngines } from '@molecule/app-ai-voice'
import { bond } from '@molecule/app-bond'

import type { AreaFakesFactory } from '../spec.js'
import { saveBonds } from './bonds.js'

/** What a case can seed for this area (`context.areas.voice`). */
export interface VoiceSeed {
  /**
   * Installs a recording `window.SpeechRecognition` before the component mounts. `startThrows`
   * makes `start()` throw, as a browser does while a previous session is still tearing down.
   */
  readonly webSpeech?: { readonly startThrows?: boolean }
  /**
   * Bonds a recording on-device `AIVoiceProvider` as `ai-voice`. `recognition: false` makes it
   * report no recognition support (default true).
   */
  readonly provider?: { readonly recognition?: boolean }
  /** Registers this dictation engine catalog; each engine's `create()` bonds the recording provider. */
  readonly engines?: readonly Omit<VoiceEngineDef, 'create'>[]
}

/** The states a `voice.state` control can report. */
const VOICE_STATES: readonly VoiceState[] = ['idle', 'listening', 'processing', 'speaking', 'error']

/** One result of a Web Speech session, shaped as the browser's `SpeechRecognitionResult`. */
type SpeechResult = { transcript: string; confidence: number }[] & { isFinal: boolean }

/** The newest dictation session the controls reach. */
type Session =
  | { kind: 'speech'; recognition: RecordingRecognition; results: SpeechResult[] }
  | { kind: 'provider'; handlers: VoiceEventHandlers }

/** The parts of a `SpeechRecognition` a component sets and calls. */
interface RecordingRecognition {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: (() => void) | null
  onresult: ((event: unknown) => void) | null
  onend: (() => void) | null
  onerror: ((event: unknown) => void) | null
  start(): void
  stop(): void
  abort(): void
}

/**
 * Builds this area's fakes for one case.
 *
 * @param context - The case context (`context.areas?.voice` is this area's seed).
 * @param record - Receives every operation the component starts.
 * @returns The area's controls and cleanup.
 */
export const createVoiceFakes: AreaFakesFactory = (context, record) => {
  const seed = context.areas?.voice
  if (!seed) return {}
  let session: Session | null = null
  const restores: (() => void)[] = []

  if (seed.webSpeech) {
    const startThrows = seed.webSpeech.startThrows === true
    /** A recording stand-in for the browser's `SpeechRecognition`. */
    class FakeSpeechRecognition implements RecordingRecognition {
      continuous = false
      interimResults = false
      lang = ''
      onstart: (() => void) | null = null
      onresult: ((event: unknown) => void) | null = null
      onend: (() => void) | null = null
      onerror: ((event: unknown) => void) | null = null
      /** Starts the session (records it with the settings set so far). */
      start(): void {
        record('speech.start', [
          { continuous: this.continuous, interimResults: this.interimResults, lang: this.lang },
        ])
        if (startThrows)
          throw new DOMException('recognition has already started', 'InvalidStateError')
        session = { kind: 'speech', recognition: this, results: [] }
      }
      /** Asks the service to finish the session (it still delivers `onend`). */
      stop(): void {
        record('speech.stop', [])
      }
      /** Drops the session at once. */
      abort(): void {
        record('speech.abort', [])
      }
    }
    const before = Object.getOwnPropertyDescriptor(window, 'SpeechRecognition')
    Object.defineProperty(window, 'SpeechRecognition', {
      configurable: true,
      writable: true,
      value: FakeSpeechRecognition,
    })
    restores.push(() => {
      if (before) Object.defineProperty(window, 'SpeechRecognition', before)
      else Reflect.deleteProperty(window, 'SpeechRecognition')
    })
  }

  const recognition = seed.provider?.recognition !== false
  let state: VoiceState = 'idle'
  const provider: AIVoiceProvider = {
    name: 'conformance-voice',
    startListening: (options, handlers) => {
      record('voice.startListening', [options ?? null])
      session = { kind: 'provider', handlers: handlers ?? {} }
    },
    stopListening: () => record('voice.stopListening', []),
    speak: async (text, options) => record('voice.speak', options ? [text, options] : [text]),
    stopSpeaking: () => record('voice.stopSpeaking', []),
    getState: () => state,
    isSupported: () => recognition,
    isRecognitionSupported: () => recognition,
    isSynthesisSupported: () => false,
    getAvailableVoices: async () => [],
    dispose: () => record('voice.dispose', []),
  }
  // Selecting an engine bonds its provider too, so the bond is restored for either seed.
  if (seed.provider || seed.engines) restores.push(saveBonds(['ai-voice']))
  if (seed.provider) bond('ai-voice', provider)
  if (seed.engines) {
    registerVoiceEngines(
      seed.engines.map((engine) => ({
        ...engine,
        create: () => {
          record('voice.engine.create', [engine.id])
          return provider
        },
      })),
    )
    restores.push(() => registerVoiceEngines([]))
  }

  /**
   * The newest session, which every control reaches.
   *
   * @param control - The control's name, for the error.
   * @returns The session.
   */
  const current = (control: string): Session => {
    if (!session)
      throw new Error(`conformance: ${control} reached no dictation session (none started)`)
    return session
  }
  const setState = (next: VoiceState, handlers: VoiceEventHandlers): void => {
    state = next
    handlers.onStateChange?.(next)
  }
  return {
    controls: {
      'voice.start': () => {
        const s = current('voice.start')
        if (s.kind === 'speech') s.recognition.onstart?.()
        else setState('listening', s.handlers)
      },
      'voice.result': (transcript: unknown, isFinal: unknown = true) => {
        const s = current('voice.result')
        const text = String(transcript)
        const final = isFinal === true
        if (s.kind === 'provider') {
          s.handlers.onTranscript?.({ transcript: text, isFinal: final, confidence: 1 })
          return
        }
        s.results.push(Object.assign([{ transcript: text, confidence: 1 }], { isFinal: final }))
        s.recognition.onresult?.({ resultIndex: s.results.length - 1, results: s.results })
      },
      'voice.error': (code: unknown) => {
        const s = current('voice.error')
        const error = String(code)
        if (s.kind === 'speech') s.recognition.onerror?.({ error, message: '' })
        else s.handlers.onError?.({ code: error, message: error })
      },
      'voice.end': () => {
        const s = current('voice.end')
        if (s.kind === 'speech') s.recognition.onend?.()
        else setState('idle', s.handlers)
      },
      'voice.state': (next: unknown) => {
        const s = current('voice.state')
        if (s.kind !== 'provider')
          throw new Error('conformance: voice.state reaches a provider session only')
        const known = VOICE_STATES.find((value) => value === next)
        if (!known)
          throw new Error(`conformance: voice.state takes one of ${VOICE_STATES.join(', ')}`)
        setState(known, s.handlers)
      },
    },
    dispose: () => {
      for (const restore of restores.reverse()) restore()
    },
  }
}
