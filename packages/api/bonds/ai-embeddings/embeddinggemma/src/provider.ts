/**
 * EmbeddingGemma 2 ai-embeddings provider for molecule.dev.
 *
 * Runs `onnx-community/embeddinggemma-2-ONNX` in-process via Transformers.js —
 * no API key, no per-call cost, no network after the first weight download.
 * Text, images and audio land in one 768-d, L2-normalized vector space; the
 * model's task prefixes are applied for you; Matryoshka truncation to
 * 512 / 256 / 128 is re-normalized.
 *
 * The model's `sentence_embedding` output is the pooled, projected and
 * normalized vector (verified against the Python sentence-transformers
 * reference: q8 cosine ≥ 0.9999), so no pooling is applied here.
 *
 * @module
 */

import type {
  AIEmbeddingsProvider,
  EmbedContentInput,
  EmbedContentParams,
  EmbeddingInputType,
  EmbeddingResult,
  EmbeddingTask,
  EmbedParams,
} from '@molecule/api-ai-embeddings'

import { MATRYOSHKA_DIMENSIONS, truncateEmbedding } from './matryoshka.js'
import { loadAudio, readMediaBytes, unwrapMediaSource } from './media.js'
import { applyTaskPrefix, isEmbeddingTask } from './prefixes.js'
import type {
  EmbeddingGemmaConfig,
  EmbeddingGemmaDevice,
  EmbeddingGemmaDtype,
  EmbeddingGemmaModality,
} from './types.js'

/** Default model — the ONNX export of `google/embeddinggemma-2`. */
export const EMBEDDINGGEMMA_DEFAULT_MODEL = 'onnx-community/embeddinggemma-2-ONNX'

/** Texts per forward pass when the caller doesn't specify (a memory bound). */
const DEFAULT_BATCH_SIZE = 16

const DTYPES: readonly EmbeddingGemmaDtype[] = ['fp32', 'fp16', 'q8', 'q4', 'q4f16']
const DEVICES: readonly EmbeddingGemmaDevice[] = ['cpu', 'webgpu', 'wasm']
const MODALITIES: readonly string[] = ['text', 'image', 'audio']

/** Usage is always zero: local inference is not billed. */
const NO_USAGE = { promptTokens: 0, totalTokens: 0 }

/** Structural view of the model output tensor. */
interface EmbeddingTensor {
  tolist(): number[][]
}

/** Structural view of the loaded model: call it with processor/tokenizer output. */
type ModelCall = (inputs: unknown) => Promise<{ sentence_embedding: EmbeddingTensor }>

/** Structural view of the tokenizer call. */
type TokenizerCall = (
  texts: string[],
  options: { padding: boolean; truncation: boolean },
) => unknown

/** Structural view of the processor call: `(text, images, audio, videos)`. */
type ProcessorCall = (
  text: string[] | null,
  images?: unknown,
  audio?: unknown,
  videos?: unknown,
) => Promise<unknown>

/** The loaded model plus its pre-processors. */
interface Loaded {
  model: ModelCall
  tokenizer: TokenizerCall
  processor: ProcessorCall | null
  loadImage: (data: Uint8Array | string) => Promise<unknown>
}

/** Resolved, validated settings. */
interface Settings {
  model: string
  dtype: EmbeddingGemmaDtype
  device: EmbeddingGemmaDevice
  modalities: EmbeddingGemmaModality[]
  dimensions: number
  task: EmbeddingTask
  applyPrefixes: boolean
  batchSize: number
}

/**
 * Pick a value from an allow-list, or fail loudly — a typo'd env var must not
 * silently load a different precision or device.
 *
 * @param value - Configured value.
 * @param allowed - Allowed values.
 * @param name - Setting name for the error.
 * @returns The value.
 * @throws {Error} When the value is not allowed.
 */
function oneOf<T extends string>(value: string, allowed: readonly T[], name: string): T {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new Error(`EmbeddingGemma: ${name} must be one of ${allowed.join(', ')} (got "${value}")`)
  }
  return value as T
}

/**
 * Validate a Matryoshka size.
 *
 * @param dimensions - Requested size.
 * @returns The size.
 * @throws {Error} When the model was not trained for that size.
 */
function checkDimensions(dimensions: number): number {
  if (!MATRYOSHKA_DIMENSIONS.includes(dimensions)) {
    throw new Error(
      `EmbeddingGemma: dimensions must be one of ${MATRYOSHKA_DIMENSIONS.join(', ')} (got ${dimensions}) — only these sizes are trained.`,
    )
  }
  return dimensions
}

/**
 * Resolve config + env into validated settings.
 *
 * @param config - Provider configuration.
 * @returns The settings.
 */
