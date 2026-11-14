// @vitest-environment jsdom
/**
 * The published examples' behavior, ported from `@molecule/app-query-react`'s
 * doc-example suites (`detail-example.test.tsx`,
 * `resource-toggle-example.test.tsx`): the same assertions, driven through the
 * real HTTP client and the real optimistic-value hook. Like the React
 * originals, the published snippets themselves are executed: the mutation and
 * query-core examples run as written against the bonded client, and the
 * resource example is converted with `svelte2tsx` (svelte-check's own
 * converter) and type-checked strictly against the installed public
 * contracts.
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Bonds the reference ClassMap before `@molecule/app-ui-svelte` is imported
// (its barrel reads the bond while its modules load).
import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { writable } from 'svelte/store'
import { svelte2tsx } from 'svelte2tsx'
import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createFetchClient, getClient, type HttpClient, setClient } from '@molecule/app-http'
import {
  getQueryClient,
  type QueryOptions,
  resetQueryClient,
  setProvider,
} from '@molecule/app-query'
import { provider as memoryProvider } from '@molecule/app-query-memory'
import { provider as tanstackProvider } from '@molecule/app-query-tanstack'

import { deferred, settle } from './helpers/harness.js'
import InvoicePage from './helpers/InvoicePage.svelte'
import PackageHost from './helpers/PackageHost.svelte'
import PackagePage from './helpers/PackagePage.svelte'
import { type Invoice, invoices, VIEWER } from './helpers/resources.js'

/** The mounted instances, unmounted after every test. */
const unmounters: (() => Promise<void>)[] = []
afterEach(async () => {
  for (const unmounter of unmounters.splice(0)) await unmounter()
  resetQueryClient()
  vi.unstubAllGlobals()
})

