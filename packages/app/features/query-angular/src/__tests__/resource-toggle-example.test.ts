// @vitest-environment jsdom
/**
 * The published invoice-toggle composition — a flag button whose value saves
 * optimistically (`OptimisticToggleButton` from `@molecule/app-ui-angular`,
 * the Angular counterpart of `@molecule/app-ui-react`), mounted inside
 * `QueryContent` — executed as a real Angular page over both query bonds, the
 * counterpart of `query-react`'s resource-toggle-example test.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import '@molecule/app-framework-conformance/ui/setup'
import '@angular/compiler'
import { Component, type Type } from '@angular/core'
import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { QueryProvider } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider as memoryProvider } from '@molecule/app-query-memory'
import { provider as tanstackProvider } from '@molecule/app-query-tanstack'
import { OptimisticToggleButton } from '@molecule/app-ui-angular'

import { createQueryResource, QueryContent, type ResourceHttp, useQuery } from '../index.js'
import { type ComponentMount, drain, mountComponent } from './harness.js'

interface Invoice {
  id: string
  number: string
  flagged: boolean
}

/** The i18n binding the example uses: the English default is the rendered text. */
const t = (_key: string, _values: unknown, options: { defaultValue: string }): string =>
  options.defaultValue

const initial: Invoice = { id: 'one', number: 'INV-1', flagged: false }

const here = dirname(fileURLToPath(import.meta.url))
const doc = readFileSync(join(here, '../index.ts'), 'utf8').replace(/^ \* ?/gm, '')
const snippet = [...doc.matchAll(/```typescript\n([\s\S]*?)```/g)].find((match) =>
  match[1]?.includes('export const invoices'),
)?.[1]
if (!snippet) throw new Error('Missing the published query-resource example')

// The page below mirrors the published example with plain `inputs` (JIT
// cannot see signal inputs); this compiles the published one itself, so the
// documentation cannot drift from the installed public contracts.
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
    experimentalDecorators: true,
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

/** Host selectors minted so far (each example defines its own components). */
let exampleCount = 0

/** The page and resource the published example composes, bound to one HTTP client. */
interface Example {
  invoices: ReturnType<typeof createQueryResource<Invoice>>
  InvoicePage: Type<object>
}

