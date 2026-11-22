/**
 * The chat panel's voice region (dictation) as framework-neutral behaviour.
 *
 * Every framework's chat panel drives the same dictation paths: the browser's
 * Web Speech service when it works, the bonded on-device provider when it does
 * not, and (when the app registers an engine catalog) whichever engine the
 * person chose in the `/mic` picker. This controller owns that machinery — the
 * recognition session, the restart/watchdog timers, the engine choice and the
 * give-up detection — and reads every browser API it needs from its options:
 * the Web Speech constructor, the ai-voice provider, the engine catalog lookup,
 * storage, the clock and the timers. It performs no I/O when it is constructed;
 * the host starts its work from the effects it already keeps in place.
 *
 * The host keeps the values it renders (the listening flag, the error/notice
 * text, the dead-service flag, the picker and the chosen engine id) in its own
 * state and passes the setters in, so the controller never owns view state and
 * the rendered output does not move.
 *
 * @module
 */

import type { TranslateFunction } from '@molecule/app-i18n'

/**
 * A dictation engine option as this controller reads it: the identity it
 * persists, how it runs, and the languages it covers. `@molecule/app-ai-voice`'s
 * `VoiceEngineDef` is assignable to this shape.
 */
export interface DictationEngine {
  /** Stable engine id (persisted as the user's choice). */
  id: string
  /** How the engine runs: the browser's service or an on-device model. */
  kind: 'native' | 'on-device'
  /** Language coverage: 'all', or the ISO 639-1 codes the engine can transcribe. */
  languages: 'all' | readonly string[]
}

/** A transcript (interim or final) as the on-device provider reports it. */
export interface DictationVoiceTranscriptEvent {
  /** The recognized text. */
  transcript: string
  /** Whether this is a final (stable) result or an interim (partial) result. */
  isFinal: boolean
  /** Confidence score from 0 to 1. */
  confidence: number
}

/** A voice error as the on-device provider reports it. */
export interface DictationVoiceErrorEvent {
  /** Machine-readable error code (e.g. 'not-allowed', 'no-speech', 'network'). */
  code: string
  /** Human-readable error description. */
  message: string
}

/** The possible states of the on-device voice provider. */
export type DictationVoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error'

/** Options for an on-device recognition request. */
export interface DictationVoiceRecognitionOptions {
  /** BCP-47 language code (e.g. 'en-US'). */
  language?: string
  /** When true, recognition continues after the first final result. */
  continuous?: boolean
  /** When true, interim (partial) results are reported. */
  interimResults?: boolean
  /** Maximum number of alternative transcriptions to return. */
  maxAlternatives?: number
}

/** Event handlers for an on-device recognition request. */
export interface DictationVoiceEventHandlers {
  /** Called when a transcript (interim or final) is available. */
  onTranscript?: (event: DictationVoiceTranscriptEvent) => void
  /** Called when the voice state changes. */
  onStateChange?: (state: DictationVoiceState) => void
  /** Called when an error occurs. */
  onError?: (event: DictationVoiceErrorEvent) => void
}

/**
 * The part of a bonded ai-voice provider this controller uses.
 * `@molecule/app-ai-voice`'s `AIVoiceProvider` is assignable to this shape.
 */
export interface DictationVoiceProvider {
  /**
   * Checks whether speech recognition (STT) is supported.
   * @returns True when supported.
   */
  isRecognitionSupported(): boolean
  /**
   * Starts speech recognition.
   * @param options - Recognition options (language, continuous mode, etc.).
   * @param handlers - Callbacks for transcript results, state changes, and errors.
   */
  startListening(
    options?: DictationVoiceRecognitionOptions,
    handlers?: DictationVoiceEventHandlers,
  ): void
  /** Stops speech recognition. */
  stopListening(): void
}

/** One Web Speech recognition session, as the browser constructs it. */
export interface SpeechRecognitionSession {
  /** Starts listening. */
  start(): void
  /** Stops listening and may still deliver a final result. */
  stop(): void
  /** Stops listening and discards pending results. */
  abort(): void
  /** Called when the service started. */
  onstart: (() => void) | null
  /** Called with each recognition result. */
  onresult: ((event: unknown) => void) | null
  /** Called when the session ends. */
  onend: (() => void) | null
  /** Called when the session fails. */
  onerror: ((event: unknown) => void) | null
  /** Whether the session continues after the first result. */
  continuous: boolean
  /** Whether interim (partial) results are reported. */
  interimResults: boolean
  /** BCP-47 language tag of the session. */
  lang: string
}

