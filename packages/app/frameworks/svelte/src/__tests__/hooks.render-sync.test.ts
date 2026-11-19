// @vitest-environment jsdom

/**
 * The React-named hooks that used to keep a "latest value" in a ref written
 * during render now read it through state (a render-time reset) or a stable
 * callback. Both must keep the behaviour the ref gave the committed tree: a
 * value read from a new key, a new scope or a new provider is the value the
 * first read after the change sees, never the previous one.
 *
 * React records what each COMMIT saw; Svelte runs a hook once per component and
 * publishes through stores, so each case records what the stores hold at the
 * first synchronous read after the change — the value that first render sees.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { get, writable } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { EditorProvider } from '@molecule/app-code-editor'
import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import { createFetchClient } from '@molecule/app-http'
import type { StorageProvider } from '@molecule/app-storage'
import { setProvider } from '@molecule/app-storage'

import { setMoleculeContext } from '../context.js'
import { resetAIModelsCache, useAIModels } from '../hooks/useAIModels.js'
import { useEditor } from '../hooks/useEditor.js'
import { useStoragePreference, useStorageValue } from '../hooks/useStorage.js'
import type { MoleculeConfig } from '../types.js'

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

/** The mounted hosts this file tears down after each case. */
const hosts: Array<() => Promise<void>> = []

/**
 * Mounts a host that runs the hook once during a child's init, under the given
 * services, and returns what the hook returned.
 *
 * @param config - The services to provide through `setMoleculeContext`.
 * @param run - Calls the hook; its return value is kept.
 * @returns The hook's result and the host's unmount.
 */
function mountHook<T>(
  config: MoleculeConfig,
  run: () => T,
): { result: T; stop: () => Promise<void> } {
  const captured: { result?: T } = {}
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = mount(Host, {
    target: container,
    props: {
      config,
      setMoleculeContext,
      run: () => {
        captured.result = run()
      },
    },
  })
  flushSync()
  const result = captured.result
  if (result === undefined) throw new Error('the host never ran the hook')
  const stop = async (): Promise<void> => {
    await unmount(app)
    container.remove()
  }
  hosts.push(stop)
  return { result, stop }
}

afterEach(async () => {
  for (const stop of hosts.splice(0)) await stop()
  resetAIModelsCache()
  vi.unstubAllGlobals()
})

describe('useStoragePreference across a key change', () => {
  it('renders the new key, and its unready state, in the first commit', async () => {
    setProvider(syncProvider({ width: 320, height: 480 }))
    const key = writable<'width' | 'height'>('width')
    const { result } = mountHook({}, () => useStoragePreference<number>(key, { defaultValue: 0 }))
    // The synchronous provider answers the very first read already.
    expect(get(result.value)).toBe(320)
    expect(get(result.ready)).toBe(false)
    await vi.waitFor(() => expect(get(result.ready)).toBe(true))

    key.set('height')

    // The new key's stored value is readable at once, and it is unready from
    // its first read (the previous key had already hydrated).
    expect(get(result.value)).toBe(480)
    expect(get(result.ready)).toBe(false)
    await vi.waitFor(() => expect(get(result.ready)).toBe(true))
    expect(get(result.value)).toBe(480)
  })
})

describe('useAIModels across a project scope change', () => {
  it('renders from the new scope in the first commit', async () => {
    resetAIModelsCache()
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => Response.json({ models: [{ id: 'scoped-model' }] })),
    )
    const http = createFetchClient({ baseURL: '' })
    const projectId = writable<string | undefined>(undefined)
    const { result } = mountHook({ http }, () => useAIModels(projectId))
    await vi.waitFor(() =>
      expect(
        get(result.models)
          .map((model) => model.id)
          .join(','),
      ).toBe('scoped-model'),
    )

    projectId.set('project-1')

    // The new scope starts empty and loading; the previous scope's catalog is
    // never read under the new scope.
    expect(get(result.models)).toEqual([])
    expect(get(result.loading)).toBe(true)
  })
})

describe('useEditor across a provider replacement', () => {
  it('renders the new provider tabs in the first commit', async () => {
    const first = mountHook({ editor: fakeEditor(['first.ts']) }, () => useEditor())
    expect(
      get(first.result.tabs)
        .map((tab) => tab.path)
        .join(','),
    ).toBe('first.ts')
    await first.stop()

    // A component mounted under a replaced provider reads that provider's tabs
    // at once — the first read, with no wait for an event.
    const second = mountHook({ editor: fakeEditor(['second.ts']) }, () => useEditor())
    expect(
      get(second.result.tabs)
        .map((tab) => tab.path)
        .join(','),
    ).toBe('second.ts')
  })
})

describe('useStorageValue removeValue', () => {
  it('keeps one identity and removes the key it is showing', async () => {
    const provider = syncProvider({ a: 'one', b: 'two' })
    const key = writable('a')
    const { result } = mountHook({ storage: provider }, () => useStorageValue<string>(key))
    const first = result.removeValue

    key.set('b')

    expect(result.removeValue).toBe(first)
    await result.removeValue()
    expect(provider.values.has('b')).toBe(false)
    expect(provider.values.has('a')).toBe(true)
  })
})
