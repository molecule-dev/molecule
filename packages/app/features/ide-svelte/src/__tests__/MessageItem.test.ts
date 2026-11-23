// @vitest-environment jsdom

/**
 * `MessageItem`'s user rows rendered for real: a real user message, an
 * auto-sent message, a team note, a dictated message, the clickable author
 * name, the header time, the timeline rhythm and the attachment chips.
 *
 * Svelte port of `@molecule/app-ide-react`'s `MessageItem` behaviour asserted
 * through `ChatPanel` in `ChatPanel.automatic-message.test.tsx` /
 * `ChatPanel.user-avatar.test.tsx` / `ChatPanel.dictated-message.test.tsx`,
 * mounted on the part itself (the Svelte ChatPanel does not carry the timeline
 * dispatch yet — unit U4 — so the same render contract is asserted at the
 * component boundary here). Assistant replies are unit U2 and are not covered.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatMessage } from '@molecule/app-ai-chat'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { TIMELINE_ITEM_GAP, TIMELINE_ITEM_GAP_DISCOVERY } from '@molecule/app-ide-panel-logic'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import MessageItem from '../parts/MessageItem.svelte'
import type { MessageItemProps } from '../types.js'

/** The mount this file last created, torn down after each test. */
let mounted: Record<string, unknown> | undefined

/**
 * Builds a chat message with the given overrides.
 *
 * @param overrides - Fields to replace on the base user message.
 * @returns The message.
 */
function message(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return { id: 'm1', role: 'user', content: 'Hello there', timestamp: 1000, ...overrides }
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // Any glyph resolves to a defined entry, so Icon renders an empty <svg>.
  setIconSet(new Proxy({}, { get: () => ({ paths: [], viewBox: '0 0 16 16' }) }))
})

