// @vitest-environment jsdom
/**
 * `/model` picker — mode dropdown + host "manage your own models" seam.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ChatPanel.model-picker.test.tsx`
 * with the same test names and the same assertions. The picker overlay carries
 * a MODE dropdown (Default / Plan / Execute / Commit messages / Compaction)
 * that re-scopes the OPEN picker in place: a selection then persists to the
 * scoped settings field (`chatModel` / `planModel` / `executeModel` /
 * `commitModel` / `compactModel`) through the same PATCH path the `--plan` etc.
 * flags use — the flags merely preselect the dropdown. A host that passes
 * `onManageCustomModels` gets an "Add or manage your own models…" row at the
 * bottom of the list; hosts that don't stay unaffected.
 *
 * Real Solid mounts of {@link ChatPanel} driven by a controllable HTTP client —
 * the picker opens by typing `/model ` into the real textarea.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import {
  ChatContext,
  HttpContext,
  resetAIModelsCache,
  resetChatStoresForTests,
  ThemeContext,
} from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatPanel } from '../components/ChatPanel.jsx'
import { buildThemeProvider } from './theme-test-provider.js'

/** Per-mode defaults the server sends a free-tier requester. */
const FREE_DEFAULTS = {
  plan: 'free-model',
  execute: 'execute-default',
  commit: 'free-model',
  compact: 'free-model',
}

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
  {
    id: 'pro-model',
    provider: 'anthropic',
    label: 'Pro Model',
    description: 'the paid one',
    contextWindow: 200_000,
    maxOutputTokens: 16_000,
    supportsThinking: false,
    thinkingBudgetTokens: 0,
    thinkingConfigurable: false,
    supportsVision: false,
    supportsPromptCaching: false,
    supportsTools: true,
    inputPricePerMTok: 3,
    outputPricePerMTok: 15,
    cacheReadPricePerMTok: 0,
    cacheWritePricePerMTok: 0,
    knowledgeCutoff: '2025-06-01',
    freeTier: false,
  },
  // A non-free model the SERVER names as the free tier's execute default.
  {
    id: 'execute-default',
    provider: 'vendor',
    label: 'Execute Default',
    description: 'the server-sent execute default',
    contextWindow: 128_000,
    maxOutputTokens: 8_000,
    supportsThinking: false,
    thinkingBudgetTokens: 0,
    thinkingConfigurable: false,
    supportsVision: false,
    supportsPromptCaching: false,
    supportsTools: true,
    inputPricePerMTok: 0.6,
    outputPricePerMTok: 2.2,
    cacheReadPricePerMTok: 0,
    cacheWritePricePerMTok: 0,
    knowledgeCutoff: '2025-03-01',
    freeTier: false,
  },
]

type PatchCall = { path: string; body: unknown }

/**
 * An {@link HttpClient} whose GETs serve the model catalog + empty project
 * settings, whose PATCHes are recorded, and whose other requests reject.
 *
 * @param patchCalls - Sink for recorded PATCH calls.
 * @returns A controllable HTTP client.
 */
function buildHttpClient(patchCalls: PatchCall[]): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  const get = async (path: string): Promise<unknown> => {
    if (path.startsWith('/ai/models')) return { data: { models: MODELS, defaults: FREE_DEFAULTS } }
    if (/^\/projects\/[^/?]+$/.test(path)) return { data: { settings: {} } }
    return reject()
  }
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get: get as HttpClient['get'],
    post: reject,
    put: reject,
    patch: (async (path: string, body: unknown) => {
      patchCalls.push({ path, body })
      return { data: {} }
    }) as HttpClient['patch'],
    delete: reject,
    addRequestInterceptor: () => () => {},
    addResponseInterceptor: () => () => {},
    addErrorInterceptor: () => () => {},
    setAuthToken: () => {},
    getAuthToken: () => null,
    onAuthError: () => () => {},
  }
}

/** A {@link ChatProvider} whose `loadHistory` resolves empty. */
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

/** The mount alive right now. */
const mounted: { dispose?: () => void } = {}

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
  document.body.innerHTML = ''
  resetChatStoresForTests()
  resetAIModelsCache()
  setProvider(createSimpleI18nProvider())
})

