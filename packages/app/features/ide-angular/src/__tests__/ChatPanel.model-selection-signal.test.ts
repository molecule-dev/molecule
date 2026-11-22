// @vitest-environment jsdom
/**
 * `modelSelectionSignal` — a host bump re-reads the project's saved settings.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ChatPanel.model-selection-signal.test.tsx`
 * with the same test name and the same assertions: a host bumps the signal when
 * the saved model changed somewhere else (the provider modal, another member's
 * edit), and the panel then reads the settings again instead of keeping the
 * ones it loaded at mount. Here the re-read answers a model that has left the
 * catalogue, so a working re-read shows the "no longer available" notice.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatProvider } from '@molecule/app-ai-chat'
import { resetChatStoresForTests } from '@molecule/app-angular'
import type { HttpClient } from '@molecule/app-http'
import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  buildChatProvider,
  makeStorage,
  mountPanel,
  PANEL_TEST_TIMEOUT_MS,
  type PanelMount,
  responseOf,
} from './chat-panel-harness.js'

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
  const get: HttpClient['get'] = async (path: string) => {
    if (path.startsWith('/ai/models')) return responseOf({ models: MODELS, defaults: {} })
    if (/^\/projects\/[^/]+$/.test(path)) {
      const settings = settingsReads[Math.min(reads.count, settingsReads.length - 1)]
      reads.count++
      return responseOf({ settings })
    }
    return reject()
  }
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get,
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

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

beforeEach(() => {
  setClassMap(classMap)
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
  mounted?.unmount()
  mounted = null
  document.body.innerHTML = ''
  resetChatStoresForTests()
  vi.restoreAllMocks()
})

describe('ChatPanel modelSelectionSignal', () => {
  it(
    're-reads the saved settings when the host bumps it',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const reads = { count: 0 }
      const http = buildHttpClient(
        [{ chatModel: 'free-model' }, { chatModel: 'retired-model' }],
        reads,
      )
      const chat: ChatProvider = buildChatProvider([])
      mounted = await mountPanel({
        http,
        chat,
        props: { projectId: 'p-signal', modelSelectionSignal: 0 },
      })
      const container = mounted.container
      await vi.waitFor(() => expect(container.querySelector('textarea')).not.toBeNull())
      await vi.waitFor(() => expect(reads.count).toBeGreaterThan(0))
      const readsAtMount = reads.count
      expect(container.textContent).not.toContain('is no longer available')

      mounted.props['modelSelectionSignal'] = 1
      mounted.tick()

      await vi.waitFor(() => expect(reads.count).toBeGreaterThan(readsAtMount))
      await vi.waitFor(() =>
        expect(container.textContent).toContain(
          'Your selected model "retired-model" is no longer available.',
        ),
      )
    },
  )
})
