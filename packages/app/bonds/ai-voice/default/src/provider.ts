/**
 * Default AI voice provider using the Web Speech API.
 *
 * Uses the browser-native SpeechRecognition API for speech-to-text
 * and the SpeechSynthesis API for text-to-speech. Works in modern
 * browsers without any external dependencies.
 *
 * @module
 */

import type {
  AIVoiceProvider,
  VoiceDescriptor,
  VoiceEventHandlers,
  VoiceRecognitionOptions,
  VoiceState,
  VoiceSynthesisOptions,
} from '@molecule/app-ai-voice'

import type { DefaultVoiceConfig } from './types.js'

/**
 * Resolves the SpeechRecognition constructor, accounting for vendor prefixes.
 * @returns The SpeechRecognition constructor or null if unsupported.
 */
function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof globalThis === 'undefined') return null
  const g = globalThis as Record<string, unknown>
  return (g.SpeechRecognition ?? g.webkitSpeechRecognition ?? null) as
    | (new () => SpeechRecognition)
    | null
}

/**
 * Returns the SpeechSynthesis instance if available.
 * @returns The speechSynthesis instance or null if unsupported.
 */
function getSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof globalThis === 'undefined') return null
  return (
    ((globalThis as Record<string, unknown>).speechSynthesis as SpeechSynthesis | undefined) ?? null
  )
}

/**
 * Resolves the SpeechSynthesisUtterance constructor from globalThis.
 * @returns The SpeechSynthesisUtterance constructor or null if unsupported.
 */
function getUtteranceCtor(): (new (text: string) => SpeechSynthesisUtterance) | null {
  if (typeof globalThis === 'undefined') return null
  return (
    ((globalThis as Record<string, unknown>).SpeechSynthesisUtterance as
      | (new (text: string) => SpeechSynthesisUtterance)
      | undefined) ?? null
  )
}

/**
 * Default voice provider implementation using the browser Web Speech API.
 *
 * Provides speech-to-text via SpeechRecognition and text-to-speech via
 * SpeechSynthesis. Falls back gracefully when APIs are unavailable.
 */
export class DefaultVoiceProvider implements AIVoiceProvider {
  readonly name = 'default'

  private state: VoiceState = 'idle'
  private config: DefaultVoiceConfig
  private recognition: SpeechRecognition | null = null
  private handlers: VoiceEventHandlers = {}
  private disposed = false
  private shouldRestart = false

  /**
   * Creates a new DefaultVoiceProvider.
   * @param config - Provider configuration with default recognition/synthesis options.
   */
  constructor(config: DefaultVoiceConfig = {}) {
    this.config = config
  }

  /**
   * Starts speech recognition using the Web Speech API.
   * @param options - Recognition options that override defaults from config.
   * @param handlers - Callbacks for transcript results, state changes, and errors.
   */
  startListening(options?: VoiceRecognitionOptions, handlers?: VoiceEventHandlers): void {
    if (this.disposed) return

    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      handlers?.onError?.({
        code: 'not-supported',
        message: 'Speech recognition is not supported in this browser',
      })
      return
    }

    // Stop any existing recognition session before starting a new one
    this.stopListening()

    this.handlers = handlers ?? {}
    const merged = { ...this.config.recognition, ...options }

    const recognition = new Ctor()
    recognition.lang = merged.language ?? 'en-US'
    recognition.continuous = merged.continuous ?? false
    recognition.interimResults = merged.interimResults ?? true
    recognition.maxAlternatives = merged.maxAlternatives ?? 1

    this.shouldRestart = this.config.autoRestart !== false && (merged.continuous ?? false)

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results[event.results.length - 1]
      if (!last) return
      const alt = last[0]
      if (!alt) return
      this.handlers.onTranscript?.({
        transcript: alt.transcript,
        isFinal: last.isFinal,
        confidence: alt.confidence,
      })
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // 'aborted' fires when we call stop() intentionally — not a real error
      if (event.error === 'aborted') return

      // 'no-speech' in continuous mode is recoverable — just keep listening
      if (event.error === 'no-speech' && this.shouldRestart) return