/** The browser's Web Speech constructor (`SpeechRecognition`). */
export type SpeechRecognitionConstructor = new () => SpeechRecognitionSession

/** The key/value store the controller reads and writes (a Web Storage area). */
export interface DictationStorage {
  /**
   * Reads a stored value.
   * @param key - The storage key.
   * @returns The stored value, or null.
   */
  getItem(key: string): string | null
  /**
   * Stores a value.
   * @param key - The storage key.
   * @param value - The value to store.
   */
  setItem(key: string, value: string): void
  /**
   * Removes a stored value.
   * @param key - The storage key.
   */
  removeItem(key: string): void
}

/** An opaque scheduled-timer handle, as the platform's `setTimeout` returns it. */
export type DictationTimer = ReturnType<typeof setTimeout>

/** Why an engine can't be used on this device, or null when it can. */
export type DictationEngineDisabledReason = 'browser' | 'language' | null

/** Session-storage key remembering that the browser's Web Speech service proved dead. */
export const WEB_SPEECH_DEAD_STORAGE_KEY = 'molecule.ide.webSpeechDead'

/** Local-storage key holding the user's chosen dictation engine id. */
export const MIC_ENGINE_STORAGE_KEY = 'molecule.ide.voiceEngine'

/** How long an error message stays visible, in milliseconds. */
const VOICE_ERROR_MS = 8000

/** How long a started-but-silent Web Speech session waits before it is declared dead. */
const WEB_SPEECH_WATCHDOG_MS = 5000

/** How long a no-result session waits before it restarts. */
const WEB_SPEECH_RESTART_MS = 300

/** Consecutive rapid no-result failures before the service is declared dead. */
const VOICE_FAIL_LIMIT = 3

/** What the controller reads from its host and its environment. */
export interface ChatDictationControllerOptions {
  /** Translates the fallback messages the controller shows. */
  translate: TranslateFunction
  /** The browser's Web Speech constructor, or undefined when the browser has none. */
  speechRecognitionConstructor?: SpeechRecognitionConstructor
  /** The app's registered engine catalog (empty when the app offers no choice). */
  engines?: readonly DictationEngine[]
  /**
   * Selects an engine by id: bonds its provider and remembers the choice.
   * @param id - The engine id to select.
   * @returns The selected engine, or null when the id is not registered.
   */
  selectEngine: (id: string) => DictationEngine | null
  /**
   * Checks whether an engine covers a BCP-47 language tag.
   * @param engine - The engine to check.
   * @param language - BCP-47 tag (e.g. 'en-US').
   * @returns True when the engine can transcribe the language.
   */
  engineCoversLanguage(engine: DictationEngine, language: string): boolean
  /**
   * Returns the bonded on-device provider, or null when none is wired.
   * @returns The provider or null.
   */
  getVoiceProvider: () => DictationVoiceProvider | null
  /**
   * Reads the composer draft.
   * @returns The current draft text.
   */
  readInput: () => string
  /**
   * Replaces the composer draft.
   * @param value - The new draft text.
   */
  writeInput: (value: string) => void
  /**
   * Records a final transcript inserted into the current draft.
   * @param transcript - The inserted transcript.
   */
  pushDictatedSnippet: (transcript: string) => void
  /** Grows the composer to fit the inserted transcript. */
  onTranscriptInserted: () => void
  /** Called when a dictation session begins (pauses the auto-fix countdown). */
  onDictationStart: () => void
  /** Closes the sibling composer popups before the mic picker opens. */
  closeSiblingPopups: () => void
  /** Opens the `/mic` engine picker for a mic-click-initiated choice. */
  openMicPicker: () => void
  /** Closes the `/mic` engine picker. */
  closeMicPicker: () => void
  /**
   * Sets the rendered listening flag.
   * @param listening - Whether a dictation session is active.
   */
  setListening: (listening: boolean) => void
  /**
   * Sets the rendered error message.
   * @param message - The message, or null to clear it.
   */
  setVoiceError: (message: string | null) => void
  /**
   * Sets the rendered secondary notice.
   * @param message - The notice, or null to clear it.
   */
  setVoiceNotice: (message: string | null) => void
  /**
   * Sets the rendered dead-service flag.
   * @param dead - Whether the browser's speech service proved dead.
   */
  setWebSpeechDead: (dead: boolean) => void
  /**
   * Sets the rendered chosen-engine id.
   * @param id - The engine id, or null when no engine is chosen.
   */
  setCurrentVoiceEngineId: (id: string | null) => void
  /**
   * Reads the current time. Defaults to `Date.now`.
   * @returns Milliseconds since the epoch.
   */
  now?: () => number
  /**
   * Schedules a callback. Defaults to `setTimeout`.
   * @param callback - The callback to run.
   * @param delayMs - The delay in milliseconds.
   * @returns The timer handle.
   */
  setTimer?: (callback: () => void, delayMs: number) => DictationTimer
  /**
   * Cancels a scheduled callback. Defaults to `clearTimeout`.
   * @param timer - The timer handle to cancel.
   */
  clearTimer?: (timer: DictationTimer) => void
  /**
   * Reads the UI language. Defaults to `navigator.language`.
   * @returns A BCP-47 language tag.
   */
  getLanguage?: () => string
  /**
   * Returns the session storage area, or undefined when unavailable.
   * @returns The store or undefined.
   */
  sessionStore?: () => DictationStorage | undefined
  /**
   * Returns the local storage area, or undefined when unavailable.
   * @returns The store or undefined.
   */
  localStore?: () => DictationStorage | undefined
}

