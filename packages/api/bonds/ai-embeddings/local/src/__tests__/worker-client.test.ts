import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { Worker } from 'node:worker_threads'

import { afterEach, describe, expect, it } from 'vitest'

import type { ResolvedLocalEmbeddingsConfig } from '../worker-client.js'
import { createWorkerExtractor } from '../worker-client.js'

const config: ResolvedLocalEmbeddingsConfig = {
  model: 'test',
  pooling: 'cls',
  normalize: true,
  batchSize: 2,
  inferenceThreads: 1,
  requestTimeoutMs: 5_000,
}
const clients: ReturnType<typeof createWorkerExtractor>[] = []
afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()))
})

const asModule = (source: string): string => `data:text/javascript,${encodeURIComponent(source)}`

/** Real worker entry, real queue and extractor; only the heavyweight model is replaced. */
function modelLoader(model: string): string {
  const loader = asModule(`
    export async function resolve(specifier, context, next) {
      if (specifier === '@huggingface/transformers') return {
        url: ${JSON.stringify(asModule(model))}, shortCircuit: true,
      };
      return next(specifier, context);
    }
  `)
  return asModule(`import { register } from 'node:module'; register(${JSON.stringify(loader)});`)
}

/** Start the production worker with a deterministic model module. */
function modelWorker(model: string, workerConfig = config): Worker {
  return new Worker(new URL('../worker.ts', import.meta.url), {
    workerData: workerConfig,
    execArgv: ['--import', modelLoader(model)],
  })
}

describe('local embeddings worker', () => {
  it('runs from stdin/eval callers without inheriting file-incompatible --input-type', async () => {
    const loader = modelLoader(`
      export const env = {};
      export async function pipeline() {
        return async texts => ({tolist: () => texts.map(text => [text.length])});
      }
    `)
    for (const flags of [['--input-type=module'], ['--input-type', 'module']]) {
      const script = `
        const { createWorkerExtractor } = await import(${JSON.stringify(new URL('../worker-client.ts', import.meta.url).href)});
        const client = createWorkerExtractor(${JSON.stringify(config)});
        try { console.log(JSON.stringify(await client.extract(['abc']))); }
        finally { await client.close(); }
      `
      const result = await promisify(execFile)(process.execPath, [
        '--import',
        loader,
        ...flags,
        '--eval',
        script,
      ])
      expect(JSON.parse(result.stdout.trim())).toEqual([[3]])
    }
  })
  it('keeps the caller responsive while synchronous model work blocks the worker', async () => {
    const client = createWorkerExtractor(config, () =>
      modelWorker(`
      export const env = {};
      export async function pipeline() {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
        return async texts => ({tolist: () => texts.map(text => [text.length])});
      }
    `),
    )
    clients.push(client)
    let complete = false
    const vectors = client.extract(['aa', 'b']).then((result) => {
      complete = true
      return result
    })
    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(complete).toBe(false)
    expect(await vectors).toEqual([[2], [1]])
  })

  it('serializes concurrent requests, preserves order and loads one model', async () => {
    const client = createWorkerExtractor(config, () =>
      modelWorker(`
      export const env = {};
      let calls = 0, active = false;
      export async function pipeline() {
        if (++calls !== 1) throw Error('loaded twice');
        return async texts => {
          if (active) throw Error('concurrent inference');
          active = true;
          await new Promise(resolve => setTimeout(resolve, 10));
          active = false;
          return {tolist: () => texts.map(text => [text.length])};
        };
      }
    `),
    )
    clients.push(client)
    expect(
      await Promise.all([client.extract(['aa', 'b', 'ccc']), client.extract(['dddd'])]),
    ).toEqual([[[2], [1], [3]], [[4]]])
  })

  it('retries model initialization after a real worker reports a load failure', async () => {
    const client = createWorkerExtractor(config, () =>
      modelWorker(`
      export const env = {};
      let calls = 0;
      export async function pipeline() {
        if (++calls === 1) throw Error('model load failed');
        return async texts => ({tolist: () => texts.map(text => [text.length])});
      }
    `),
    )
    clients.push(client)
    await expect(client.extract(['aa'])).rejects.toThrow('model load failed')
    expect(await client.extract(['aa'])).toEqual([[2]])
  })

  it('rejects all queued calls on worker exit and replaces it for a later call', async () => {
    let started = 0
    const client = createWorkerExtractor(config, () => {
      started += 1
      return new Worker(
        started === 1
          ? 'process.exit(7)'
          : `
        const {parentPort} = require('node:worker_threads');
        parentPort.on('message', m => parentPort.postMessage({id:m.id,vectors:[[9]]}));
      `,
        { eval: true },
      )
    })
    clients.push(client)
    const results = await Promise.allSettled([client.extract(['a']), client.extract(['b'])])
    expect(results.map((r) => r.status)).toEqual(['rejected', 'rejected'])
    expect(await client.extract(['c'])).toEqual([[9]])
    expect(started).toBe(2)
  })

  it('terminates a hung worker at the deadline and can recover', async () => {
    let started = 0
    const client = createWorkerExtractor({ ...config, requestTimeoutMs: 150 }, () => {
      started += 1
      return new Worker(
        started === 1
          ? 'setInterval(() => {}, 1000)'
          : `
        const {parentPort} = require('node:worker_threads');
        parentPort.on('message', m => parentPort.postMessage({id:m.id,vectors:[[1]]}));
      `,
        { eval: true },
      )
    })
    clients.push(client)
    await expect(client.extract(['x'])).rejects.toThrow('timed out')
    expect(await client.extract(['y'])).toEqual([[1]])
  })

  it('closes pending work and refuses subsequent calls without spawning another worker', async () => {
    let started = 0
    const client = createWorkerExtractor(config, () => {
      started += 1
      return new Worker('setInterval(() => {}, 1000)', { eval: true })
    })
    clients.push(client)
    const pending = client.extract(['x'])
    const rejection = expect(pending).rejects.toThrow('closed')
    await new Promise((resolve) => setImmediate(resolve))
    await client.close()
    await rejection
    await expect(client.extract(['y'])).rejects.toThrow('closed')
    expect(started).toBe(1)
  })
})
