// @vitest-environment jsdom
/**
 * SYN10 — report affordance glyph visual-quality guard.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/ChatPanel.report-icon.test.tsx`
 * with the same test name and the same assertions: the chat header's "report a
 * bug" button wears the bonded `bug` glyph from `@molecule/app-icons` — a real
 * `<svg><path>`, never the `exclamation-triangle` it used to carry and never an
 * emoji. A NAME-KEYED icon set resolves each glyph to a `<path>` whose `d`
 * encodes the looked-up name, so the assertion bites if anyone reverts it.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { resetChatStoresForTests } from '@molecule/app-svelte'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  buildChatProvider,
  buildRejectingHttpClient,
  makeStorage,
  mountPanel,
  type PanelMount,
} from './chat-panel-harness.js'

/**
 * Polls `predicate` until it stops throwing.
 *
 * @param predicate - The assertion to retry.
 * @param timeout - How long to keep trying, in ms.
 * @returns A promise resolved once the predicate passes.
 */
async function waitFor(predicate: () => void, timeout = 1500): Promise<void> {
  const started = Date.now()
  for (;;) {
    try {
      predicate()
      return
    } catch (error) {
      if (Date.now() - started > timeout) throw error
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
  }
}

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // Name-keyed glyphs: every icon resolves to a path whose `d` names it.
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
  setProvider(createSimpleI18nProvider())
})

describe('ChatPanel report-button glyph (SYN10)', () => {
  it('renders the real bug glyph on the report button, never the warning triangle and never an emoji', async () => {
    mounted = mountPanel({
      http: buildRejectingHttpClient(),
      chat: buildChatProvider([]),
      projectId: 'proj-syn10',
    })
    const container = mounted.container

    await waitFor(() => {
      const el = container.querySelector('[data-mol-id="chat-report-button"]')
      expect(el, 'the report-a-bug button must render in the chat header').not.toBeNull()
    })
    const button = container.querySelector('[data-mol-id="chat-report-button"]') as HTMLElement

    // It is a real SVG glyph, not an emoji string or text node.
    const svg = button.querySelector('svg')
    expect(svg, 'the report button must render an <svg> icon, not an emoji').not.toBeNull()
    expect(button.textContent ?? '', 'no emoji/text glyph beside the SVG').toBe('')

    // The glyph wired is the `bug` icon — not the warning triangle the audit
    // rejected. This assertion bites if anyone reverts the name.
    const d = svg?.querySelector('path')?.getAttribute('d')
    expect(d, 'the report button renders the bonded `bug` glyph').toBe('glyph:bug')
    expect(d).not.toBe('glyph:exclamation-triangle')
  })
})
