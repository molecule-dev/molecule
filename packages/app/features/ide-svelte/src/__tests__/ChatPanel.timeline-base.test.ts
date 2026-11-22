// @vitest-environment jsdom

/**
 * ChatPanel unit P5 (timeline base) — the messages container, the
 * empty-conversation hint, the persistent activity slot and the top of the
 * input area, mounted through the shared panel harness against the real
 * components.
 *
 * The entry-tip card itself renders in the per-item timeline dispatch (unit
 * U4), so these cases drive the panels that make the conditions observable:
 * `hideConversationMenu` (forwarded as `discovery`) suppresses the onboarding
 * tips, which lets an empty conversation show the hint.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

/**
 * Reads one required element, failing the case (or retrying, inside
 * `vi.waitFor`) when it is absent.
 *
 * @param container - The tree to search.
 * @param selector - The CSS selector.
 * @returns The element.
 */
function query<T extends Element>(container: ParentNode, selector: string): T {
  const element = container.querySelector<T>(selector)
  if (!element) throw new Error(`missing ${selector}`)
  return element
}

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [], viewBox: '0 0 16 16' }) }))
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
  setProvider(createSimpleI18nProvider('en'))
  vi.restoreAllMocks()
})

/**
 * Mounts the real panel on a fresh conversation with `hideConversationMenu` on
 * (React's `discovery`), so no onboarding tip is queued and an empty timeline
 * stays empty.
 *
 * @param props - Extra panel props the case varies.
 * @returns The mount.
 */
function renderEmptyPanel(props: Record<string, unknown> = {}): PanelMount {
  mounted?.unmount()
  mounted = mountPanel({
    http: buildRejectingHttpClient(),
    chat: buildChatProvider([]),
    projectId: 'proj-p5',
    props: { ...props, hideConversationMenu: true } as never,
  })
  return mounted
}

describe('ChatPanel timeline base (P5)', () => {
  it('renders the transcript as a polite live log with the scroll styles', () => {
    const { container } = renderEmptyPanel()

    const log = query<HTMLElement>(container, '[role="log"]')
    expect(log.getAttribute('aria-live')).toBe('polite')
    expect(log.getAttribute('aria-relevant')).toBe('additions')
    expect(log.getAttribute('aria-label')).toBe('Conversation messages')
    expect(log.style.flex).toBe('1 1 0%')
    expect(log.style.overflowY).toBe('auto')
    expect(log.style.scrollbarWidth).toBe('thin')
    expect(log.style.overflowAnchor).toBe('none')
  })

  it('shows the empty-state hint above the activity slot and the sentinel', async () => {
    const { container } = renderEmptyPanel()

    const hint = await vi.waitFor(() =>
      query<HTMLElement>(container, '[data-mol-id="chat-empty-hint"]'),
    )
    expect(hint.textContent).toContain('Describe what you want to build...')
    expect(hint.style.height).toBe('calc(100% - 28px)')
    expect(hint.style.minHeight).toBe('120px')
    expect(hint.querySelector('svg'), 'the hint carries the logo mark').not.toBeNull()

    const slot = query<HTMLElement>(container, '[data-mol-id="chat-activity-slot"]')
    expect(slot.getAttribute('aria-hidden')).toBe('true')
    expect(slot.style.minHeight).toBe('28px')
    expect(
      (hint.compareDocumentPosition(slot) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
      'the activity slot follows the hint',
    ).toBe(true)

    // The sentinel is the log's last element child.
    const log = query<HTMLElement>(container, '[role="log"]')
    expect(log.lastElementChild?.textContent).toBe('')
    expect(log.lastElementChild?.hasAttribute('data-mol-id')).toBe(false)
  })

  it('a sandbox-boot wait hides the hint and shows the boot copy', () => {
    const { container } = renderEmptyPanel({ awaitingSandboxBoot: true })

    const slot = query<HTMLElement>(container, '[data-mol-id="chat-activity-slot"]')
    expect(slot.getAttribute('aria-hidden')).toBe('false')
    expect(slot.style.opacity).toBe('1')
    expect(slot.style.pointerEvents).toBe('auto')
    expect(slot.textContent).toContain(
      'Waiting for the development environment to finish starting…',
    )
    expect(
      container.querySelector('[data-mol-id="chat-empty-hint"]'),
      'the boot wait and the hint never coexist',
    ).toBeNull()
  })

  it('wraps the composer in the position-relative input block', () => {
    const { container } = renderEmptyPanel()

    const composer = query<HTMLElement>(container, '[data-mol-id="chat-composer"]')
    expect(composer.style.padding).toBe('8px 10px')
    // The input area's position-relative block is one of the composer's ancestors.
    let block: HTMLElement | null = composer.parentElement
    while (block && block.style.position !== 'relative') block = block.parentElement
    expect(block, 'the input area is the position-relative block').not.toBeNull()
    expect(block?.classList.contains('shrink-0'), 'the block does not shrink').toBe(true)
  })
})
