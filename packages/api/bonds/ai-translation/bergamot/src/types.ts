/**
 * Bergamot translation provider configuration and engine types.
 *
 * @module
 */

/**
 * Configuration for the Bergamot translation provider.
 */
export interface BergamotConfig {
  /**
   * Directory the models and the translation runtime are downloaded into on
   * first use (about 20–50 MB per language pair, plus 5 MB of runtime). Defaults
   * to `BERGAMOT_CACHE_DIR`, then `~/.cache/molecule/bergamot`. Keep it on a
   * persistent volume so a restart does not download everything again.
   */
  cacheDir?: string
  /**
   * Worker threads per language pair, translating chunks of one batch in parallel.
   * Each holds its own copy of the runtime and the pair's model(s) — roughly
   * 100–250 MB of memory per worker. Defaults to `BERGAMOT_WORKERS`, then 1.
   */
  workers?: number
  /**
   * Language pairs (routes) kept loaded at once; the least recently used one is shut
   * down beyond this. Defaults to 4.
   */
  maxLoadedPairs?: number
  /**
   * The list of published models (a Mozilla Remote Settings collection). Defaults to
   * Firefox's own; point it at a mirror to serve the models from your own host.
   */
  recordsUrl?: string
  /** Base URL the model files are downloaded from. Defaults to Firefox's model CDN. */
  attachmentsUrl?: string
  /** How long the downloaded model list is trusted before it is fetched again. Defaults to 24 hours. */
  recordsMaxAgeMs?: number
  /**
   * A local copy of `bergamot-translator.wasm` (release v0.6.0). When set, nothing is
   * downloaded for the runtime — use this, with `gluePath`, on hosts without internet.
   */
  wasmPath?: string
  /** A local copy of the matching `bergamot-translator.js` loader (v0.6.0). */
  gluePath?: string
  /** Replaces the worker-thread engine — for tests, or to run the engine elsewhere. */
  engine?: BergamotEngine
  /** Replaces `fetch` for downloads — for tests or a proxy-aware client. */
  fetch?: typeof fetch
}

/**
 * Paths of one model's files on disk, by the role Bergamot gives them.
 */
export interface BergamotModelFiles {
  /** The translation model (int8 weights). */
  model: string
  /** The lexical shortlist that limits the decoder's output vocabulary. */
  lex: string
  /** A vocabulary shared by both languages — or the two below. */
  vocab?: string
  /** Source-language vocabulary, when the model has separate ones. */
  srcvocab?: string
  /** Target-language vocabulary, when the model has separate ones. */
  trgvocab?: string
}

/**
 * One translation model the engine should load.
 */
export interface BergamotModelSpec {
  /** Stable identity used for the engine's model cache, e.g. `en-de@2.1`. */
  key: string
  /** Source language (Bergamot code). */
  from: string
  /** Target language (Bergamot code). */
  to: string
  /** The model's files on disk. */
  files: BergamotModelFiles
}

/**
 * One batch sent to the engine.
 */
export interface BergamotRequest {
  /** One model to translate directly, or two to pivot through English. */
  models: BergamotModelSpec[]
  /** Texts to translate. */
  texts: string[]
  /** Whether the texts are HTML (tags are carried over to the translation). */
  html: boolean
}

/**
 * What runs the Bergamot runtime. The default is a pool of worker threads.
 */
export interface BergamotEngine {
  /**
   * Translates one batch.
   *
   * @param request - Models, texts and mode.
   * @returns One translation per text, in order.
   */
  translate(request: BergamotRequest): Promise<string[]>
  /** Stops the engine and frees its memory. */
  close(): Promise<void>
}