function resolveSettings(config: EmbeddingGemmaConfig): Settings {
  const env = process.env
  const modalityList =
    config.modalities ??
    (env.MOL_EMBEDDINGS_EMBEDDINGGEMMA_MODALITIES ?? 'text')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  for (const modality of modalityList) {
    if (modality === 'video') {
      throw new Error(
        'EmbeddingGemma: video is not supported in Node — Transformers.js decodes video only in a browser. Embed sampled frames as images, or use @molecule/api-ai-embeddings-gemini.',
      )
    }
    oneOf(modality, MODALITIES, 'each modality')
  }
  const modalities = [...new Set(['text', ...modalityList])] as EmbeddingGemmaModality[]

  const task = config.task ?? env.MOL_EMBEDDINGS_EMBEDDINGGEMMA_TASK ?? 'search'
  if (!isEmbeddingTask(task)) throw new Error(`EmbeddingGemma: unknown task "${task}"`)

  const configured = config.batchSize ?? Number(env.MOL_EMBEDDINGS_EMBEDDINGGEMMA_BATCH_SIZE)
  const batchSize =
    Number.isFinite(configured) && configured >= 1 ? Math.floor(configured) : DEFAULT_BATCH_SIZE

  return {
    model: config.model ?? env.MOL_EMBEDDINGS_EMBEDDINGGEMMA_MODEL ?? EMBEDDINGGEMMA_DEFAULT_MODEL,
    dtype: oneOf(config.dtype ?? env.MOL_EMBEDDINGS_EMBEDDINGGEMMA_DTYPE ?? 'q8', DTYPES, 'dtype'),
    device: oneOf(
      config.device ?? env.MOL_EMBEDDINGS_EMBEDDINGGEMMA_DEVICE ?? 'cpu',
      DEVICES,
      'device',
    ),
    modalities,
    dimensions: checkDimensions(
      config.dimensions ?? Number(env.MOL_EMBEDDINGS_EMBEDDINGGEMMA_DIMENSIONS ?? 768),
    ),
    task,
    applyPrefixes: config.applyPrefixes ?? true,
    batchSize,
  }
}

/**
 * Load the model, loading only the encoders for the configured modalities (the
 * text-only model is 314 MB at q8; vision adds 195 MB, audio 340 MB).
 * Dynamically imported so a consumer that never embeds pays nothing.
 *
 * @param config - Provider configuration (paths, remote-fetch policy).
 * @param settings - Resolved settings.
 * @returns The loaded model and pre-processors.
 */
async function load(config: EmbeddingGemmaConfig, settings: Settings): Promise<Loaded> {
  const { AutoConfig, AutoModel, AutoProcessor, AutoTokenizer, RawImage, env } =
    await import('@huggingface/transformers')

  const localModelPath =
    config.localModelPath ?? process.env.MOL_EMBEDDINGS_EMBEDDINGGEMMA_MODEL_PATH
  if (localModelPath) {
    env.localModelPath = localModelPath
    env.allowRemoteModels = config.allowRemoteModels ?? false
  } else if (config.allowRemoteModels !== undefined) {
    env.allowRemoteModels = config.allowRemoteModels
  }
  const cacheDir = config.cacheDir ?? process.env.MOL_EMBEDDINGS_EMBEDDINGGEMMA_CACHE_DIR
  if (cacheDir) env.cacheDir = cacheDir

  // Null an encoder's config and Transformers.js skips downloading + loading it
  // (the selective-loading recipe from the ONNX model card).
  const modelConfig = (await AutoConfig.from_pretrained(settings.model)) as unknown as Record<
    string,
    unknown
  >
  if (!settings.modalities.includes('image')) modelConfig.vision_config = null
  if (!settings.modalities.includes('audio')) modelConfig.audio_config = null

  const needsProcessor = settings.modalities.length > 1
  const [model, tokenizer, processor] = await Promise.all([
    AutoModel.from_pretrained(settings.model, {
      config: modelConfig as never,
      device: settings.device,
      dtype: settings.dtype,
    }),
    AutoTokenizer.from_pretrained(settings.model),
    needsProcessor ? AutoProcessor.from_pretrained(settings.model) : Promise.resolve(null),
  ])

  // Boundary casts: Transformers.js types these as broad callable classes; we
  // use exactly the shapes its model card documents for this model.
  return {
    model: model as unknown as ModelCall,
    tokenizer: tokenizer as unknown as TokenizerCall,
    processor: processor as unknown as ProcessorCall | null,
    // Read bytes ourselves (fetch / fs) so URLs and paths behave exactly like audio's.
    loadImage: async (data) =>
      RawImage.fromBlob(new Blob([new Uint8Array(await readMediaBytes(data))])),
  }
}

/**
 * Create an EmbeddingGemma 2 provider. Config falls back to env vars, so
 * `createProvider()` with no arguments works (text only, q8, 768-d, `search`).
 *
 * @param config - Optional configuration.
 * @returns An {@link AIEmbeddingsProvider} with `embedContent` for the loaded modalities.
 */
