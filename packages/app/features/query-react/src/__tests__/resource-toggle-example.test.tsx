/** Execute the published resource example with delayed reads, writes and list refreshes. */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { act, type ComponentType, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { QueryProvider } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider as memoryProvider } from '@molecule/app-query-memory'
import { provider as tanstackProvider } from '@molecule/app-query-tanstack'
import { useOptimisticValue } from '@molecule/app-react'

import { QueryContent } from '../query-content.js'
import { createQueryResource, type QueryResource, type ResourceHttp } from '../resource.js'
import { useQuery } from '../useQuery.js'

interface Invoice {
  id: string
  number: string
  flagged: boolean
}
interface Example {
  invoices: QueryResource<Invoice>
  InvoicePage: ComponentType<{ id: string }>
}
const initial: Invoice = { id: 'one', number: 'INV-1', flagged: false }
const sourcePath = join(__dirname, '../index.ts')
const doc = readFileSync(sourcePath, 'utf8').replace(/^ \* ?/gm, '')
const snippet = [...doc.matchAll(/```tsx\n([\s\S]*?)```/g)].find((match) =>
  match[1]?.includes('export const invoices'),
)?.[1]
if (!snippet) throw new Error('Missing executable query-resource example')

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

/** Bind services, retaining the example's actual UI, hook and resource composition. */
function compile(http: ResourceHttp): Example {
  const imports: Record<string, unknown> = {
    '@molecule/app-http': {
      getClient: () => http,
      unwrapList: (response: { data: unknown }) => response.data,
      unwrapSingle: (response: { data: unknown }) => response.data,
    },
    '@molecule/app-query-react': { QueryContent, createQueryResource, useQuery },
    '@molecule/app-react': {
      useAuth: () => ({ user: { id: 'reader' } }),
      useOptimisticValue,
      useTranslation: () => ({
        t: (_key: string, _values: unknown, options: { defaultValue: string }) =>
          options.defaultValue,
      }),
    },
  }
  const result = ts.transpileModule(`${snippet}\nexport { InvoicePage }`, {
    fileName: 'resource-example.tsx',
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  })
  expect(result.diagnostics).toEqual([])
  const exports = {}
  new Function('require', 'exports', 'React', result.outputText)(
    (name: string) => {
      if (!(name in imports)) throw new Error(`Unexpected example import: ${name}`)
      return imports[name]
    },
    exports,
    { createElement },
  )
  return exports as Example
}

it('the complete resource example compiles against the installed public contracts', () => {
  const file = join(__dirname, '__resource-example__.tsx')
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    types: [],
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
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

let root: Root | undefined
let host: HTMLDivElement
const flush = async () => {
  for (let i = 0; i < 6; i++) await act(async () => {})
}
function mount(example: Example): void {
  host = document.createElement('div')
  root = createRoot(host)
  act(() => root!.render(createElement(example.InvoicePage, { id: initial.id })))
}
function click(): void {
  act(() => host.querySelector('button')!.click())
}
afterEach(() => {
  if (root) act(() => root!.unmount())
  root = undefined
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
      put: vi.fn(),
      patch: vi.fn(),
    }
  })

  it('waits for the initial record before mounting an action, then saves its first click', async () => {
    const read = deferred<{ data: Invoice }>()
    vi.mocked(http.get).mockReturnValue(read.promise)
    mount(compile(http))
    expect(host.querySelector('button')).toBeNull()
    expect(http.post).not.toHaveBeenCalled()
    await act(async () => read.resolve({ data: initial }))
    click()
    expect(host.querySelector('button')!.textContent).toContain('Unflag')
    await flush()
    expect(http.post).toHaveBeenCalledExactlyOnceWith('/invoices/one/flag')
  })

  it.each(['missing', 'failed'] as const)(
    'presents an initial %s read without mounting a record action',
    async (state) => {
      if (state === 'missing') vi.mocked(http.get).mockResolvedValue({ data: null })
      else vi.mocked(http.get).mockRejectedValue(new Error('Offline'))
      mount(compile(http))
      await flush()
      expect(host.querySelector('button')).toBeNull()
      expect(host.querySelector('[role="alert"]')?.textContent).toBe(
        state === 'missing' ? 'Invoice not found.' : 'Unable to load invoice.',
      )
      expect(http.post).not.toHaveBeenCalled()
    },
  )

  it('keeps an inverse click after cache publication while the first list refresh is delayed', async () => {
    const example = compile(http)
    const refresh = deferred<{ data: Invoice[] }>()
    // A tracked list extends the mutation promise beyond publication of its saved detail.
    const list = example.invoices.list('reader')
    getQueryClient().set(list.key, [initial])
    vi.mocked(http.get).mockImplementation(async (path) =>
      path === '/invoices' ? refresh.promise : { data: initial },
    )
    mount(example)
    await flush()
    click()
    await flush()
    expect(getQueryClient().get(['invoices', 'reader', 'detail', 'one'])).toMatchObject({
      flagged: true,
    })
    click()
    expect(host.querySelector('button')!.textContent).toContain('Flag')
    expect(host.querySelector('button')!.getAttribute('aria-pressed')).toBe('false')
    expect(http.delete).not.toHaveBeenCalled()
    await act(async () => refresh.resolve({ data: [{ ...initial, flagged: true }] }))
    await flush()
    expect(http.delete).toHaveBeenCalledExactlyOnceWith('/invoices/one/flag')
    expect(host.querySelector('button')!.getAttribute('aria-pressed')).toBe('false')
  })

  it('rejects a late pre-mutation read and keeps the label on the completed saved state', async () => {
    const example = compile(http)
    const detail = example.invoices.detail('reader', initial.id)!
    const client = getQueryClient()
    client.set(detail.key, initial)
    const old = deferred<{ data: Invoice }>()
    vi.mocked(http.get).mockReturnValue(old.promise)
    let reading!: Promise<Invoice | null>
    act(() => {
      reading = client.fetch({ ...detail, staleMs: 0 })
    })
    mount(example)
    click()
    await flush()
    await act(async () => {
      old.resolve({ data: initial })
      await reading
    })
    expect(host.querySelector('button')!.getAttribute('aria-pressed')).toBe('true')
    expect(host.querySelector('button')!.textContent).toContain('Unflag')
    expect(client.get(detail.key)).toMatchObject({ flagged: true })
  })

  it('counterexample: accepts a genuinely newer server value after saving completes', async () => {
    const example = compile(http)
    mount(example)
    await flush()
    click()
    await flush()
    expect(host.querySelector('button')!.getAttribute('aria-pressed')).toBe('true')
    const detail = example.invoices.detail('reader', initial.id)!
    // The first publication acknowledges the hook's current incoming server snapshot.
    act(() => getQueryClient().set(detail.key, { ...initial, flagged: true }))
    act(() => getQueryClient().set(detail.key, initial))
    expect(host.querySelector('button')!.getAttribute('aria-pressed')).toBe('false')
    expect(host.querySelector('button')!.textContent).toContain('Flag')
    expect(http.post).toHaveBeenCalledTimes(1)
    expect(http.delete).not.toHaveBeenCalled()
  })
})
