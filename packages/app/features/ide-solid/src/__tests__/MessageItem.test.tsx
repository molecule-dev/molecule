// @vitest-environment jsdom

/**
 * `MessageItem`'s user rows rendered for real: a real user message, an
 * auto-sent message, a team note, a dictated message, the clickable author
 * name, the header time, the timeline rhythm and the attachment chips; and the
 * assistant reply row (text, thinking, tool calls, verification, the aborted
 * note and the loop-limit card).
 *
 * Solid port of `@molecule/app-ide-react`'s `MessageItem` behaviour asserted
 * through `ChatPanel` in `ChatPanel.automatic-message.test.tsx` /
 * `ChatPanel.user-avatar.test.tsx` / `ChatPanel.dictated-message.test.tsx`,
 * mounted on the part itself (the Solid ChatPanel does not carry the timeline
 * dispatch yet — unit U4 — so the same render contract is asserted at the
 * component boundary here).
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatMessage } from '@molecule/app-ai-chat'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { TIMELINE_ITEM_GAP, TIMELINE_ITEM_GAP_DISCOVERY } from '@molecule/app-ide-panel-logic'
import { MoleculeProvider } from '@molecule/app-solid'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { MessageItem, type MessageItemProps } from '../parts/MessageItem.jsx'
import { buildThemeProvider } from './theme-test-provider.js'

/** The root this file last mounted, disposed before the next render. */
const mounted: { dispose?: () => void } = {}

/**
 * Builds a chat message with the given overrides.
 *
 * @param overrides - Fields to replace on the base user message.
 * @returns The message.
 */
function message(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return { id: 'm1', role: 'user', content: 'Hello there', timestamp: 1000, ...overrides }
}

/** The required props U1's rows do not read, filled so the contract type-checks. */
const BASE_PROPS: Omit<MessageItemProps, 'msg'> = {
  sendMessage: () => undefined,
  handleAskUserResponse: () => undefined,
  isLoading: false,
  streamingStatus: null,
  undoneTcIds: new Set<string>(),
  handleUndoToggle: () => undefined,
  handleFileRevert: () => Promise.resolve(),
  setInputAndCursorEnd: () => undefined,
  setModelPicker: () => null,
  chatMode: 'execute',
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // Any glyph resolves to a defined entry, so Icon renders an empty <svg>.
  setIconSet(new Proxy({}, { get: () => ({ paths: [], viewBox: '0 0 16 16' }) }))
})

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

/**
 * Mounts the message row with the given props.
 *
 * @param overrides - The MessageItem props to render with (the message is required).
 * @returns The host element the row mounted into.
 */
function renderMessage(
  overrides: Partial<MessageItemProps> & Pick<MessageItemProps, 'msg'>,
): HTMLElement {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const props: MessageItemProps = { ...BASE_PROPS, ...overrides }
  mounted.dispose = render(
    () => (
      <MoleculeProvider theme={buildThemeProvider()}>
        <MessageItem {...props} />
      </MoleculeProvider>
    ),
    container,
  )
  return container
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
    const container = renderMessage({ msg: message({ content: 'Build me a todo app' }) })
    const row = container.querySelector('[data-mol-id="chat-user-message"]')
    expect(row, 'a user message row should render').not.toBeNull()
    expect(row?.querySelector('[data-mol-id="chat-user-avatar"]')).not.toBeNull()
    expect(row?.textContent).toContain('Build me a todo app')
    expect(row?.textContent).toContain('You')
    const cm = getClassMap()
    expect(classTokens(row)).toEqual(tokens(cm.cn(cm.surfaceSecondary, cm.textSize('sm'))))
  })

  it('renders an auto-sent message as a success card with the sync glyph and no header', () => {
    const container = renderMessage({
      msg: message({ content: 'Fix these issues', automatic: true }),
    })
    const card = container.querySelector('[data-mol-id="chat-automatic-message"]')
    expect(card, 'an auto-sent card should render').not.toBeNull()
    expect(card?.querySelector('[data-mol-id="chat-user-avatar"]')).toBeNull()
    expect(card?.querySelector('svg'), 'the sync glyph should render').not.toBeNull()
    expect(card?.textContent).not.toContain('You')
    const cm = getClassMap()
    expect(classTokens(card)).toEqual(tokens(cm.textSize('xs')))
  })

  it('renders a team note with the gold team-only badge', () => {
    const container = renderMessage({
      msg: message({
        role: 'system',
        teamOnly: true,
        author: { id: 'u2', name: 'Mara' },
      }),
      agentName: 'Synthase',
    })
    const row = container.querySelector('[data-mol-id="chat-team-message"]')
    expect(row, 'a team note should render').not.toBeNull()
    expect(row?.textContent).toContain('Mara')
    expect(
      row?.querySelector('[data-mol-id="chat-team-only-badge"]')?.getAttribute('aria-label'),
    ).toBe('Team only — visible to your team; Synthase will ignore it')
  })

  it('marks a dictated user message with the mic badge', () => {
    const container = renderMessage({ msg: message({ viaDictation: true }) })
    expect(container.querySelector('[data-mol-id="chat-dictated-badge"]')).not.toBeNull()
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
    const container = renderMessage({
      msg: message({
        attachments: [{ filename: 'notes.txt', mediaType: 'text/plain', size: 2048 }],
      }),
    })
    expect(container.textContent).toContain('notes.txt')
    expect(container.textContent).toContain('(2KB)')
  })
})

