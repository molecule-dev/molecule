// @vitest-environment jsdom
/**
 * `/model` picker — mode dropdown + host "manage your own models" seam.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/ChatPanel.model-picker.test.tsx`
 * with the same test names and the same assertions: the picker overlay carries
 * a MODE dropdown (Default / Plan / Execute / Commit messages / Compaction)
 * that re-scopes the OPEN picker in place, and a selection persists to the
 * scoped settings field through the same PATCH path the `--plan` etc. flags
 * use. A host that passes `onManageCustomModels` gets an "Add or manage your
 * own models…" row ANCHORED below the scrolling list; hosts that don't stay
 * unaffected.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
  // A non-free model the SERVER names as the free tier's execute default — the
  // client must learn that from the server, never from the model's id.
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

/** One recorded PATCH call. */
type PatchCall = { path: string; body: unknown }

/**
 * A typed HTTP success envelope.
 *
 * @param data - The response payload.
 * @returns The envelope.
 */
const ok = responseOf

/**
 * An {@link HttpClient} whose GETs serve the model catalog + empty project
 * settings, whose PATCHes are recorded, and whose other requests reject.
 *
 * @param patchCalls - Sink for recorded PATCH calls.
 * @returns A controllable HTTP client.
 */
function buildHttpClient(patchCalls: PatchCall[]): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  const get = async (path: string): Promise<HttpResponse<never>> => {
    if (path.startsWith('/ai/models')) return ok({ models: MODELS, defaults: FREE_DEFAULTS })
    if (/^\/projects\/[^/]+$/.test(path)) return ok({ settings: {} })
    return reject()
  }
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get,
    post: reject,
    put: reject,
    patch: async (path: string, body: unknown): Promise<HttpResponse<never>> => {
      patchCalls.push({ path, body })
      return ok({})
    },
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

/**
 * Mounts the panel inside every service it needs.
 *
 * @param patchCalls - Sink for recorded PATCH calls.
 * @param projectId - Project id (vary per test so each gets a fresh models scope).
 * @param onManageCustomModels - Optional host seam under test.
 * @param isPro - Paid-plan flag (default true; false exercises the free-tier locks).
 * @returns The mount container.
 */
function mountChatPanel(
  patchCalls: PatchCall[],
  projectId: string,
  onManageCustomModels?: (context?: { mode?: 'plan' | 'execute' }) => void,
  isPro = true,
): HTMLElement {
  mounted?.unmount()
  mounted = mountPanel({
    http: buildHttpClient(patchCalls),
    chat: buildChatProvider([]),
    projectId,
    props: { isPro, onManageCustomModels },
  })
  return mounted.container
}

/**
 * Sets a textarea's value the way a keystroke does.
 *
 * @param textarea - The mounted textarea.
 * @param value - The value to write.
 */
function typeInto(textarea: HTMLTextAreaElement, value: string): void {
  textarea.value = value
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
}

/**
 * Opens the `/model` picker by typing into the panel's real textarea.
 *
 * @param container - The rendered panel container.
 * @returns The mode dropdown element once the picker is open.
 */
