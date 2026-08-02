/**
 * On-device NVIDIA Parakeet voice provider using parakeet.js.
 *
 * Runs speech-to-text entirely in the browser: microphone audio is captured
 * with the Web Audio API, segmented by a lightweight energy-based voice
 * activity detector, and transcribed by an NVIDIA Parakeet TDT 0.6B ONNX
 * model via parakeet.js (WebGPU encoder + WASM decoder, pure WASM fallback).
 * Parakeet tops the open ASR leaderboards — substantially lower word error
 * rate and faster inference than Whisper-class models of any comparable
 * size. No audio ever leaves the device, and it works in browsers that ship
 * no speech backend for the Web Speech API (Brave, ungoogled Chromium,
 * Firefox).
 *
 * Text-to-speech delegates to the browser's SpeechSynthesis API, which is
 * independent of the missing recognition backend.
 *
 * @remarks
 * - The FIRST use downloads the model (hundreds of MB at int8 for the 0.6B
 *   models, cached by the browser afterwards). Wire `onModelProgress` to a
 *   UI indicator or the user will stare at a silent mic button.
 * - The default `parakeet-tdt-0.6b-v3` model handles en, fr, de, es, it,
 *   pt, nl, pl, ru, uk, ja, ko and zh with automatic language detection —
 *   `VoiceRecognitionOptions.language` is used only for support checks, not
 *   passed to the model. For other languages use a multilingual Whisper
 *   provider (`@molecule/app-ai-voice-whisper`) instead; check coverage
 *   with the exported `supportsRecognitionLanguage()` before wiring.
 * - Transcripts are emitted as FINAL results per speech chunk (after each
 *   pause). `interimResults` is accepted but ignored — don't build UI that
 *   waits for `isFinal: false` events.
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

import type { ModelProgressEvent, ParakeetVoiceConfig } from './types.js'

/** Sample rate expected by Parakeet models. */
const MODEL_SAMPLE_RATE = 16000

/** ScriptProcessor buffer size (samples) — ~256 ms frames at 16 kHz. */
const FRAME_SIZE = 4096

/** Minimum amount of detected speech (seconds) worth transcribing. */
const MIN_SPEECH_SECONDS = 0.35

/** Default parakeet.js model key (multilingual v3). */
const DEFAULT_MODEL = 'parakeet-tdt-0.6b-v3'

/** Minimal shape of the parakeet.js model this provider uses. */
interface ParakeetModelLike {
  transcribe(
    audio: Float32Array,
    sampleRate?: number,
    opts?: Record<string, unknown>,
  ): Promise<{
    utterance_text: string
    confidence_scores?: { token_avg?: number | null }
  }>
}

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
 * Checks whether a Parakeet model can transcribe the given BCP-47 language.
 * Use this at wiring time to decide between this provider and a
 * multilingual Whisper provider.
 * @param language - BCP-47 language tag (e.g. 'en-US', 'ja').
 * @param model - parakeet.js model key or repo id. Defaults to the
 *   provider's default model.
 * @returns A promise resolving to true when the model covers the language.
 */
export async function supportsRecognitionLanguage(
  language: string,
  model: string = DEFAULT_MODEL,
): Promise<boolean> {
  const { supportsLanguage } = await import('parakeet.js')
  return supportsLanguage(model, language.split('-')[0].toLowerCase())
}

/**
 * On-device NVIDIA Parakeet speech-to-text provider.
 *
 * Captures microphone audio, segments it on pauses, and transcribes each
 * segment locally with a parakeet.js ONNX model.
 */
export class ParakeetVoiceProvider implements AIVoiceProvider {
  readonly name = 'parakeet'

  private state: VoiceState = 'idle'
  private config: ParakeetVoiceConfig
  private handlers: VoiceEventHandlers = {}
  private disposed = false

  private modelPromise: Promise<ParakeetModelLike> | null = null

  private mediaStream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private processor: ScriptProcessorNode | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null

  private listening = false

  // VAD/chunking state
  private speechFrames: Float32Array[] = []
  private inSpeech = false
  private silentSamples = 0
  private speechSamples = 0

  // Serialized transcription queue
  private transcribeQueue: Float32Array[] = []
  private transcribing = false

  /**
   * Creates a new ParakeetVoiceProvider.
   * @param config - Provider configuration (model, backend, VAD tuning).
   */
  constructor(config: ParakeetVoiceConfig = {}) {
    this.config = config
  }

