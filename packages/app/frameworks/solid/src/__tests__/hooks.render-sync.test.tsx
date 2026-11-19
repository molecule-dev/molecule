// @vitest-environment jsdom

/**
 * The primitive counterparts of React's ref-written-during-render hooks. React
 * pins the FIRST COMMIT after an argument or provider change: a value read from
 * a new key, a new scope, a new provider or the external store must be the one
 * that render shows, never one render later.
 *
 * Solid has no commits, so each case records what the primitive's accessors
 * return on every effect run: the first recorded value after the change is what
 * a caller reads before any await, which is the same contract.
 *
 * @module
 */

import { createEffect, createSignal, type JSX, Show } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import type { EditorProvider } from '@molecule/app-code-editor'
import type { HttpClient, HttpResponse } from '@molecule/app-http'
import type { StorageProvider } from '@molecule/app-storage'
import { setProvider } from '@molecule/app-storage'

import { EditorContext, HttpContext, StorageContext } from '../context.js'
import { resetAIModelsCache, useAIModels } from '../primitives/ai-models.js'
import { useEditor } from '../primitives/ide.js'
import { useStoragePreference, useStorageValue } from '../primitives/storage.js'

const disposers: Array<() => void> = []

/**
 * Renders a Solid tree into a container in the document and keeps its cleanup.
 *
 * @param app - The tree to render.
 * @returns The container the tree rendered into.
 */
function mount(app: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(app, container)
  disposers.push(() => {
    dispose()
    container.remove()
  })
  return container
}

/**
 * Lets queued microtasks and timers run.
 *
 * @returns A promise resolved after the pending work.
 */
async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
  }
}

/**
 * Retries an assertion until it passes or the deadline expires.
 *
 * @param assertion - The assertion to retry.
 * @param timeoutMs - How long to keep retrying.
 * @returns A promise resolved once the assertion passes.
 */
async function waitFor(assertion: () => void, timeoutMs = 2000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      assertion()
      return
    } catch (error) {
      if (Date.now() > deadline) throw error
      await settle()
    }
  }
}

/**
 * Records the value of every effect run, in order — React's dependency-less
 * `useEffect` probe. The effect tracks the signals the value was built from, so
 * an unchanged value built from changed inputs still records a run.
 *
 * @param props - The value to record and the array to record it in.
 * @returns Nothing rendered.
 */
function CommittedValue<T>(props: { value: T; into: T[] }): null {
  createEffect(() => {
    props.into.push(props.value)
  })
  return null
}

/**
 * A synchronous storage provider — the browser localStorage shape.
 *
 * @param initial - The values the provider starts with.
 * @returns The provider, its values, and its write spy.
 */
function syncProvider(initial: Record<string, unknown> = {}): StorageProvider & {
  values: Map<string, unknown>
  writes: string[]
} {
  const values = new Map<string, unknown>(Object.entries(initial))
  const writes: string[] = []
  const provider: StorageProvider = {
    async get<T = unknown>(key: string): Promise<T | null> {
      return values.has(key) ? (values.get(key) as T) : null
    },
    getSync<T = unknown>(key: string): T | null {
      return values.has(key) ? (values.get(key) as T) : null
    },
    async set<T = unknown>(key: string, value: T): Promise<void> {
      writes.push(key)
      values.set(key, value)
    },
    async remove(key: string): Promise<void> {
      writes.push(key)
      values.delete(key)
    },
    async clear(): Promise<void> {
      values.clear()
    },
    async keys(): Promise<string[]> {
      return [...values.keys()]
    },
  }
  return Object.assign(provider, { values, writes })
}

/**
 * Wraps a `vi.fn` so a mock property carries its method's real generic
 * signature without a cast.
 *
 * @param mock - The recording mock.
 * @returns The same mock, typed as the interface method it stands in for.
 */
const asMethod = <Method extends (...args: never[]) => unknown>(
  mock: Mock<Method>,
): Mock<Method> & Method =>
  Object.assign(mock, (): never => {
    throw new Error('generic method stand-in — calls are recorded by the vi.fn mock')
  })

/**
 * A full `HttpResponse<T>` fixture.
 *
 * @param data - The response body.
 * @returns The response.
 */
function httpResponse<T>(data: T): HttpResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { method: 'GET', url: '/ai/models' },
  }
}

/**
 * A minimal HTTP client whose GET answers one model list.
 *
 * @param models - The `GET /ai/models` body.
 * @returns The client.
 */
function modelClient(models: Array<{ id: string }>): HttpClient {
  const get = asMethod(vi.fn<HttpClient['get']>())
  get.mockResolvedValue(httpResponse({ models }))
  return {
    baseURL: '',
    defaultHeaders: {},
    get,
    post: asMethod(vi.fn<HttpClient['post']>()),
    put: asMethod(vi.fn<HttpClient['put']>()),
    patch: asMethod(vi.fn<HttpClient['patch']>()),
    delete: asMethod(vi.fn<HttpClient['delete']>()),
    request: asMethod(vi.fn<HttpClient['request']>()),
    addRequestInterceptor: vi.fn(() => () => undefined),
    addResponseInterceptor: vi.fn(() => () => undefined),
    addErrorInterceptor: vi.fn(() => () => undefined),
    setAuthToken: vi.fn(),
    getAuthToken: vi.fn(() => null),
    onAuthError: vi.fn(() => () => undefined),
  }
}

