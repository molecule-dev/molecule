// @vitest-environment jsdom
/**
 * Port of `query-react/src/__tests__/detail-example.test.tsx`: executes the
 * published detail-page example (this package's own module JSDoc, first
 * ```ts block) through the real hook, HTTP client and query providers, and the
 * adjacent mutation and core examples against the real cache.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type App, type Component, computed, createApp, defineComponent, h, ref } from 'vue'

import { createFetchClient, isHttpError, unwrapList, unwrapSingle } from '@molecule/app-http'
import type { QueryOptions } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider as memoryProvider } from '@molecule/app-query-memory'
import { provider as tanstackProvider } from '@molecule/app-query-tanstack'
import { useOptimisticValue } from '@molecule/app-vue'

import { createQueryResource, intentPrefetchProps, QueryContent, useQuery } from '../index.js'
import { settle } from './helpers.js'

interface PackageDocument {
  name: string
  description: string
}

interface DetailExample {
  PackagePage: Component
  packageQuery: (name: string) => QueryOptions<PackageDocument | null>
}

interface MutationExample {
  feedKey: (principal: string, filter: string, page: number) => readonly unknown[]
  feedOptions: (principal: string, filter: string, page: number) => QueryOptions<unknown>
  setFollowing: (principal: string, authorId: string, follow: boolean) => Promise<void>
}

const here = dirname(fileURLToPath(import.meta.url))
const sourcePath = process.env.MOL_QUERY_VUE_DOC_SOURCE ?? join(here, '../index.ts')
const source = readFileSync(sourcePath, 'utf8')
const doc = source.slice(source.indexOf('/**'), source.indexOf('*/')).replace(/^ \* ?/gm, '')
const snippets = [...doc.matchAll(/```ts\n([\s\S]*?)```/g)].map((match) => match[1])
const snippet = snippets[0]
if (!snippet) throw new Error('Missing query-vue detail example')

const http = createFetchClient({ baseURL: 'https://catalog.example', retry: { maxRetries: 0 } })

/** Binds the example's imports to the installed public contracts, then executes it. */
function compileSnippet<T>(code: string, names: string[]): T {
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
    '@molecule/app-http': { getClient: () => http, isHttpError, unwrapList, unwrapSingle },
    '@molecule/app-i18n': {
      t: (_key: string, _values: unknown, options: { defaultValue: string }) =>
        options.defaultValue,
    },
    '@molecule/app-query': { getQueryClient, setProvider },
  }
  const { outputText, diagnostics } = ts.transpileModule(
    `${code}\nexport { ${names.join(', ')} }`,
    {
      fileName: 'detail-example.ts',
      reportDiagnostics: true,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    },
  )
  expect(diagnostics).toEqual([])
  const exports: Record<string, unknown> = {}
  new Function('require', 'exports', outputText)((name: string) => {
    if (!(name in imports)) throw new Error(`Unexpected example import: ${name}`)
    return imports[name]
  }, exports)
  return exports as T
}

/** Selects the core example's actual query declaration without executing its top-level demo calls. */
function coreQueryExample(): Pick<DetailExample, 'packageQuery'> {
  const corePath =
    process.env.MOL_QUERY_CORE_DOC_SOURCE ?? join(here, '../../../../core/query/src/index.ts')
  const core = readFileSync(corePath, 'utf8').replace(/^ \* ?/gm, '')
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
  return compileSnippet(selected.map((node) => node.getText(parsed)).join('\n'), ['packageQuery'])
}

let app: App | null = null
let host: HTMLElement
let example: DetailExample
const fetchMock = vi.fn<typeof fetch>()
const nameRef = ref('inventory')
const tick = ref(0)

/** Mounts the example's page, keeping the same instance across name changes. */
function mountPage(): void {
  nameRef.value = 'inventory'
  tick.value = 0
  host = document.createElement('div')
  document.body.append(host)
  const Host = defineComponent({
    setup() {
      return () => {
        void tick.value
        return h(example.PackagePage as Component, { name: nameRef.value })
      }
    },
  })
  app = createApp(Host)
  app.mount(host)
}

/** Re-renders the page (a parent state change, or a changed name prop). */
function render(name = 'inventory'): void {
  if (name !== nameRef.value) nameRef.value = name
  else tick.value += 1
}

/** Settle HTTP parsing, query notifications and Vue's scheduler. */
async function settleAll(): Promise<void> {
  await settle()
}