/**
 * Mounts {@link ChatPanel} inside the contexts it needs.
 *
 * @param patchCalls - Sink for recorded PATCH calls.
 * @param projectId - Project id (vary per test so each gets a fresh models scope).
 * @param onManageCustomModels - Optional host seam under test.
 * @param isPro - Paid-plan flag (default true; false exercises the free-tier locks).
 * @returns The mount container.
 */
function renderChatPanel(
  patchCalls: PatchCall[],
  projectId: string,
  onManageCustomModels?: () => void,
  isPro = true,
): HTMLElement {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.dispose = render(
    () => (
      <ThemeContext.Provider value={buildThemeProvider()}>
        <HttpContext.Provider value={buildHttpClient(patchCalls)}>
          <ChatContext.Provider value={buildChatProvider()}>
            <ChatPanel
              projectId={projectId}
              isPro={isPro}
              onManageCustomModels={onManageCustomModels}
            />
          </ChatContext.Provider>
        </HttpContext.Provider>
      </ThemeContext.Provider>
    ),
    container,
  )
  return container
}

/**
 * Types into the panel's real textarea.
 *
 * @param container - The mount container.
 * @param value - The composer text to write.
 * @returns The textarea.
 */
function typeIntoComposer(container: HTMLElement, value: string): HTMLTextAreaElement {
  const textarea = container.querySelector('textarea') as HTMLTextAreaElement | null
  if (!textarea) throw new Error('chat textarea not mounted')
  textarea.value = value
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
  return textarea
}

/**
 * Opens the `/model` picker by typing into the panel's real textarea.
 *
 * @param container - The rendered panel container.
 * @returns The mode dropdown element once the picker is open.
 */
async function openModelPicker(container: HTMLElement): Promise<HTMLSelectElement> {
  await vi.waitFor(() => expect(container.querySelector('textarea')).not.toBeNull())
  typeIntoComposer(container, '/model ')
  return (await vi.waitFor(() => {
    const element = container.querySelector('[data-mol-id="chat-model-mode-select"]')
    if (!element) throw new Error('model picker not open')
    return element
  })) as HTMLSelectElement
}

/**
 * The picker row button whose label matches, or null.
 *
 * @param container - The rendered panel container.
 * @param label - The model label to look for.
 * @returns The matching row button.
 */
function modelRow(container: HTMLElement, label: string): HTMLButtonElement | null {
  return (
    Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes(label),
    ) ?? null
  )
}