describe('MessageItem — assistant replies', () => {
  it('renders plain assistant content as markdown with no user chrome', () => {
    const container = renderMessage({
      msg: message({ role: 'assistant', content: 'All done here' }),
    })
    expect(container.querySelector('[data-mol-id="chat-user-message"]')).toBeNull()
    expect(container.textContent).toContain('All done here')
  })

  it('updates a streamed reply in place as blocks are appended', () => {
    const [msg, setMsg] = createSignal<ChatMessage>(
      message({
        role: 'assistant',
        isStreaming: true,
        blocks: [{ type: 'thinking', content: 'live reasoning' }],
      }),
    )
    mounted.dispose?.()
    document.body.innerHTML = ''
    const container = document.createElement('div')
    document.body.appendChild(container)
    mounted.dispose = render(
      () => (
        <MoleculeProvider theme={buildThemeProvider()}>
          <MessageItem {...BASE_PROPS} msg={msg()} />
        </MoleculeProvider>
      ),
      container,
    )
    expect(container.textContent).toContain('live reasoning')

    setMsg(
      message({
        role: 'assistant',
        isStreaming: true,
        blocks: [
          { type: 'thinking', content: 'live reasoning' },
          { type: 'text', content: 'The answer' },
        ],
      }),
    )
    expect(container.textContent).toContain('The answer')
    expect(container.textContent).not.toContain('live reasoning')
  })

  it('renders a thinking block before the reply text', () => {
    const container = renderMessage({
      msg: message({
        role: 'assistant',
        blocks: [
          { type: 'thinking', content: 'weighing options' },
          { type: 'text', content: 'The answer' },
        ],
      }),
    })
    expect(container.textContent).toContain('Thought briefly')
    expect(container.textContent).toContain('The answer')
    expect(container.textContent).not.toContain('weighing options')
  })

  it('auto-expands the last thinking block while the turn streams', () => {
    const container = renderMessage({
      msg: message({
        role: 'assistant',
        isStreaming: true,
        blocks: [{ type: 'thinking', content: 'live reasoning' }],
      }),
    })
    expect(container.textContent).toContain('Thinking')
    expect(container.textContent).toContain('live reasoning')
  })

  it('renders the verification badge for a verification block', () => {
    const container = renderMessage({
      msg: message({
        role: 'assistant',
        blocks: [{ type: 'verification', status: 'ok', workspaces: ['app'] }],
      }),
    })
    expect(container.textContent).toContain('Checks passed')
  })

  it('renders the resource-limit banner for a resource_limit block', () => {
    const container = renderMessage({
      msg: message({
        role: 'assistant',
        blocks: [{ type: 'resource_limit', resource: 'tokens', message: 'Token limit reached' }],
      }),
    })
    expect(container.textContent).toContain('Token limit reached')
  })

  it('cards the context-compaction summary with its expandable rest', () => {
    const container = renderMessage({
      msg: message({
        role: 'assistant',
        blocks: [{ type: 'text', content: '**Context compacted**\n\nEarlier work summarised' }],
      }),
    })
    expect(container.textContent).toContain('Context compacted')
    expect(container.textContent).toContain('Earlier work summarised')
    expect(container.querySelector('details')).not.toBeNull()
  })

  it('renders the card of each tool_call block', () => {
    const container = renderMessage({
      msg: message({
        role: 'assistant',
        blocks: [{ type: 'tool_call', id: 't1' }],
        toolCalls: [{ id: 't1', name: 'read_file', input: { path: 'a.ts' }, status: 'done' }],
      }),
    })
    expect(container.textContent).toContain('Read')
    expect(container.textContent).toContain('a.ts')
  })

  it('renders the tool calls of a message with no blocks', () => {
    const container = renderMessage({
      msg: message({
        role: 'assistant',
        content: '',
        toolCalls: [{ id: 't2', name: 'read_file', input: { path: 'b.ts' }, status: 'done' }],
      }),
    })
    expect(container.textContent).toContain('b.ts')
  })

  it('renders a pending ask_user whose tool_call block never persisted', () => {
    const container = renderMessage({
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
    expect(container.textContent).toContain('Waiting on you')
    expect(container.textContent).toContain('Which stack?')
  })

  it('marks an aborted turn', () => {
    const container = renderMessage({
      msg: message({ role: 'assistant', content: 'partial', aborted: true }),
    })
    expect(container.textContent).toContain('Response stopped')
  })

  it('offers Continue after the loop limit and sends its prompt', () => {
    const sendMessage = vi.fn()
    const container = renderMessage({
      msg: message({ role: 'assistant', content: 'partial', loopLimitReached: 5 }),
      sendMessage,
    })
    expect(container.textContent).toContain('Reached the maximum of 5 tool iterations.')
    const button = Array.from(container.querySelectorAll('button')).find((element) =>
      element.textContent?.includes('Continue'),
    ) as HTMLElement
    expect(button).toBeDefined()
    button.click()
    expect(sendMessage).toHaveBeenCalledWith('Continue implementing from where you left off.')
  })

  it('offers Change model and Increase max loops after the loop limit', () => {
    const setInputAndCursorEnd = vi.fn()
    const setModelPicker = vi.fn()
    const container = renderMessage({
      msg: message({ role: 'assistant', content: 'partial', loopLimitReached: 3 }),
      setInputAndCursorEnd,
      setModelPicker,
      chatMode: 'plan',
    })
    const buttons = Array.from(container.querySelectorAll('button')) as HTMLElement[]
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
    const container = renderMessage({
      msg: message({ author: { id: 'u2', name: 'Mara' } }),
      onProfileClick,
    })
    const button = container.querySelector('[data-mol-id="chat-user-name-button"]')
    expect(button, 'the author name should be a button').not.toBeNull()
    expect(button?.textContent).toBe('Mara')
    ;(button as HTMLElement).click()
    expect(onProfileClick).toHaveBeenCalledWith({ id: 'u2', name: 'Mara', avatar: null })
  })

  it('underlines the author name on hover and on focus', () => {
    const container = renderMessage({
      msg: message({ author: { id: 'u2', name: 'Mara' } }),
      onProfileClick: () => undefined,
    })
    const button = container.querySelector('[data-mol-id="chat-user-name-button"]') as HTMLElement
    expect(button.style.textDecoration).toBe('none')
    button.dispatchEvent(new MouseEvent('mouseenter'))
    expect(button.style.textDecoration).toBe('underline')
    button.dispatchEvent(new MouseEvent('mouseleave'))
    expect(button.style.textDecoration).toBe('none')
    button.focus()
    expect(button.style.textDecoration).toBe('underline')
    button.blur()
    expect(button.style.textDecoration).toBe('none')
  })

  it('renders a deleted author name as plain text', () => {
    const onProfileClick = vi.fn()
    const container = renderMessage({
      msg: message({ author: { name: 'Gone' } }),
      onProfileClick,
    })
    expect(container.querySelector('[data-mol-id="chat-user-name-button"]')).toBeNull()
    expect(container.textContent).toContain('Gone')
  })
})
