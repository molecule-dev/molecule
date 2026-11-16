// @vitest-environment jsdom
/**
 * The documented detail page executed as a real Angular page over both query
 * bonds, plus the framework-neutral core and mutation examples compiled from
 * their published sources — the counterpart of `query-react`'s
 * detail-example test. Pending, missing and failed states, prefetch, a changed
 * key's abort and the core HTTP failure contract are asserted on the real
 * component and the real fetch client.
 *
 * @module
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import '@angular/compiler'
import { Component as AngularComponent, computed, signal, type Type } from '@angular/core'
import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createFetchClient, isHttpError } from '@molecule/app-http'
import { t } from '@molecule/app-i18n'
import type { QueryOptions, QueryProvider } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider as memoryProvider } from '@molecule/app-query-memory'
import { provider as tanstackProvider } from '@molecule/app-query-tanstack'

import { intentPrefetchProps, useQuery } from '../index.js'
import { type ComponentMount, drain, mountComponent } from './harness.js'

interface PackageDocument {
  name: string
  description: string
}

/** The page's query: 404 and a completed null are missing, anything else is a failure. */
const packageQuery = (name: string): QueryOptions<PackageDocument | null> => {
  const http = createFetchClient({ baseURL: 'https://catalog.example', retry: { maxRetries: 0 } })
  return {
    key: ['package', name],
    fetch: async (requestSignal: AbortSignal): Promise<PackageDocument | null> => {
      try {
        const response = await http.get<PackageDocument | null>(
          `/data/packages/${encodeURIComponent(name)}.json`,
          { signal: requestSignal },
        )
        return response.data
      } catch (error) {
        if (isHttpError(error) && error.status === 404) return null
        throw error
      }
    },
  }
}

/** Host selectors minted so far (each page defines its own component). */
let pageCount = 0

/** The documented page component (its `name` is a signal so the test can change it). */
function packagePage(): Type<object> {
  return AngularComponent({
    selector: `mol-package-page-${++pageCount}`,
    standalone: true,
    template: `
      @if (query.status === 'error') {
        <p role="alert">{{ render('packages.loadFailed', 'Unable to load package.') }}</p>
      } @else if (query.status === 'idle' || query.status === 'loading') {
        <p role="status">{{ render('common.loading', 'Loading…') }}</p>
      } @else if (query.data === null) {
        <p>{{ render('packages.notFound', 'Package not found.') }}</p>
      } @else {
        <article><h1>{{ query.data?.name }}</h1><p>{{ query.data?.description }}</p></article>
      }
    `,
  })(
    class PackagePageComponent {
      /** The i18n binding the page uses. */
      readonly render = (key: string, defaultValue: string): string =>
        t(key, undefined, { defaultValue })
      /** The package the page shows. */
      readonly name = signal('inventory')
      /** This page's query. */
      readonly query = useQuery(computed(() => (this.name() ? packageQuery(this.name()) : null)))
    },
  ) as Type<object>
}

let view: ComponentMount<{ name: ReturnType<typeof signal<string>> }> | null = null
const fetchMock = vi.fn<typeof fetch>()

