/**
 * Worker thread that runs the Bergamot WASM runtime.
 *
 * Bergamot's WASM build is single-threaded and synchronous, so each worker
 * runs one translation at a time off the main event loop; parallelism comes
 * from running several workers. Each worker serves ONE route — one model, or
 * the two models of a pivot — like Firefox, which runs one engine per language
 * pair: a runtime that had translated with one model and then loaded a second
 * one crashed (`memory access out of bounds`, reproduced with en→de then
 * en→ja in one instance). This file only uses `import type` from the
 * rest of the package, so Node can run it directly from source (type
 * stripping) as well as from `dist/`.
 *
 * The loader (`bergamot-translator.js`) is Firefox's own, built for a Web
 * Worker: it defines a global `loadBergamot(Module)` function and, given the
 * WASM bytes, instantiates them without touching the network or the DOM. The
 * integer matrix-multiply ("gemm") falls back to the WASM's built-in version,
 * because Node has no `WebAssembly.mozIntGemm`.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { runInThisContext } from 'node:vm'
import { parentPort, workerData } from 'node:worker_threads'

import type { BergamotModelFiles, BergamotModelSpec } from './types.js'

/** What the engine passes to each worker. */
interface WorkerInit {
  gluePath: string
  wasmPath: string
  /** The route this worker serves: one model, or two to pivot. */
  models: BergamotModelSpec[]
}

/** A C++ object exposed through embind. */
interface Deletable {
  delete(): void
}

/** A C++ `std::vector` exposed through embind. */
interface Vector<T> extends Deletable {
  size(): number
  get(index: number): T
  push_back(item: T): void
}

/** The subset of the Bergamot module this worker uses. */
interface BergamotModule {
  AlignedMemory: new (
    size: number,
    alignment: number,
  ) => Deletable & {
    getByteArrayView(): Uint8Array
  }
  AlignedMemoryList: new () => Vector<unknown>
  TranslationModel: new (
    from: string,
    to: string,
    config: string,
    model: unknown,
    lex: unknown,
    vocabs: unknown,
    qualityModel: unknown,
  ) => Deletable
  BlockingService: new (options: { cacheSize: number }) => {
    translate(model: Deletable, texts: unknown, options: unknown): Vector<Response>
    translateViaPivoting(
      first: Deletable,
      second: Deletable,
      texts: unknown,
      options: unknown,
    ): Vector<Response>
  }
  VectorString: new () => Vector<string>
  VectorResponseOptions: new () => Vector<{
    qualityScores: boolean
    alignment: boolean
    html: boolean
  }>
}

/** One translation result. */
interface Response {
  getTranslatedText(): string
}

/** Memory alignment Bergamot requires for each file role. */
const ALIGNMENT: Record<keyof BergamotModelFiles, number> = {
  model: 256,
  lex: 64,
  vocab: 64,
  srcvocab: 64,
  trgvocab: 64,
}

/**
 * Marian settings, as Firefox passes them: greedy decoding, int8 matrix
 * multiplication, sentences split at 128 tokens.
 */
const MODEL_CONFIG = `
beam-size: 1
normalize: 1.0
word-penalty: 0
max-length-break: 128
mini-batch-words: 1024
workspace: 128
max-length-factor: 2.0
skip-cost: true
cpu-threads: 0
quiet: true
quiet-translation: true
gemm-precision: int8shiftAlphaAll
alignment: soft
`

const init = workerData as WorkerInit

/**
 * Instantiates the WASM runtime.
 *
 * @returns The Bergamot module.
 */
async function loadRuntime(): Promise<BergamotModule> {
  const loaderSource = readFileSync(init.gluePath, 'utf8')
  const loadBergamot = runInThisContext(
    `(function () {\n${loaderSource}\nreturn loadBergamot\n})()`,
    {
      filename: init.gluePath,
    },
  ) as (module: Record<string, unknown>) => BergamotModule
  // The loader announces which gemm it picked with console.log; this worker's
  // console is its own, so muting it during start-up affects nothing else.
  const log = console.log
  console.log = () => undefined
  try {
    return await new Promise<BergamotModule>((resolve, reject) => {
      const module = loadBergamot({
        INITIAL_MEMORY: 234_291_200,
        wasmBinary: readFileSync(init.wasmPath),
        print: () => undefined,
        printErr: () => undefined,
        onAbort: (reason: unknown) =>
          reject(new Error(`Bergamot runtime aborted: ${String(reason)}`)),
        onRuntimeInitialized: () => resolve(module),
      })
    })
  } finally {
    console.log = log
  }
}

