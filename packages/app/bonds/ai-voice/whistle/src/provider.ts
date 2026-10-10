/**
 * On-device Whistle voice provider using the Cactus needle WASM engine.
 *
 * Runs speech-to-text entirely in the browser (CPU-only WebAssembly — no
 * WebGPU needed): microphone audio is captured with the Web Audio API at
 * 16 kHz, segmented by a lightweight energy-based voice activity detector,
 * and transcribed by Cactus Compute's 16.9 MB Whistle model (`whistle.cact`,
 * Apache-2.0) in seven languages with optional keyword biasing and word
 * timestamps. No audio ever leaves the device, and it works in browsers that
 * ship no speech backend for the Web Speech API (Brave, ungoogled Chromium,
 * Firefox).
 *
 * Text-to-speech delegates to the browser's SpeechSynthesis API, which is
 * independent of the recognition engine.
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

import {
  DEFAULT_WHISTLE_ENGINE_URL,
  DEFAULT_WHISTLE_WEIGHTS_URL,
  loadWhistleEngine,
  WHISTLE_MAX_CLIP_SECONDS,
  WHISTLE_SAMPLE_RATE,
  type WhistleEngine,
} from './engine.js'
import { WHISTLE_LANGUAGES, type WhistleVoiceConfig } from './types.js'

/** ScriptProcessor buffer size (samples) — ~256 ms frames at 16 kHz. */
const FRAME_SIZE = 4096

/** Minimum amount of detected speech (seconds) worth transcribing. */
const MIN_SPEECH_SECONDS = 0.35

/**
 * Resolves getUserMedia, or null when unavailable.
 * @returns The bound getUserMedia function or null.
 */
