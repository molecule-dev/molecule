// @vitest-environment jsdom
/**
 * Unit P5 of the ChatPanel port: the timeline base — the tips and system-card
 * slices, the timeline derivations, the render handlers, the messages container
 * with the empty hint, the persistent activity slot and the top of the input
 * area.
 *
 * The tests mount the real panel through `chat-panel-harness.ts` and pin the
 * DOM this unit owns: the log port's attributes, class and layout; the entry
 * tip taking the empty hint's place (the hint renders only for a conversation
 * the tips skip); the hint's own text and geometry; the idle activity slot's
 * reserved geometry and the boot-wait label when it lights; the input area's
 * position-relative block; and the host handler registrations the system-card
 * effects make and clear.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { resetChatStoresForTests } from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
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
  settle,
} from './chat-panel-harness.js'

/** The project every test mounts. */
const PROJECT = 'proj-timeline-base'

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

/**
 * Mounts the real panel for this suite.
 *
 * @param props - Extra panel props.
 * @returns The mounted panel.
 */
async function mountChat(props: Record<string, unknown> = {}): Promise<PanelMount> {
  mounted?.unmount()
  mounted = await mountPanel({
    http: buildRejectingHttpClient(),
    chat: buildChatProvider([]),
    projectId: PROJECT,
    props,
  })
  await settle(mounted)
  return mounted
}

/**
 * The messages container (React's log port).
 *
 * @param container - The mounted container.
 * @returns The log port element.
 */
function messagesOf(container: HTMLElement): HTMLDivElement {
  const el = container.querySelector<HTMLDivElement>('[role="log"]')
  if (!el) throw new Error('messages log port not found')
  return el
}

/**
 * The persistent activity slot.
 *
 * @param container - The mounted container.
 * @returns The slot element.
 */
