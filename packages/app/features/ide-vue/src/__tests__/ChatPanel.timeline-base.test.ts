// @vitest-environment jsdom
/**
 * The timeline base — the messages container, the empty-conversation hint and
 * the persistent activity slot of the Vue ChatPanel port (`chat:tips`,
 * `chat:timeline` and the "── Messages ──" / "Persistent activity slot"
 * sections).
 *
 * The hint is gated on there being literally nothing else to show, so these
 * cases mount with `hideConversationMenu` (the discovery phase) to suppress the
 * entry tip and reach the empty state, then assert the container's attributes
 * and styles, the reserved activity slot, and the two conditions the hint's own
 * gates name.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { resetChatStoresForTests } from '@molecule/app-vue'

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
 * Waits for one selector to mount and returns it.
 *
 * @param container - The mount container.
 * @param selector - The selector to wait for.
 * @returns The element.
 */
async function waitFor(container: HTMLElement, selector: string): Promise<HTMLElement> {
  return vi.waitFor(() => {
    const el = container.querySelector<HTMLElement>(selector)
    if (!el) throw new Error(`${selector} not mounted`)
    return el
  })
}

/**
 * The messages container.
 *
 * @param container - The mount container.
 * @returns The log port element.
 */
function messagesPort(container: HTMLElement): HTMLElement {
  const el = container.querySelector<HTMLElement>('[role="log"]')
  if (!el) throw new Error('messages container not mounted')
  return el
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
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

describe('ChatPanel timeline base — the messages port and the activity slot', () => {
  it("renders the log port with React's attributes and styles", async () => {
    mounted = mountPanel({
      http: buildRejectingHttpClient(),
      chat: buildChatProvider([]),
      projectId: 'proj-timeline-1',
      // The discovery phase suppresses the onboarding tip, so this run reaches
      // the genuinely empty timeline.
      props: { hideConversationMenu: true },
    })
    const port = await waitFor(mounted.container, '[role="log"]')
    expect(port.getAttribute('aria-live')).toBe('polite')
    expect(port.getAttribute('aria-relevant')).toBe('additions')
    expect(port.getAttribute('aria-label')).toBe('Conversation messages')
    expect(port.classList.contains('p-3')).toBe(true)
    expect(port.style.flex).toBe('1 1 0%')
    expect(port.style.overflowY).toBe('auto')
    expect(port.style.scrollbarWidth).toBe('thin')
    expect(port.style.overflowAnchor).toBe('none')
  })

  it('shows the empty-conversation hint and keeps the activity slot reserved', async () => {
    mounted = mountPanel({
      http: buildRejectingHttpClient(),
      chat: buildChatProvider([]),
      projectId: 'proj-timeline-2',
      props: { hideConversationMenu: true },
    })
    const hint = await waitFor(mounted.container, '[data-mol-id="chat-empty-hint"]')
    expect(hint.textContent).toContain('Describe what you want to build...')
    expect(hint.style.display).toBe('flex')
    expect(hint.style.flexDirection).toBe('column')
    expect(hint.style.alignItems).toBe('center')
    expect(hint.style.justifyContent).toBe('center')
    expect(hint.style.gap).toBe('10px')
    expect(hint.style.height).toBe('calc(100% - 28px)')
    expect(hint.style.minHeight).toBe('120px')
    expect(hint.style.textAlign).toBe('center')
    const icon = hint.querySelector('svg')
    expect(icon?.getAttribute('aria-hidden')).toBe('true')
    expect(icon?.getAttribute('width')).toBe('28')
    expect(icon?.style.opacity).toBe('0.5')

    const slot = await waitFor(mounted.container, '[data-mol-id="chat-activity-slot"]')
    expect(slot.getAttribute('aria-hidden')).toBe('true')
    expect(slot.style.minHeight).toBe('28px')
    expect(slot.style.opacity).toBe('0')
    expect(slot.style.pointerEvents).toBe('none')
    expect(slot.style.transition).toBe('opacity 0.18s ease-out')
    expect(slot.textContent?.trim()).toBe('')

    // The order is React's: hint, activity slot, then the scroll sentinel.
    const port = messagesPort(mounted.container)
    const children = Array.from(port.children)
    expect(children.indexOf(hint)).toBeLessThan(children.indexOf(slot))
    expect(children.indexOf(slot)).toBeLessThan(children.length - 1)
    expect(children[children.length - 1]?.textContent?.trim()).toBe('')
  })

  it('covers the sandbox-boot wait with the activity indicator and hides the hint', async () => {
    mounted = mountPanel({
      http: buildRejectingHttpClient(),
      chat: buildChatProvider([]),
      projectId: 'proj-timeline-3',
      props: { hideConversationMenu: true, awaitingSandboxBoot: true },
    })
    const slot = await waitFor(mounted.container, '[data-mol-id="chat-activity-slot"]')
    expect(slot.getAttribute('aria-hidden')).toBe('false')
    expect(slot.style.opacity).toBe('1')
    expect(slot.style.pointerEvents).toBe('auto')
    expect(slot.textContent).toContain(
      'Waiting for the development environment to finish starting…',
    )
    expect(mounted.container.querySelector('[data-mol-id="chat-empty-hint"]')).toBeNull()
  })
})
