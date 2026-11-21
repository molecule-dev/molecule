// @vitest-environment jsdom

/**
 * The composables that read a value from a new key, a new scope or a new
 * provider must render that value with the FIRST render after the change,
 * never one render later.
 *
 * Each case records the value every render saw, so a stale first render fails
 * even though the settled DOM would look the same either way. React's
 * render-time ref has no Vue counterpart; what the caller observes is the value
 * the render reads, so that is what each case records.
 *
 * @module
 */

import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'

import type { EditorProvider } from '@molecule/app-code-editor'
import { createFetchClient } from '@molecule/app-http'
import type { StorageProvider } from '@molecule/app-storage'
import { setProvider } from '@molecule/app-storage'

import {
  resetAIModelsCache,
  useAIModels,
  type UseAIModelsResult,
} from '../composables/useAIModels.js'
import { useEditor } from '../composables/useEditor.js'
import { useStoragePreference, useStorageValue } from '../composables/useStorage.js'
import { moleculePlugin } from '../plugin.js'
import type { UseEditorResult, UseStorageValueResult } from '../types.js'

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

/**
 * An HTTP client whose `GET /ai/models` answers only when `release()` is called,
 * so a test can look at the render BEFORE the catalog lands.
 *
 * @param modelId - The single model id the answer carries.
 * @returns The client and a function that answers the outstanding request.
 */
function deferredModelClient(modelId: string): {
  client: ReturnType<typeof createFetchClient>
  release: () => void
  pending: () => number
} {
  const answers: (() => void)[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          answers.push(() =>
            resolve(
              new Response(JSON.stringify({ models: [{ id: modelId }] }), {
                status: 200,
                headers: { 'content-type': 'application/json' },
              }),
            ),
          )
        }),
    ),
  )
  return {
    client: createFetchClient(),
    release: () => {
      answers.shift()?.()
    },
    pending: () => answers.length,
  }
}

const wrappers: VueWrapper[] = []

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  setProvider(syncProvider())
  resetAIModelsCache()
  vi.unstubAllGlobals()
})

describe('useStoragePreference across a key change', () => {
  it('renders the new key, and its unready state, in the first commit', async () => {
    setProvider(syncProvider({ width: 320, height: 480 }))
    const committed: string[] = []
    const key = ref('width')
    const Probe = defineComponent({
      setup() {
        const { value, ready } = useStoragePreference<number>(key, { defaultValue: 0 })
        return () => {
          committed.push(`${key.value}:${String(value.value)}:${String(ready.value)}`)
          return h(
            'button',
            {
              type: 'button',
              onClick: () => {
                key.value = 'height'
              },
            },
            'switch',
          )
        }
      },
    })

    const wrapper = mount(Probe)
    wrappers.push(wrapper)
    // The synchronous provider answers the very first render already.
    expect(committed[0]).toBe('width:320:false')
    await vi.waitFor(() => expect(committed[committed.length - 1]).toBe('width:320:true'))

    committed.length = 0
    await wrapper.get('button').trigger('click')

    // The new key's stored value is rendered at once, and it is unready from
    // its first render (the previous key had already hydrated).
    expect(committed[0]).toBe('height:480:false')
  })
})

describe('useAIModels across a project scope change', () => {
  it('renders from the new scope in the first commit', async () => {
    resetAIModelsCache()
    const { client, release, pending } = deferredModelClient('scoped-model')
    const committed: string[] = []
    const projectId = ref<string | undefined>(undefined)
    let models!: UseAIModelsResult['models']
    const Probe = defineComponent({
      setup() {
        const result = useAIModels(projectId)
        models = result.models
        return () => {
          committed.push(result.models.value.map((model) => model.id).join(','))
          return h(
            'button',
            {
              type: 'button',
              onClick: () => {
                projectId.value = 'project-1'
              },
            },
            'scope',
          )
        }
      },
    })

    const wrapper = mount(Probe, { global: { plugins: [[moleculePlugin, { http: client }]] } })
    wrappers.push(wrapper)
    expect(committed[0]).toBe('')
    await vi.waitFor(() => expect(pending()).toBe(1))
    release()
    await vi.waitFor(() => expect(committed[committed.length - 1]).toBe('scoped-model'))

    committed.length = 0
    await wrapper.get('button').trigger('click')

    // The new scope starts empty and loading; the previous scope's catalog is
    // never rendered under a render that reads the new scope.
    expect(committed[0]).toBe('')
    expect(models.value).toEqual([])
    await vi.waitFor(() => expect(pending()).toBe(1))
    release()
    await vi.waitFor(() => expect(committed[committed.length - 1]).toBe('scoped-model'))
  })
})

describe('useEditor across a provider replacement', () => {
  it('renders the new provider tabs in the first commit', () => {
    const committed: string[] = []
    let tabs!: UseEditorResult['tabs']
    const Probe = defineComponent({
      setup() {
        const editor = useEditor()
        tabs = editor.tabs
        return () => {
          committed.push(editor.tabs.value.map((tab) => tab.path).join(','))
          return h('div')
        }
      },
    })

    // Vue resolves an injected provider at setup, so a caller replaces one by
    // rendering the subtree under the new provider; the first render there must
    // read the new provider's tabs, not a carried-over list.
    const first = mount(Probe, {
      global: { plugins: [[moleculePlugin, { editor: fakeEditor(['first.ts']) }]] },
    })
    wrappers.push(first)
    expect(committed[committed.length - 1]).toBe('first.ts')

    committed.length = 0
    const second = mount(Probe, {
      global: { plugins: [[moleculePlugin, { editor: fakeEditor(['second.ts']) }]] },
    })
    wrappers.push(second)

    expect(committed[0]).toBe('second.ts')
    expect(tabs.value.map((tab) => tab.path)).toEqual(['second.ts'])
  })
})

describe('useStorageValue removeValue', () => {
  it('keeps one identity and removes the key it is showing', async () => {
    const provider = syncProvider({ a: 'one', b: 'two' })
    const key = ref('a')
    let storage!: UseStorageValueResult<string>
    const Probe = defineComponent({
      setup() {
        storage = useStorageValue<string>(key)
        return () => h('div')
      },
    })

    const wrapper = mount(Probe, { global: { plugins: [[moleculePlugin, { storage: provider }]] } })
    wrappers.push(wrapper)
    const first = storage.removeValue

    key.value = 'b'
    await nextTick()

    expect(storage.removeValue).toBe(first)
    await storage.removeValue()
    expect(provider.values.has('b')).toBe(false)
    expect(provider.values.has('a')).toBe(true)
  })
})
