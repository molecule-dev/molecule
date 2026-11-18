// @vitest-environment jsdom

/**
 * The hooks that used to keep a "latest value" in a ref written during render
 * now read it through state (a render-time reset) or a stable callback. Both
 * must keep the behaviour the ref gave the committed tree: a value read from a
 * new key, a new scope, a new provider or the external store is rendered by the
 * FIRST commit of that render, never one commit later.
 *
 * Each case records what each COMMIT saw, so a stale first commit fails even
 * though the settled DOM would look the same either way.
 *
 * @module
 */

import { act, render, renderHook, waitFor } from '@testing-library/react'
import type { JSX, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { EditorProvider } from '@molecule/app-code-editor'
import type { HttpClient, HttpResponse } from '@molecule/app-http'
import type { StorageProvider } from '@molecule/app-storage'
import { setProvider } from '@molecule/app-storage'

import { EditorContext, HttpContext } from '../contexts.js'
import { resetAIModelsCache, useAIModels } from '../hooks/useAIModels.js'
import { useEditor } from '../hooks/useEditor.js'
import { useStoragePreference, useStorageValue } from '../hooks/useStorage.js'
import { StorageProvider as StorageProviderComponent } from '../providers.js'

/**
 * Records the value of every commit, in order.
 *
 * @param props - The value to record and the array to record it in.
 * @returns Nothing rendered.
 */
function CommittedValue<T>({ value, into }: { value: T; into: T[] }): null {
  // No dependency list: an unchanged value must still be recorded, or a stale
  // commit that renders the SAME value as before would leave no trace.
  useEffect(() => {
    into.push(value)
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
 * A minimal HTTP client whose GET answers one model list.
 *
 * @param models - The `GET /ai/models` body.
 * @returns The client.
 */
function modelClient(models: Array<{ id: string }>): HttpClient {
  return {
    baseURL: '',
    defaultHeaders: {},
    get: vi.fn(async (): Promise<HttpResponse<{ models: Array<{ id: string }> }>> => ({
      data: { models },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { method: 'GET', url: '/ai/models' },
    })),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    addRequestInterceptor: vi.fn(() => () => undefined),
    addResponseInterceptor: vi.fn(() => () => undefined),
    addErrorInterceptor: vi.fn(() => () => undefined),
    setAuthToken: vi.fn(),
    getAuthToken: vi.fn(() => null),
    onAuthError: vi.fn(() => () => undefined),
  } as unknown as HttpClient
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

afterEach(() => {
  setProvider(null as unknown as StorageProvider)
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
      const [key, setKey] = useState('width')
      const { value, ready } = useStoragePreference<number>(key, { defaultValue: 0 })
      return (
        <>
          <button type="button" onClick={() => setKey('height')}>
            switch
          </button>
          <CommittedValue value={`${key}:${String(value)}:${String(ready)}`} into={committed} />
        </>
      )
    }

    const { getByRole } = render(<Probe />)
    // The synchronous provider answers the very first render already.
    expect(committed[0]).toBe('width:320:false')
    await waitFor(() => expect(committed[committed.length - 1]).toBe('width:320:true'))

    committed.length = 0
    await act(async () => getByRole('button').click())

    // The new key's stored value is committed at once, and it is unready from
    // its first commit (the previous key had already hydrated).
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
      const [projectId, setProjectId] = useState<string | undefined>(undefined)
      const { models } = useAIModels(projectId)
      return (
        <>
          <button type="button" onClick={() => setProjectId('project-1')}>
            scope
          </button>
          <CommittedValue value={models.map((model) => model.id).join(',')} into={committed} />
        </>
      )
    }

    const wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
      <HttpContext.Provider value={client}>{children}</HttpContext.Provider>
    )
    const { getByRole } = render(<Probe />, { wrapper })
    await waitFor(() => expect(committed[committed.length - 1]).toBe('scoped-model'))

    committed.length = 0
    act(() => getByRole('button').click())

    // The new scope starts empty and loading; the previous scope's catalog is
    // never committed under a render that reads the new scope.
    expect(committed[0]).toBe('')
  })
})

describe('useEditor across a provider replacement', () => {
  it('renders the new provider tabs in the first commit', () => {
    const committed: string[] = []

    /**
     * Records the tab paths of every commit.
     *
     * @returns The commit probe.
     */
    function Probe(): JSX.Element {
      const { tabs } = useEditor()
      return <CommittedValue value={tabs.map((tab) => tab.path).join(',')} into={committed} />
    }

    /**
     * Renders the probe under one editor provider.
     *
     * @param props - The provider to expose through `EditorContext`.
     * @returns The probe element.
     */
    function Tree({ provider }: { provider: EditorProvider }): JSX.Element {
      return (
        <EditorContext.Provider value={provider}>
          <Probe />
        </EditorContext.Provider>
      )
    }

    const { rerender } = render(<Tree provider={fakeEditor(['first.ts'])} />)
    expect(committed[committed.length - 1]).toBe('first.ts')

    committed.length = 0
    rerender(<Tree provider={fakeEditor(['second.ts'])} />)

    expect(committed[0]).toBe('second.ts')
  })
})

describe('useStorageValue removeValue', () => {
  it('keeps one identity and removes the key it is showing', async () => {
    const provider = syncProvider({ a: 'one', b: 'two' })

    /**
     * Reads one storage key.
     *
     * @param props - The storage key to read.
     * @returns The hook result.
     */
    function useKey({ key }: { key: string }): ReturnType<typeof useStorageValue<string>> {
      return useStorageValue<string>(key)
    }

    const wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
      <StorageProviderComponent provider={provider}>{children}</StorageProviderComponent>
    )
    const { result, rerender } = renderHook(useKey, { wrapper, initialProps: { key: 'a' } })
    const first = result.current.removeValue

    rerender({ key: 'b' })

    expect(result.current.removeValue).toBe(first)
    await act(async () => {
      await result.current.removeValue()
    })
    expect(provider.values.has('b')).toBe(false)
    expect(provider.values.has('a')).toBe(true)
  })
})