/**
 * Loads one model into the runtime's memory.
 *
 * @param bergamot - The runtime.
 * @param spec - Which model.
 * @returns The model.
 */
function loadModel(bergamot: BergamotModule, spec: BergamotModelSpec): Deletable {
  const memory = (role: keyof BergamotModelFiles, path: string): Deletable => {
    const bytes = readFileSync(path)
    const aligned = new bergamot.AlignedMemory(bytes.byteLength, ALIGNMENT[role])
    aligned.getByteArrayView().set(bytes)
    return aligned
  }
  const vocabs = new bergamot.AlignedMemoryList()
  if (spec.files.vocab) vocabs.push_back(memory('vocab', spec.files.vocab))
  else if (spec.files.srcvocab && spec.files.trgvocab) {
    vocabs.push_back(memory('srcvocab', spec.files.srcvocab))
    vocabs.push_back(memory('trgvocab', spec.files.trgvocab))
  } else throw new Error(`Bergamot model ${spec.key} has no vocabulary`)
  return new bergamot.TranslationModel(
    spec.from,
    spec.to,
    MODEL_CONFIG,
    memory('model', spec.files.model),
    memory('lex', spec.files.lex),
    vocabs,
    null,
  )
}

/**
 * Starts the runtime and loads this worker's route.
 *
 * @returns Everything a translation needs.
 */
async function start(): Promise<{
  bergamot: BergamotModule
  service: InstanceType<BergamotModule['BlockingService']>
  models: Deletable[]
}> {
  if (init.models.length < 1 || init.models.length > 2) {
    throw new Error(`Bergamot takes one or two models, got ${init.models.length}`)
  }
  const bergamot = await loadRuntime()
  return {
    bergamot,
    service: new bergamot.BlockingService({ cacheSize: 0 }),
    models: init.models.map((spec) => loadModel(bergamot, spec)),
  }
}

const ready = start()
// A start-up failure is reported to every request, which all await `ready`;
// this handler only stops it counting as an unhandled rejection before the first one.
ready.catch((_error: unknown) => undefined)

/**
 * Translates one batch. Leading/trailing whitespace is kept aside and put back,
 * as Firefox does; blank texts are returned unchanged.
 *
 * @param input - The texts.
 * @param html - Whether they are HTML.
 * @returns One translation per text.
 */
async function translate(input: string[], html: boolean): Promise<string[]> {
  const { bergamot, service, models } = await ready
  const out = [...input]
  const positions: number[] = []
  const edges: Array<[string, string]> = []
  const texts = new bergamot.VectorString()
  const options = new bergamot.VectorResponseOptions()
  let responses: Vector<Response> | null = null
  try {
    input.forEach((text, i) => {
      const match = /^(\s*)([\s\S]*?)(\s*)$/.exec(text)!
      if (match[2] === '') return
      positions.push(i)
      edges.push([match[1], match[3]])
      texts.push_back(match[2])
      options.push_back({ qualityScores: false, alignment: html, html })
    })
    if (positions.length === 0) return out
    responses =
      models.length === 1
        ? service.translate(models[0], texts, options)
        : service.translateViaPivoting(models[0], models[1], texts, options)
    positions.forEach((position, k) => {
      out[position] = edges[k][0] + responses!.get(k).getTranslatedText() + edges[k][1]
    })
    return out
  } finally {
    texts.delete()
    options.delete()
    responses?.delete()
  }
}

parentPort?.on('message', (message: { id: number; texts: string[]; html: boolean }) => {
  translate(message.texts, message.html).then(
    (texts) => parentPort?.postMessage({ id: message.id, texts }),
    (error: unknown) =>
      parentPort?.postMessage({
        id: message.id,
        error: error instanceof Error ? error.message : String(error),
      }),
  )
})