/** Bind the example's actual UI, hook and resource composition to a test client. */
function compile(http: ResourceHttp): Example {
  const invoices = createQueryResource<Invoice>({
    name: 'invoices',
    path: '/invoices',
    http: () => http,
    readList: (response) => response.data as Invoice[],
    readOne: (response) => response.data as Invoice | null,
  })
  const counter = ++exampleCount

  // The record's own action: a flag control whose value saves optimistically.
  // OptimisticToggleButton takes the server value as an input and follows it
  // after a save completes, the way React's useOptimisticValue does.
  const InvoiceFlag = Component({
    selector: `mol-invoice-flag-${counter}`,
    standalone: true,
    imports: [OptimisticToggleButton],
    inputs: ['invoice', 'viewer'],
    template: `
      <button type="button" mol-optimistic-toggle-button [value]="invoice.flagged" [commit]="save">
        <span slot="activeLabel">{{ t('invoice.unflag', undefined, { defaultValue: 'Unflag' }) }}</span>
        <span slot="inactiveLabel">{{ t('invoice.flag', undefined, { defaultValue: 'Flag' }) }}</span>
      </button>
    `,
  })(
    class FlagControl {
      readonly t = t
      invoice!: Invoice
      viewer = ''

      /**
       * Saves one flag change and returns the server's saved value.
       *
       * @param flagged - The value the person chose.
       * @returns The saved record's flag.
       */
      readonly save = async (flagged: boolean): Promise<boolean> =>
        (await invoices.toggle(this.viewer, this.invoice.id, 'flag', flagged)).flagged
    },
  ) as Type<unknown>

  const InvoicePage = Component({
    selector: `mol-invoice-page-${counter}`,
    standalone: true,
    imports: [QueryContent, InvoiceFlag],
    template: `
      <mol-query-content
        [query]="query"
        [pending]="pending"
        [missing]="missing"
        [error]="failed"
        [children]="content"
      ></mol-query-content>
      <ng-template #pending>
        <p role="status">{{ t('common.loading', undefined, { defaultValue: 'Loading…' }) }}</p>
      </ng-template>
      <ng-template #missing>
        <p role="alert">{{ t('invoice.missing', undefined, { defaultValue: 'Invoice not found.' }) }}</p>
      </ng-template>
      <ng-template #failed>
        <p role="alert">{{ t('invoice.failed', undefined, { defaultValue: 'Unable to load invoice.' }) }}</p>
      </ng-template>
      <ng-template #content let-invoice>
        <mol-invoice-flag-${counter} [invoice]="invoice" [viewer]="viewer"></mol-invoice-flag-${counter}>
      </ng-template>
    `,
  })(
    class InvoicePageComponent {
      readonly t = t
      readonly viewer = 'reader'
      // The record this page shows (the example is bound to one invoice).
      readonly query = useQuery(invoices.detail(this.viewer, initial.id))
    },
  ) as Type<object>
  return { invoices, InvoicePage }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

const mounts: ComponentMount<object>[] = []
const mounted = async (view: Promise<ComponentMount<object>>): Promise<ComponentMount<object>> => {
  const mount = await view
  mounts.push(mount)
  return mount
}
const flush = async (): Promise<void> => {
  for (let i = 0; i < 6; i += 1) await drain()
}
const click = async (view: ComponentMount<object>): Promise<void> => {
  view.host.querySelector<HTMLButtonElement>('button')!.click()
  await flush()
}

afterEach(async () => {
  for (const view of mounts.splice(0)) await view.destroy()
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
    const example = compile(http)
    const view = await mounted(mountComponent<object>(example.InvoicePage))
    expect(view.host.querySelector('button')).toBeNull()
    expect(http.post).not.toHaveBeenCalled()
    read.resolve({ data: initial })
    await view.settle()
    await click(view)
    expect(view.host.querySelector('button')!.textContent).toContain('Unflag')
    expect(http.post).toHaveBeenCalledExactlyOnceWith('/invoices/one/flag')
  })

  it.each(['missing', 'failed'] as const)(
    'presents an initial %s read without mounting a record action',
    async (state) => {
      if (state === 'missing') vi.mocked(http.get).mockResolvedValue({ data: null })
      else vi.mocked(http.get).mockRejectedValue(new Error('Offline'))
      const example = compile(http)
      const view = await mounted(mountComponent<object>(example.InvoicePage))
      await view.settle()
      expect(view.host.querySelector('button')).toBeNull()
      expect(view.host.querySelector('[role="alert"]')?.textContent).toBe(
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
    const view = await mounted(mountComponent<object>(example.InvoicePage))
    await flush()
    await click(view)
    expect(getQueryClient().get(['invoices', 'reader', 'detail', 'one'])).toMatchObject({
      flagged: true,
    })
    view.host.querySelector<HTMLButtonElement>('button')!.click()
    // The click's own change-detection pass: the inverse shows at once, the
    // delete waits behind the save still running.
    view.tick()
    expect(view.host.querySelector('button')!.textContent).toContain('Flag')
    expect(view.host.querySelector('button')!.getAttribute('aria-pressed')).toBe('false')
    expect(http.delete).not.toHaveBeenCalled()
    refresh.resolve({ data: [{ ...initial, flagged: true }] })
    await flush()
    await view.settle()
    expect(http.delete).toHaveBeenCalledExactlyOnceWith('/invoices/one/flag')
    expect(view.host.querySelector('button')!.getAttribute('aria-pressed')).toBe('false')
  })

  it('rejects a late pre-mutation read and keeps the label on the completed saved state', async () => {
    const example = compile(http)
    const detail = example.invoices.detail('reader', initial.id)!
    const client = getQueryClient()
    client.set(detail.key, initial)
    const old = deferred<{ data: Invoice }>()
    vi.mocked(http.get).mockReturnValue(old.promise)
    const reading = client.fetch({ ...detail, staleMs: 0 })
    const view = await mounted(mountComponent<object>(example.InvoicePage))
    await click(view)
    old.resolve({ data: initial })
    await reading
    await view.settle()
    expect(view.host.querySelector('button')!.getAttribute('aria-pressed')).toBe('true')
    expect(view.host.querySelector('button')!.textContent).toContain('Unflag')
    expect(client.get(detail.key)).toMatchObject({ flagged: true })
  })

  it('counterexample: accepts a genuinely newer server value after saving completes', async () => {
    const example = compile(http)
    const view = await mounted(mountComponent<object>(example.InvoicePage))
    await flush()
    await click(view)
    expect(view.host.querySelector('button')!.getAttribute('aria-pressed')).toBe('true')
    const detail = example.invoices.detail('reader', initial.id)!
    // The first publication acknowledges the control's current incoming server snapshot.
    getQueryClient().set(detail.key, { ...initial, flagged: true })
    getQueryClient().set(detail.key, initial)
    await view.settle()
    expect(view.host.querySelector('button')!.getAttribute('aria-pressed')).toBe('false')
    expect(view.host.querySelector('button')!.textContent).toContain('Flag')
    expect(http.post).toHaveBeenCalledTimes(1)
    expect(http.delete).not.toHaveBeenCalled()
  })
})