function getGetUserMedia(): ((constraints: MediaStreamConstraints) => Promise<MediaStream>) | null {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return null
  return navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
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
 * Maps a BCP-47 language tag to its ISO 639-1 base code.
 * @param language - BCP-47 tag (e.g. 'en-US').
 * @returns The base code (e.g. 'en').
 */
function baseLanguage(language: string): string {
  return language.split('-')[0].toLowerCase()
}

/**
 * Checks whether Whistle can transcribe the given language. Whistle covers
 * exactly seven languages; use this at wiring time to pick between this
 * provider and a broader one (`@molecule/app-ai-voice-whisper`, ~99 languages).
 * @param language - BCP-47 language tag (e.g. 'en-US', 'pl').
 * @returns True when Whistle covers the language's base code.
 */
export function supportsRecognitionLanguage(language: string): boolean {
  return (WHISTLE_LANGUAGES as readonly string[]).includes(baseLanguage(language))
}

/**
 * Linearly resamples mono float PCM to 16 kHz (Whistle's required rate) —
 * needed when the browser's AudioContext ignores the requested sampleRate.
 * @param pcm - Input samples at `fromRate` Hz.
 * @param fromRate - The input sample rate.
 * @returns Samples resampled to 16 kHz.
 */
function resampleTo16k(pcm: Float32Array, fromRate: number): Float32Array {
  if (fromRate === WHISTLE_SAMPLE_RATE) return pcm
  const ratio = fromRate / WHISTLE_SAMPLE_RATE
  const outLength = Math.floor(pcm.length / ratio)
  const out = new Float32Array(outLength)
  for (let i = 0; i < outLength; i++) {
    const position = i * ratio
    const index = Math.floor(position)
    const frac = position - index
    const a = pcm[index] ?? 0
    const b = pcm[index + 1] ?? a
    out[i] = a + (b - a) * frac
  }
  return out
}

/**
 * On-device Whistle speech-to-text provider.
 *
 * Captures microphone audio, segments it on pauses, and transcribes each
 * segment locally with the 16.9 MB Whistle WASM engine.
 */
export class WhistleVoiceProvider implements AIVoiceProvider {
  readonly name = 'whistle'

  private state: VoiceState = 'idle'
  private config: WhistleVoiceConfig
  private handlers: VoiceEventHandlers = {}
  private disposed = false

  private enginePromise: Promise<WhistleEngine> | null = null

  private mediaStream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private processor: ScriptProcessorNode | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null

  private listening = false

  /**
   * Monotonic id of the capture setup that is allowed to finish. `listening`
   * alone cannot answer "is the async setup still the live one?" — a
   * stop-then-start inside one setup window flips it back to `true`, so a
   * superseded setup's `getUserMedia` continuation would read the NEW
   * session's `true` and build a second capture graph over the fields the new
   * session owns, leaving its own microphone open forever. Every setup
   * carries the id it started with and does nothing once superseded.
   */
  private sessionId = 0

  /**
   * The utterance that currently owns the `speaking` state. A replaced or
   * stopped utterance's end event still fires a beat later; only the CURRENT
   * utterance's handlers may flip the shared state or report `onSpeakEnd`.
   */
  private currentUtterance: SpeechSynthesisUtterance | null = null

  /** Language forced for the current listening session (null = auto-detect). */
  private sessionLanguage: string | null = null

  // VAD/chunking state
  private speechFrames: Float32Array[] = []
  private inSpeech = false
  private silentSamples = 0
  private speechSamples = 0

  // Serialized transcription queue
  private transcribeQueue: Float32Array[] = []
  private transcribing = false

  /**
   * Creates a new WhistleVoiceProvider.
   * @param config - Provider configuration (URLs, language, keywords, VAD tuning).
   */
  constructor(config: WhistleVoiceConfig = {}) {
    this.config = config
  }

  /**
   * Loads (or returns the cached) Whistle engine, reporting download progress
   * through `config.onModelProgress`. The engine is process-global: multiple
   * providers share one wasm instance.
   * @returns The ready-to-use engine.
   */
  private loadEngine(): Promise<WhistleEngine> {
    if (this.enginePromise) return this.enginePromise
    const promise = loadWhistleEngine(
      {
        jsUrl: this.config.engineUrl ?? DEFAULT_WHISTLE_ENGINE_URL,
        weightsUrl: this.config.weightsUrl ?? DEFAULT_WHISTLE_WEIGHTS_URL,
      },
      this.config.onModelProgress,
    )
    // The engine loader evicts a FAILED load so the next call retries; this
    // per-provider memo must drop the rejected promise the same way, or the
    // retry never happens for THIS provider — a transient download failure on
    // first use would fail every later startListening until the page reloads.
    // The rejection still reaches the current caller through `promise` itself.
    promise.catch(() => {
      if (this.enginePromise === promise) this.enginePromise = null
    })
    this.enginePromise = promise
    return promise
  }

  /**
   * Starts on-device speech recognition: opens the microphone, loads the
   * engine if needed, and emits a final transcript after each pause.
   * @param options - Recognition options. `language` (BCP-47) is forced on the
   *   model when it is one of Whistle's seven languages; an uncovered language
   *   reports a `language-not-supported` error instead of transcribing in the
   *   wrong language. `interimResults` is accepted but ignored.
   * @param handlers - Callbacks for transcripts, state changes, and errors.
   */
  startListening(options?: VoiceRecognitionOptions, handlers?: VoiceEventHandlers): void {
    if (this.disposed || this.listening) return

    this.handlers = handlers ?? {}

    const requested = options?.language ? baseLanguage(options.language) : undefined
    if (requested !== undefined && !supportsRecognitionLanguage(requested)) {
      this.handlers.onError?.({
        code: 'language-not-supported',
        message: `Whistle transcribes ${WHISTLE_LANGUAGES.join(', ')} — not '${requested}'`,
      })
      return
    }
    this.sessionLanguage = requested ?? this.config.language ?? null

    const getUserMedia = getGetUserMedia()
    if (!getUserMedia) {
      this.handlers.onError?.({
        code: 'not-supported',
        message: 'Microphone capture is not supported in this environment',
      })
      return
    }

    this.listening = true
    // Claim this setup: any earlier in-flight setup is now superseded and will
    // release whatever it opened (see `sessionId`).
    const session = ++this.sessionId
    // 'processing' until the engine is ready — consumers use the transition to
    // 'listening' to clear their "preparing dictation" indicator. Speech is
    // captured during the load and transcribed once the engine arrives.
    this.setState('processing')

    void (async () => {
      try {
        // Kick off the engine load and mic open in parallel — the first load
        // downloads ~18 MB and the mic prompt needs to appear now.
        const engineReady = this.loadEngine()
        const stream = await getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })
        if (this.sessionId !== session || this.disposed) {
          // A stop (or another start) superseded this setup while the mic was
          // opening: release the stream THIS call opened and touch nothing
          // else — the capture fields now belong to the live session, and
          // stopping ITS tracks here would kill the session the user can hear.
          for (const track of stream.getTracks()) track.stop()
          return
        }
        this.mediaStream = stream

        const context = new AudioContext({ sampleRate: WHISTLE_SAMPLE_RATE })
        this.audioContext = context
        this.sourceNode = context.createMediaStreamSource(stream)
        // ScriptProcessorNode is deprecated but has no replacement that works
        // without shipping a separate AudioWorklet module file, which npm
        // consumers' bundlers would each need to handle. Revisit when
        // AudioWorklet.addModule accepts inline modules everywhere.
        this.processor = context.createScriptProcessor(FRAME_SIZE, 1, 1)
        this.processor.onaudioprocess = (event) => {
          this.handleFrame(event.inputBuffer.getChannelData(0), context.sampleRate)
        }
        this.sourceNode.connect(this.processor)
        this.processor.connect(context.destination)

        await engineReady
        if (this.sessionId === session && !this.disposed) {
          this.setState('listening')
        }
      } catch (error) {
        // A setup that is no longer current must not tear down the LIVE
        // session's capture graph, clear its `listening` flag, or report its
        // own failure as the live session's error. Everything it opened was
        // either never assigned (it bailed above) or already released by the
        // stop/dispose that superseded it.
        if (this.sessionId !== session || this.disposed) return
        this.teardownCapture()
        // A start the caller already ended (stopListening during the mic/engine
        // setup, or dispose) is not a failed start: reporting 'error' + onError
        // here moved the state machine idle → error for a session that no
        // longer exists and nothing could ever acknowledge.
        this.listening = false
        this.setState('error')
        const isPermission = error instanceof DOMException && error.name === 'NotAllowedError'
        this.handlers.onError?.({
          code: isPermission ? 'not-allowed' : 'start-failed',
          message: error instanceof Error ? error.message : 'Failed to start speech recognition',
        })
      }
    })()
  }

  /**
   * Consumes one audio frame: tracks speech/silence via RMS energy and
   * flushes a chunk to the transcription queue when a pause ends it.
   * @param frame - Raw samples for this frame.
   * @param sampleRate - The capture context's actual sample rate.
   */
  private handleFrame(frame: Float32Array, sampleRate: number): void {
    if (!this.listening) return

    let sumSquares = 0
    for (let i = 0; i < frame.length; i++) sumSquares += frame[i] * frame[i]
    const rms = Math.sqrt(sumSquares / frame.length)

    const threshold = this.config.speechThreshold ?? 0.01
    const silenceMs = this.config.silenceMs ?? 800
    const maxChunkSeconds = Math.min(this.config.maxChunkSeconds ?? 15, WHISTLE_MAX_CLIP_SECONDS)

    if (rms >= threshold) {
      this.inSpeech = true
      this.silentSamples = 0
    } else if (this.inSpeech) {
      this.silentSamples += frame.length
    }

    if (this.inSpeech) {
      // Copy — the buffer is reused by the audio pipeline.
      this.speechFrames.push(new Float32Array(frame))
      this.speechSamples += frame.length

      const silenceReached = this.silentSamples >= (silenceMs / 1000) * sampleRate
      const capReached = this.speechSamples >= maxChunkSeconds * sampleRate
      if (silenceReached || capReached) {
        this.flushChunk(sampleRate)
      }
    }
  }

  /**
   * Moves the accumulated speech buffer into the transcription queue.
   * @param sampleRate - The capture sample rate, to size-gate tiny blips.
   */
  private flushChunk(sampleRate: number): void {
    const frames = this.speechFrames
    const totalSamples = this.speechSamples
    this.speechFrames = []
    this.inSpeech = false
    this.silentSamples = 0
    this.speechSamples = 0

    // Ignore blips shorter than the minimum — they're clicks, not words.
    if (totalSamples < MIN_SPEECH_SECONDS * sampleRate) return

    const chunk = new Float32Array(totalSamples)
    let offset = 0
    for (const frame of frames) {
      chunk.set(frame, offset)
      offset += frame.length
    }
    // Whistle needs 16 kHz exactly; some browsers ignore the AudioContext's
    // requested sampleRate, so resample the whole chunk when it differs.
    this.transcribeQueue.push(resampleTo16k(chunk, sampleRate))
    void this.drainTranscribeQueue()
  }

  /**
   * Transcribes queued chunks one at a time, emitting a final transcript for
   * each.
   */
  private async drainTranscribeQueue(): Promise<void> {
    if (this.transcribing) return
    this.transcribing = true
    try {
      while (this.transcribeQueue.length > 0 && !this.disposed) {
        const chunk = this.transcribeQueue.shift() as Float32Array
        try {
          const engine = await this.loadEngine()
          const result = engine.transcribe(chunk, {
            language: this.sessionLanguage,
            keywords: this.config.keywords,
            wordTimestamps: this.config.wordTimestamps,
          })
          const text = result.text.trim()
          // Silence or steady noise transcribes to EMPTY text and language —
          // that is the engine's "nothing spoken" answer, not a failure.
          if (text) {
            this.handlers.onTranscript?.({
              transcript: text,
              isFinal: true,
              confidence: averageProbability(result.words) ?? 1,
            })
          }
          // A pass that succeeded after an earlier failure means the session is
          // healthy again: capture is still live, so the state must say
          // 'listening' — leaving it at 'error' reported a dead session while
          // transcripts kept arriving. Restored ONLY from 'error': this drain
          // also runs for a STOPPED session's tail chunks, which can overlap a
          // FRESH startListening — an unconditional set flipped that session's
          // 'processing' (mic still opening, engine still loading) to
          // 'listening' before anything was capturing, clearing the consumer's
          // preparing indicator while the permission prompt was still up.
          if (this.listening && this.state === 'error') this.setState('listening')
        } catch (error) {
          this.setState('error')
          this.handlers.onError?.({
            code: 'transcription-failed',
            message: error instanceof Error ? error.message : 'Transcription failed',
          })
        }
      }
    } finally {
      this.transcribing = false
      if (this.state === 'processing' && !this.listening) this.setState('idle')
    }
  }

  /**
   * Stops recognition. Any speech captured before the stop is still
   * transcribed and emitted (a user's last sentence shouldn't vanish
   * because they clicked stop before pausing).
   */
  stopListening(): void {
    if (!this.listening) return
    this.listening = false
    // Supersede any in-flight setup: its getUserMedia/engine continuation is
    // for a session the user has already ended.
    this.sessionId++

    // Flush whatever speech was in progress at stop time.
    if (this.speechSamples > 0 && this.audioContext) {
      this.flushChunk(this.audioContext.sampleRate)
    }

    this.teardownCapture()

    if (this.transcribing || this.transcribeQueue.length > 0) {
      this.setState('processing')
    } else {
      this.setState('idle')
    }
  }

  /**
   * Releases the microphone and audio-graph resources.
   */
  private teardownCapture(): void {
    if (this.processor) {
      this.processor.onaudioprocess = null
      this.processor.disconnect()
      this.processor = null
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect()
      this.sourceNode = null
    }
    if (this.audioContext) {
      // Closing an already-closed context rejects; teardown must not throw.
      void this.audioContext.close().catch((_error: unknown) => undefined)
      this.audioContext = null
    }
    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) track.stop()
      this.mediaStream = null
    }
    this.speechFrames = []
    this.inSpeech = false
    this.silentSamples = 0
    this.speechSamples = 0
  }

  /**
   * Speaks the given text using the Web Speech Synthesis API.
   * @param text - The text to speak aloud.
   * @param options - Synthesis options.
   * @returns A promise that resolves when speech finishes or is interrupted.
   */
  async speak(text: string, options?: VoiceSynthesisOptions): Promise<void> {
    if (this.disposed) return

    const synth = getSpeechSynthesis()
    if (!synth) {
      throw new Error('Speech synthesis is not supported in this browser')
    }
    synth.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = options?.language ?? 'en-US'
    utterance.rate = options?.rate ?? 1
    utterance.pitch = options?.pitch ?? 1
    utterance.volume = options?.volume ?? 1
    if (options?.voice) {
      const match = synth
        .getVoices()
        .find((v) => v.name === options.voice || v.voiceURI === options.voice)
      if (match) utterance.voice = match
    }

    this.setState('speaking')
    // Only the utterance that is STILL the current one may drive the shared
    // speaking state: `synth.cancel()` above fires the replaced utterance's
    // end event a beat later, and letting it tear down state read `idle` (and
    // fired `onSpeakEnd`) while the replacement's audio was still playing.
    const current = utterance
    this.currentUtterance = current
    return new Promise<void>((resolve, reject) => {
      const finish = (): void => {
        if (this.currentUtterance !== current) return
        this.currentUtterance = null
        this.setState('idle')
        this.handlers.onSpeakEnd?.()
      }
      utterance.onend = () => {
        finish()
        resolve()
      }
      utterance.onerror = (event) => {
        // 'canceled' and its spec spelling 'interrupted' mean this utterance
        // was replaced or explicitly stopped — not a failure. State is handled
        // by the replacement (or stopSpeaking); this promise just settles.
        if (event.error === 'canceled' || event.error === 'interrupted') {
          finish()
          resolve()
          return
        }
        if (this.currentUtterance === current) {
          this.currentUtterance = null
          this.setState('error')
        }
        reject(new Error(`Speech synthesis error: ${event.error}`))
      }
      synth.speak(utterance)
    })
  }

  /**
   * Stops any current speech synthesis.
   */
  stopSpeaking(): void {
    getSpeechSynthesis()?.cancel()
    if (this.state === 'speaking') this.setState('idle')
  }

  /**
   * Returns the current voice provider state.
   * @returns The current VoiceState.
   */
  getState(): VoiceState {
    return this.state
  }

  /**
   * Checks whether any voice feature is supported.
   * @returns True if recognition or synthesis is available.
   */
  isSupported(): boolean {
    return this.isRecognitionSupported() || this.isSynthesisSupported()
  }

  /**
   * Checks whether on-device recognition can run here: microphone capture,
   * Web Audio, and WebAssembly are all required. WebGPU is NOT required —
   * Whistle runs on CPU, which is the point.
   * @returns True if speech recognition is supported.
   */
  isRecognitionSupported(): boolean {
    return (
      getGetUserMedia() !== null &&
      typeof AudioContext !== 'undefined' &&
      typeof WebAssembly !== 'undefined'
    )
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
   * @returns A promise resolving to an array of VoiceDescriptor objects.
   */
  async getAvailableVoices(): Promise<VoiceDescriptor[]> {
    const synth = getSpeechSynthesis()
    if (!synth) return []
    return synth.getVoices().map((v) => ({
      id: v.voiceURI,
      name: v.name,
      language: v.lang,
      isDefault: v.default,
      isLocal: v.localService,
    }))
  }

  /**
   * Cleans up resources: stops capture and synthesis, drops queued audio.
   * The wasm engine itself is process-global and stays loaded.
   */
  dispose(): void {
    this.disposed = true
    this.listening = false
    // Supersede any in-flight setup — its continuation must not rebuild a
    // capture graph for a disposed provider.
    this.sessionId++
    this.teardownCapture()
    this.transcribeQueue = []
    this.stopSpeaking()
    // The provider is dead — capture torn down, queue dropped — so the
    // reported state must not keep describing a live session ('listening' or
    // 'processing') to whoever reads getState() afterwards.
    this.setState('idle')
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
 * Averages per-word probabilities when word timestamps were requested.
 * @param words - Words with probabilities, when present.
 * @returns The average probability, or null when unavailable.
 */
function averageProbability(words: Array<{ probability: number }> | undefined): number | null {
  if (!words || words.length === 0) return null
  let sum = 0
  for (const word of words) sum += word.probability
  return sum / words.length
}

/**
 * Creates a WhistleVoiceProvider instance.
 * @param config - Optional configuration (URLs, language, keywords, VAD tuning).
 * @returns A WhistleVoiceProvider running speech-to-text on-device.
 */
export function createProvider(config?: WhistleVoiceConfig): WhistleVoiceProvider {
  return new WhistleVoiceProvider(config)
}

/** Lazily-initialized provider singleton. Defers creation until first use so importing this module never touches browser APIs. */
let _provider: AIVoiceProvider | null = null
/**
 * The provider implementation — the fleet-standard typed `provider` const.
 *
 * Wire it once at startup: `setProvider(provider)` from `@molecule/app-ai-voice`.
 * It is a lazy proxy: construction is deferred to the first property access, so
 * importing this module never throws and needs no config up front. Use
 * `createProvider(config)` instead when you need custom URLs, keyword biasing
 * or VAD tuning.
 */
export const provider: AIVoiceProvider = new Proxy({} as AIVoiceProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
