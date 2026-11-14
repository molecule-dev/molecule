// @vitest-environment jsdom
/**
 * Execute the published resource example with delayed reads, writes and list
 * refreshes — the counterpart of the React package's own
 * resource-toggle-example test.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import './node-globals.js'
import * as SolidJS from 'solid-js'
import * as SolidWeb from 'solid-js/web'
import { render as solidRender } from 'solid-js/web'
import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { QueryProvider } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider as memoryProvider } from '@molecule/app-query-memory'
import { provider as tanstackProvider } from '@molecule/app-query-tanstack'
import { useOptimisticValue } from '@molecule/app-solid'

import {
  createQueryResource,
  QueryContent,
  type QueryResource,
  type ResourceHttp,
  useQuery,
} from '../index.js'
import { runExample } from './example-runner.js'
import { settle } from './helpers.jsx'

interface Invoice {
  id: string
  number: string
  flagged: boolean
}
interface Example {
  invoices: QueryResource<Invoice>
  InvoicePage: (props: { id: string }) => unknown
}
const initial: Invoice = { id: 'one', number: 'INV-1', flagged: false }
const sourcePath = join(import.meta.dirname, '../index.ts')
const doc = readFileSync(sourcePath, 'utf8').replace(/^ \* ?/gm, '')
const snippet = [...doc.matchAll(/```tsx\n([\s\S]*?)```/g)].find((match) =>
  match[1]?.includes('export const invoices'),
)?.[1]
if (!snippet) throw new Error('Missing executable query-resource example')

/** Bind services, retaining the example's actual UI, primitive and resource composition. */
function compile(http: ResourceHttp): Example {
  const imports: Record<string, unknown> = {
    'solid-js': SolidJS,
    'solid-js/web': SolidWeb,
    '@molecule/app-http': {
      getClient: () => http,
      unwrapList: (response: { data: unknown }) => response.data,
      unwrapSingle: (response: { data: unknown }) => response.data,
    },
    '@molecule/app-query-solid': { QueryContent, createQueryResource, useQuery },
    '@molecule/app-solid': {
      useAuth: () => ({ user: () => ({ id: 'reader' }) }),
      useOptimisticValue,
      useTranslation: () => ({
        t: (_key: string, _values: unknown, options: { defaultValue: string }) =>
          options.defaultValue,
      }),
    },
  }
  return runExample(snippet, imports, ['InvoicePage', 'invoices']) as Example
}

it('the complete resource example compiles against the installed public contracts', () => {
  const file = join(import.meta.dirname, '__resource-example__.tsx')
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    types: [],
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.Preserve,
    jsxImportSource: 'solid-js',
  }
  const host = ts.createCompilerHost(options)
  const getSourceFile = host.getSourceFile.bind(host)
  host.getSourceFile = (path, languageVersion, onError, shouldCreateNewSourceFile) =>
    path === file
      ? ts.createSourceFile(path, snippet, languageVersion, true, ts.ScriptKind.TSX)
      : getSourceFile(path, languageVersion, onError, shouldCreateNewSourceFile)
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([file], options, host))
  expect(
    diagnostics.map((item) => ({
      line: item.file?.getLineAndCharacterOfPosition(item.start ?? 0).line,
      message: ts.flattenDiagnosticMessageText(item.messageText, '\n'),
    })),
  ).toEqual([])
})

let host: HTMLDivElement | null = null
let dispose: (() => void) | null = null

/** Mount the example's page (the same instance stays mounted across a test). */
function mount(example: Example): void {
  dispose?.()
  host = document.createElement('div')
  document.body.append(host)
  dispose = solidRender(() => example.InvoicePage({ id: initial.id }), host)
}

function click(): void {
  host!.querySelector('button')!.click()
}

afterEach(() => {
  dispose?.()
  dispose = null
  host?.remove()
  resetQueryClient()
})