function activitySlotOf(container: HTMLElement): HTMLDivElement {
  const el = container.querySelector<HTMLDivElement>('[data-mol-id="chat-activity-slot"]')
  if (!el) throw new Error('activity slot not found')
  return el
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet(
    new Proxy(
      {},
      {
        get: () => ({ paths: [], viewBox: '0 0 16 16' }),
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
})

afterEach(() => {
  mounted?.unmount()
  mounted = null
})

describe('ChatPanel timeline base (P5)', () => {
  it(
    'renders the transcript log port with its attributes, class and layout',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const mount = await mountChat()
      const messages = messagesOf(mount.container)

      expect(messages.getAttribute('role')).toBe('log')
      expect(messages.getAttribute('aria-live')).toBe('polite')
      expect(messages.getAttribute('aria-relevant')).toBe('additions')
      expect(messages.getAttribute('aria-label')).toBe('Conversation messages')
      expect(messages.className).toBe(classMap.sp('p', 3))

      // React's inline style, as the DOM serializes the style object.
      expect(messages.style.flex).toBe('1 1 0%')
      expect(messages.style.overflowY).toBe('auto')
      expect(messages.style.scrollbarWidth).toBe('thin')
      expect(messages.style.overflowAnchor).toBe('none')
    },
  )

  it(
    'keeps the idle activity slot in the layout with its reserved height',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const mount = await mountChat()
      const slot = activitySlotOf(mount.container)

      // Never mounted/unmounted: reserved geometry, faded out.
      expect(slot.getAttribute('aria-hidden')).toBe('true')
      expect(slot.style.minHeight).toBe('28px')
      expect(slot.style.opacity).toBe('0')
      expect(slot.style.pointerEvents).toBe('none')
      expect(slot.style.transition).toBe('opacity 0.18s ease-out')
      // Idle: no indicator inside.
      expect(slot.textContent?.trim()).toBe('')
    },
  )

  it(
    'shows the empty hint for a conversation whose tips are skipped, above the sentinel',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      // The outer panel reports discovery as `hideConversationMenu`, and
      // discovery skips the onboarding tips, so the transcript is empty — the
      // one state where the hint renders (the entry tip otherwise replaces it).
      const mount = await mountChat({ hideConversationMenu: true })
      const messages = messagesOf(mount.container)
      const hint = messages.querySelector<HTMLDivElement>('[data-mol-id="chat-empty-hint"]')
      expect(hint).not.toBeNull()
      if (!hint) throw new Error('empty hint not found')

      expect(hint.textContent).toContain('Describe what you want to build...')
      expect(hint.classList.contains(classMap.textSize('sm'))).toBe(true)
      expect(hint.classList.contains(classMap.textMuted)).toBe(true)
      expect(hint.style.display).toBe('flex')
      expect(hint.style.flexDirection).toBe('column')
      expect(hint.style.alignItems).toBe('center')
      expect(hint.style.justifyContent).toBe('center')
      expect(hint.style.gap).toBe('10px')
      // Height reserves the always-in-layout activity slot below.
      expect(hint.style.height).toBe('calc(100% - 28px)')
      expect(hint.style.minHeight).toBe('120px')
      expect(hint.style.textAlign).toBe('center')

      // The logo mark at 28px, half faded.
      const icon = hint.querySelector('svg')
      expect(icon).not.toBeNull()
      expect(icon?.getAttribute('width')).toBe('28')
      expect(icon?.getAttribute('height')).toBe('28')
      expect(icon?.getAttribute('aria-hidden')).toBe('true')
      expect(icon?.style.opacity).toBe('0.5')

      // React's order: the hint, then the scroll sentinel as the last child.
      const children = Array.from(messages.children)
      expect(children[0]).toBe(hint)
      expect(children[children.length - 1]?.textContent?.trim()).toBe('')
      expect(children[children.length - 1]).not.toBe(hint)
    },
  )

  it(
    'lets the entry tip take the empty hint out of the transcript',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      // A fresh conversation gets the onboarding tip, so `timeline.length` is 1
      // and the hint must not render (the tips slice owns that card).
      const mount = await mountChat()
      expect(mount.container.querySelector('[data-mol-id="chat-empty-hint"]')).toBeNull()
    },
  )

  it(
    'lights the activity slot with the sandbox-boot copy while the environment starts',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const mount = await mountChat({ hideConversationMenu: true, awaitingSandboxBoot: true })
      const slot = activitySlotOf(mount.container)

      expect(slot.getAttribute('aria-hidden')).toBe('false')
      expect(slot.style.opacity).toBe('1')
      expect(slot.style.pointerEvents).toBe('auto')
      expect(slot.style.minHeight).toBe('28px')
      expect(slot.textContent).toContain(
        'Waiting for the development environment to finish starting…',
      )
      // The boot wait alone is not a streaming turn: no token or elapsed count.
      expect(slot.textContent).not.toContain('tokens')
    },
  )

  it(
    'wraps every composer-anchored surface in the position-relative input area',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const mount = await mountChat()
      // The header is also a `shrink-0` row; the input area is the one that is
      // position-relative and holds the composer.
      const block = Array.from(
        mount.container.querySelectorAll<HTMLDivElement>('div.shrink-0'),
      ).find((el) => el.className === classMap.shrink0)
      expect(block).toBeDefined()
      if (!block) throw new Error('input area not found')

      expect(block.className).toBe(classMap.shrink0)
      expect(block.style.position).toBe('relative')
      // It holds the composer-anchored surfaces, as React's block does: the
      // hidden file input for the attachment button and the composer itself.
      expect(block.querySelector('input[type="file"]')).not.toBeNull()
      expect(block.querySelector('[data-mol-id="chat-composer"]')).not.toBeNull()
      // Nothing to report on a clean mount: no skill suggestion and no error or
      // dictation notice comes before the attachment chips.
      expect(block.firstElementChild?.hasAttribute('mol-chat-attachment-chips')).toBe(true)
    },
  )

  it(
    'registers the push handler and the history reconcile with the host, and clears them',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const push = vi.fn()
      const reconcile = vi.fn()
      const mount = await mountChat({
        onRegisterPushHandler: push,
        onRegisterHistoryReconcile: reconcile,
      })

      expect(push).toHaveBeenCalledTimes(1)
      expect(typeof push.mock.calls[0][0]).toBe('function')
      expect(reconcile).toHaveBeenCalledTimes(1)
      expect(typeof reconcile.mock.calls[0][0]).toBe('function')

      mount.unmount()
      mounted = null
      expect(push).toHaveBeenLastCalledWith(null)
      expect(reconcile).toHaveBeenLastCalledWith(null)
    },
  )
})