async function openModelPicker(container: HTMLElement): Promise<HTMLSelectElement> {
  let textarea: HTMLTextAreaElement | null = null
  await waitFor(() => {
    const el = container.querySelector('textarea')
    if (!el) throw new Error('chat textarea not mounted')
    textarea = el as HTMLTextAreaElement
  })
  typeInto(textarea!, '/model ')
  let select: HTMLSelectElement | null = null
  await waitFor(() => {
    const el = container.querySelector('[data-mol-id="chat-model-mode-select"]')
    if (!el) throw new Error('model picker not open')
    select = el as HTMLSelectElement
  })
  return select!
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

describe('ChatPanel /model picker — mode dropdown + manage seam', () => {
  it('opens scoped to the LIVE mode, with all five mode options each naming its active model', async () => {
    const container = mountChatPanel([], 'proj-picker-1')
    const modeSelect = await openModelPicker(container)

    // A plain /model targets the mode the user is IN (this conversation never
    // entered plan mode, so it is execute) — a pick moves that mode's model,
    // not the legacy both-modes chatModel. Default stays selectable below.
    expect(modeSelect.value).toBe('execute')
    const labels = Array.from(modeSelect.options).map((option) => option.textContent ?? '')
    expect(modeSelect.options.length).toBe(5)
    expect(labels[0]).toContain('Default')
    expect(labels[1]).toContain('Plan')
    expect(labels[2]).toContain('Execute')
    expect(labels[3]).toContain('Commit messages')
    expect(labels[4]).toContain('Compaction')
    // Every unset mode NAMES the model it actually resolves to — the
    // server-sent per-mode default, never a vague "Follows default model".
    expect(labels[1]).toContain('Default (Free Model)')
    expect(labels[2]).toContain('Default (Execute Default)')
    expect(labels[3]).toContain('Default (Free Model)')
  })

  it('re-scopes the open picker: a selection persists to the dropdown mode settings key', async () => {
    const patchCalls: PatchCall[] = []
    const container = mountChatPanel(patchCalls, 'proj-picker-2')
    const modeSelect = await openModelPicker(container)

    modeSelect.value = 'commit'
    modeSelect.dispatchEvent(new Event('change', { bubbles: true }))
    let row: HTMLButtonElement | null = null
    await waitFor(() => {
      const el = modelRow(container, 'Pro Model')
      if (!el) throw new Error('model row not rendered')
      row = el
    })
    row!.click()

    await waitFor(() =>
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
    const container = mountChatPanel(patchCalls, 'proj-picker-3')
    let textarea: HTMLTextAreaElement | null = null
    await waitFor(() => {
      const el = container.querySelector('textarea')
      if (!el) throw new Error('chat textarea not mounted')
      textarea = el as HTMLTextAreaElement
    })

    typeInto(textarea!, '/model --plan ')
    let modeSelect: HTMLSelectElement | null = null
    await waitFor(() => {
      const el = container.querySelector('[data-mol-id="chat-model-mode-select"]')
      if (!el) throw new Error('model picker not open')
      modeSelect = el as HTMLSelectElement
    })
    expect(modeSelect!.value).toBe('plan')

    // Switch back to Default in place — the selection now sets the legacy
    // single chatModel.
    modeSelect!.value = ''
    modeSelect!.dispatchEvent(new Event('change', { bubbles: true }))
    let row: HTMLButtonElement | null = null
    await waitFor(() => {
      const el = modelRow(container, 'Free Model')
      if (!el) throw new Error('model row not rendered')
      row = el
    })
    row!.click()

    await waitFor(() =>
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
    const container = mountChatPanel(patchCalls, 'proj-picker-6', undefined, false)
    const modeSelect = await openModelPicker(container)
    modeSelect.value = 'plan'
    modeSelect.dispatchEvent(new Event('change', { bubbles: true }))

    /**
     * The text of every span inside a model row.
     *
     * @param label - The model label to locate.
     * @returns The row's span texts.
     */
    const pillsOf = (label: string): string[] => {
      const row = modelRow(container, label)
      if (!row) throw new Error(`row ${label} not rendered`)
      return Array.from(row.querySelectorAll('span')).map((span) => span.textContent ?? '')
    }
    // The server-sent execute default in the plan scope is a mode mismatch —
    // muted "free in execute", never "Pro".
    await waitFor(() => expect(pillsOf('Execute Default')).toContain('free in execute'))
    expect(pillsOf('Execute Default')).not.toContain('Pro')
    // A genuinely paid model keeps the Pro pill.
    expect(pillsOf('Pro Model')).toContain('Pro')
    // The free-tier model is selectable in plan — no pill of either kind.
    expect(pillsOf('Free Model')).not.toContain('Pro')
    expect(pillsOf('Free Model')).not.toContain('free in execute')

    // Clicking the mode-locked row shows the plain one-liner, NOT the paid
    // upgrade pitch, and never persists a selection.
    modelRow(container, 'Execute Default')?.click()
    await waitFor(() => {
      if (!container.textContent?.includes('used in execute mode')) {
        throw new Error('mode card not shown')
      }
    })
    expect(container.textContent).not.toContain('available on Pro')
    expect(patchCalls).toHaveLength(0)
  })

  it('hides the manage row without the host prop, shows + fires it with the prop', async () => {
    // Without the prop: no row.
    let container = mountChatPanel([], 'proj-picker-4')
    await openModelPicker(container)
    expect(container.querySelector('[data-mol-id="chat-model-manage-custom"]')).toBeNull()
    mounted?.unmount()
    mounted = null
    document.body.innerHTML = ''
    resetChatStoresForTests()

    // With the prop: the action renders as an ANCHORED footer — a sibling
    // AFTER the scrolling list, never a row inside it — and clicking it closes
    // the picker and invokes the callback.
    const onManage = vi.fn<(context?: { mode?: 'plan' | 'execute' }) => void>()
    container = mountChatPanel([], 'proj-picker-5', onManage)
    await openModelPicker(container)
    let row: HTMLButtonElement | null = null
    await waitFor(() => {
      const el = container.querySelector('[data-mol-id="chat-model-manage-custom"]')
      if (!el) throw new Error('manage row not rendered')
      row = el as HTMLButtonElement
    })
    expect(row).not.toBeNull()
    await waitFor(() =>
      expect(
        (row!.previousElementSibling as HTMLElement).style.overflowY,
        'the scrollable model list is the footer’s preceding sibling',
      ).toBe('auto'),
    )
    expect(
      (row!.parentElement as HTMLElement).style.overflowY,
      'the footer must sit OUTSIDE the scrollable list',
    ).not.toBe('auto')
    row!.click()
    expect(onManage).toHaveBeenCalledTimes(1)
    // The host receives the mode a "Use" in its provider modal should target —
    // the picker's scoped mode (the live conversation mode here).
    expect(onManage).toHaveBeenCalledWith({ mode: 'execute' })
    await waitFor(() =>
      expect(container.querySelector('[data-mol-id="chat-model-mode-select"]')).toBeNull(),
    )
  })
})
