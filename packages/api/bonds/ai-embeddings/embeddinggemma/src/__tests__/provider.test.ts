import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock Transformers.js so tests never download or load the real model.
// The provider dynamically imports '@huggingface/transformers', which this intercepts.
const configFromPretrained = vi.fn()
const modelFromPretrained = vi.fn()
const tokenizerFromPretrained = vi.fn()
const processorFromPretrained = vi.fn()
const rawImageFromBlob = vi.fn()
const envMock: Record<string, unknown> = {}
vi.mock('@huggingface/transformers', () => ({
  AutoConfig: { from_pretrained: (...args: unknown[]) => configFromPretrained(...args) },
  AutoModel: { from_pretrained: (...args: unknown[]) => modelFromPretrained(...args) },
  AutoTokenizer: { from_pretrained: (...args: unknown[]) => tokenizerFromPretrained(...args) },
  AutoProcessor: { from_pretrained: (...args: unknown[]) => processorFromPretrained(...args) },
  RawImage: { fromBlob: (...args: unknown[]) => rawImageFromBlob(...args) },
  env: envMock,
}))

import { truncateEmbedding } from '../matryoshka.js'
import { AUDIO_SAMPLE_RATE, decodeWav, resample } from '../media.js'
import { applyTaskPrefix } from '../prefixes.js'
import { createProvider, EMBEDDINGGEMMA_DEFAULT_MODEL } from '../provider.js'

/** A deterministic unit vector: 768 values, the first encodes `seed`. */
function unitVector(seed: number): number[] {
  const raw = Array.from({ length: 768 }, (_, i) => (i === 0 ? seed : 1))
  const norm = Math.hypot(...raw)
  return raw.map((value) => value / norm)
}

/** Fake tokenizer: records the texts and hands them to the fake model. */
const tokenizer = vi.fn((texts: string[]) => ({ texts }))
/** Fake processor: records its arguments. */
const processor = vi.fn(async (...args: unknown[]) => ({ processed: args }))
/** Fake model: one vector per tokenized text, or one for a processor call. */
const model = vi.fn(async (inputs: { texts?: string[] }) => ({
  sentence_embedding: {
    tolist: () => (inputs.texts ? inputs.texts.map((t) => unitVector(t.length)) : [unitVector(7)]),
  },
}))

/** Build a 16-bit PCM WAV file. */
function wav16(samples: number[][], sampleRate: number): Uint8Array {
  const channels = samples.length
  const frames = samples[0]?.length ?? 0
  const buffer = Buffer.alloc(44 + frames * channels * 2)
  buffer.write('RIFF', 0, 'ascii')
  buffer.writeUInt32LE(36 + frames * channels * 2, 4)
  buffer.write('WAVE', 8, 'ascii')
  buffer.write('fmt ', 12, 'ascii')
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(channels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * channels * 2, 28)
  buffer.writeUInt16LE(channels * 2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36, 'ascii')
  buffer.writeUInt32LE(frames * channels * 2, 40)
  for (let frame = 0; frame < frames; frame++) {
    for (let channel = 0; channel < channels; channel++) {
      const value = Math.round((samples[channel]?.[frame] ?? 0) * 32_767)
      buffer.writeInt16LE(value, 44 + (frame * channels + channel) * 2)
    }
  }
  return new Uint8Array(buffer)
}

const ENV_KEYS = [
  'MODEL',
  'DTYPE',
  'DEVICE',
  'MODALITIES',
  'DIMENSIONS',
  'TASK',
  'CACHE_DIR',
  'MODEL_PATH',
  'BATCH_SIZE',
].map((key) => `MOL_EMBEDDINGS_EMBEDDINGGEMMA_${key}`)