      this.setState('error')
      this.handlers.onError?.({
        code: event.error,
        message: event.message || `Speech recognition error: ${event.error}`,
      })
    }

    recognition.onstart = () => {
      this.setState('listening')
    }

    recognition.onend = () => {
      // Auto-restart in continuous mode if we haven't been explicitly stopped
      if (this.shouldRestart && !this.disposed && this.state === 'listening') {
        try {
          recognition.start()
        } catch {
          this.setState('idle')
        }
        return
      }
      if (this.state !== 'error') {
        this.setState('idle')
      }
    }

    this.recognition = recognition

    try {
      recognition.start()
    } catch (err) {
      this.handlers.onError?.({
        code: 'start-failed',
        message: err instanceof Error ? err.message : 'Failed to start speech recognition',
      })
    }
  }

  /**
   * Stops the current speech recognition session.
   */
  stopListening(): void {
    this.shouldRestart = false
    if (this.recognition) {
      try {
        this.recognition.abort()
      } catch {
        // Already stopped
      }
      this.recognition = null
    }
    if (this.state === 'listening') {
      this.setState('idle')
    }
  }

  /**
   * Speaks the given text using the Web Speech Synthesis API.
   * @param text - The text to speak aloud.
   * @param options - Synthesis options that override defaults from config.
   * @returns A promise that resolves when speech finishes or is interrupted.
   */
  async speak(text: string, options?: VoiceSynthesisOptions): Promise<void> {
    if (this.disposed) return

    const synth = getSpeechSynthesis()
    if (!synth) {
      throw new Error('Speech synthesis is not supported in this browser')
    }

    // Cancel any current speech
    synth.cancel()

    const merged = { ...this.config.synthesis, ...options }
    const Utterance = getUtteranceCtor()
    if (!Utterance) {
      throw new Error('Speech synthesis is not supported in this browser')
    }
    const utterance = new Utterance(text)
    utterance.lang = merged.language ?? 'en-US'
    utterance.rate = merged.rate ?? 1
    utterance.pitch = merged.pitch ?? 1
    utterance.volume = merged.volume ?? 1

    // Resolve the voice by name if specified
    if (merged.voice) {
      const voices = synth.getVoices()
      const match = voices.find((v) => v.name === merged.voice || v.voiceURI === merged.voice)
      if (match) {
        utterance.voice = match
      }
    }

    this.setState('speaking')

    return new Promise<void>((resolve, reject) => {
      utterance.onend = () => {
        if (this.state === 'speaking') {
          this.setState('idle')
        }
        this.handlers.onSpeakEnd?.()
        resolve()
      }

      utterance.onerror = (event) => {
        // 'canceled' fires when we call cancel() intentionally
        if (event.error === 'canceled') {
          if (this.state === 'speaking') {
            this.setState('idle')
          }
          resolve()
          return
        }
        this.setState('error')
        this.handlers.onError?.({
          code: event.error,
          message: `Speech synthesis error: ${event.error}`,
        })
        reject(new Error(`Speech synthesis error: ${event.error}`))
      }

      synth.speak(utterance)
    })
  }

  /**
   * Stops any current speech synthesis.
   */
  stopSpeaking(): void {
    const synth = getSpeechSynthesis()
    if (synth) {
      synth.cancel()
    }
    if (this.state === 'speaking') {
      this.setState('idle')
    }
  }

  /**
   * Returns the current voice provider state.
   * @returns The current VoiceState.
   */
  getState(): VoiceState {
    return this.state
  }

  /**
   * Checks whether any voice feature (recognition or synthesis) is supported.
   * @returns True if at least one API is available.
   */
  isSupported(): boolean {
    return this.isRecognitionSupported() || this.isSynthesisSupported()
  }

  /**
   * Checks whether the SpeechRecognition API is available.
   * @returns True if speech recognition is supported.
   */
  isRecognitionSupported(): boolean {
    return getSpeechRecognitionCtor() !== null
  }

  /**
   * Checks whether the SpeechSynthesis API is available.
   * @returns True if speech synthesis is supported.
   */
  isSynthesisSupported(): boolean {
    return getSpeechSynthesis() !== null
  }

  /**
   * Returns the list of available speech synthesis voices.
   * Waits for voices to load if they haven't yet (some browsers load them asynchronously).
   * @returns A promise resolving to an array of VoiceDescriptor objects.
   */
  async getAvailableVoices(): Promise<VoiceDescriptor[]> {
    const synth = getSpeechSynthesis()
    if (!synth) return []

    let voices = synth.getVoices()
    if (voices.length === 0) {
      // Some browsers (Chrome) load voices asynchronously
      voices = await new Promise<SpeechSynthesisVoice[]>((resolve) => {
        const onVoicesChanged = () => {
          synth.removeEventListener('voiceschanged', onVoicesChanged)
          resolve(synth.getVoices())
        }
        synth.addEventListener('voiceschanged', onVoicesChanged)

        // Timeout after 2 seconds if voiceschanged never fires
        setTimeout(() => {
          synth.removeEventListener('voiceschanged', onVoicesChanged)
          resolve(synth.getVoices())
        }, 2000)
      })
    }

    return voices.map((v) => ({
      id: v.voiceURI,
      name: v.name,
      language: v.lang,
      isDefault: v.default,
      isLocal: v.localService,
    }))
  }

  /**
   * Cleans up resources: stops recognition and synthesis, removes references.
   */
  dispose(): void {
    this.disposed = true
    this.stopListening()
    this.stopSpeaking()
    this.handlers = {}
  }

  /**
   * Updates the internal state and notifies handlers.
   * @param newState - The new voice state.
   */
  private setState(newState: VoiceState): void {
    if (this.state !== newState) {
      this.state = newState
      this.handlers.onStateChange?.(newState)
    }
  }
}

/**
 * Creates a DefaultVoiceProvider instance.
 * @param config - Optional configuration with default recognition/synthesis options.
 * @returns A DefaultVoiceProvider that uses the browser Web Speech API.
 */
export function createProvider(config?: DefaultVoiceConfig): DefaultVoiceProvider {
  return new DefaultVoiceProvider(config)
}