/** A real HTTP response, including non-2xx JSON that native fetch itself resolves. */
function response(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/** This test's own directory (the package's `src/__tests__/`). */
const here = dirname(fileURLToPath(import.meta.url))

/** The published package doc, with its comment decorations stripped. */
const source = readFileSync(join(here, '../index.ts'), 'utf8')
const doc = source.slice(source.indexOf('/**'), source.indexOf('*/')).replace(/^ \* ?/gm, '')
/** The published ```svelte examples, in JSDoc order. */
const snippets = [...doc.matchAll(/```svelte\n([\s\S]*?)```/g)].map((match) => match[1])
const mutationSnippet = snippets[2]
if (!mutationSnippet) throw new Error('Missing query-svelte mutation example')

/** The published mutation example's exports. */
interface MutationExample {
  /** The documented feed key. */
  feedKey: (principal: string, filter: string, page: number) => readonly unknown[]
  /** The documented feed read options. */
  feedOptions: (principal: string, filter: string, page: number) => QueryOptions<unknown>
  /** The documented follow write. */
  setFollowing: (principal: string, authorId: string, follow: boolean) => Promise<void>
}

/**
 * Executes one published example's script with the bonded modules injected,
 * the way React's tests bind imports before running a transpiled snippet.
 *
 * @template T - The example's exports.
 * @param block - The fenced example.
 * @param names - The exports to read off the executed script.
 * @param modules - The module specifier to bindings map.
 * @returns The example's exports.
 */
function runExampleScript<T>(block: string, names: string[], modules: Record<string, unknown>): T {
  const script = block.includes('</script>')
    ? block.slice(block.indexOf('>') + 1, block.lastIndexOf('</script>'))
    : block
  const { outputText, diagnostics } = ts.transpileModule(
    `${script}\nexport { ${names.join(', ')} }`,
    {
      fileName: 'doc-example.ts',
      reportDiagnostics: true,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    },
  )
  expect(diagnostics).toEqual([])
  const exports = {}
  new Function('require', 'exports', outputText)((name: string) => {
    if (!(name in modules)) throw new Error(`Unexpected example import: ${name}`)
    return modules[name]
  }, exports)
  return exports as T
}

/**
 * Selects the query core's actual example declaration without executing its
 * top-level demo calls, and runs it against the bonded client.
 *
 * @returns The example's `packageQuery`.
 */
function coreQueryExample(): { packageQuery: (name: string) => QueryOptions<unknown> } {
  const core = readFileSync(join(here, '../../../../core/query/src/index.ts'), 'utf8').replace(
    /^ \* ?/gm,
    '',
  )
  const code = core.match(/```typescript\n([\s\S]*?)```/)?.[1]
  if (!code) throw new Error('Missing query core example')
  const parsed = ts.createSourceFile('core-example.ts', code, ts.ScriptTarget.Latest, true)
  const selected = parsed.statements.filter(
    (node) =>
      ts.isImportDeclaration(node) ||
      (ts.isVariableStatement(node) &&
        node.declarationList.declarations.some(
          (declaration) => declaration.name.getText(parsed) === 'packageQuery',
        )),
  )
  return runExampleScript(
    selected.map((node) => node.getText(parsed)).join('\n'),
    ['packageQuery'],
    {
      '@molecule/app-http': { getClient },
      '@molecule/app-query': { getQueryClient, setProvider },
      '@molecule/app-query-tanstack': { provider: tanstackProvider },
    },
  )
}

/** One flattened diagnostic: its zero-based line and message. */
interface Diagnostic {
  /** The zero-based line the diagnostic points at. */
  line: number
  /** The compiler's message. */
  message: string
}

const nodeRequire = createRequire(import.meta.url)

/**
 * Type-checks a published example against the installed public contracts:
 * converts the Svelte snippet with `svelte2tsx` (svelte-check's own
 * converter) and runs the strict program over the emitted tsx, resolving the
 * example's imports the way an app installing this package would.
 *
 * @param code - The fenced example.
 * @returns Every diagnostic, flattened; empty means the example compiles.
 */
function typeCheckExample(code: string): Diagnostic[] {
  const emitted = svelte2tsx(code, { filename: 'resource-example.svelte', isTs: true }).code
  const file = join(here, '../__resource-example__.svelte.tsx')
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
      ? ts.createSourceFile(path, emitted, languageVersion, true, ts.ScriptKind.TSX)
      : getSourceFile(path, languageVersion, onError, shouldCreateNewSourceFile)
  const diagnostics = ts.getPreEmitDiagnostics(
    ts.createProgram(
      [
        file,
        nodeRequire.resolve('svelte2tsx/svelte-shims-v4.d.ts'),
        nodeRequire.resolve('svelte2tsx/svelte-jsx-v4.d.ts'),
      ],
      options,
      host,
    ),
  )
  return diagnostics.map((item) => ({
    line: item.file?.getLineAndCharacterOfPosition(item.start ?? 0).line ?? -1,
    message: ts.flattenDiagnosticMessageText(item.messageText, '\n'),
  }))
}

it('the complete resource example compiles against the installed public contracts', () => {
  const snippet = snippets.find((code) => code.includes('OptimisticToggleButton'))
  if (!snippet) throw new Error('Missing query-svelte resource example')
  expect(typeCheckExample(snippet)).toEqual([])
  // The check is not vacuous: one wrong prop name fails it through the same
  // pipeline — which also proves the child snippet's record arrives typed.
  const broken = snippet.replace('value={invoice.flagged}', 'value={invoice.flgged}')
  expect(broken).not.toBe(snippet)
  const diagnostics = typeCheckExample(broken)
  expect(diagnostics.length).toBeGreaterThan(0)
  expect(diagnostics.some((item) => item.message.includes('flgged'))).toBe(true)
})

/** Mounts the documented page under `name`. */
function renderPackagePage(name = 'inventory'): HTMLDivElement {
  const container = document.createElement('div')
  document.body.append(container)
  const instance = mount(PackagePage, { target: container, props: { name } })
  flushSync()
  unmounters.push(() => unmount(instance))
  return container
}

describe.each([
  ['memory', memoryProvider],
  ['tanstack', tanstackProvider],
] as const)('documented detail page over the %s query bond', (_name, bond) => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    resetQueryClient()
    setProvider(bond)
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    setClient(createFetchClient({ baseURL: 'https://catalog.example', retry: { maxRetries: 0 } }))
  })

  it('shows pending across a parent re-render, then paints the completed document', async () => {
    let finish!: (value: Response) => void
    fetchMock.mockImplementation(() => new Promise((resolve) => (finish = resolve)))
    // The parent re-renders itself with UNCHANGED page props (its own store
    // drives the template), keeping the page instance the way React's second
    // `render()` does.
    const renders = writable(0)
    const container = document.createElement('div')
    document.body.append(container)
    const instance = mount(PackageHost, {
      target: container,
      props: { name: 'inventory', renders },
    })
    flushSync()
    unmounters.push(() => unmount(instance))
    await settle()
    renders.set(1)
    flushSync()
    expect(container.querySelector('span')?.textContent).toBe('1')
    expect(container.querySelector('[role="status"]')).not.toBeNull()
    expect(container.textContent).not.toContain('not found')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    finish(response(200, { name: 'Inventory', description: 'Warehouse stock' }))
    await settle()
    expect(container.querySelector('article')?.textContent).toContain('Inventory')
    expect(container.querySelector('[role="status"]')).toBeNull()
  })

  it.each([
    ['HTTP 404', 404, { error: 'missing' }],
    ['completed HTTP 200/null', 200, null],
  ] as const)(
    'shows completed missing for %s, never a pending skeleton',
    async (_case, status, body) => {
      fetchMock.mockResolvedValue(response(status, body))
      const page = renderPackagePage()
      await settle()
      expect(page.textContent).toBe('Package not found.')
      expect(page.querySelector('[role="status"], [role="alert"], article')).toBeNull()
    },
  )

  it.each([401, 403, 500])(
    'reports HTTP %s as a load failure, never missing or loaded',
    async (status) => {
      fetchMock.mockResolvedValue(response(status, { error: 'unavailable' }))
      const page = renderPackagePage()
      await settle()
      expect(page.querySelector('[role="alert"]')?.textContent).toBe('Unable to load package.')
      expect(page.textContent).not.toContain('not found')
      expect(page.querySelector('[role="status"], article')).toBeNull()
    },
  )

  it('reports a network rejection as a load failure, never missing', async () => {
    fetchMock.mockRejectedValue(new TypeError('Connection lost'))
    const page = renderPackagePage()
    await settle()
    expect(page.querySelector('[role="alert"]')?.textContent).toBe('Unable to load package.')
    expect(page.textContent).not.toContain('not found')
  })

  it('paints a prefetched document synchronously without a request or skeleton', async () => {
    getQueryClient().set(['package', 'inventory'], {
      name: 'Inventory',
      description: 'Warehouse stock',
    })
    const page = renderPackagePage()
    await settle()
    expect(page.querySelector('article')?.textContent).toContain('Inventory')
    expect(page.querySelector('[role="status"]')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('aborts a changed key and never paints its late response under the new identity', async () => {
    const pending: { signal: AbortSignal; resolve: (value: Response) => void }[] = []
    fetchMock.mockImplementation(
      (_url, options) =>
        new Promise<Response>((resolve) => pending.push({ signal: options!.signal!, resolve })),
    )
    renderPackagePage('inventory')
    await settle()
    // A key change remounts the page (the Svelte idiom React's re-render covers).
    await unmounters.splice(0)[0]()
    const next = renderPackagePage('purchase-orders')
    await settle()
    expect(pending).toHaveLength(2)
    expect(pending[0].signal.aborted).toBe(true)
    expect(pending[1].signal.aborted).toBe(false)
    pending[0].resolve(response(200, { name: 'Obsolete inventory', description: 'Old' }))
    await settle()
    expect(next.textContent).not.toContain('Obsolete inventory')
    expect(next.querySelector('[role="status"]')).not.toBeNull()
    pending[1].resolve(response(200, { name: 'Purchase orders', description: 'Current' }))
    await settle()
    expect(next.querySelector('article')?.textContent).toContain('Purchase orders')
    expect(next.textContent).not.toContain('Obsolete inventory')
  })

  it('aborts the actual HTTP request when the page unmounts', async () => {
    let signal!: AbortSignal
    fetchMock.mockImplementation((_url, options) => {
      signal = options!.signal!
      return new Promise<Response>(
        (_resolve) =>
          new Promise((reject) => {
            signal.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            )
          }),
      )
    })
    const page = renderPackagePage()
    await settle()
    expect(signal.aborted).toBe(false)
    await unmounters.splice(0)[0]()
    expect(signal.aborted).toBe(true)
    await settle()
    void page
  })

  it('rejects an HTTP failure instead of caching its body as a document', async () => {
    fetchMock.mockResolvedValue(response(500, { error: 'unavailable' }))
    const query = {
      key: ['package', 'inventory'],
      fetch: async (signal: AbortSignal) => {
        const client = getClient()
        return (await client.get('/data/packages/inventory.json', { signal })).data
      },
    }
    await expect(getQueryClient().fetch(query)).rejects.toMatchObject({ status: 500 })
    expect(getQueryClient().get(query.key)).toBeUndefined()
  })

  it('accepts a completed null as data rather than fabricating a failure', async () => {
    fetchMock.mockResolvedValue(response(200, null))
    const query = {
      key: ['package', 'inventory'],
      fetch: async (signal: AbortSignal) => {
        const client = getClient()
        return (await client.get('/data/packages/inventory.json', { signal })).data
      },
    }
    await expect(getQueryClient().fetch(query)).resolves.toBeNull()
    expect(getQueryClient().get(query.key)).toBeNull()
  })

  it('rejects a core-example HTTP failure instead of caching its body as a document', async () => {
    fetchMock.mockResolvedValue(response(500, { error: 'unavailable' }))
    const query = coreQueryExample().packageQuery('inventory')
    await expect(getQueryClient().fetch(query)).rejects.toMatchObject({ status: 500 })
    expect(getQueryClient().get(query.key)).toBeUndefined()
  })

  it('accepts the core-example completed null as data rather than fabricating a failure', async () => {
    fetchMock.mockResolvedValue(response(200, null))
    const query = coreQueryExample().packageQuery('inventory')
    await expect(getQueryClient().fetch(query)).resolves.toBeNull()
    expect(getQueryClient().get(query.key)).toBeNull()
  })

  it('rejects an adjacent retry-example HTTP failure instead of caching an error body', async () => {
    fetchMock.mockResolvedValue(response(500, { error: 'unavailable' }))
    const mutation = runExampleScript<MutationExample>(
      mutationSnippet,
      ['feedKey', 'feedOptions', 'setFollowing'],
      { '@molecule/app-http': { getClient }, '@molecule/app-query': { getQueryClient } },
    )
    const query = mutation.feedOptions('viewer', 'following', 1)
    await expect(getQueryClient().fetch(query)).rejects.toMatchObject({ status: 500 })
    expect(getQueryClient().get(query.key)).toBeUndefined()
  })

  it.each([true, false])(
    'does not overwrite cache after a failed mutation (follow=%s)',
    async (follow) => {
      fetchMock.mockResolvedValue(response(500, { feed: 'error response document' }))
      const key = ['feed', 'viewer', 'following', 1]
      getQueryClient().set(key, 'saved document')
      const options = {
        key,
        fetch: async (signal: AbortSignal) =>
          (await getClient().get('/api/feeds/following', { signal, params: { page: 1 } })).data,
      }
      await expect(
        (async () => {
          const http = getClient()
          const { data: body } = follow
            ? await http.post<{ feed: unknown }>('/api/follows/author')
            : await http.delete<{ feed: unknown }>('/api/follows/author')
          getQueryClient().set(options.key, body.feed)
        })(),
      ).rejects.toMatchObject({ status: 500 })
      expect(getQueryClient().get(key)).toBe('saved document')
    },
  )

  it.each([true, false])('paints a successful mutation response (follow=%s)', async (follow) => {
    fetchMock.mockResolvedValue(response(200, { feed: 'saved document' }))
    const key = ['feed', 'viewer', 'following', 1]
    const http = getClient()
    const { data: body } = follow
      ? await http.post<{ feed: unknown }>('/api/follows/author')
      : await http.delete<{ feed: unknown }>('/api/follows/author')
    getQueryClient().set(key, body.feed)
    expect(getQueryClient().get(key)).toBe('saved document')
  })
})

