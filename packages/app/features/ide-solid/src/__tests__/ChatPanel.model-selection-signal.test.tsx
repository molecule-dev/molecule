// @vitest-environment jsdom
/**
 * `modelSelectionSignal` — a host bump re-reads the project's saved settings.
 *
 * Port of
 * `@molecule/app-ide-react/src/__tests__/ChatPanel.model-selection-signal.test.tsx`
 * with the same test name and the same assertions: a host bumps the signal when
 * the saved model changed somewhere else (the provider modal, another member's
 * edit), and the panel then reads the settings again instead of keeping the
 * ones it loaded at mount. Here the re-read answers a model that has left the
 * catalogue, so a working re-read shows the "no longer available" notice.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { HttpContext, ThemeContext } from '@molecule/app-solid'
import { resetAIModelsCache } from '@molecule/app-solid/ai-models'
import { ChatContext, resetChatStoresForTests } from '@molecule/app-solid/chat'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatPanel } from '../components/ChatPanel.jsx'
import { buildThemeProvider } from './theme-test-provider.js'

/** The one model the catalogue offers. */
const MODELS = [
  {
    id: 'free-model',
    provider: 'deepseek',
    label: 'Free Model',
    description: 'the free one',
    contextWindow: 100_000,
    maxOutputTokens: 8_000,
    supportsThinking: false,
    thinkingBudgetTokens: 0,
    thinkingConfigurable: false,
    supportsVision: false,
    supportsPromptCaching: false,
    supportsTools: true,
    inputPricePerMTok: 0.5,
    outputPricePerMTok: 2,
    cacheReadPricePerMTok: 0,
    cacheWritePricePerMTok: 0,
    knowledgeCutoff: '2025-01-01',
    freeTier: true,
  },
]

/**
 * An {@link HttpClient} that serves the catalogue and answers each project
 * settings read from `settingsReads` in turn (the last one repeats); every
 * other request rejects, and each caller in the mounted tree catches its own.
 *
 * @param settingsReads - The saved settings each `GET /projects/:id` answers.
 * @param reads - Sink counting the settings reads.
 * @returns The client.
 */
function buildHttpClient(
  settingsReads: Record<string, unknown>[],
  reads: { count: number },
): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  const get = async (path: string): Promise<unknown> => {
    if (path.startsWith('/ai/models')) return { data: { models: MODELS, defaults: {} } }
    if (/^\/projects\/[^/?]+$/.test(path)) {
      const settings = settingsReads[Math.min(reads.count, settingsReads.length - 1)]
      reads.count++
      return { data: { settings } }
    }
    return reject()
  }
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get: get as HttpClient['get'],
    post: reject,
    put: reject,
    patch: reject,
    delete: reject,
    addRequestInterceptor: () => () => {},
    addResponseInterceptor: () => () => {},
    addErrorInterceptor: () => () => {},
    setAuthToken: () => {},
    getAuthToken: () => null,
    onAuthError: () => () => {},
  }
}

/** A {@link ChatProvider} whose history is empty, so the panel mounts with no network. */
function buildChatProvider(): ChatProvider {
  return {
    name: 'stub',
    sendMessage: async (): Promise<void> => {},
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config: ChatConfig): Promise<ChatMessage[]> => [],
  }
}

/** A working in-memory Storage (Node's experimental web-storage shadows jsdom's). */
function makeStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length(): number {
      return store.size
    },
    clear: (): void => store.clear(),
    getItem: (key: string): string | null => store.get(key) ?? null,
    key: (index: number): string | null => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string): void => void store.delete(key),
    setItem: (key: string, value: string): void => void store.set(key, String(value)),
  }
}

/** The mount alive right now, plus the host's signal setter. */
const mounted: {
  dispose?: () => void
  bump?: (signal: number) => void
} = {}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet(
    new Proxy(
      {},
      {
        get: (_target, name) => ({
          paths: [{ d: `glyph:${String(name)}` }],
          viewBox: '0 0 16 16',
        }),
      },
    ),
  )
  resetChatStoresForTests()
  resetAIModelsCache()
  Object.defineProperty(globalThis, 'localStorage', {
    value: makeStorage(),
    configurable: true,
    writable: true,
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: makeStorage(),
    configurable: true,
    writable: true,
  })
  Element.prototype.scrollIntoView = (): void => {}
})

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  mounted.bump = undefined
  document.body.innerHTML = ''
  resetChatStoresForTests()
  resetAIModelsCache()
  setProvider(createSimpleI18nProvider())
})

describe('ChatPanel modelSelectionSignal', () => {
  it('re-reads the saved settings when the host bumps it', async () => {
    const reads = { count: 0 }
    const http = buildHttpClient(
      [{ chatModel: 'free-model' }, { chatModel: 'retired-model' }],
      reads,
    )
    const container = document.createElement('div')
    document.body.appendChild(container)
    mounted.dispose = render(() => {
      const [signal, setSignal] = createSignal(0)
      mounted.bump = setSignal
      return (
        <ThemeContext.Provider value={buildThemeProvider()}>
          <HttpContext.Provider value={http}>
            <ChatContext.Provider value={buildChatProvider()}>
              <ChatPanel projectId="p-signal" modelSelectionSignal={signal()} />
            </ChatContext.Provider>
          </HttpContext.Provider>
        </ThemeContext.Provider>
      )
    }, container)

    await vi.waitFor(() => expect(container.querySelector('textarea')).not.toBeNull())
    await vi.waitFor(() => expect(reads.count).toBeGreaterThan(0))
    const readsAtMount = reads.count
    expect(container.textContent).not.toContain('is no longer available')

    mounted.bump?.(1)

    await vi.waitFor(() => expect(reads.count).toBeGreaterThan(readsAtMount))
    await vi.waitFor(() =>
      expect(container.textContent).toContain(
        'Your selected model "retired-model" is no longer available.',
      ),
    )
  })
})