/** A real HTTP response, including non-2xx JSON that native fetch itself resolves. */
function response(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

afterEach(async () => {
  if (app) app.unmount()
  app = null
  if (host) host.remove()
  resetQueryClient()
  vi.unstubAllGlobals()
})

describe.each([
  ['memory', memoryProvider],
  ['tanstack', tanstackProvider],
] as const)('documented detail page over the %s query bond', (_name, bond) => {
  beforeEach(() => {
    resetQueryClient()
    setProvider(bond)
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    example = compileSnippet<DetailExample>(snippet, ['packageQuery', 'PackagePage'])
  })

  it('shows pending across a parent re-render, then paints the completed document', async () => {
    let finish!: (value: Response) => void
    fetchMock.mockImplementation(() => new Promise((resolve) => (finish = resolve)))
    mountPage()
    await settleAll()
    render()
    expect(host.querySelector('[role="status"]')).not.toBeNull()
    expect(host.textContent).not.toContain('not found')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    finish(response(200, { name: 'Inventory', description: 'Warehouse stock' }))
    await settleAll()
    expect(host.querySelector('article')?.textContent).toContain('Inventory')
    expect(host.querySelector('[role="status"]')).toBeNull()
  })

  it.each([
    ['HTTP 404', 404, { error: 'missing' }],
    ['completed HTTP 200/null', 200, null],
  ])('shows completed missing for %s, never a pending skeleton', async (_case, status, body) => {
    fetchMock.mockResolvedValue(response(status, body))
    mountPage()
    await settleAll()
    expect(host.textContent).toBe('Package not found.')
    expect(host.querySelector('[role="status"], [role="alert"], article')).toBeNull()
  })

  it.each([401, 403, 500])(
    'reports HTTP %s as a load failure, never missing or loaded',
    async (status) => {
      fetchMock.mockResolvedValue(response(status, { error: 'unavailable' }))
      mountPage()
      await settleAll()
      expect(host.querySelector('[role="alert"]')?.textContent).toBe('Unable to load package.')
      expect(host.textContent).not.toContain('not found')
      expect(host.querySelector('[role="status"], article')).toBeNull()
    },
  )

  it('reports a network rejection as a load failure, never missing', async () => {
    fetchMock.mockRejectedValue(new TypeError('Connection lost'))
    mountPage()
    await settleAll()
    expect(host.querySelector('[role="alert"]')?.textContent).toBe('Unable to load package.')
    expect(host.textContent).not.toContain('not found')
  })

  it('paints a prefetched document synchronously without a request or skeleton', () => {
    getQueryClient().set(example.packageQuery('inventory').key, {
      name: 'Inventory',
      description: 'Warehouse stock',
    })
    mountPage()
    expect(host.querySelector('article')?.textContent).toContain('Inventory')
    expect(host.querySelector('[role="status"]')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('aborts a changed key and never paints its late response under the new identity', async () => {
    const pending: { signal: AbortSignal; resolve: (value: Response) => void }[] = []
    fetchMock.mockImplementation(
      (_url, options) =>
        new Promise((resolve) => pending.push({ signal: options!.signal!, resolve })),
    )
    mountPage()
    await settleAll()
    render('purchase-orders')
    await settleAll()
    expect(pending).toHaveLength(2)
    expect(pending[0].signal.aborted).toBe(true)
    expect(pending[1].signal.aborted).toBe(false)
    pending[0].resolve(response(200, { name: 'Obsolete inventory', description: 'Old' }))
    await settleAll()
    expect(host.textContent).not.toContain('Obsolete inventory')
    expect(host.querySelector('[role="status"]')).not.toBeNull()
    pending[1].resolve(response(200, { name: 'Purchase orders', description: 'Current' }))
    await settleAll()
    expect(host.querySelector('article')?.textContent).toContain('Purchase orders')
    expect(host.textContent).not.toContain('Obsolete inventory')
  })

  it('aborts the actual HTTP request when the page unmounts', async () => {
    let signal!: AbortSignal
    fetchMock.mockImplementation((_url, options) => {
      signal = options!.signal!
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      })
    })
    mountPage()
    await settleAll()
    expect(signal.aborted).toBe(false)
    app?.unmount()
    app = null
    expect(signal.aborted).toBe(true)
    await settleAll()
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
    const mutation = compileSnippet<MutationExample>(snippets[2], [
      'feedKey',
      'feedOptions',
      'setFollowing',
    ])
    const query = mutation.feedOptions('viewer', 'following', 1)
    await expect(getQueryClient().fetch(query)).rejects.toMatchObject({ status: 500 })
    expect(getQueryClient().get(query.key)).toBeUndefined()
  })

  it.each([true, false])(
    'does not overwrite cache after a failed mutation (follow=%s)',
    async (follow) => {
      fetchMock.mockResolvedValue(response(500, { feed: 'error response document' }))
      const mutation = compileSnippet<MutationExample>(snippets[2], [
        'feedKey',
        'feedOptions',
        'setFollowing',
      ])
      const key = mutation.feedKey('viewer', 'following', 1)
      getQueryClient().set(key, 'saved document')
      await expect(mutation.setFollowing('viewer', 'author', follow)).rejects.toMatchObject({
        status: 500,
      })
      expect(getQueryClient().get(key)).toBe('saved document')
    },
  )

  it.each([true, false])('paints a successful mutation response (follow=%s)', async (follow) => {
    fetchMock.mockResolvedValue(response(200, { feed: 'saved document' }))
    const mutation = compileSnippet<MutationExample>(snippets[2], [
      'feedKey',
      'feedOptions',
      'setFollowing',
    ])
    await mutation.setFollowing('viewer', 'author', follow)
    expect(getQueryClient().get(mutation.feedKey('viewer', 'following', 1))).toBe('saved document')
  })
})
