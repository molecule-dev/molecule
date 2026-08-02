/**
 * On-device Whisper voice provider using transformers.js.
 *
 * Runs speech-to-text entirely in the browser: microphone audio is captured
 * with the Web Audio API, segmented by a lightweight energy-based voice
 * activity detector, and transcribed by a Whisper (or Moonshine) ONNX model
 * via `@huggingface/transformers` — WebGPU when available, WASM otherwise.
 * No audio ever leaves the device, and it works in browsers that ship no
 * speech backend for the Web Speech API (Brave, ungoogled Chromium, Firefox).
 *
 * Text-to-speech delegates to the browser's SpeechSynthesis API, which is
 * independent of the missing recognition backend.
 *
 * @remarks
 * - The FIRST use downloads the model (tens of MB, cached by the browser
 *   afterwards). Wire `onModelProgress` to a UI indicator or the user will
 *   stare at a silent mic button during the download.
 * - Transcripts are emitted as FINAL results per speech chunk (after each
 *   pause). `interimResults` is accepted but ignored — there are no partial
 *   results, so don't build UI that waits for `isFinal: false` events.
 * - The default model (`onnx-community/whisper-base`) is multilingual and
 *   honors `VoiceRecognitionOptions.language`. Moonshine models are
 *   English-only and ignore the language option — don't configure one for a
 *   multilingual app.
 * - Whisper reports no confidence scores; `VoiceTranscriptEvent.confidence`
 *   is always 1.
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

import type { ModelProgressEvent, WhisperVoiceConfig } from './types.js'

/** Sample rate expected by Whisper/Moonshine models. */
const MODEL_SAMPLE_RATE = 16000

/** ScriptProcessor buffer size (samples) — ~256 ms frames at 16 kHz. */
const FRAME_SIZE = 4096

/** Minimum amount of detected speech (seconds) worth transcribing. */
const MIN_SPEECH_SECONDS = 0.35

/** Default Hugging Face model id. */
const DEFAULT_MODEL = 'onnx-community/whisper-base'

/** Minimal shape of the transformers.js ASR pipeline this provider uses. */
type AsrPipeline = (
  audio: Float32Array,
  options?: Record<string, unknown>,
) => Promise<{ text: string } | Array<{ text: string }>>

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
 * Maps a BCP-47 tag (e.g. 'en-US') to the bare ISO language code Whisper
 * expects (e.g. 'en').
 * @param language - BCP-47 language tag.
 * @returns The lowercase primary language subtag.
 */
function toWhisperLanguage(language: string): string {
  return language.split('-')[0].toLowerCase()
}

/**
 * On-device Whisper speech-to-text provider.
 *
 * Captures microphone audio, segments it on pauses, and transcribes each
 * segment locally with a transformers.js ASR model.
 */
export class WhisperVoiceProvider implements AIVoiceProvider {
  readonly name = 'whisper'

  private state: VoiceState = 'idle'
  private config: WhisperVoiceConfig
  private handlers: VoiceEventHandlers = {}
  private disposed = false

  private pipelinePromise: Promise<AsrPipeline> | null = null
  private modelReady = false

  private mediaStream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private processor: ScriptProcessorNode | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null

  private listening = false
  private recognitionLanguage: string | undefined

  // VAD/chunking state
  private speechFrames: Float32Array[] = []
  private inSpeech = false
  private silentSamples = 0
  private speechSamples = 0

  // Serialized transcription queue
  private transcribeQueue: Float32Array[] = []
  private transcribing = false

  /**
   * Creates a new WhisperVoiceProvider.
   * @param config - Provider configuration (model id, device, VAD tuning).
   */
  constructor(config: WhisperVoiceConfig = {}) {
    this.config = config
  }

