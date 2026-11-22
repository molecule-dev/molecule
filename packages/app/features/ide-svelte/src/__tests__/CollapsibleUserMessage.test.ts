// @vitest-environment jsdom

/**
 * A long user message is clipped behind a full-width chevron strip. The chevron
 * is the strip's only content, so the button names itself with `aria-label` and
 * reports its state with `aria-expanded`; without them a screen reader announced
 * a bare "button".
 *
 * Svelte port of `@molecule/app-ide-react/src/__tests__/CollapsibleUserMessage.test.tsx`
 * with the same test names and the same assertions, rendered through the exported
 * `MessageItem` part (the strip itself is private to it).
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { getByRole, queryByRole } from '@testing-library/dom'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatMessage } from '@molecule/app-ai-chat'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { USER_MSG_COLLAPSE_HEIGHT } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import MessageItem from '../parts/MessageItem.svelte'
import MessageItemHost from './MessageItemHost.svelte'

/** The long user message whose body clips at the collapse height. */
const LONG_MESSAGE: ChatMessage = {
  id: 'm1',
  role: 'user',
  content: 'line\n'.repeat(40),
  timestamp: 0,
}

/** The mount this file last created, torn down after each test. */
let mounted: Record<string, unknown> | undefined

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // jsdom lays nothing out, so every element reports a scrollHeight of 0: give
  // the message body a height past the clip so the strip renders.
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(
    USER_MSG_COLLAPSE_HEIGHT + 50,
  )
})

afterEach(async () => {
  if (mounted) await unmount(mounted)
  mounted = undefined
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

/**
 * Renders the message part with the given message.
 *
 * @param msg - The message the part renders.
 * @returns The mounted host element.
 */
function renderMessage(msg: ChatMessage): HTMLElement {
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted = mount(MessageItem, { target: container, props: { msg, isLight: false } })
  flushSync()
  return container
}

describe('CollapsibleUserMessage', () => {
  it('names the expand strip and reports it collapsed', () => {
    const container = renderMessage(LONG_MESSAGE)
    const strip = getByRole(container, 'button', { name: 'Show more' })
    expect(strip.getAttribute('aria-expanded')).toBe('false')
  })

  it('renames the strip and reports it expanded once clicked', () => {
    const container = renderMessage(LONG_MESSAGE)
    getByRole(container, 'button', { name: 'Show more' }).click()
    flushSync()
    const strip = getByRole(container, 'button', { name: 'Show less' })
    expect(strip.getAttribute('aria-expanded')).toBe('true')
  })

  it('renders no strip for a message that fits', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(USER_MSG_COLLAPSE_HEIGHT)
    const container = renderMessage({ ...LONG_MESSAGE, content: 'short' })
    expect(queryByRole(container, 'button')).toBeNull()
  })

  it('measures again when the message grows past the clip', () => {
    const height = vi
      .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
      .mockReturnValue(USER_MSG_COLLAPSE_HEIGHT)
    const container = document.createElement('div')
    document.body.appendChild(container)
    const host = mount(MessageItemHost, {
      target: container,
      props: { msg: { ...LONG_MESSAGE, content: 'short' } },
    })
    mounted = host
    flushSync()
    expect(queryByRole(container, 'button')).toBeNull()
    height.mockReturnValue(USER_MSG_COLLAPSE_HEIGHT + 50)
    host.setMsg(LONG_MESSAGE)
    flushSync()
    expect(
      getByRole(container, 'button', { name: 'Show more' }).getAttribute('aria-expanded'),
    ).toBe('false')
  })
})