/**
 * The voice region's behaviour (see the module docs). The host subscribes to
 * nothing: it keeps the values it renders in its own state, hands the controller
 * its setters, and calls {@link ChatDictationController.mount},
 * {@link ChatDictationController.restoreSavedEngine} and
 * {@link ChatDictationController.dispose} from the effects it already keeps in
 * place, so the order of the host's requests and timers cannot move.
 */
export class ChatDictationController {
  private readonly translate: TranslateFunction
  private readonly speechRecognitionConstructor: SpeechRecognitionConstructor | undefined
  private readonly hasSpeechRecognition: boolean
  private readonly engines: readonly DictationEngine[]
  private readonly selectEngine: (id: string) => DictationEngine | null
  private readonly engineCoversLanguage: (engine: DictationEngine, language: string) => boolean
  private readonly getVoiceProvider: () => DictationVoiceProvider | null
  private readonly readInput: () => string
  private readonly writeInput: (value: string) => void
  private readonly pushDictatedSnippet: (transcript: string) => void
  private readonly onTranscriptInserted: () => void
  private readonly onDictationStart: () => void
  private readonly closeSiblingPopups: () => void
  private readonly openMicPicker: () => void
  private readonly closeMicPicker: () => void
  private readonly setListening: (listening: boolean) => void
  private readonly setVoiceError: (message: string | null) => void
  private readonly setVoiceNotice: (message: string | null) => void
  private readonly setWebSpeechDead: (dead: boolean) => void
  private readonly setCurrentVoiceEngineId: (id: string | null) => void
  private readonly now: () => number
  private readonly setTimer: (callback: () => void, delayMs: number) => DictationTimer
  private readonly clearTimer: (timer: DictationTimer) => void
  private readonly getLanguage: () => string
  private readonly sessionStore: () => DictationStorage | undefined
  private readonly localStore: () => DictationStorage | undefined

  private recognition: SpeechRecognitionSession | null = null
  private voiceErrorTimer: DictationTimer | null = null
  private voiceRestartTimer: DictationTimer | null = null
  private voiceWatchdogTimer: DictationTimer | null = null
  private voiceIntent = false
  private voiceDiscard = false
  private voiceFailCount = 0
  private voiceLastStart = 0
  private useLocalVoice = false
  private webSpeechDead = false
  private engine: DictationEngine | null = null

