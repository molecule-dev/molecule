// @vitest-environment jsdom

/**
 * `MessageItem`'s user rows rendered for real: a real user message, an
 * auto-sent message, a team note, a dictated message, the clickable author
 * name, the header time, the timeline rhythm and the attachment chips.
 *
 * Vue port of `@molecule/app-ide-react`'s `MessageItem` behaviour asserted
 * through `ChatPanel` in `ChatPanel.automatic-message.test.tsx` /
 * `ChatPanel.user-avatar.test.tsx` / `ChatPanel.dictated-message.test.tsx`,
 * mounted on the part itself (the Vue ChatPanel does not carry the timeline
 * dispatch yet — unit U4 — so the same render contract is asserted at the
 * component boundary here). Assistant replies are covered from unit U2: their
 * blocks, tool-call cards, orphan ask cards, abort note and loop-limit card.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, type VNodeChild } from 'vue'

import type { ChatMessage } from '@molecule/app-ai-chat'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { TIMELINE_ITEM_GAP, TIMELINE_ITEM_GAP_DISCOVERY } from '@molecule/app-ide-panel-logic'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { createThemePlugin } from '@molecule/app-vue'

import { MessageItem, type MessageItemProps } from '../parts/MessageItem.js'
import { buildThemeProvider } from './theme-test-provider.js'

/** The app this file last mounted, unmounted before the next render. */
const mounted: { app?: ReturnType<typeof createApp> } = {}

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

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

/**
 * Mounts the message row with the given props.
 *
 * @param props - The MessageItem props to render with.
 * @returns The host element the row mounted into.
 */
function renderMessage(props: Partial<MessageItemProps>): HTMLElement {
  mounted.app?.unmount()
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({
    render: (): VNodeChild => h(MessageItem, props as MessageItemProps),
  })
  app.use(createThemePlugin(buildThemeProvider()))
  mounted.app = app
  app.mount(host)
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
    const dictated = renderMessage({
      msg: message({ viaDictation: true }),
    })
    expect(dictated.querySelector('[data-mol-id="chat-dictated-badge"]')).not.toBeNull()
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
  })
})

