/**
 * molecule.dev hosted speech provider.
 *
 * `synthesize` calls `POST <servicesUrl>/speech/synthesize` and `transcribe`
 * calls `POST <servicesUrl>/speech/transcribe`, with the project's API key.
 * Audio crosses the wire as base64 inside JSON; this provider converts it to
 * and from the core's `Uint8Array` so callers see the core's own types.
 *
 * Only `synthesize` and `transcribe` are implemented. The other optional
 * `AISpeechProvider` methods (voice cloning, streaming, listVoices, audio
 * translation) are absent, which is how the core says "not supported".
 *
 * @module
 */

import type {
  AISpeechProvider,
  SynthesizeParams,
  SynthesizeResult,
  TranscribeParams,
  TranscribeResult,
} from '@molecule/api-ai-speech'

import type { MoleculeSpeechConfig } from './types.js'

/** Default hosted services base URL. */
export const DEFAULT_SERVICES_URL = 'https://api.molecule.dev/api/v1/services'

/**
 * Validates the hosted-services base URL and strips trailing slashes.
 *
 * The project API key rides as a Bearer token on every call, so a plain-http
 * base URL must never send it across the PUBLIC internet in cleartext.
 * Mirroring the docker sandbox bond's plain-TCP production refusal, non-https
 * URLs are refused unless the host is loopback (a self-hosted services
 * instance for local development) or a PRIVATE-network endpoint — RFC 1918
 * addresses and `*.docker.internal` — which is how an in-sandbox app reaches
 * its platform's hosted-services gateway (`http://host.docker.internal:…`),
 * traffic that never leaves the host's virtual network. Public cleartext is
 * still refused. Duplicated across the molecule service bonds on purpose:
 * they are independent published packages with no shared runtime dependency.
 *
 * @param raw - The configured or defaulted base URL.
 * @returns The validated base URL, without trailing slashes.
 * @throws {Error} When the URL is not https and not loopback/private http.
 */
function resolveServicesUrl(raw: string): string {
  const trimmed = raw.replace(/\/+$/, '')
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch (_error) {
    // Not a URL at all (e.g. a bare hostname) — refuse it with the fix spelled out.
    throw new Error(
      `Invalid MOLECULE_SERVICES_URL "${raw}" — it must be an absolute https URL (default ${DEFAULT_SERVICES_URL}).`,
      { cause: _error },
    )
  }
  const host = parsed.hostname.toLowerCase()
  if (parsed.protocol === 'https:' || (parsed.protocol === 'http:' && isPrivateHttpHost(host))) {
    return trimmed
  }
  throw new Error(
    `MOLECULE_SERVICES_URL "${raw}" must use https: the project API key is sent as a Bearer token on every request and must not cross the public internet in cleartext. ` +
      `Point it at ${DEFAULT_SERVICES_URL} or a private https endpoint; only loopback and private-network (RFC 1918 / *.docker.internal) http is allowed, for a local services instance or an in-sandbox app reaching its own platform.`,
  )
}

/**
 * Whether a plain-http URL to this host never leaves a trusted network: the
 * loopback addresses, the RFC 1918 private ranges (each octet range-checked —
 * a public address must not parse its way past this guard), and the docker
 * host-gateway names an in-sandbox app uses to reach its own platform.
 *
 * @param host - Lowercased URL hostname.
 * @returns True when plain http to this host is a private-network hop.
 */
function isPrivateHttpHost(host: string): boolean {
  if (host === 'localhost' || host === '[::1]' || host === '::1' || host.startsWith('127.')) {
    return true
  }
  if (host === 'host.docker.internal' || host.endsWith('.docker.internal')) return true
  const octets = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host)
  if (!octets) return false
  const [a, b, c, d] = octets.slice(1).map(Number)
  if ([a, b, c, d].some((n) => n > 255)) return false
  if (a === 10) return true
  if (a === 172) return b >= 16 && b <= 31
  if (a === 192) return b === 168
  return false
}

/** Per-request limits of the hosted service. */
export const SPEECH_SERVICE_LIMITS = {
  /** Characters of text per synthesize call. */
  maxSynthesizeChars: 4096,
  /** Bytes of audio per transcribe call. */
  maxTranscribeBytes: 12 * 1024 * 1024,
} as const

/** Error thrown for a refused or failed hosted-service call. */
export class MoleculeServiceError extends Error {
  /** HTTP status from molecule.dev. */
  readonly status: number
  /** Stable error key from molecule.dev, e.g. `broker.error.budgetExceeded`. */
  readonly errorKey: string | undefined

  /**
   * Create the error.
   *
   * @param message - Human-readable message.
   * @param status - HTTP status.
   * @param errorKey - Stable error key, when the service sent one.
   * @param cause - The underlying error, if any.
   */
  constructor(message: string, status: number, errorKey?: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'MoleculeServiceError'
    this.status = status
    this.errorKey = errorKey
  }
}