  /**
   * Wires the controller. Performs no I/O: every API it needs is stored, not
   * called, and the host's effects start the work.
   *
   * @param options - The host callbacks and the browser APIs the controller uses.
   */
  constructor(options: ChatDictationControllerOptions) {
    this.translate = options.translate
    this.speechRecognitionConstructor = options.speechRecognitionConstructor
    this.hasSpeechRecognition = Boolean(options.speechRecognitionConstructor)
    this.engines = options.engines ?? []
    this.selectEngine = options.selectEngine
    this.engineCoversLanguage = options.engineCoversLanguage
    this.getVoiceProvider = options.getVoiceProvider
    this.readInput = options.readInput
    this.writeInput = options.writeInput
    this.pushDictatedSnippet = options.pushDictatedSnippet
    this.onTranscriptInserted = options.onTranscriptInserted
    this.onDictationStart = options.onDictationStart
    this.closeSiblingPopups = options.closeSiblingPopups
    this.openMicPicker = options.openMicPicker
    this.closeMicPicker = options.closeMicPicker
    this.setListening = options.setListening
    this.setVoiceError = options.setVoiceError
    this.setVoiceNotice = options.setVoiceNotice
    this.setWebSpeechDead = options.setWebSpeechDead
    this.setCurrentVoiceEngineId = options.setCurrentVoiceEngineId
    this.now = options.now ?? (() => Date.now())
    this.setTimer = options.setTimer ?? ((callback, delayMs) => setTimeout(callback, delayMs))
    this.clearTimer = options.clearTimer ?? ((timer) => clearTimeout(timer))
    this.getLanguage =
      options.getLanguage ??
      (() => (typeof navigator === 'undefined' ? '' : navigator.language) || 'en-US')
    this.sessionStore = options.sessionStore ?? (() => globalThis.sessionStorage)
    this.localStore = options.localStore ?? (() => globalThis.localStorage)
  }

  /**
   * Restores the session-scoped dead-service flag from storage. Called from the
   * host's mount effect.
   */
  mount(): void {
    try {
      this.webSpeechDead = this.sessionStore()?.getItem(WEB_SPEECH_DEAD_STORAGE_KEY) === '1'
    } catch (_error) {
      // sessionStorage unavailable — the watchdog re-detects within one session
    }
  }

  /**
   * Restores the user's saved engine choice. Called from the host's
   * engine-restore effect (a no-op when the app registers no catalog).
   */
  restoreSavedEngine(): void {
    if (this.engines.length === 0) return
    try {
      const savedId = this.localStore()?.getItem(MIC_ENGINE_STORAGE_KEY)
      if (savedId) {
        const def = this.selectEngine(savedId)
        if (def) this.engine = def
      }
    } catch (_error) {
      // localStorage unavailable — the picker simply reopens on first use
    }
  }

  /**
   * Why an engine can't be used here, or null when it can: 'browser' = the
   * native speech service is missing/proven dead in this browser; 'language'
   * = the engine doesn't cover the UI language.
   *
   * @param def - The engine to check.
   * @param webSpeechDead - Whether the rendered dead-service flag is set.
   * @returns The reason, or null when the engine can be used.
   */
  voiceEngineDisabledReason(
    def: DictationEngine,
    webSpeechDead: boolean,
  ): DictationEngineDisabledReason {
    if (def.kind === 'native' && (!this.hasSpeechRecognition || webSpeechDead)) {
      return 'browser'
    }
    if (!this.engineCoversLanguage(def, this.getLanguage())) return 'language'
    return null
  }

  /**
   * Shows an error message, replacing any current one and clearing it after
   * {@link VOICE_ERROR_MS}.
   *
   * @param message - The message to show.
   */
  showVoiceError(message: string): void {
    this.setVoiceError(message)
    if (this.voiceErrorTimer) this.clearTimer(this.voiceErrorTimer)
    this.voiceErrorTimer = this.setTimer(() => {
      this.voiceErrorTimer = null
      this.setVoiceError(null)
    }, VOICE_ERROR_MS)
  }

