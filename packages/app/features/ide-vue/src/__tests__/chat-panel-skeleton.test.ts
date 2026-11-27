// @vitest-environment jsdom
/**
 * The skeleton's DOM: the outer panel's root, the conversation-selector header
 * above the inner chat, and the inner chat's own root — all real (React's
 * classes and inline style).
 *
 * This pins the container nodes the later units build inside, so a change to
 * either root is caught before the behaviour that fills them arrives.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ChatMessage } from '@molecule/app-ai-chat'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { resetChatStoresForTests } from '@molecule/app-vue/chat'

import {
  buildChatProvider,
  buildRejectingHttpClient,
  makeStorage,
  mountPanel,
  type PanelMount,
} from './chat-panel-harness.js'

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
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

describe('chat panel skeleton', () => {
  it('renders the outer root with the panel classes, the header and the inner chat', () => {
    mounted = mountPanel({
      http: buildRejectingHttpClient(),
      chat: buildChatProvider([] as ChatMessage[]),
    })
    const cm = getClassMap()

    const root = mounted.container.firstElementChild as HTMLElement | null
    expect(root).not.toBeNull()
    const classes = (root as HTMLElement).className.split(/\s+/)
    expect(classes).toEqual(expect.arrayContaining(cm.surface.split(/\s+/)))
    expect(classes).toEqual(expect.arrayContaining(cm.borderR.split(/\s+/)))
    expect(classes).toEqual(expect.arrayContaining(cm.flex({ direction: 'col' }).split(/\s+/)))
    expect(classes).toEqual(expect.arrayContaining(cm.h('full').split(/\s+/)))

    // The header sits above the inner chat, which stays the last child.
    expect((root as HTMLElement).children).toHaveLength(2)
    const header = (root as HTMLElement).firstElementChild as HTMLElement
    expect(
      header.querySelector('[data-mol-id="chat-conversation-toggle"]'),
      'the conversation-selector header renders',
    ).not.toBeNull()
    // What the inner chat renders grows unit by unit (the composer since P4), so only its root
    // element is checked here.
    const inner = (root as HTMLElement).lastElementChild as HTMLElement
    expect(inner.tagName).toBe('DIV')
  })

  it('gives the inner chat root React’s inline container style', () => {
    mounted = mountPanel({
      http: buildRejectingHttpClient(),
      chat: buildChatProvider([] as ChatMessage[]),
    })
    const inner = mounted.container.firstElementChild?.lastElementChild as HTMLElement

    expect(inner.style.display).toBe('flex')
    expect(inner.style.flexDirection).toBe('column')
    expect(inner.style.overflow).toBe('hidden')
    expect(inner.style.position).toBe('relative')
    // React writes the numeric 0 / 1 values; Vue's DOM writes the same declaration.
    expect(inner.style.minHeight).toBe('0px')
    expect(inner.style.flexGrow).toBe('1')
  })
})