afterEach(async () => {
  if (mounted) await unmount(mounted)
  mounted = undefined
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

/**
 * Mounts the message row with the given props.
 *
 * @param props - The MessageItem props to render with.
 * @returns The host element the row mounted into.
 */
function renderMessage(props: Partial<MessageItemProps> & { msg: ChatMessage }): HTMLElement {
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted = mount(MessageItem, { target: host, props: { isLight: false, ...props } })
  flushSync()
  return host
}

/**
 * A class list as a set of tokens, so class ORDER never affects a comparison.
 *
 * @param value - A space-separated class list.
 * @returns Its tokens.
 */
function tokens(value: string | null | undefined): Set<string> {
  return new Set((value ?? '').split(/\s+/).filter(Boolean))
}

/**
 * The set of class tokens on an element, order-insensitive.
 *
 * @param element - The element to read.
 * @returns Its class tokens.
 */
function classTokens(element: Element | null): Set<string> {
  return tokens(element?.getAttribute('class'))
}

describe('MessageItem — user rows', () => {
  it('renders a real user message with the user avatar and the name header', () => {
    const host = renderMessage({ msg: message({ content: 'Build me a todo app' }) })
    const row = host.querySelector('[data-mol-id="chat-user-message"]')
    expect(row, 'a user message row should render').not.toBeNull()
    expect(row!.querySelector('[data-mol-id="chat-user-avatar"]')).not.toBeNull()
    expect(row?.textContent).toContain('Build me a todo app')
    expect(row?.textContent).toContain('You')
    const cm = getClassMap()
    expect(classTokens(row)).toEqual(tokens(cm.cn(cm.surfaceSecondary, cm.textSize('sm'))))
  })

  it('renders an auto-sent message as a success card with the sync glyph and no header', () => {
    const host = renderMessage({
      msg: message({ content: 'Fix these issues', automatic: true }),
    })
    const card = host.querySelector('[data-mol-id="chat-automatic-message"]')
    expect(card, 'an auto-sent card should render').not.toBeNull()
    expect(card?.querySelector('[data-mol-id="chat-user-avatar"]')).toBeNull()
    expect(card!.querySelector('svg'), 'the sync glyph should render').not.toBeNull()
    expect(card?.textContent).not.toContain('You')
    const cm = getClassMap()
    expect(classTokens(card)).toEqual(tokens(cm.textSize('xs')))
  })

  it('renders a team note with the gold team-only badge', () => {
    const host = renderMessage({
      msg: message({
        role: 'system',
        teamOnly: true,
        author: { id: 'u2', name: 'Mara' },
      }),
      agentName: 'Synthase',
    })
    const row = host.querySelector('[data-mol-id="chat-team-message"]')
    expect(row, 'a team note should render').not.toBeNull()
    expect(row?.textContent).toContain('Mara')
    expect(
      row?.querySelector('[data-mol-id="chat-team-only-badge"]')?.getAttribute('aria-label'),
    ).toBe('Team only — visible to your team; Synthase will ignore it')
  })

  it('marks a dictated user message with the mic badge', () => {
    const host = renderMessage({ msg: message({ viaDictation: true }) })
    expect(host.querySelector('[data-mol-id="chat-dictated-badge"]')).not.toBeNull()
  })

  it('shows the timestamp only when the timeline plan says so', () => {
    const hidden = renderMessage({ msg: message() })
    expect(hidden.querySelector('[data-mol-id="chat-timestamp"]')).toBeNull()
    const shown = renderMessage({ msg: message(), showTimestamp: true })
    expect(shown.querySelector('[data-mol-id="chat-timestamp"]')).not.toBeNull()
  })

  it('separates discovery rows more than timeline rows', () => {
    const normal = renderMessage({ msg: message() })
    expect((normal.firstElementChild as HTMLElement).style.marginBottom).toBe(
      `${TIMELINE_ITEM_GAP}px`,
    )
    const discovery = renderMessage({ msg: message(), discovery: true })
    expect((discovery.firstElementChild as HTMLElement).style.marginBottom).toBe(
      `${TIMELINE_ITEM_GAP_DISCOVERY}px`,
    )
  })

  it('lists each attachment with its formatted size', () => {
    const host = renderMessage({
      msg: message({
        attachments: [{ filename: 'notes.txt', mediaType: 'text/plain', size: 2048 }],
      }),
    })
    expect(host.textContent).toContain('notes.txt')
    expect(host.textContent).toContain('(2KB)')
    // The glyph, one space, the name and the parenthesised size, as React lays
    // them out inside the chip.
    expect(host.textContent).toContain('📄 notes.txt(2KB)')
  })
})

describe('MessageItem — the author name button', () => {
  it('opens the clicked author profile with that author identity', () => {
    const onProfileClick = vi.fn()
    const host = renderMessage({
      msg: message({ author: { id: 'u2', name: 'Mara' } }),
      onProfileClick,
    })
    const button = host.querySelector('[data-mol-id="chat-user-name-button"]')
    expect(button, 'the author name should be a button').not.toBeNull()
    expect(button?.textContent).toBe('Mara')
    ;(button as HTMLElement).click()
    expect(onProfileClick).toHaveBeenCalledWith({ id: 'u2', name: 'Mara', avatar: null })
  })

  it('underlines the author name on hover and on focus', () => {
    const host = renderMessage({
      msg: message({ author: { id: 'u2', name: 'Mara' } }),
      onProfileClick: vi.fn(),
    })
    const button = host.querySelector('[data-mol-id="chat-user-name-button"]') as HTMLElement
    expect(button.style.textDecoration).toBe('none')
    button.dispatchEvent(new MouseEvent('mouseenter'))
    flushSync()
    expect(button.style.textDecoration).toBe('underline')
    button.dispatchEvent(new MouseEvent('mouseleave'))
    flushSync()
    expect(button.style.textDecoration).toBe('none')
    button.focus()
    flushSync()
    expect(button.style.textDecoration).toBe('underline')
    button.blur()
    flushSync()
    expect(button.style.textDecoration).toBe('none')
  })

  it('renders a deleted author name as plain text', () => {
    const onProfileClick = vi.fn()
    const host = renderMessage({
      msg: message({ author: { name: 'Gone' } }),
      onProfileClick,
    })
    expect(host.querySelector('[data-mol-id="chat-user-name-button"]')).toBeNull()
    expect(host.textContent).toContain('Gone')
  })
})