/** A real HTTP response, including non-2xx JSON that native fetch itself resolves. */
function response(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/** Settle HTTP parsing, query notifications and Angular's re-render. */
async function settle(): Promise<void> {
  for (let i = 0; i < 6; i += 1) await drain()
  await view?.settle()
}

afterEach(async () => {
  await view?.destroy()
  view = null
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
  })

  /** Mounts the documented page after the test arranged the HTTP response. */
  const render = async (): Promise<void> => {
    view = await mountComponent<{ name: ReturnType<typeof signal<string>> }>(packagePage())
  }

  it('shows pending across a parent re-render, then paints the completed document', async () => {
    let finish!: (value: Response) => void
    fetchMock.mockImplementation(() => new Promise((resolve) => (finish = resolve)))
    await render()
    await settle()
    // A parent change-detection pass while the request is still in flight.
    await view!.settle()
    expect(view!.host.querySelector('[role="status"]')).not.toBeNull()
    expect(view!.host.textContent).not.toContain('not found')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    finish(response(200, { name: 'Inventory', description: 'Warehouse stock' }))
    await settle()
    expect(view!.host.querySelector('article')?.textContent).toContain('Inventory')
    expect(view!.host.querySelector('[role="status"]')).toBeNull()
  })

  it.each([
    ['HTTP 404', 404, { error: 'missing' }],
    ['completed HTTP 200/null', 200, null],
  ])('shows completed missing for %s, never a pending skeleton', async (_case, status, body) => {
    fetchMock.mockResolvedValue(response(status, body))
    await render()
    await settle()
    expect(view!.host.textContent).toBe('Package not found.')
    expect(view!.host.querySelector('[role="status"], [role="alert"], article')).toBeNull()
  })

  it.each([401, 403, 500])(
    'reports HTTP %s as a load failure, never missing or loaded',
    async (status) => {
      fetchMock.mockResolvedValue(response(status, { error: 'unavailable' }))
      await render()
      await settle()
      expect(view!.host.querySelector('[role="alert"]')?.textContent).toBe(
        'Unable to load package.',
      )
      expect(view!.host.textContent).not.toContain('not found')
      expect(view!.host.querySelector('[role="status"], article')).toBeNull()
    },
  )

  it('reports a network rejection as a load failure, never missing', async () => {
    fetchMock.mockRejectedValue(new TypeError('Connection lost'))
    await render()
    await settle()
    expect(view!.host.querySelector('[role="alert"]')?.textContent).toBe('Unable to load package.')
    expect(view!.host.textContent).not.toContain('not found')
  })

  it('paints a prefetched document synchronously without a request or skeleton', async () => {
    getQueryClient().set(packageQuery('inventory').key, {
      name: 'Inventory',
      description: 'Warehouse stock',
    })
    // The mount's first render reads the cache in the hook's field initializer.
    await render()
    expect(view!.host.querySelector('article')?.textContent).toContain('Inventory')
    expect(view!.host.querySelector('[role="status"]')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('aborts a changed key and never paints its late response under the new identity', async () => {
    const pending: { signal: AbortSignal; resolve: (value: Response) => void }[] = []
    fetchMock.mockImplementation(
      (_url, options) =>
        new Promise((resolve) => pending.push({ signal: options!.signal!, resolve })),
    )
    await render()
    await settle()
    view!.component.name.set('purchase-orders')
    await settle()
    expect(pending).toHaveLength(2)
    expect(pending[0].signal.aborted).toBe(true)
    expect(pending[1].signal.aborted).toBe(false)
    pending[0].resolve(response(200, { name: 'Obsolete inventory', description: 'Old' }))
    await settle()
    expect(view!.host.textContent).not.toContain('Obsolete inventory')
    expect(view!.host.querySelector('[role="status"]')).not.toBeNull()
    pending[1].resolve(response(200, { name: 'Purchase orders', description: 'Current' }))
    await settle()
    expect(view!.host.querySelector('article')?.textContent).toContain('Purchase orders')
    expect(view!.host.textContent).not.toContain('Obsolete inventory')
  })

  it('aborts the actual HTTP request when the page unmounts', async () => {
    let requestSignal!: AbortSignal
    fetchMock.mockImplementation((_url, options) => {
      requestSignal = options!.signal!
      return new Promise((_resolve, reject) => {
        requestSignal.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        )
      })
    })
    await render()
    await settle()
    expect(requestSignal.aborted).toBe(false)
    await view!.destroy()
    view = null
    expect(requestSignal.aborted).toBe(true)
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
    const mutation = mutationExample()
    const query = mutation.feedOptions('viewer', 'following', 1)
    await expect(getQueryClient().fetch(query)).rejects.toMatchObject({ status: 500 })
    expect(getQueryClient().get(query.key)).toBeUndefined()
  })

  it.each([true, false])(
    'does not overwrite cache after a failed mutation (follow=%s)',
    async (follow) => {
      fetchMock.mockResolvedValue(response(500, { feed: 'error response document' }))
      const mutation = mutationExample()
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
    const mutation = mutationExample()
    await mutation.setFollowing('viewer', 'author', follow)
    expect(getQueryClient().get(mutation.feedKey('viewer', 'following', 1))).toBe('saved document')
  })
})

/** The Angular docs' fenced TypeScript blocks (the executable examples). */
function examples(): string[] {
  const source = readFileSync(join(__dirname, '../index.ts'), 'utf8')
  const doc = source.slice(source.indexOf('/**'), source.indexOf('*/')).replace(/^ \* ?/gm, '')
  return [...doc.matchAll(/```typescript\n([\s\S]*?)```/g)].map((match) => match[1])
}

interface DetailExample {
  packageQuery: (name: string) => QueryOptions<PackageDocument | null>
}

interface MutationExample {
  feedKey: (principal: string, filter: string, page: number) => readonly unknown[]
  feedOptions: (principal: string, filter: string, page: number) => QueryOptions<unknown>
  setFollowing: (principal: string, authorId: string, follow: boolean) => Promise<void>
}

/**
 * Compiles and runs one fenced example against the real modules: only its
 * imports are bound (the Angular decorators are the real ones, and the example
 * components are never instantiated).
 *
 * @param code - The example's TypeScript.
 * @param names - The declarations to export from it.
 * @returns The compiled exports.
 */
function compileSnippet<T>(code: string, names: string[]): T {
  const http = createFetchClient({ baseURL: 'https://catalog.example', retry: { maxRetries: 0 } })
  const imports: Record<string, unknown> = {
    '@angular/core': { Component: AngularComponent, computed, input: () => () => undefined },
    '@molecule/app-angular': { useTranslation: () => ({ t }) },
    '@molecule/app-query-angular': { useQuery, intentPrefetchProps },
    '@molecule/app-http': { getClient: () => http, isHttpError },
    '@molecule/app-i18n': { t },
    '@molecule/app-query': { getQueryClient },
    '@molecule/app-query-tanstack': { provider: tanstackProvider },
  }
  const { outputText, diagnostics } = ts.transpileModule(
    `${code}\nexport { ${names.join(', ')} }`,
    {
      fileName: 'example.ts',
      reportDiagnostics: true,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        experimentalDecorators: true,
      },
    },
  )
  expect(diagnostics).toEqual([])
  const exports = {}
  new Function('require', 'exports', outputText)((name: string) => {
    if (!(name in imports)) throw new Error(`Unexpected example import: ${name}`)
    return imports[name]
  }, exports)
  return exports as T
}

/** Select the core example's actual query declaration without executing its top-level demo calls. */
function coreQueryExample(): DetailExample {
  const path = join(__dirname, '../../../../core/query/src/index.ts')
  const core = readFileSync(path, 'utf8').replace(/^ \* ?/gm, '')
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
  return compileSnippet<DetailExample>(selected.map((node) => node.getText(parsed)).join('\n'), [
    'packageQuery',
  ])
}

/** The published mutation example (the exact `feedKey`/`feedOptions`/`setFollowing` declarations). */
function mutationExample(): MutationExample {
  const snippet = examples().find((block) => block.includes('setFollowing'))
  if (!snippet) throw new Error('Missing query mutation example')
  return compileSnippet<MutationExample>(snippet, ['feedKey', 'feedOptions', 'setFollowing'])
}
