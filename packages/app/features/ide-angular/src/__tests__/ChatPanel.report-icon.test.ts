// @vitest-environment jsdom
/**
 * SYN10 — report affordance glyph visual-quality guard.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ChatPanel.report-icon.test.tsx`
 * with the same test name and the same assertions: the chat header's
 * "report a bug" button wears the real `bug` glyph from the bonded
 * `@molecule/app-icons` SVG icon set — never the warning triangle the MVP
 * intent audit rejected, and never an emoji. A name-keyed icon set resolves
 * each glyph to an `<svg><path>` whose `d` uniquely encodes the looked-up
 * name, so the assertion bites if the name is reverted or the SVG is swapped
 * for an emoji string.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { resetChatStoresForTests } from '@molecule/app-angular'
import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  buildChatProvider,
  buildRejectingHttpClient,
  makeStorage,
  mountPanel,
  PANEL_TEST_TIMEOUT_MS,
  type PanelMount,
} from './chat-panel-harness.js'

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

beforeEach(() => {
  setClassMap(classMap)
  // A name-keyed icon set: every glyph resolves to a real <svg><path> whose `d`
  // uniquely encodes the looked-up name, so the test can assert the report
  // button renders the `bug` glyph (never `exclamation-triangle`, never emoji).
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
})

describe('ChatPanel report-button glyph (SYN10)', () => {
  it(
    'renders the real bug glyph on the report button, never the warning triangle and never an emoji',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      mounted = await mountPanel({
        http: buildRejectingHttpClient(),
        chat: buildChatProvider([]),
        props: { projectId: 'proj-syn10' },
      })
      const container = mounted.container

      const button = await vi.waitFor(() => {
        const el = container.querySelector('[data-mol-id="chat-report-button"]')
        expect(el, 'the report-a-bug button must render in the chat header').not.toBeNull()
        return el as HTMLElement
      })

      // It is a real SVG glyph, not an emoji string or text node.
      const svg = button.querySelector('svg')
      expect(svg, 'the report button must render an <svg> icon, not an emoji').not.toBeNull()
      expect(button.textContent ?? '', 'no emoji/text glyph beside the SVG').toBe('')

      // The glyph wired is the `bug` icon — not the warning triangle the audit
      // rejected. This assertion bites if anyone reverts the name.
      const d = svg?.querySelector('path')?.getAttribute('d')
      expect(d, 'the report button renders the bonded `bug` glyph').toBe('glyph:bug')
      expect(d).not.toBe('glyph:exclamation-triangle')
    },
  )
})