  /**
   * Starts dictation through the bonded on-device provider. Returns false when
   * no usable provider is wired, so the caller can fall through to the
   * "dictation unavailable" path.
   *
   * @returns True when the provider started listening.
   */
  startLocalVoice(): boolean {
    const localVoice = this.getVoiceProvider()
    if (!localVoice || !localVoice.isRecognitionSupported()) return false
    this.useLocalVoice = true
    // Shown until the provider reaches 'listening' (model may need a download)
    this.setVoiceNotice(
      this.translate('ide.chat.voicePreparing', undefined, {
        defaultValue: 'Preparing dictation — this can take a moment on first use.',
      }),
    )
    localVoice.startListening(
      {
        language: this.getLanguage(),
        continuous: true,
        interimResults: false,
      },
      {
        onTranscript: (event) => {
          if (this.voiceDiscard || !event.isFinal || !event.transcript) return
          const prev = this.readInput()
          this.writeInput(prev ? `${prev} ${event.transcript}` : event.transcript)
          this.pushDictatedSnippet(event.transcript)
          this.onTranscriptInserted()
        },
        onStateChange: (state) => {
          if (state === 'listening') this.setVoiceNotice(null)
        },
        onError: (event) => {
          if (event.code === 'not-allowed') {
            this.voiceIntent = false
            this.setListening(false)
            this.setVoiceNotice(null)
            this.showVoiceError(
              this.translate('ide.chat.voiceMicBlocked', undefined, {
                defaultValue: 'Microphone access is blocked.',
              }),
            )
            return
          }
          if (event.code === 'transcription-failed') {
            // One chunk failed; the session keeps listening
            this.showVoiceError(
              this.translate('ide.chat.voiceTranscribeFailed', undefined, {
                defaultValue: 'Transcription failed.',
              }),
            )
            return
          }
          // not-supported / start-failed — the fallback itself is unusable
          this.voiceIntent = false
          this.setListening(false)
          this.setVoiceNotice(null)
          this.showVoiceError(
            this.translate('ide.chat.voiceUnavailable', undefined, {
              defaultValue: 'Dictation is not available in this browser.',
            }),
          )
        },
      },
    )
    return true
  }

  /**
   * Starts one Web Speech session, restarting it after a healthy end and giving
   * up (delegating to the on-device provider or the unavailable path) when the
   * service never answers or fails repeatedly.
   */
  startRecognition(): void {
    // One attempt; a healthy session that ends (or a short-lived failure) starts the
    // next attempt through `start`, with this same render's values.
    const start = (): void => {
      const Ctor = this.speechRecognitionConstructor
      if (!Ctor || !this.voiceIntent) return

      const recognition = new Ctor()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = this.getLanguage()

      let gotResult = false

      const clearWatchdog = (): void => {
        if (this.voiceWatchdogTimer) {
          this.clearTimer(this.voiceWatchdogTimer)
          this.voiceWatchdogTimer = null
        }
      }

      // The Web Speech service itself is broken (not just this session): stop
      // retrying it for good — instead of flicker-restarting forever. If an
      // on-device provider is bonded, hand the same gesture over to it
      // seamlessly; otherwise turn the button off and say so.
      const giveUp = (): void => {
        clearWatchdog()
        this.voiceFailCount = 0
        this.recognition = null
        this.webSpeechDead = true
        this.setWebSpeechDead(true)
        try {
          this.sessionStore()?.setItem(WEB_SPEECH_DEAD_STORAGE_KEY, '1')
        } catch (_error) {
          // sessionStorage unavailable — the watchdog re-detects next time
        }
        try {
          recognition.abort()
        } catch (_error) {
          // abort() on a never-started/already-ended session throws harmlessly
        }
        // With an engine catalog, the native engine just proved dead: clear the
        // user's (native) choice and reopen the picker so THEY pick a fallback —
        // the native row now shows as disabled with the reason.
        if (this.engines.length > 0) {
          this.engine = null
          this.setCurrentVoiceEngineId(null)
          try {
            this.localStore()?.removeItem(MIC_ENGINE_STORAGE_KEY)
          } catch (_error) {
            // localStorage unavailable — the stale choice re-fails harmlessly
          }
          this.voiceIntent = false
          this.setListening(false)
          this.closeSiblingPopups()
          this.openMicPicker()
          return
        }
        if (this.voiceIntent && this.startLocalVoice()) {
          return
        }
        this.voiceIntent = false
        this.setListening(false)
        this.showVoiceError(
          this.translate('ide.chat.voiceUnavailable', undefined, {
            defaultValue: 'Dictation is not available in this browser.',
          }),
        )
      }

      recognition.onstart = () => {
        clearWatchdog()
      }

      recognition.onresult = (e: unknown) => {
        gotResult = true
        this.voiceFailCount = 0
        const event = e as {
          results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>
          resultIndex: number
        }
        let transcript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript
          }
        }
        if (transcript) {
          const prev = this.readInput()
          this.writeInput(prev ? `${prev} ${transcript}` : transcript)
          this.pushDictatedSnippet(transcript)
          this.onTranscriptInserted()
        }
      }