  /**
   * Loads (or returns the cached) transformers.js ASR pipeline, reporting
   * download progress through `config.onModelProgress`.
   * @returns The ready-to-use ASR pipeline.
   */
  private loadPipeline(): Promise<AsrPipeline> {
    if (this.pipelinePromise) return this.pipelinePromise

    const progress = (event: ModelProgressEvent): void => {
      this.config.onModelProgress?.(event)
    }

    this.pipelinePromise = (async () => {
      progress({ status: 'loading' })
      const { pipeline, env } = await import('@huggingface/transformers')
      if (this.config.wasmPaths && env.backends.onnx.wasm) {
        env.backends.onnx.wasm.wasmPaths = this.config.wasmPaths
      }
      const device =
        this.config.device && this.config.device !== 'auto'
          ? this.config.device
          : (navigator as { gpu?: unknown }).gpu
            ? 'webgpu'
            : 'wasm'

      const options: Record<string, unknown> = {
        device,
        progress_callback: (p: { status?: string; progress?: number; file?: string }) => {
          if (p.status === 'progress') {
            progress({ status: 'downloading', progress: p.progress, file: p.file })
          }
        },
      }
      if (this.config.dtype) options.dtype = this.config.dtype

      const model = this.config.model ?? DEFAULT_MODEL
      let asr: AsrPipeline
      try {
        asr = (await pipeline('automatic-speech-recognition', model, options)) as AsrPipeline
      } catch (error) {
        if (device === 'webgpu') {
          // WebGPU exists but initialization failed (driver/adapter issues are
          // common) — fall back to WASM before giving up.
          asr = (await pipeline('automatic-speech-recognition', model, {
            ...options,
            device: 'wasm',
          })) as AsrPipeline
        } else {
          progress({ status: 'error' })
          throw error
        }
      }
      this.modelReady = true
      progress({ status: 'ready' })
      return asr
    })()

    this.pipelinePromise.catch(() => {
      // Allow a retry on the next startListening call; the caller already
      // receives this rejection via startListening's error handling.
      this.pipelinePromise = null
    })

    return this.pipelinePromise
  }

  /**
   * Starts on-device speech recognition: opens the microphone, loads the
   * model if needed, and emits a final transcript after each pause.
   * @param options - Recognition options; `language` is honored by
   *   multilingual Whisper models.
   * @param handlers - Callbacks for transcripts, state changes, and errors.
   */
  startListening(options?: VoiceRecognitionOptions, handlers?: VoiceEventHandlers): void {
    if (this.disposed || this.listening) return

    this.handlers = handlers ?? {}
    this.recognitionLanguage = options?.language

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
        const pipelineReady = this.loadPipeline()
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

        await pipelineReady
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
    const maxChunkSeconds = Math.min(this.config.maxChunkSeconds ?? 12, 30)

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
          const asr = await this.loadPipeline()
          const model = this.config.model ?? DEFAULT_MODEL
          const callOptions: Record<string, unknown> = {}
          // Only multilingual Whisper checkpoints take a language; Moonshine
          // and *.en Whisper models throw or ignore it.
          if (this.recognitionLanguage && /whisper/i.test(model) && !/\.en/i.test(model)) {
            callOptions.language = toWhisperLanguage(this.recognitionLanguage)
            callOptions.task = 'transcribe'
          }
          const output = await asr(chunk, callOptions)
          const text = (Array.isArray(output) ? output[0]?.text : output.text)?.trim()
          if (text) {
            this.handlers.onTranscript?.({
              transcript: text,
              isFinal: true,
              // Whisper exposes no confidence score — report full confidence.
              confidence: 1,
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
 * Creates a WhisperVoiceProvider instance.
 * @param config - Optional configuration (model id, device, VAD tuning).
 * @returns A WhisperVoiceProvider running speech-to-text on-device.
 */
export function createProvider(config?: WhisperVoiceConfig): WhisperVoiceProvider {
  return new WhisperVoiceProvider(config)
}

/** Lazily-initialized provider singleton. Defers creation until first use so importing this module never touches browser APIs. */
let _provider: AIVoiceProvider | null = null
/**
 * The provider implementation — the fleet-standard typed `provider` const.
 *
 * Wire it once at startup: `setProvider(provider)` from `@molecule/app-ai-voice`.
 * It is a lazy proxy: construction is deferred to the first property access, so
 * importing this module never throws and needs no config up front. Use
 * `createProvider(config)` instead when you need a custom model, device, or
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