/**
 * An editor provider holding a fixed set of tabs, first one active. It builds a
 * fresh array and fresh tab objects on every `getTabs()` call, like a real one.
 *
 * @param paths - The open file paths, first one active.
 * @returns The provider.
 */
function fakeEditor(paths: readonly string[]): EditorProvider {
  return {
    name: 'fake-editor',
    mount: () => {},
    dispose: () => {},
    openFile: () => {},
    closeFile: () => {},
    getContent: () => null,
    setContent: () => {},
    getCursorPosition: () => null,
    setCursorPosition: () => {},
    focus: () => {},
    onChange: () => () => {},
    getTabs: () =>
      paths.map((path, index) => ({
        path,
        label: path,
        isDirty: false,
        isActive: index === 0,
      })),
    setActiveTab: () => {},
    updateConfig: () => {},
  }
}

beforeEach(() => {
  resetAIModelsCache()
})

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  resetAIModelsCache()
})

describe('useStoragePreference across a key change', () => {
  it('renders the new key, and its unready state, in the first commit', async () => {
    setProvider(syncProvider({ width: 320, height: 480 }))
    const committed: string[] = []

    /**
     * Switches the storage key from `width` to `height` on a click.
     *
     * @returns The switch button and the commit probe.
     */
    function Probe(): JSX.Element {
      const [key, setKey] = createSignal('width')
      const { value, ready } = useStoragePreference<number>(key, { defaultValue: 0 })
      return (
        <>
          <button type="button" onClick={() => setKey('height')}>
            switch
          </button>
          <CommittedValue
            value={`${key()}:${String(value())}:${String(ready())}`}
            into={committed}
          />
        </>
      )
    }

    const container = mount(() => <Probe />)
    // The synchronous provider answers the very first read already.
    expect(committed[0]).toBe('width:320:false')
    await waitFor(() => expect(committed[committed.length - 1]).toBe('width:320:true'))

    committed.length = 0
    container.querySelector('button')?.click()

    // The new key's stored value is read at once, and it is unready from its
    // first read (the previous key had already hydrated).
    expect(committed[0]).toBe('height:480:false')
  })
})

describe('useAIModels across a project scope change', () => {
  it('renders from the new scope in the first commit', async () => {
    resetAIModelsCache()
    const client = modelClient([{ id: 'scoped-model' }])
    const committed: string[] = []

    /**
     * Switches the catalog scope from unscoped to `project-1` on a click.
     *
     * @returns The scope button and the commit probe.
     */
    function Probe(): JSX.Element {
      const [projectId, setProjectId] = createSignal<string | undefined>(undefined)
      // `''` is how the primitive reads React's `undefined` scope.
      const { models } = useAIModels(() => projectId() ?? '')
      return (
        <>
          <button type="button" onClick={() => setProjectId('project-1')}>
            scope
          </button>
          <CommittedValue
            value={models()
              .map((model) => model.id)
              .join(',')}
            into={committed}
          />
        </>
      )
    }

    const container = mount(() => (
      <HttpContext.Provider value={client}>
        <Probe />
      </HttpContext.Provider>
    ))
    await waitFor(() => expect(committed[committed.length - 1]).toBe('scoped-model'))

    committed.length = 0
    container.querySelector('button')?.click()

    // The new scope starts empty and loading; the previous scope's catalog is
    // never read under the new scope.
    expect(committed[0]).toBe('')
  })
})

describe('useEditor across a provider replacement', () => {
  it('renders the new provider tabs in the first commit', () => {
    const committed: string[] = []
    const [provider, setProvider] = createSignal<EditorProvider>(fakeEditor(['first.ts']))

    /**
     * Records the tab paths of every read.
     *
     * @returns The commit probe.
     */
    function Probe(): JSX.Element {
      const { tabs } = useEditor()
      return (
        <CommittedValue
          value={tabs()
            .map((tab) => tab.path)
            .join(',')}
          into={committed}
        />
      )
    }

    // `keyed` re-creates the consumer under the replacement provider, which is
    // how a Solid tree shows a provider that changed (the context read happens
    // once at setup).
    mount(() => (
      <Show when={provider()} keyed>
        {(current: EditorProvider) => (
          <EditorContext.Provider value={current}>
            <Probe />
          </EditorContext.Provider>
        )}
      </Show>
    ))
    expect(committed[committed.length - 1]).toBe('first.ts')

    committed.length = 0
    setProvider(fakeEditor(['second.ts']))

    expect(committed[0]).toBe('second.ts')
  })
})

describe('useStorageValue removeValue', () => {
  it('keeps one identity and removes the key it is showing', async () => {
    const provider = syncProvider({ a: 'one', b: 'two' })
    let setKey!: (value: string) => void
    let result!: ReturnType<typeof useStorageValue<string>>

    /**
     * Reads one storage key with a key that can change on the same mount.
     *
     * @returns The commit probe.
     */
    function Probe(): JSX.Element {
      const [key, set] = createSignal('a')
      setKey = set
      result = useStorageValue<string>(key)
      return <></>
    }

    mount(() => (
      <StorageContext.Provider value={provider}>
        <Probe />
      </StorageContext.Provider>
    ))
    const first = result.removeValue

    setKey('b')

    expect(result.removeValue).toBe(first)
    await result.removeValue()
    expect(provider.values.has('b')).toBe(false)
    expect(provider.values.has('a')).toBe(true)
  })
})