/** What to tell the developer for each refusal the service can return. */
const HINTS: Record<number, string> = {
  401: 'Check MOLECULE_API_KEY: it must be a molecule project API key with the "broker" or "broker:speech" scope, and not revoked.',
  402: "The molecule project's owner has used the included allowance. Enable usage billing on molecule.dev, or bond another speech provider.",
  413: 'Split the input: text into chunks of at most 4096 characters, audio into clips of at most 12 MB.',
  429: 'Too many requests for this project right now. Slow down and retry.',
  503: 'molecule.dev has paused this service briefly. Retry after the Retry-After delay.',
}

/**
 * Speech through molecule.dev's hosted service.
 */
export class MoleculeSpeechProvider implements AISpeechProvider {
  readonly name = 'molecule'

  private readonly apiKey: string
  private readonly servicesUrl: string
  private readonly defaultVoice: string
  private readonly defaultTTSModel: string
  private readonly timeoutMs: number

  /**
   * Create the provider.
   *
   * @param config - Options; each falls back to its env var.
   */
  constructor(config: MoleculeSpeechConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.MOLECULE_API_KEY ?? ''
    this.servicesUrl = resolveServicesUrl(
      config.servicesUrl ?? process.env.MOLECULE_SERVICES_URL ?? DEFAULT_SERVICES_URL,
    )
    this.defaultVoice = config.defaultVoice ?? 'alloy'
    this.defaultTTSModel = config.defaultTTSModel ?? 'tts-1'
    this.timeoutMs = config.timeoutMs ?? 120_000
  }

  /**
   * Text to speech. Voices: alloy, ash, coral, echo, fable, nova, onyx, sage,
   * shimmer. Models: tts-1, tts-1-hd. `instructions` is not supported by these
   * models and is not sent.
   *
   * @param params - Text, voice, model, format and speed.
   * @returns The audio bytes and their content type.
   */
  async synthesize(params: SynthesizeParams): Promise<SynthesizeResult> {
    const data = (await this.request('synthesize', {
      input: params.input,
      voice: params.voice ?? this.defaultVoice,
      model: params.model ?? this.defaultTTSModel,
      ...(params.responseFormat ? { responseFormat: params.responseFormat } : {}),
      ...(params.speed ? { speed: params.speed } : {}),
    })) as { audio: string; contentType: string }
    return {
      audio: new Uint8Array(Buffer.from(data.audio, 'base64')),
      contentType: data.contentType,
    }
  }

  /**
   * Speech to text with whisper-1. Always returns the verbose shape (text,
   * language, duration, segments); `responseFormat` and `timestampGranularity`
   * are ignored.
   *
   * @param params - Audio bytes, filename (for its extension), language, prompt.
   * @returns The transcription.
   */
  async transcribe(params: TranscribeParams): Promise<TranscribeResult> {
    if (params.audio.byteLength > SPEECH_SERVICE_LIMITS.maxTranscribeBytes) {
      throw new MoleculeServiceError(
        `The audio is ${params.audio.byteLength} bytes; the hosted service accepts at most ${SPEECH_SERVICE_LIMITS.maxTranscribeBytes}. ${HINTS[413]}`,
        413,
        'hostedServices.error.inputTooLarge',
      )
    }
    return (await this.request('transcribe', {
      audio: Buffer.from(params.audio).toString('base64'),
      ...(params.filename ? { filename: params.filename } : {}),
      ...(params.model ? { model: params.model } : {}),
      ...(params.language ? { language: params.language } : {}),
      ...(params.prompt ? { prompt: params.prompt } : {}),
    })) as TranscribeResult
  }

  /** One POST to the hosted service. */
  private async request(operation: string, body: Record<string, unknown>): Promise<unknown> {
    if (!this.apiKey) {
      throw new MoleculeServiceError(
        'MOLECULE_API_KEY is not set. Create a project API key on molecule.dev (or with `mlcl apikey create`) and put it in the API .env.',
        401,
        'hostedServices.error.tokenInvalid',
      )
    }
    const response = await fetch(`${this.servicesUrl}/speech/${operation}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    })
    const text = await response.text()
    let data: unknown
    try {
      data = text ? JSON.parse(text) : {}
    } catch (error) {
      // A proxy/gateway error page, not the service: report the status only.
      throw new MoleculeServiceError(
        `molecule.dev returned ${response.status} with a non-JSON body.`,
        response.status,
        undefined,
        error,
      )
    }
    if (!response.ok) {
      const err = data as { error?: string; errorKey?: string }
      const hint = HINTS[response.status]
      throw new MoleculeServiceError(
        `molecule.dev speech/${operation} failed (${response.status}): ${err.error ?? 'error'}${hint ? ` ${hint}` : ''}`,
        response.status,
        err.errorKey,
      )
    }
    return data
  }
}

/**
 * Create a hosted speech provider.
 *
 * @param config - Options; each falls back to its env var.
 * @returns An `AISpeechProvider` backed by molecule.dev.
 */
export function createProvider(config?: MoleculeSpeechConfig): AISpeechProvider {
  return new MoleculeSpeechProvider(config)
}
