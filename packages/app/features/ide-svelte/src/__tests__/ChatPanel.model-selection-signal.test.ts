// @vitest-environment jsdom
/**
 * `modelSelectionSignal` — a host bump re-reads the project's saved settings.
 *
 * A port of
 * `@molecule/app-ide-react/src/__tests__/ChatPanel.model-selection-signal.test.tsx`
 * with the same test name and the same assertions: a host bumps the prop when
 * the saved model changed somewhere else (the provider modal, another member's
 * edit), and the panel then reads the settings again instead of keeping the
 * ones it loaded at mount. Here the re-read answers a model that has left the
 * catalogue, so a working re-read shows the "no longer available" notice.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { resetAIModelsCache } from '@molecule/app-svelte/ai-models'
import { resetChatStoresForTests } from '@molecule/app-svelte/chat'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  buildChatProvider,
  flush,
  makeStorage,
  mountPanel,
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
 * A typed HTTP success envelope.
 *
 * @param data - The response payload.
 * @returns The envelope.
 */
const ok = responseOf

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
  const get = async (path: string): Promise<HttpResponse<never>> => {
    if (path.startsWith('/ai/models')) return ok({ models: MODELS, defaults: {} })
    if (/^\/projects\/[^/]+$/.test(path)) {
      const settings = settingsReads[Math.min(reads.count, settingsReads.length - 1)]
      reads.count++
      return ok({ settings })
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

/**
 * Polls `predicate` until it stops throwing.
 *
 * @param predicate - The assertion to retry.
 * @param timeout - How long to keep trying, in ms.
 * @returns A promise resolved once the predicate passes.
 */
async function waitFor(predicate: () => void, timeout = 3000): Promise<void> {
  const started = Date.now()
  for (;;) {
    try {
      predicate()
      return
    } catch (error) {
      if (Date.now() - started > timeout) throw error
      await new Promise((resolve) => setTimeout(resolve, 10))
      await flush()
    }
  }
}

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

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
  mounted?.unmount()
  mounted = null
  document.body.innerHTML = ''
  resetChatStoresForTests()
  setProvider(createSimpleI18nProvider())
})

describe('ChatPanel modelSelectionSignal', () => {
  it('re-reads the saved settings when the host bumps it', async () => {
    const reads = { count: 0 }
    const http = buildHttpClient(
      [{ chatModel: 'free-model' }, { chatModel: 'retired-model' }],
      reads,
    )
    mounted = mountPanel({
      http,
      chat: buildChatProvider([]),
      projectId: 'p-signal',
      props: { modelSelectionSignal: 0 },
    })
    const container = mounted.container

    await waitFor(() => expect(container.querySelector('textarea')).not.toBeNull())
    await waitFor(() => expect(reads.count).toBeGreaterThan(0))
    const readsAtMount = reads.count
    expect(container.textContent).not.toContain('is no longer available')

    mounted.setProps({ modelSelectionSignal: 1 })
    await flush()

    await waitFor(() => expect(reads.count).toBeGreaterThan(readsAtMount))
    await waitFor(() =>
      expect(container.textContent).toContain(
        'Your selected model "retired-model" is no longer available.',
      ),
    )
  })
})
