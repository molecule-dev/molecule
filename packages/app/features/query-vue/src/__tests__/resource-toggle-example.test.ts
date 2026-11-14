// @vitest-environment jsdom
/**
 * Port of `query-react/src/__tests__/resource-toggle-example.test.tsx`:
 * executes the published resource example (this package's module JSDoc, the
 * ```ts block declaring `export const invoices`) with delayed reads, writes
 * and list refreshes, through the real resource, composable and optimistic
 * value.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type App,
  type Component,
  computed,
  createApp,
  defineComponent,
  h,
  nextTick,
  ref,
} from 'vue'

import { type ResourceHttp, unwrapList, unwrapSingle } from '@molecule/app-http'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider as memoryProvider } from '@molecule/app-query-memory'
import { provider as tanstackProvider } from '@molecule/app-query-tanstack'
import { useOptimisticValue } from '@molecule/app-vue'

import { createQueryResource, intentPrefetchProps, QueryContent, useQuery } from '../index.js'
import { settle } from './helpers.js'

interface Invoice {
  id: string
  number: string
  flagged: boolean
}
interface Example {
  invoices: ReturnType<typeof createQueryResource<Invoice>>
  InvoicePage: Component
}
const initial: Invoice = { id: 'one', number: 'INV-1', flagged: false }

const here = dirname(fileURLToPath(import.meta.url))
const doc = readFileSync(join(here, '../index.ts'), 'utf8').replace(/^ \* ?/gm, '')
const snippet = [...doc.matchAll(/```ts\n([\s\S]*?)```/g)].find((match) =>
  match[1]?.includes('export const invoices'),
)?.[1]
if (!snippet) throw new Error('Missing executable query-resource example')

/** Binds the example's imports to the installed public contracts, then executes it. */
function compile(http: ResourceHttp): Example {
  const imports: Record<string, unknown> = {
    vue: { computed, defineComponent, h, ref },
    '@molecule/app-query-vue': { createQueryResource, intentPrefetchProps, QueryContent, useQuery },
    '@molecule/app-vue': {
      useAuth: () => ({ user: ref({ id: 'reader' }) }),
      useOptimisticValue,
      useTranslation: () => ({
        t: (_key: string, _values: unknown, options: { defaultValue: string }) =>
          options.defaultValue,
      }),
    },
    '@molecule/app-http': {
      getClient: () => http,
      isHttpError: undefined,
      unwrapList,
      unwrapSingle,
    },
    '@molecule/app-i18n': {
      t: (_key: string, _values: unknown, options: { defaultValue: string }) =>
        options.defaultValue,
    },
    '@molecule/app-query': { getQueryClient, setProvider },
  }
  const result = ts.transpileModule(`${snippet}\nexport { InvoicePage }`, {
    fileName: 'resource-example.ts',
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  expect(result.diagnostics).toEqual([])
  const exports: Record<string, unknown> = {}
  new Function('require', 'exports', result.outputText)((name: string) => {
    if (!(name in imports)) throw new Error(`Unexpected example import: ${name}`)
    return imports[name]
  }, exports)
  return exports as Example
}

/** The complete resource example compiles against the installed public contracts. */
it('the complete resource example compiles against the installed public contracts', () => {
  const file = join(here, '__resource-example__.ts')
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    types: [],
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  }
  const host = ts.createCompilerHost(options)
  const getSourceFile = host.getSourceFile.bind(host)
  host.getSourceFile = (path, languageVersion, onError, shouldCreateNewSourceFile) =>
    path === file
      ? ts.createSourceFile(path, snippet, languageVersion, true, ts.ScriptKind.TS)
      : getSourceFile(path, languageVersion, onError, shouldCreateNewSourceFile)
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([file], options, host))
  expect(
    diagnostics.map((item) => ({
      line: item.file?.getLineAndCharacterOfPosition(item.start ?? 0).line,
      message: ts.flattenDiagnosticMessageText(item.messageText, '\n'),
    })),
  ).toEqual([])
})

let app: App | null = null
let host: HTMLElement
let http: ResourceHttp