export function createProvider(config: EmbeddingGemmaConfig = {}): AIEmbeddingsProvider {
  const settings = resolveSettings(config)
  const resultModel = settings.model

  // Single-flight lazy load; reset on failure so a transient download error can retry.
  let loading: Promise<Loaded> | null = null
  const getLoaded = (): Promise<Loaded> => {
    if (!loading) {
      loading = load(config, settings).catch((error: unknown) => {
        loading = null
        throw error
      })
    }
    return loading
  }

  const prefix = (text: string, task: EmbeddingTask, inputType: EmbeddingInputType): string =>
    settings.applyPrefixes ? applyTaskPrefix(text, task, inputType) : text

  const finish = (vectors: number[][], dimensions: number | undefined): number[][] => {
    const size = checkDimensions(dimensions ?? settings.dimensions)
    return vectors.map((vector) => truncateEmbedding(vector, size))
  }

  /** Embed texts in bounded, sequential batches (sequential keeps peak memory flat). */
  const embedTexts = async (texts: string[]): Promise<number[][]> => {
    const { model, tokenizer } = await getLoaded()
    const vectors: number[][] = []
    for (let start = 0; start < texts.length; start += settings.batchSize) {
      const inputs = tokenizer(texts.slice(start, start + settings.batchSize), {
        padding: true,
        truncation: true,
      })
      const output = await model(inputs)
      for (const vector of output.sentence_embedding.tolist()) vectors.push(vector)
    }
    return vectors
  }

  /** Embed ONE content input (text + media → one vector). Media can't be batched: the processor merges a batch into one vector. */
  const embedOne = async (
    input: EmbedContentInput,
    task: EmbeddingTask,
    inputType: EmbeddingInputType,
  ): Promise<number[]> => {
    if (input.video !== undefined) {
      throw new Error(
        'EmbeddingGemma: video is not supported in Node (Transformers.js decodes video only in a browser) — embed sampled frames as images.',
      )
    }
    const hasImage = input.image !== undefined
    const hasAudio = input.audio !== undefined
    if (input.text === undefined && !hasImage && !hasAudio) {
      throw new Error('EmbeddingGemma: an embedContent input needs text, image or audio')
    }
    for (const [kind, present] of [
      ['image', hasImage],
      ['audio', hasAudio],
    ] as const) {
      if (present && !settings.modalities.includes(kind)) {
        throw new Error(
          `EmbeddingGemma: ${kind} input needs the ${kind} encoder — create the provider with modalities: ['text', '${kind}'] (or MOL_EMBEDDINGS_EMBEDDINGGEMMA_MODALITIES=text,${kind}).`,
        )
      }
    }
    if (!hasImage && !hasAudio) {
      const [vector] = await embedTexts([prefix(input.text ?? '', task, inputType)])
      return vector ?? []
    }

    const loaded = await getLoaded()
    const processor = loaded.processor
    if (!processor) throw new Error('EmbeddingGemma: processor not loaded')
    const image = hasImage
      ? await loaded.loadImage(unwrapMediaSource(input.image!).data)
      : undefined
    const audio = hasAudio ? await loadAudio(input.audio!) : undefined

    let inputs: unknown
    if (input.text === undefined) {
      inputs = await processor(null, image ?? null, audio ?? null)
    } else {
      // Interleaved: the text marks where each medium sits; append a marker the
      // caller left out so the processor finds one per medium.
      let text = input.text
      if (hasImage && !text.includes('<|image|>')) text += ' <|image|>'
      if (hasAudio && !text.includes('<|audio|>')) text += ' <|audio|>'
      inputs = await processor(
        [prefix(text, task, inputType)],
        image === undefined ? null : [[image]],
        audio === undefined ? null : [[audio]],
      )
    }
    const output = await loaded.model(inputs)
    return output.sentence_embedding.tolist()[0] ?? []
  }

  return {
    name: 'embeddinggemma',
    modalities: settings.modalities,

    async embed(params: EmbedParams): Promise<EmbeddingResult> {
      const texts = Array.isArray(params.input) ? params.input : [params.input]
      if (texts.length === 0) return { embeddings: [], model: resultModel, usage: NO_USAGE }
      const task = params.task ?? settings.task
      const inputType = params.inputType ?? 'document'
      const vectors = await embedTexts(texts.map((text) => prefix(text, task, inputType)))
      return { embeddings: finish(vectors, params.dimensions), model: resultModel, usage: NO_USAGE }
    },

    async embedQuery(text: string): Promise<number[]> {
      const [vector] = await embedTexts([prefix(text, settings.task, 'query')])
      return finish([vector ?? []], undefined)[0] ?? []
    },

    async embedDocuments(texts: string[]): Promise<number[][]> {
      if (texts.length === 0) return []
      const vectors = await embedTexts(texts.map((text) => prefix(text, settings.task, 'document')))
      return finish(vectors, undefined)
    },

    async embedContent(params: EmbedContentParams): Promise<EmbeddingResult> {
      const task = params.task ?? settings.task
      const inputType = params.inputType ?? 'document'
      const vectors: number[][] = []
      for (const input of params.inputs) vectors.push(await embedOne(input, task, inputType))
      return { embeddings: finish(vectors, params.dimensions), model: resultModel, usage: NO_USAGE }
    },
  }
}

/** Lazily-initialized provider singleton (config + env resolve on first use). */
let _provider: AIEmbeddingsProvider | null = null

/**
 * The provider implementation (text only by default). Bond it with the
 * ai-embeddings core's `setProvider`. The model loads on the first embed call.
 */
export const provider: AIEmbeddingsProvider = new Proxy({} as AIEmbeddingsProvider, {
  get(_target, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})