describe.each([
  ['memory', memoryProvider],
  ['tanstack', tanstackProvider],
] as const)('the invoice toggle example over %s', (_name, provider) => {
  /** The example's loaded invoice. */
  const initial: Invoice = { id: 'one', number: 'INV-1', flagged: false }

  beforeEach(() => {
    resetQueryClient()
    setProvider(provider)
  })

  /**
   * The documented invoice API, as a bonded client: only the ResourceHttp
   * surface the resource calls is implemented, so the cast is the test's
   * statement that the rest of the client is never reached.
   */
  const mockHttp = (overrides: Partial<HttpClient> = {}): HttpClient =>
    ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      ...overrides,
    }) as HttpClient

  /** Mounts the documented invoice page and tracks it. */
  function mountInvoicePage(id: string): HTMLDivElement {
    const container = document.createElement('div')
    document.body.append(container)
    const instance = mount(InvoicePage, { target: container, props: { id } })
    flushSync()
    unmounters.push(() => unmount(instance))
    return container
  }

  /** One optimistic click on the page's current action. */
  function click(page: HTMLDivElement): void {
    page.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }

  it('waits for the initial record before mounting an action, then saves its first click', async () => {
    const read = Promise.withResolvers<{ data: { id: string; number: string; flagged: boolean } }>()
    const http = mockHttp({
      get: vi.fn(() => read.promise),
      post: vi.fn(async () => ({ data: { id: 'one', number: 'INV-1', flagged: true } })),
      delete: vi.fn(async () => ({ data: { id: 'one', number: 'INV-1', flagged: false } })),
    })
    setClient(http)
    const page = mountInvoicePage('one')
    expect(page.querySelector('button')).toBeNull()
    expect(http.post).not.toHaveBeenCalled()
    read.resolve({ data: { id: 'one', number: 'INV-1', flagged: false } })
    await settle()
    const button = page.querySelector('button')
    expect(button?.textContent).toContain('Flag')
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    // The optimistic value flips before the save answers.
    flushSync()
    expect(button?.textContent).toContain('Unflag')
    await settle()
    expect(http.post).toHaveBeenCalledTimes(1)
    expect(http.post).toHaveBeenCalledWith('/invoices/one/flag')
  })

  it.each(['missing', 'failed'] as const)(
    'presents an initial %s read without mounting a record action',
    async (state) => {
      const http = mockHttp({
        get: vi.fn(async () =>
          state === 'missing' ? { data: null } : Promise.reject(new Error('Offline')),
        ),
      })
      setClient(http)
      const page = mountInvoicePage('one')
      await settle()
      expect(page.querySelector('button')).toBeNull()
      expect(page.querySelector('[role="alert"]')?.textContent).toBe(
        state === 'missing' ? 'Invoice not found.' : 'Unable to load invoice.',
      )
      expect(http.post).not.toHaveBeenCalled()
    },
  )

  it('keeps an inverse click after cache publication while the first list refresh is delayed', async () => {
    const refresh = deferred<{ data: Invoice[] }>()
    // A tracked list extends the mutation promise beyond publication of its saved detail.
    const list = invoices.list(VIEWER)
    getQueryClient().set(list.key, [initial])
    const http = mockHttp({
      get: vi.fn(async (path: string) =>
        path === '/invoices' ? refresh.promise : { data: initial },
      ),
      post: vi.fn(async () => ({ data: { ...initial, flagged: true } })),
      delete: vi.fn(async () => ({ data: initial })),
    })
    setClient(http)
    const page = mountInvoicePage(initial.id)
    await settle()
    click(page)
    await settle()
    expect(getQueryClient().get(['invoices', VIEWER, 'detail', 'one'])).toMatchObject({
      flagged: true,
    })
    click(page)
    flushSync()
    expect(page.querySelector('button')?.textContent).toContain('Flag')
    expect(page.querySelector('button')?.getAttribute('aria-pressed')).toBe('false')
    expect(http.delete).not.toHaveBeenCalled()
    refresh.resolve({ data: [{ ...initial, flagged: true }] })
    await settle()
    expect(http.delete).toHaveBeenCalledExactlyOnceWith('/invoices/one/flag')
    expect(page.querySelector('button')?.getAttribute('aria-pressed')).toBe('false')
  })

  it('rejects a late pre-mutation read and keeps the label on the completed saved state', async () => {
    const detail = invoices.detail(VIEWER, initial.id)!
    const client = getQueryClient()
    client.set(detail.key, initial)
    const old = deferred<{ data: Invoice }>()
    const http = mockHttp({
      get: vi.fn(() => old.promise),
      post: vi.fn(async () => ({ data: { ...initial, flagged: true } })),
      delete: vi.fn(async () => ({ data: initial })),
    })
    setClient(http)
    const page = mountInvoicePage(initial.id)
    const reading = client.fetch({ ...detail, staleMs: 0 })
    click(page)
    await settle()
    old.resolve({ data: initial })
    await reading
    expect(page.querySelector('button')?.getAttribute('aria-pressed')).toBe('true')
    expect(page.querySelector('button')?.textContent).toContain('Unflag')
    expect(client.get(detail.key)).toMatchObject({ flagged: true })
  })

  it('counterexample: accepts a genuinely newer server value after saving completes', async () => {
    const http = mockHttp({
      get: vi.fn(async () => ({ data: initial })),
      post: vi.fn(async () => ({ data: { ...initial, flagged: true } })),
      delete: vi.fn(async () => ({ data: initial })),
    })
    setClient(http)
    const page = mountInvoicePage(initial.id)
    await settle()
    click(page)
    await settle()
    expect(page.querySelector('button')?.getAttribute('aria-pressed')).toBe('true')
    const detail = invoices.detail(VIEWER, initial.id)!
    // The first publication acknowledges the hook's current incoming server snapshot.
    getQueryClient().set(detail.key, { ...initial, flagged: true })
    getQueryClient().set(detail.key, initial)
    flushSync()
    expect(page.querySelector('button')?.getAttribute('aria-pressed')).toBe('false')
    expect(page.querySelector('button')?.textContent).toContain('Flag')
    expect(http.post).toHaveBeenCalledTimes(1)
    expect(http.delete).not.toHaveBeenCalled()
  })
})