      recognition.onend = () => {
        clearWatchdog()
        this.recognition = null
        if (!this.voiceIntent) {
          this.setListening(false)
          return
        }
        // If we got results, the session was healthy — restart immediately
        if (gotResult) {
          this.voiceFailCount = 0
          start()
          return
        }
        // No results — could be a rapid failure loop. Track it.
        const elapsed = this.now() - this.voiceLastStart
        if (elapsed < 1000) {
          this.voiceFailCount++
        } else {
          this.voiceFailCount = 0
        }
        // Too many rapid no-result failures — the service is not working
        if (this.voiceFailCount >= VOICE_FAIL_LIMIT) {
          giveUp()
          return
        }
        // Restart after a short delay so we don't spin
        this.voiceRestartTimer = this.setTimer(() => {
          this.voiceRestartTimer = null
          if (this.voiceIntent) start()
        }, WEB_SPEECH_RESTART_MS)
      }

      recognition.onerror = (e: unknown) => {
        const error = (e as { error?: string }).error
        // In the Chromium family a 'network' error means the browser has no
        // reachable speech backend (Brave, ungoogled builds) — it will fail
        // identically every session, so retrying just flickers.
        if (error === 'network' || error === 'language-not-supported') {
          giveUp()
          return
        }
        if (error === 'not-allowed' || error === 'service-not-allowed') {
          clearWatchdog()
          this.voiceIntent = false
          this.recognition = null
          this.setListening(false)
          this.showVoiceError(
            this.translate('ide.chat.voiceMicBlocked', undefined, {
              defaultValue: 'Microphone access is blocked.',
            }),
          )
        }
        // Other errors (no-speech, audio-capture, aborted) — onend will handle restart
      }