describe('api-ai-embeddings-embeddinggemma', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const key of Object.keys(envMock)) delete envMock[key]
    for (const key of ENV_KEYS) delete process.env[key]
    configFromPretrained.mockImplementation(async () => ({ vision_config: {}, audio_config: {} }))
    modelFromPretrained.mockResolvedValue(model)
    tokenizerFromPretrained.mockResolvedValue(tokenizer)
    processorFromPretrained.mockResolvedValue(processor)
    rawImageFromBlob.mockResolvedValue({ kind: 'image' })
  })

  describe('text', () => {
    it('embedQuery applies the search query prefix', async () => {
      const vector = await createProvider().embedQuery('red planet?')
      expect(tokenizer).toHaveBeenCalledWith(['task: search result | query: red planet?'], {
        padding: true,
        truncation: true,
      })
      expect(vector).toHaveLength(768)
    })

    it('embedDocuments applies the document prefix with title none', async () => {
      const vectors = await createProvider().embedDocuments(['Mars is red.', 'Venus is hot.'])
      expect(tokenizer.mock.calls[0]?.[0]).toEqual([
        'title: none | text: Mars is red.',
        'title: none | text: Venus is hot.',
      ])
      expect(vectors).toHaveLength(2)
    })

    it('embed defaults to documents and honours task + inputType', async () => {
      const provider = createProvider()
      await provider.embed({ input: 'x' })
      await provider.embed({ input: 'fn()', task: 'code-retrieval', inputType: 'query' })
      await provider.embed({ input: 'news', task: 'classification' })
      expect(tokenizer.mock.calls.map((call) => call[0][0])).toEqual([
        'title: none | text: x',
        'task: code retrieval | query: fn()',
        'task: classification | query: news',
      ])
    })

    it('never double-prefixes and can be turned off', async () => {
      await createProvider().embedQuery('task: fact checking | query: claim')
      await createProvider({ applyPrefixes: false }).embedQuery('raw')
      expect(tokenizer.mock.calls.map((call) => call[0][0])).toEqual([
        'task: fact checking | query: claim',
        'raw',
      ])
    })

    it('reports the model, zero usage, and short-circuits empty input', async () => {
      const provider = createProvider()
      const result = await provider.embed({ input: ['a'] })
      expect(result.model).toBe(EMBEDDINGGEMMA_DEFAULT_MODEL)
      expect(result.usage).toEqual({ promptTokens: 0, totalTokens: 0 })
      expect(await provider.embed({ input: [] })).toEqual({
        embeddings: [],
        model: EMBEDDINGGEMMA_DEFAULT_MODEL,
        usage: { promptTokens: 0, totalTokens: 0 },
      })
      expect(await provider.embedDocuments([])).toEqual([])
    })

    it('truncates to a Matryoshka size and re-normalizes', async () => {
      const result = await createProvider().embed({ input: 'x', dimensions: 256 })
      const [vector] = result.embeddings
      expect(vector).toHaveLength(256)
      expect(Math.hypot(...(vector ?? []))).toBeCloseTo(1, 6)
      const configured = await createProvider({ dimensions: 128 }).embedQuery('x')
      expect(configured).toHaveLength(128)
    })

    it('rejects sizes the model was not trained for', async () => {
      await expect(createProvider().embed({ input: 'x', dimensions: 300 })).rejects.toThrow(
        /768, 512, 256, 128/,
      )
      expect(() => createProvider({ dimensions: 64 as never })).toThrow(/dimensions/)
    })

    it('batches texts in bounded passes, preserving order', async () => {
      const texts = Array.from({ length: 5 }, (_, i) => 'x'.repeat(i + 1))
      const vectors = await createProvider({ batchSize: 2, applyPrefixes: false }).embedDocuments(
        texts,
      )
      expect(tokenizer.mock.calls.map((call) => call[0].length)).toEqual([2, 2, 1])
      expect(vectors.map((vector) => vector[0])).toEqual(
        texts.map((text) => unitVector(text.length)[0]),
      )
    })

    it('loads the model once (single-flight) with q8 on cpu by default', async () => {
      const provider = createProvider()
      await Promise.all([provider.embedQuery('a'), provider.embedDocuments(['b'])])
      expect(modelFromPretrained).toHaveBeenCalledTimes(1)
      expect(modelFromPretrained).toHaveBeenCalledWith(EMBEDDINGGEMMA_DEFAULT_MODEL, {
        config: { vision_config: null, audio_config: null },
        device: 'cpu',
        dtype: 'q8',
      })
      expect(processorFromPretrained).not.toHaveBeenCalled()
    })

    it('retries the load after a failure', async () => {
      modelFromPretrained.mockRejectedValueOnce(new Error('download failed'))
      const provider = createProvider()
      await expect(provider.embedQuery('a')).rejects.toThrow('download failed')
      await expect(provider.embedQuery('a')).resolves.toHaveLength(768)
    })
  })

  describe('configuration', () => {
    it('reads model, dtype, device, task, dimensions and batch size from env', async () => {
      process.env.MOL_EMBEDDINGS_EMBEDDINGGEMMA_MODEL = 'mirror/egemma'
      process.env.MOL_EMBEDDINGS_EMBEDDINGGEMMA_DTYPE = 'q4'
      process.env.MOL_EMBEDDINGS_EMBEDDINGGEMMA_DEVICE = 'wasm'
      process.env.MOL_EMBEDDINGS_EMBEDDINGGEMMA_TASK = 'question-answering'
      process.env.MOL_EMBEDDINGS_EMBEDDINGGEMMA_DIMENSIONS = '512'
      process.env.MOL_EMBEDDINGS_EMBEDDINGGEMMA_BATCH_SIZE = '1'
      const vector = await createProvider().embedQuery('why?')
      expect(vector).toHaveLength(512)
      expect(tokenizer).toHaveBeenCalledWith(['task: question answering | query: why?'], {
        padding: true,
        truncation: true,
      })
      expect(modelFromPretrained).toHaveBeenCalledWith(
        'mirror/egemma',
        expect.objectContaining({ dtype: 'q4', device: 'wasm' }),
      )
    })

    it('fails loudly on a typo instead of loading something else', () => {
      process.env.MOL_EMBEDDINGS_EMBEDDINGGEMMA_DTYPE = 'int8'
      expect(() => createProvider()).toThrow(/dtype must be one of/)
      delete process.env.MOL_EMBEDDINGS_EMBEDDINGGEMMA_DTYPE
      process.env.MOL_EMBEDDINGS_EMBEDDINGGEMMA_TASK = 'searching'
      expect(() => createProvider()).toThrow(/unknown task/)
    })

    it('rejects video in Node with a pointer to the alternatives', () => {
      expect(() => createProvider({ modalities: ['video' as never] })).toThrow(/browser/)
    })

    it('a bundled localModelPath disables remote fetch; cacheDir is honoured', async () => {
      await createProvider({ localModelPath: '/models', cacheDir: '/cache' }).embedQuery('x')
      expect(envMock).toMatchObject({
        localModelPath: '/models',
        allowRemoteModels: false,
        cacheDir: '/cache',
      })
    })

    it('a malformed batch size falls back to the default bound', async () => {
      process.env.MOL_EMBEDDINGS_EMBEDDINGGEMMA_BATCH_SIZE = 'lots'
      await createProvider({ applyPrefixes: false }).embedDocuments(
        Array.from({ length: 20 }, (_, i) => `t${i}`),
      )
      expect(tokenizer.mock.calls.map((call) => call[0].length)).toEqual([16, 4])
    })
  })

  describe('embedContent', () => {
    it('advertises the loaded modalities and loads only those encoders', async () => {
      const provider = createProvider({ modalities: ['image'] })
      expect(provider.modalities).toEqual(['text', 'image'])
      await provider.embedContent!({ inputs: [{ image: new Uint8Array([1, 2, 3]) }] })
      expect(modelFromPretrained).toHaveBeenCalledWith(
        EMBEDDINGGEMMA_DEFAULT_MODEL,
        expect.objectContaining({ config: { vision_config: {}, audio_config: null } }),
      )
      expect(processor).toHaveBeenCalledWith(null, { kind: 'image' }, null)
    })

    it('embeds each input as one vector, one pass per media input', async () => {
      const provider = createProvider({ modalities: ['image'] })
      const result = await provider.embedContent!({
        inputs: [{ image: new Uint8Array([1]) }, { text: 'hello' }],
        dimensions: 512,
      })
      expect(result.embeddings).toHaveLength(2)
      expect(result.embeddings.every((vector) => vector.length === 512)).toBe(true)
      expect(processor).toHaveBeenCalledTimes(1)
      expect(tokenizer).toHaveBeenCalledWith(['title: none | text: hello'], expect.anything())
    })

    it('interleaves text and media, appending a missing placeholder', async () => {
      const provider = createProvider({ modalities: ['image'] })
      await provider.embedContent!({
        inputs: [{ text: 'my cats', image: { data: new Uint8Array([1]), mimeType: 'image/jpeg' } }],
        inputType: 'query',
      })
      expect(processor).toHaveBeenCalledWith(
        ['task: search result | query: my cats <|image|>'],
        [[{ kind: 'image' }]],
        null,
      )
    })

    it('decodes WAV audio to 16 kHz mono', async () => {
      const provider = createProvider({ modalities: ['audio'] })
      const audio = wav16([Array(32_000).fill(0.5)], 32_000)
      await provider.embedContent!({ inputs: [{ audio: { data: audio, mimeType: 'audio/wav' } }] })
      const samples = processor.mock.calls[0]?.[2] as Float32Array
      expect(samples).toBeInstanceOf(Float32Array)
      expect(samples.length).toBe(16_000)
      expect(samples[100]).toBeCloseTo(0.5, 3)
    })

    it('reads media from a file path', async () => {
      const dir = mkdtempSync(join(tmpdir(), 'egemma-'))
      const path = join(dir, 'clip.wav')
      writeFileSync(path, wav16([[0.1, 0.1]], AUDIO_SAMPLE_RATE))
      await createProvider({ modalities: ['audio'] }).embedContent!({ inputs: [{ audio: path }] })
      expect((processor.mock.calls[0]?.[2] as Float32Array).length).toBe(2)
    })

    it('refuses media whose encoder is not loaded, empty inputs, video and non-WAV audio', async () => {
      const textOnly = createProvider()
      await expect(
        textOnly.embedContent!({ inputs: [{ image: new Uint8Array([1]) }] }),
      ).rejects.toThrow(/modalities: \['text', 'image'\]/)
      await expect(textOnly.embedContent!({ inputs: [{}] })).rejects.toThrow(/needs text/)
      await expect(
        textOnly.embedContent!({ inputs: [{ video: new Uint8Array([1]) }] }),
      ).rejects.toThrow(/video is not supported in Node/)
      const audio = createProvider({ modalities: ['audio'] })
      await expect(
        audio.embedContent!({
          inputs: [{ audio: { data: new Uint8Array([1]), mimeType: 'audio/mpeg' } }],
        }),
      ).rejects.toThrow(/WAV/)
      await expect(
        audio.embedContent!({ inputs: [{ audio: new Uint8Array([1, 2, 3, 4]) }] }),
      ).rejects.toThrow(/RIFF\/WAVE/)
    })
  })

  describe('helpers', () => {
    it('applyTaskPrefix maps every task', () => {
      expect(applyTaskPrefix('q', 'fact-checking', 'query')).toBe('task: fact checking | query: q')
      expect(applyTaskPrefix('d', 'question-answering', 'document')).toBe('title: none | text: d')
      expect(applyTaskPrefix('c', 'clustering', 'document')).toBe('task: clustering | query: c')
      expect(applyTaskPrefix('s', 'similarity', 'document')).toBe(
        'task: sentence similarity | query: s',
      )
    })

    it('decodeWav mixes stereo down and resample changes the rate', () => {
      const decoded = decodeWav(wav16([Array(8).fill(1), Array(8).fill(0)], 48_000))
      expect(decoded.sampleRate).toBe(48_000)
      expect(decoded.samples[0]).toBeCloseTo(0.5, 3)
      expect(resample(decoded, 16_000)).toHaveLength(2)
    })

    it('truncateEmbedding leaves full-size vectors alone', () => {
      const vector = unitVector(3)
      expect(truncateEmbedding(vector, 768)).toBe(vector)
      expect(Math.hypot(...truncateEmbedding(vector, 128))).toBeCloseTo(1, 6)
    })
  })
})