  /**
   * Loads (or returns the cached) parakeet.js model, reporting download
   * progress through `config.onModelProgress`.
   * @returns The ready-to-use Parakeet model.
   */
  private loadModel(): Promise<ParakeetModelLike> {
    if (this.modelPromise) return this.modelPromise

    const progress = (event: ModelProgressEvent): void => {
      this.config.onModelProgress?.(event)
    }

    this.modelPromise = (async () => {
      progress({ status: 'loading' })
      const { fromHub } = await import('parakeet.js')
      const backend =
        this.config.backend && this.config.backend !== 'auto'
          ? this.config.backend
          : (navigator as { gpu?: unknown }).gpu
            ? 'webgpu'
            : 'wasm'

      const options = {
        backend: backend as 'webgpu' | 'wasm',
        encoderQuant: this.config.encoderQuant ?? ('int8' as const),
        decoderQuant: this.config.decoderQuant ?? ('int8' as const),
        progress: (p: { loaded: number; total: number; file: string }) => {
          progress({
            status: 'downloading',
            progress: p.total > 0 ? Math.round((p.loaded / p.total) * 100) : undefined,
            file: p.file,
          })
        },
      }

      const model = this.config.model ?? DEFAULT_MODEL
      let parakeet: ParakeetModelLike
      try {
        parakeet = (await fromHub(model, options)) as unknown as ParakeetModelLike
      } catch (error) {
        if (options.backend === 'webgpu') {
          // WebGPU exists but initialization failed (driver/adapter issues
          // are common) — fall back to WASM before giving up.
          parakeet = (await fromHub(model, {
            ...options,
            backend: 'wasm',
          })) as unknown as ParakeetModelLike
        } else {
          progress({ status: 'error' })
          throw error
        }
      }
      progress({ status: 'ready' })
      return parakeet
    })()

    this.modelPromise.catch(() => {
      // Allow a retry on the next startListening call; the caller already
      // receives this rejection via startListening's error handling.
      this.modelPromise = null
    })

    return this.modelPromise
  }

  /**
   * Starts on-device speech recognition: opens the microphone, loads the
   * model if needed, and emits a final transcript after each pause.
   * @param options - Recognition options. `language` is not passed to the
   *   model (Parakeet auto-detects) — check coverage up front with
   *   `supportsRecognitionLanguage()`.
   * @param handlers - Callbacks for transcripts, state changes, and errors.
   */
  startListening(options?: VoiceRecognitionOptions, handlers?: VoiceEventHandlers): void {
    if (this.disposed || this.listening) return
    void options

    this.handlers = handlers ?? {}

    const getUserMedia = getGetUserMedia()
    if (!getUserMedia) {
      this.handlers.onError?.({
        code: 'not-supported',
        message: 'Microphone capture is not supported in this environment',
      })
      return
    }

    this.listening = true
    // 'processing' until the model is ready — consumers use the transition to
    // 'listening' to clear their "preparing dictation" indicator. Speech is
    // captured during the load and transcribed once the model arrives.
    this.setState('processing')

    void (async () => {
      try {
        // Kick off the model load and mic open in parallel — the model can
        // take a while on first use and the mic prompt needs to appear now.
        const modelReady = this.loadModel()
        const stream = await getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })
        if (!this.listening || this.disposed) {
          for (const track of stream.getTracks()) track.stop()
          return
        }
        this.mediaStream = stream

        const context = new AudioContext({ sampleRate: MODEL_SAMPLE_RATE })
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

        await modelReady
        if (this.listening && !this.disposed) {
          this.setState('listening')
        }
      } catch (error) {
        this.teardownCapture()
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
    const maxChunkSeconds = this.config.maxChunkSeconds ?? 15

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
    this.transcribeQueue.push(chunk)
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
          const model = await this.loadModel()
          const result = await model.transcribe(chunk, MODEL_SAMPLE_RATE, {
            returnConfidences: true,
          })
          const text = result.utterance_text?.trim()
          if (text) {
            this.handlers.onTranscript?.({
              transcript: text,
              isFinal: true,
              confidence: result.confidence_scores?.token_avg ?? 1,
            })
          }
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
    return new Promise<void>((resolve, reject) => {
      utterance.onend = () => {
        if (this.state === 'speaking') this.setState('idle')
        this.handlers.onSpeakEnd?.()
        resolve()
      }
      utterance.onerror = (event) => {
        if (event.error === 'canceled') {
          if (this.state === 'speaking') this.setState('idle')
          resolve()
          return
        }
        this.setState('error')
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
   * Web Audio, and WebAssembly are all required (WebGPU is optional).
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
   */
  dispose(): void {
    this.disposed = true
    this.listening = false
    this.teardownCapture()
    this.transcribeQueue = []
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
 * Creates a ParakeetVoiceProvider instance.
 * @param config - Optional configuration (model, backend, VAD tuning).
 * @returns A ParakeetVoiceProvider running speech-to-text on-device.
 */
export function createProvider(config?: ParakeetVoiceConfig): ParakeetVoiceProvider {
  return new ParakeetVoiceProvider(config)
}

/** Lazily-initialized provider singleton. Defers creation until first use so importing this module never touches browser APIs. */
let _provider: AIVoiceProvider | null = null
/**
 * The provider implementation — the fleet-standard typed `provider` const.
 *
 * Wire it once at startup: `setProvider(provider)` from `@molecule/app-ai-voice`.
 * It is a lazy proxy: construction is deferred to the first property access, so
 * importing this module never throws and needs no config up front. Use
 * `createProvider(config)` instead when you need a custom model, backend, or
 * VAD tuning.
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
