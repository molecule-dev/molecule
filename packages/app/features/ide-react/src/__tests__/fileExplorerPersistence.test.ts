/**
 * File-explorer expand/collapse persistence goes through the bonded storage
 * provider.
 *
 * Regression for the dogfood audit finding: the explorer persisted its open
 * directories straight to `window.localStorage`, so swapping the bonded
 * `@molecule/app-storage` provider (native, encrypted, memory, a test host) left
 * the file tree behind. These tests fail against the old implementation (which
 * read and wrote `localStorage` and never touched a provider).
 */

import { describe, expect, it, vi } from 'vitest'

import { setProvider, type StorageProvider } from '@molecule/app-storage'

import { loadExpandState, saveExpandState } from '../components/fileExplorerPersistence.js'

/**
 * A synchronous in-memory provider — the shape a browser `localStorage`
 * provider has, so render-time reads answer immediately.
 */
function syncProvider(initial: Record<string, unknown> = {}): StorageProvider & {
  values: Map<string, unknown>
} {
  const values = new Map<string, unknown>(Object.entries(initial))
  const provider: StorageProvider = {
    async get<T = unknown>(key: string): Promise<T | null> {
      return values.has(key) ? (values.get(key) as T) : null
    },
    async set<T = unknown>(key: string, value: T): Promise<void> {
      values.set(key, value)
    },
    async remove(key: string): Promise<void> {
      values.delete(key)
    },
    async clear(): Promise<void> {
      values.clear()
    },
    async keys(): Promise<string[]> {
      return [...values.keys()]
    },
    getSync<T = unknown>(key: string): T | null {
      return values.has(key) ? (values.get(key) as T) : null
    },
  }
  return Object.assign(provider, { values })
}

const KEY = 'molecule_file_tree_project-1'

describe('file-explorer expand state', () => {
  it('reads a persisted state from the bonded provider', () => {
    setProvider(
      syncProvider({
        [KEY]: { expanded: ['/workspace/src'], collapsed: ['/workspace/node_modules'] },
      }),
    )

    const state = loadExpandState(KEY)

    expect([...state.expanded]).toEqual(['/workspace/src'])
    expect([...state.collapsed]).toEqual(['/workspace/node_modules'])
  })

  it('writes the state through the bonded provider', async () => {
    const provider = syncProvider()
    setProvider(provider)

    saveExpandState(KEY, {
      expanded: new Set(['/workspace/src']),
      collapsed: new Set(['/workspace/vendor']),
    })

    expect(provider.values.get(KEY)).toEqual({
      expanded: ['/workspace/src'],
      collapsed: ['/workspace/vendor'],
    })
    // A render-time read sees the just-written state without awaiting.
    expect([...loadExpandState(KEY).expanded]).toEqual(['/workspace/src'])
  })

  it('reads from whichever provider is bonded now (a swap redirects the tree)', () => {
    const first = syncProvider({ [KEY]: { expanded: ['/workspace/a'], collapsed: [] } })
    setProvider(first)
    expect([...loadExpandState(KEY).expanded]).toEqual(['/workspace/a'])

    const second = syncProvider()
    setProvider(second)

    expect([...loadExpandState(KEY).expanded]).toEqual([])
  })

  it('falls back to an empty state for an absent or corrupt entry', () => {
    setProvider(syncProvider({ [KEY]: 'not an object' }))

    const state = loadExpandState(KEY)

    expect(state.expanded.size).toBe(0)
    expect(state.collapsed.size).toBe(0)
  })

  it('never touches window.localStorage directly', () => {
    // A storage that throws on ANY access: a direct implementation would throw.
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('direct localStorage read')
      },
      setItem: () => {
        throw new Error('direct localStorage write')
      },
    })

    try {
      setProvider(syncProvider())
      expect(() =>
        saveExpandState(KEY, { expanded: new Set(['/workspace/src']), collapsed: new Set() }),
      ).not.toThrow()
      expect(loadExpandState(KEY).expanded.size).toBe(1)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('works with no provider bonded (before setupProviders, or in a bare test host)', () => {
    setProvider(null as unknown as StorageProvider)

    expect(() => saveExpandState(KEY, { expanded: new Set(), collapsed: new Set() })).not.toThrow()
    expect(loadExpandState(KEY).expanded.size).toBe(0)
  })
})
