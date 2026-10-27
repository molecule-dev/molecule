/** Execute the published detail-page example through the real hook and query/HTTP providers. */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { act, type ComponentType, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { QueryOptions, QueryProvider } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider as memoryProvider } from '@molecule/app-query-memory'
import { provider as tanstackProvider } from '@molecule/app-query-tanstack'

import { isHttpError } from '../../../../core/http/src/errors.js'
import { createFetchClient } from '../../../../core/http/src/provider.js'
import { t } from '../../../../core/i18n/src/translator.js'
import { intentPrefetchProps } from '../usePrefetch.js'
import { useQuery } from '../useQuery.js'

interface PackageDocument {
  name: string
  description: string
}

interface DetailExample {
  PackagePage: ComponentType<{ name: string }>
  packageQuery: (name: string) => QueryOptions<PackageDocument | null>
}

interface MutationExample {
  feedKey: (principal: string, filter: string, page: number) => readonly unknown[]
  feedOptions: (principal: string, filter: string, page: number) => QueryOptions<unknown>
  setFollowing: (principal: string, authorId: string, follow: boolean) => Promise<void>
}

const sourcePath = process.env.MOL_QUERY_DETAIL_DOC_SOURCE ?? join(__dirname, '../index.ts')
const source = readFileSync(sourcePath, 'utf8')
const doc = source.slice(source.indexOf('/**'), source.indexOf('*/')).replace(/^ \* ?/gm, '')
const snippets = [...doc.matchAll(/```tsx\n([\s\S]*?)```/g)].map((match) => match[1])
const snippet = snippets[0]
if (!snippet) throw new Error('Missing query-react detail example')

/** Compile the actual fenced example; only its imports and old illustrative leaf views are bound. */
function compileSnippet<T>(code: string, names: string[]): T {
  const http = createFetchClient({ baseURL: 'https://catalog.example', retry: { maxRetries: 0 } })
  const imports: Record<string, unknown> = {
    'react-router': {
      Link: ({ children }: { children: string }) => createElement('a', {}, children),
    },
    '@molecule/app-query-react': { useQuery, intentPrefetchProps },
    '@molecule/app-http': { getClient: () => http, isHttpError },
    '@molecule/app-i18n': { t },
    '@molecule/app-query': { getQueryClient, setProvider },
    '@molecule/app-query-tanstack': { provider: tanstackProvider },
  }
  const { outputText, diagnostics } = ts.transpileModule(
    `${code}\nexport { ${names.join(', ')} }`,
    {
      fileName: 'detail-example.tsx',
      reportDiagnostics: true,
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
    },
  )
  expect(diagnostics).toEqual([])
  const exports = {}
  new Function('require', 'exports', 'React', 'NotFound', 'Skeleton', 'Article', outputText)(
    (name: string) => {
      if (!(name in imports)) throw new Error(`Unexpected example import: ${name}`)
      return imports[name]
    },
    exports,
    { createElement },
    () => createElement('p', {}, 'Package not found.'),
    () => createElement('p', { role: 'status' }, 'Loading…'),
    ({ doc }: { doc: PackageDocument }) => createElement('article', {}, doc.name),
  )
  return exports as T
}

/** Select the core example's actual query declaration without executing its top-level demo calls. */
function coreQueryExample(): Pick<DetailExample, 'packageQuery'> {
  const corePath =
    process.env.MOL_QUERY_CORE_DOC_SOURCE ?? join(__dirname, '../../../../core/query/src/index.ts')
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

let root: Root | undefined
let host: HTMLDivElement
let example: DetailExample
const fetchMock = vi.fn<typeof fetch>()

/** Drive a real mounted component, keeping the same instance across key changes. */
function render(name = 'inventory'): void {
  act(() => root!.render(createElement(example.PackagePage, { name })))
}

/** Settle HTTP parsing, query notifications and React effects. */
async function settle(): Promise<void> {
  for (let i = 0; i < 6; i += 1) await act(async () => {})
}

/** A real HTTP response, including non-2xx JSON that native fetch itself resolves. */
function response(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

afterEach(() => {
  if (root) act(() => root!.unmount())
  root = undefined
  host.remove()
  resetQueryClient()
  vi.unstubAllGlobals()
})

describe.each([
  ['memory', memoryProvider],
  ['tanstack', tanstackProvider],
] as const)('documented detail page over the %s query bond', (_name, bond: QueryProvider) => {
  beforeEach(() => {
    resetQueryClient()
    setProvider(bond)
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    example = compileSnippet(snippet, ['PackagePage', 'packageQuery'])
  })

  it('shows pending across a parent re-render, then paints the completed document', async () => {
    let finish!: (value: Response) => void
    fetchMock.mockImplementation(() => new Promise((resolve) => (finish = resolve)))
    render()
    await settle()
    render()
    expect(host.querySelector('[role="status"]')).not.toBeNull()
    expect(host.textContent).not.toContain('not found')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    finish(response(200, { name: 'Inventory', description: 'Warehouse stock' }))
    await settle()
    expect(host.querySelector('article')?.textContent).toContain('Inventory')
    expect(host.querySelector('[role="status"]')).toBeNull()
  })

  it.each([
    ['HTTP 404', 404, { error: 'missing' }],
    ['completed HTTP 200/null', 200, null],
  ])('shows completed missing for %s, never a pending skeleton', async (_case, status, body) => {
    fetchMock.mockResolvedValue(response(status, body))
    render()
    await settle()
    expect(host.textContent).toBe('Package not found.')
    expect(host.querySelector('[role="status"], [role="alert"], article')).toBeNull()
  })

  it.each([401, 403, 500])(
    'reports HTTP %s as a load failure, never missing or loaded',
    async (status) => {
      fetchMock.mockResolvedValue(response(status, { error: 'unavailable' }))
      render()
      await settle()
      expect(host.querySelector('[role="alert"]')?.textContent).toBe('Unable to load package.')
      expect(host.textContent).not.toContain('not found')
      expect(host.querySelector('[role="status"], article')).toBeNull()
    },
  )

  it('reports a network rejection as a load failure, never missing', async () => {
    fetchMock.mockRejectedValue(new TypeError('Connection lost'))
    render()
    await settle()
    expect(host.querySelector('[role="alert"]')?.textContent).toBe('Unable to load package.')
    expect(host.textContent).not.toContain('not found')
  })

  it('paints a prefetched document synchronously without a request or skeleton', () => {
    getQueryClient().set(example.packageQuery('inventory').key, {
      name: 'Inventory',
      description: 'Warehouse stock',
    })
    render()
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
    render('inventory')
    await settle()
    render('purchase-orders')
    await settle()
    expect(pending).toHaveLength(2)
    expect(pending[0].signal.aborted).toBe(true)
    expect(pending[1].signal.aborted).toBe(false)
    pending[0].resolve(response(200, { name: 'Obsolete inventory', description: 'Old' }))
    await settle()
    expect(host.textContent).not.toContain('Obsolete inventory')
    expect(host.querySelector('[role="status"]')).not.toBeNull()
    pending[1].resolve(response(200, { name: 'Purchase orders', description: 'Current' }))
    await settle()
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
    render()
    await settle()
    expect(signal.aborted).toBe(false)
    act(() => root!.unmount())
    root = undefined
    expect(signal.aborted).toBe(true)
    await settle()
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