describe('MessageItem — assistant replies', () => {
  it('renders plain assistant content as markdown with no user chrome', () => {
    const host = renderMessage({ msg: message({ role: 'assistant', content: 'All done here' }) })
    expect(host.querySelector('[data-mol-id="chat-user-message"]')).toBeNull()
    expect(host.textContent).toContain('All done here')
  })

  it('renders a thinking block before the reply text', () => {
    const host = renderMessage({
      msg: message({
        role: 'assistant',
        blocks: [
          { type: 'thinking', content: 'weighing options' },
          { type: 'text', content: 'The answer' },
        ],
      }),
    })
    expect(host.textContent).toContain('Thought briefly')
    expect(host.textContent).toContain('The answer')
    expect(host.textContent).not.toContain('weighing options')
  })

  it('auto-expands the last thinking block while the turn streams', () => {
    const host = renderMessage({
      msg: message({
        role: 'assistant',
        isStreaming: true,
        blocks: [{ type: 'thinking', content: 'live reasoning' }],
      }),
    })
    expect(host.textContent).toContain('Thinking')
    expect(host.textContent).toContain('live reasoning')
  })

  it('renders the verification badge for a verification block', () => {
    const host = renderMessage({
      msg: message({
        role: 'assistant',
        blocks: [{ type: 'verification', status: 'ok', workspaces: ['app'] }],
      }),
    })
    expect(host.textContent).toContain('Checks passed')
  })

  it('renders the resource-limit banner for a resource_limit block', () => {
    const host = renderMessage({
      msg: message({
        role: 'assistant',
        blocks: [{ type: 'resource_limit', resource: 'tokens', message: 'Token limit reached' }],
      }),
    })
    expect(host.textContent).toContain('Token limit reached')
  })

  it('cards the context-compaction summary with its expandable rest', () => {
    const host = renderMessage({
      msg: message({
        role: 'assistant',
        blocks: [{ type: 'text', content: '**Context compacted**\n\nEarlier work summarised' }],
      }),
    })
    expect(host.textContent).toContain('Context compacted')
    expect(host.textContent).toContain('Earlier work summarised')
    expect(host.querySelector('details')).not.toBeNull()
  })

  it('renders the card of each tool_call block', () => {
    const host = renderMessage({
      msg: message({
        role: 'assistant',
        blocks: [{ type: 'tool_call', id: 't1' }],
        toolCalls: [{ id: 't1', name: 'read_file', input: { path: 'a.ts' }, status: 'done' }],
      }),
    })
    expect(host.textContent).toContain('Read')
    expect(host.textContent).toContain('a.ts')
  })

  it('renders the tool calls of a message with no blocks', () => {
    const host = renderMessage({
      msg: message({
        role: 'assistant',
        content: '',
        toolCalls: [{ id: 't2', name: 'read_file', input: { path: 'b.ts' }, status: 'done' }],
      }),
    })
    expect(host.textContent).toContain('b.ts')
  })

  it('renders a pending ask_user whose tool_call block never persisted', () => {
    const host = renderMessage({
      msg: message({
        role: 'assistant',
        blocks: [{ type: 'text', content: 'Waiting on you' }],
        toolCalls: [
          {
            id: 'ask1',
            name: 'ask_user',
            input: { question: 'Which stack?' },
            output: { status: 'awaiting_response' },
            status: 'running',
          },
        ],
      }),
    })
    expect(host.textContent).toContain('Waiting on you')
    expect(host.textContent).toContain('Which stack?')
  })

  it('marks an aborted turn', () => {
    const host = renderMessage({
      msg: message({ role: 'assistant', content: 'partial', aborted: true }),
    })
    expect(host.textContent).toContain('Response stopped')
  })

  it('offers Continue after the loop limit and sends its prompt', () => {
    const sendMessage = vi.fn()
    const host = renderMessage({
      msg: message({ role: 'assistant', content: 'partial', loopLimitReached: 5 }),
      sendMessage,
    })
    expect(host.textContent).toContain('Reached the maximum of 5 tool iterations.')
    const button = Array.from(host.querySelectorAll('button')).find((element) =>
      element.textContent?.includes('Continue'),
    ) as HTMLElement
    expect(button).toBeDefined()
    button.click()
    expect(sendMessage).toHaveBeenCalledWith('Continue implementing from where you left off.')
  })

  it('offers Change model and Increase max loops after the loop limit', () => {
    const setInputAndCursorEnd = vi.fn()
    const setModelPicker = vi.fn()
    const host = renderMessage({
      msg: message({ role: 'assistant', content: 'partial', loopLimitReached: 3 }),
      setInputAndCursorEnd,
      setModelPicker,
      chatMode: 'plan',
    })
    const buttons = Array.from(host.querySelectorAll('button')) as HTMLElement[]
    const changeModel = buttons.find((element) =>
      element.textContent?.includes('Change model'),
    ) as HTMLElement
    changeModel.click()
    expect(setInputAndCursorEnd).toHaveBeenCalledWith('/model ')
    expect(setModelPicker).toHaveBeenCalledWith({ selectedIdx: -1, mode: 'plan', text: '/model ' })
    const increase = buttons.find((element) =>
      element.textContent?.includes('Increase max loops'),
    ) as HTMLElement
    increase.click()
    expect(setInputAndCursorEnd).toHaveBeenCalledWith('/maxloops ')
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

  it('underlines the author name on hover and on focus', async () => {
    const host = renderMessage({
      msg: message({ author: { id: 'u2', name: 'Mara' } }),
      onProfileClick: vi.fn(),
    })
    const button = host.querySelector('[data-mol-id="chat-user-name-button"]') as HTMLElement
    expect(button.style.textDecoration).toBe('none')
    button.dispatchEvent(new MouseEvent('mouseenter'))
    await nextTick()
    expect(button.style.textDecoration).toBe('underline')
    button.dispatchEvent(new MouseEvent('mouseleave'))
    await nextTick()
    expect(button.style.textDecoration).toBe('none')
    button.focus()
    await nextTick()
    expect(button.style.textDecoration).toBe('underline')
    button.blur()
    await nextTick()
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