/**
 * Mounts the example's page.
 *
 * @param mounted - The compiled example.
 */
function mount(mounted: Example): void {
  host = document.createElement('div')
  document.body.append(host)
  const Host = defineComponent({
    setup() {
      return () => h(mounted.InvoicePage as Component, { id: initial.id })
    },
  })
  app = createApp(Host)
  app.mount(host)
}

/** Clicks the mounted action and lets Vue's scheduled re-render paint it. */
async function click(): Promise<void> {
  host.querySelector('button')!.click()
  await nextTick()
}

/** Flush the write's publications and Vue's scheduler. */
async function flush(): Promise<void> {
  await settle()
}

afterEach(async () => {
  if (app) app.unmount()
  app = null
  if (host) host.remove()
  resetQueryClient()
})

describe.each([
  ['memory', memoryProvider],
  ['tanstack', tanstackProvider],
] as const)('the invoice toggle example over %s', (_name, provider) => {
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
    const read = vi.mocked(http.get)
    let resolveRead!: (response: { data: Invoice }) => void
    read.mockImplementation(() => new Promise((resolve) => (resolveRead = resolve)))
    mount(compile(http))
    expect(host.querySelector('button')).toBeNull()
    expect(http.post).not.toHaveBeenCalled()
    resolveRead({ data: initial })
    await flush()
    await click()
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
    const compiled = compile(http)
    let resolveList!: (response: { data: Invoice[] }) => void
    const list = compiled.invoices.list('reader')
    getQueryClient().set(list.key, [initial])
    const getList = vi.mocked(http.get)
    getList.mockImplementation(async (path) =>
      path === '/invoices' ? new Promise((resolve) => (resolveList = resolve)) : { data: initial },
    )
    mount(compiled)
    await flush()
    await click()
    await flush()
    expect(getQueryClient().get(['invoices', 'reader', 'detail', 'one'])).toMatchObject({
      flagged: true,
    })
    await click()
    expect(host.querySelector('button')!.textContent).toContain('Flag')
    expect(host.querySelector('button')!.getAttribute('aria-pressed')).toBe('false')
    expect(http.delete).not.toHaveBeenCalled()
    resolveList({ data: [{ ...initial, flagged: true }] })
    await flush()
    expect(http.delete).toHaveBeenCalledExactlyOnceWith('/invoices/one/flag')
    expect(host.querySelector('button')!.getAttribute('aria-pressed')).toBe('false')
  })

  it('rejects a late pre-mutation read and keeps the label on the completed saved state', async () => {
    const compiled = compile(http)
    const detail = compiled.invoices.detail('reader', initial.id)!
    const client = getQueryClient()
    client.set(detail.key, initial)
    let resolveOld!: (response: { data: Invoice }) => void
    const old = new Promise<{ data: Invoice }>((resolve) => {
      resolveOld = resolve
    })
    vi.mocked(http.get).mockReturnValue(old)
    const reading = client.fetch({ ...detail, staleMs: 0 })
    mount(compiled)
    await click()
    await flush()
    resolveOld({ data: initial })
    await reading
    expect(host.querySelector('button')!.getAttribute('aria-pressed')).toBe('true')
    expect(host.querySelector('button')!.textContent).toContain('Unflag')
    expect(client.get(detail.key)).toMatchObject({ flagged: true })
  })

  it('counterexample: accepts a genuinely newer server value after saving completes', async () => {
    const compiled = compile(http)
    mount(compiled)
    await flush()
    await click()
    await flush()
    expect(host.querySelector('button')!.getAttribute('aria-pressed')).toBe('true')
    const detail = compiled.invoices.detail('reader', initial.id)!
    // The first publication acknowledges the hook's current incoming server snapshot.
    getQueryClient().set(detail.key, { ...initial, flagged: true })
    getQueryClient().set(detail.key, initial)
    await flush()
    expect(host.querySelector('button')!.getAttribute('aria-pressed')).toBe('false')
    expect(host.querySelector('button')!.textContent).toContain('Flag')
    expect(http.post).toHaveBeenCalledTimes(1)
    expect(http.delete).not.toHaveBeenCalled()
  })
})