describe('ChatPanel /model picker — mode dropdown + manage seam', () => {
  it('opens scoped to the LIVE mode, with all five mode options each naming its active model', async () => {
    const container = renderChatPanel([], 'proj-picker-1')
    const modeSelect = await openModelPicker(container)

    // A plain /model targets the mode the user is IN (this conversation never
    // entered plan mode, so it is execute).
    expect(modeSelect.value).toBe('execute')
    const labels = Array.from(modeSelect.options).map((option) => option.textContent ?? '')
    expect(modeSelect.options.length).toBe(5)
    expect(labels[0]).toContain('Default')
    expect(labels[1]).toContain('Plan')
    expect(labels[2]).toContain('Execute')
    expect(labels[3]).toContain('Commit messages')
    expect(labels[4]).toContain('Compaction')
    // Every unset mode NAMES the model it actually resolves to — the
    // server-sent per-mode default — never a vague "Follows default model".
    expect(labels[1]).toContain('Default (Free Model)')
    expect(labels[2]).toContain('Default (Execute Default)')
    expect(labels[3]).toContain('Default (Free Model)')
  })

  it('re-scopes the open picker: a selection persists to the dropdown mode settings key', async () => {
    const patchCalls: PatchCall[] = []
    const container = renderChatPanel(patchCalls, 'proj-picker-2')
    const modeSelect = await openModelPicker(container)

    modeSelect.value = 'commit'
    modeSelect.dispatchEvent(new Event('change', { bubbles: true }))
    const row = await vi.waitFor(() => {
      const element = modelRow(container, 'Pro Model')
      if (!element) throw new Error('model row not rendered')
      return element
    })
    row.click()

    await vi.waitFor(() =>
      expect(
        patchCalls.some(
          (call) =>
            call.path === '/projects/proj-picker-2' &&
            (call.body as { settings?: { commitModel?: string } }).settings?.commitModel ===
              'pro-model',
        ),
      ).toBe(true),
    )
  })

  it('a /model --plan flag preselects the dropdown, and Default scope persists chatModel', async () => {
    const patchCalls: PatchCall[] = []
    const container = renderChatPanel(patchCalls, 'proj-picker-3')
    await vi.waitFor(() => expect(container.querySelector('textarea')).not.toBeNull())

    typeIntoComposer(container, '/model --plan ')
    const modeSelect = (await vi.waitFor(() => {
      const element = container.querySelector('[data-mol-id="chat-model-mode-select"]')
      if (!element) throw new Error('model picker not open')
      return element
    })) as HTMLSelectElement
    expect(modeSelect.value).toBe('plan')

    // Switch back to Default in place — the selection now sets the legacy
    // single chatModel.
    modeSelect.value = ''
    modeSelect.dispatchEvent(new Event('change', { bubbles: true }))
    const row = await vi.waitFor(() => {
      const element = modelRow(container, 'Free Model')
      if (!element) throw new Error('model row not rendered')
      return element
    })
    row.click()

    await vi.waitFor(() =>
      expect(
        patchCalls.some(
          (call) =>
            call.path === '/projects/proj-picker-3' &&
            (call.body as { settings?: { chatModel?: string } }).settings?.chatModel ===
              'free-model',
        ),
      ).toBe(true),
    )
  })

  it("splits the locked pill by reason: another mode's free model is never labeled Pro", async () => {
    const patchCalls: PatchCall[] = []
    const container = renderChatPanel(patchCalls, 'proj-picker-6', undefined, false)
    const modeSelect = await openModelPicker(container)
    modeSelect.value = 'plan'
    modeSelect.dispatchEvent(new Event('change', { bubbles: true }))

    const pillsOf = (label: string): string[] => {
      const row = modelRow(container, label)
      if (!row) throw new Error(`row ${label} not rendered`)
      return Array.from(row.querySelectorAll('span')).map((span) => span.textContent ?? '')
    }
    // The server-sent execute default in the plan scope is a mode mismatch —
    // muted "free in execute", never "Pro".
    await vi.waitFor(() => expect(pillsOf('Execute Default')).toContain('free in execute'))
    expect(pillsOf('Execute Default')).not.toContain('Pro')
    // A genuinely paid model keeps the Pro pill.
    expect(pillsOf('Pro Model')).toContain('Pro')
    // The free-tier model is selectable in plan — no pill of either kind.
    expect(pillsOf('Free Model')).not.toContain('Pro')
    expect(pillsOf('Free Model')).not.toContain('free in execute')

    // Clicking the mode-locked row shows the plain one-liner, NOT the paid
    // upgrade pitch, and never persists a selection.
    modelRow(container, 'Execute Default')?.click()
    await vi.waitFor(() => {
      if (!container.textContent?.includes('used in execute mode')) {
        throw new Error('mode card not shown')
      }
    })
    expect(container.textContent).not.toContain('available on Pro')
    expect(patchCalls).toHaveLength(0)
  })

  it('hides the manage row without the host prop, shows + fires it with the prop', async () => {
    // Without the prop: no row.
    let container = renderChatPanel([], 'proj-picker-4')
    await openModelPicker(container)
    expect(container.querySelector('[data-mol-id="chat-model-manage-custom"]')).toBeNull()

    // With the prop: the action renders as an ANCHORED footer — a sibling
    // AFTER the scrolling list, never a row inside it — and clicking it closes
    // the picker and invokes the callback.
    const onManage = vi.fn()
    container = renderChatPanel([], 'proj-picker-5', onManage)
    await openModelPicker(container)
    const row = container.querySelector(
      '[data-mol-id="chat-model-manage-custom"]',
    ) as HTMLButtonElement
    expect(row).not.toBeNull()
    expect(
      (row.parentElement as HTMLElement).style.overflowY,
      'the footer must sit OUTSIDE the scrollable list',
    ).not.toBe('auto')
    expect(
      (row.previousElementSibling as HTMLElement).style.overflowY,
      'the scrollable model list is the footer’s preceding sibling',
    ).toBe('auto')
    row.click()
    expect(onManage).toHaveBeenCalledTimes(1)
    // The host receives the mode a "Use" in its provider modal should target —
    // the picker's scoped mode (the live conversation mode here).
    expect(onManage).toHaveBeenCalledWith({ mode: 'execute' })
    await vi.waitFor(() =>
      expect(container.querySelector('[data-mol-id="chat-model-mode-select"]')).toBeNull(),
    )
  })
})