describe.each([
  ['memory', memoryProvider],
  ['tanstack', tanstackProvider],
] as const)('the invoice toggle example over %s', (_name, provider: QueryProvider) => {
  let http: ResourceHttp
  beforeEach(() => {
    resetQueryClient()
    setProvider(provider)
    http = {
      get: vi.fn(async () => ({ data: initial })),
      post: vi.fn(async () => ({ data: { ...initial, flagged: true } })),
      delete: vi.fn(async () => ({ data: initial })),
      put: vi.fn(async () => ({ data: initial })),
      patch: vi.fn(async () => ({ data: initial })),
    }
  })

  it('waits for the initial record before mounting an action, then saves its first click', async () => {
    const read = deferredOf<{ data: Invoice }>()
    vi.mocked(http.get).mockReturnValue(read.promise)
    mount(compile(http))
    expect(host?.querySelector('button')).toBeNull()
    expect(http.post).not.toHaveBeenCalled()
    read.resolve({ data: initial })
    await settle()
    click()
    expect(host?.querySelector('button')!.textContent).toContain('Unflag')
    await settle()
    expect(http.post).toHaveBeenCalledExactlyOnceWith('/invoices/one/flag')
    dispose?.()
    dispose = null
  })

  it.each(['missing', 'failed'] as const)(
    'presents an initial %s read without mounting a record action',
    async (state) => {
      if (state === 'missing') vi.mocked(http.get).mockResolvedValue({ data: null })
      else vi.mocked(http.get).mockRejectedValue(new Error('Offline'))
      mount(compile(http))
      await settle()
      expect(host?.querySelector('button')).toBeNull()
      expect(host?.querySelector('[role="alert"]')?.textContent).toBe(
        state === 'missing' ? 'Invoice not found.' : 'Unable to load invoice.',
      )
      expect(http.post).not.toHaveBeenCalled()
    },
  )

  it('keeps an inverse click after cache publication while the first list refresh is delayed', async () => {
    const example = compile(http)
    const refresh = deferredOf<{ data: Invoice[] }>()
    // A tracked list extends the mutation promise beyond publication of its saved detail.
    const list = example.invoices.list('reader')
    getQueryClient().set(list.key, [initial])
    vi.mocked(http.get).mockImplementation(async (path) =>
      path === '/invoices' ? refresh.promise : { data: initial },
    )
    mount(example)
    await settle()
    click()
    await settle()
    expect(getQueryClient().get(['invoices', 'reader', 'detail', 'one'])).toMatchObject({
      flagged: true,
    })
    click()
    expect(host?.querySelector('button')!.textContent).toContain('Flag')
    expect(host?.querySelector('button')!.getAttribute('aria-pressed')).toBe('false')
    expect(http.delete).not.toHaveBeenCalled()
    refresh.resolve({ data: [{ ...initial, flagged: true }] })
    await settle()
    expect(http.delete).toHaveBeenCalledExactlyOnceWith('/invoices/one/flag')
    expect(host?.querySelector('button')!.getAttribute('aria-pressed')).toBe('false')
    dispose?.()
    dispose = null
  })

  it('rejects a late pre-mutation read and keeps the label on the completed saved state', async () => {
    const example = compile(http)
    const detail = example.invoices.detail('reader', initial.id)!
    const client = getQueryClient()
    client.set(detail.key, initial)
    const old = deferredOf<{ data: Invoice }>()
    vi.mocked(http.get).mockReturnValue(old.promise)
    const reading = client.fetch({ ...detail, staleMs: 0 })
    mount(example)
    click()
    await settle()
    old.resolve({ data: initial })
    await reading
    await settle()
    expect(host?.querySelector('button')!.getAttribute('aria-pressed')).toBe('true')
    expect(host?.querySelector('button')!.textContent).toContain('Unflag')
    expect(client.get(detail.key)).toMatchObject({ flagged: true })
    dispose?.()
    dispose = null
  })

  it('counterexample: accepts a genuinely newer server value after saving completes', async () => {
    const example = compile(http)
    mount(example)
    await settle()
    click()
    await settle()
    expect(host?.querySelector('button')!.getAttribute('aria-pressed')).toBe('true')
    const detail = example.invoices.detail('reader', initial.id)!
    // The first publication acknowledges the primitive's current incoming server snapshot.
    getQueryClient().set(detail.key, { ...initial, flagged: true })
    getQueryClient().set(detail.key, initial)
    expect(host?.querySelector('button')!.getAttribute('aria-pressed')).toBe('false')
    expect(host?.querySelector('button')!.textContent).toContain('Flag')
    expect(http.post).toHaveBeenCalledTimes(1)
    expect(http.delete).not.toHaveBeenCalled()
    dispose?.()
    dispose = null
  })
})

/** The tests' local deferred, matching the React file's helper. */
function deferredOf<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((yes) => {
    resolve = yes
  })
  return { promise, resolve }
}