      this.recognition = recognition
      this.voiceLastStart = this.now()
      try {
        recognition.start()
      } catch (_error) {
        // start() throws InvalidStateError if a previous session is still tearing
        // down — treat it like any other dead session rather than crash the click
        giveUp()
        return
      }
      // Watchdog: some broken implementations accept start() and then never fire a
      // single event (verified in Brave: no onstart, no onerror, no onend).
      this.voiceWatchdogTimer = this.setTimer(() => {
        this.voiceWatchdogTimer = null
        giveUp()
      }, WEB_SPEECH_WATCHDOG_MS)
    }
    start()
  }

  /** Begins a dictation session on whatever engine/path is active. */
  beginDictation(): void {
    this.voiceIntent = true
    this.voiceDiscard = false
    this.voiceFailCount = 0
    this.setVoiceError(null)
    if (this.voiceErrorTimer) {
      this.clearTimer(this.voiceErrorTimer)
      this.voiceErrorTimer = null
    }
    this.setListening(true)
    this.onDictationStart()
    if (this.engines.length > 0) {
      // Catalog mode: the chosen engine decides the path
      if (this.engine?.kind === 'native') {
        this.startRecognition()
      } else {
        this.useLocalVoice = true
        if (!this.startLocalVoice()) {
          this.voiceIntent = false
          this.setListening(false)
          this.showVoiceError(
            this.translate('ide.chat.voiceUnavailable', undefined, {
              defaultValue: 'Dictation is not available in this browser.',
            }),
          )
        }
      }
      return
    }
    // Legacy (no catalog): Web Speech first, on-device fallback automatic
    if (!this.hasSpeechRecognition || this.webSpeechDead || this.useLocalVoice) {
      if (this.startLocalVoice()) return
      this.voiceIntent = false
      this.setListening(false)
      this.showVoiceError(
        this.translate('ide.chat.voiceUnavailable', undefined, {
          defaultValue: 'Dictation is not available in this browser.',
        }),
      )
      return
    }
    this.startRecognition()
  }

  /**
   * Applies a picker choice: wires the engine, persists it, and (for a
   * mic-click-initiated pick) starts dictating immediately.
   *
   * @param def - The engine the person chose.
   * @param autoStart - Whether to start dictating right after choosing.
   */
  chooseVoiceEngine(def: DictationEngine, autoStart: boolean): void {
    this.closeMicPicker()
    const selected = this.selectEngine(def.id)
    if (!selected) return
    this.engine = selected
    this.setCurrentVoiceEngineId(selected.id)
    this.useLocalVoice = selected.kind !== 'native'
    try {
      this.localStore()?.setItem(MIC_ENGINE_STORAGE_KEY, selected.id)
    } catch (_error) {
      // localStorage unavailable — the picker reopens next session
    }
    if (autoStart) this.beginDictation()
  }

  /**
   * Turns dictation on or off from the mic button.
   *
   * @param isListening - Whether a session is currently active (the host's state).
   */
  toggleVoice(isListening: boolean): void {
    if (isListening) {
      this.voiceIntent = false
      if (this.voiceRestartTimer) {
        this.clearTimer(this.voiceRestartTimer)
        this.voiceRestartTimer = null
      }
      if (this.voiceWatchdogTimer) {
        this.clearTimer(this.voiceWatchdogTimer)
        this.voiceWatchdogTimer = null
      }
      // Don't wait for onend — a hung session (dead service) never fires it
      this.setListening(false)
      this.setVoiceNotice(null)
      if (this.useLocalVoice) {
        // On-device provider: trailing speech is still transcribed + inserted
        this.getVoiceProvider()?.stopListening()
      } else {
        this.recognition?.stop()
      }
      return
    }
    // With an engine catalog and no choice made yet, the first mic click asks
    // the user which engine to use (and download) instead of picking for them.
    if (this.engines.length > 0 && !this.engine) {
      // Popups are one-at-a-time — close any sibling before opening the picker
      this.closeSiblingPopups()
      this.openMicPicker()
      return
    }
    this.beginDictation()
  }

  /**
   * Stops recognition when the composer submits: clears the intent and timers,
   * and drops any trailing transcript from the provider so it does not land in
   * the freshly-cleared composer. Called from the host's submit handler.
   */
  stopForSubmit(): void {
    // Stop voice recognition on submit
    this.voiceIntent = false
    if (this.voiceWatchdogTimer) {
      this.clearTimer(this.voiceWatchdogTimer)
      this.voiceWatchdogTimer = null
    }
    this.setListening(false)
    this.setVoiceNotice(null)
    if (this.useLocalVoice) {
      // Discard any trailing transcript — it belongs to the message just sent,
      // not the freshly-cleared composer
      this.voiceDiscard = true
      this.getVoiceProvider()?.stopListening()
    } else {
      this.recognition?.stop()
    }
  }

  /**
   * Stops recognition and every timer on unmount. Called from the host's
   * cleanup effect.
   */
  dispose(): void {
    this.voiceIntent = false
    if (this.voiceRestartTimer) {
      this.clearTimer(this.voiceRestartTimer)
      this.voiceRestartTimer = null
    }
    if (this.voiceWatchdogTimer) {
      this.clearTimer(this.voiceWatchdogTimer)
      this.voiceWatchdogTimer = null
    }
    if (this.voiceErrorTimer) {
      this.clearTimer(this.voiceErrorTimer)
      this.voiceErrorTimer = null
    }
    this.recognition?.abort()
    if (this.useLocalVoice) {
      // stopListening, not dispose — the bonded provider is an app-wide
      // singleton other consumers may use after this panel unmounts
      this.voiceDiscard = true
      this.getVoiceProvider()?.stopListening()
    }
  }
}
