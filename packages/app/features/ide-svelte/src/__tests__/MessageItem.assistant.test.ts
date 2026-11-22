// @vitest-environment jsdom

/**
 * `MessageItem`'s assistant reply row rendered for real: text and compaction
 * blocks, thinking, verification badges, resource-limit banners, tool-call
 * cards (referenced by a block, orphaned, or on a block-less row), the
 * "Response stopped" note and the loop-limit card with its three choices.
 *
 * Svelte port of `@molecule/app-ide-react`'s `MessageItem` behaviour for
 * assistant messages, mounted on the part itself (the Svelte ChatPanel does
 * not carry the timeline dispatch yet — unit U4). User, auto and team rows are
 * unit U1's suite; this one covers only the reply rows.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatMessage, MessageBlock, ToolCall } from '@molecule/app-ai-chat'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { TIMELINE_ITEM_GAP } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import type { MessageItemProps } from '../types.js'
import MessageItemAssistantHost from './MessageItemAssistantHost.svelte'
import { buildThemeProvider } from './theme-test-provider.js'

/** The mount this file last created, torn down after each test. */
let mounted: Record<string, unknown> | undefined

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // Any glyph resolves to an empty <svg>; no concrete icon bond is needed.
  setIconSet(new Proxy({}, { get: () => ({ paths: [], viewBox: '0 0 16 16' }) }))
})

afterEach(async () => {
  if (mounted) await unmount(mounted)
  mounted = undefined
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

/**
 * Builds an assistant message with the given overrides.
 *
 * @param overrides - Fields to replace on the base reply.
 * @returns The message.
 */
function reply(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return { id: 'a1', role: 'assistant', content: '', timestamp: 1000, ...overrides }
}

/**
 * Mounts the reply row with the given props.
 *
 * @param props - The MessageItem props to render with.
 * @returns The host element the row mounted into.
 */
function renderReply(props: Partial<MessageItemProps> & { msg: ChatMessage }): HTMLElement {
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted = mount(MessageItemAssistantHost, {
    target: host,
    props: { theme: buildThemeProvider(), isLight: false, ...props },
  })
  flushSync()
  return host
}

describe('MessageItem — assistant text', () => {
  it('renders a text block through the markdown renderer', () => {
    const host = renderReply({
      msg: reply({ blocks: [{ type: 'text', content: 'Hello **world**' }] }),
    })
    expect(host.querySelector('strong')?.textContent).toBe('world')
    expect(host.textContent).toContain('Hello')
  })

  it('falls back to the message content when there are no blocks', () => {
    const host = renderReply({ msg: reply({ content: 'Plain reply text' }) })
    expect(host.textContent).toContain('Plain reply text')
  })

  it('keeps the timelime spacing on the wrapper', () => {
    const host = renderReply({ msg: reply({ blocks: [{ type: 'text', content: 'x' }] }) })
    expect((host.firstElementChild as HTMLElement).style.marginBottom).toBe(
      `${TIMELINE_ITEM_GAP}px`,
    )
  })

  it('splits a context-compaction notice into a headline and a summary disclosure', () => {
    const text = '**Context compacted**\n\nEarlier turns were summarized.'
    const host = renderReply({ msg: reply({ blocks: [{ type: 'text', content: text }] }) })
    expect(host.textContent).toContain('Context compacted')
    const details = host.querySelector('details')
    expect(details, 'the summary should sit behind a disclosure').not.toBeNull()
    expect(details?.querySelector('summary svg')?.getAttribute('data-chevron')).toBe('')
    expect(details?.textContent).toContain('Earlier turns were summarized.')
  })
})

describe('MessageItem — thinking', () => {
  it('auto-expands the last thinking block while the reply streams', () => {
    const host = renderReply({
      msg: reply({
        blocks: [{ type: 'thinking', content: 'pondering the design' }],
        isStreaming: true,
      }),
    })
    expect(host.textContent).toContain('Thinking')
    expect(host.textContent).toContain('pondering the design')
  })

  it('names the duration once the turn finished', () => {
    const timed = { type: 'thinking' as const, content: 'done thinking', durationMs: 2000 }
    const blocks: MessageBlock[] = [timed]
    const host = renderReply({ msg: reply({ blocks }) })
    expect(host.textContent).toContain('Thought for 2 seconds')
    expect(host.textContent).not.toContain('done thinking')
  })
})

describe('MessageItem — verification and resource limits', () => {
  it('renders a passing verification badge', () => {
    const host = renderReply({
      msg: reply({
        blocks: [{ type: 'verification', status: 'ok', workspaces: ['api'] }],
      }),
    })
    expect(host.textContent).toContain('Checks passed')
  })

  it('renders a failing verification badge with its counted label', () => {
    const host = renderReply({
      msg: reply({
        blocks: [
          {
            type: 'verification',
            status: 'error',
            workspaces: ['api'],
            categories: ['type'],
            output: 'a.ts(1,2): error TS2345: nope',
          },
        ],
      }),
    })
    expect(host.textContent).toContain('1 type error')
  })

  it('renders the resource-limit banner with the host CTA', () => {
    const buildUpgradeCta = vi.fn(() => ({ label: 'Upgrade', action: 'upgrade' }))
    const host = renderReply({
      msg: reply({
        blocks: [{ type: 'resource_limit', resource: 'memory', message: 'Out of memory' }],
      }),
      buildUpgradeCta,
    })
    expect(buildUpgradeCta).toHaveBeenCalledWith({})
    expect(host.textContent).toContain('Out of memory')
  })
})

describe('MessageItem — tool calls', () => {
  const call: ToolCall = {
    id: 'tc1',
    name: 'read_file',
    input: { path: 'src/app.ts' },
    output: { content: 'export const app = 1' },
    status: 'done',
  }

  it('renders the tool-call card a block refers to', () => {
    const host = renderReply({
      msg: reply({ blocks: [{ type: 'tool_call', id: 'tc1' }], toolCalls: [call] }),
    })
    expect(host.querySelector('[role="button"]'), 'the card row should render').not.toBeNull()
    expect(host.textContent).toContain('app.ts')
  })

  it('renders on its own row when the message carries no blocks', () => {
    const host = renderReply({ msg: reply({ toolCalls: [call] }) })
    expect(host.querySelector('[role="button"]')).not.toBeNull()
    expect(host.textContent).toContain('app.ts')
  })

  it('renders an awaiting ask_user whose block was never persisted', () => {
    const host = renderReply({
      msg: reply({
        blocks: [{ type: 'text', content: 'I need a choice' }],
        toolCalls: [
          {
            id: 'tc9',
            name: 'ask_user',
            input: { question: 'Pick one', options: [{ label: 'Yes' }, { label: 'No' }] },
            output: { status: 'awaiting_response' },
            status: 'running',
          },
        ],
      }),
    })
    expect(host.textContent).toContain('Pick one')
    expect(host.querySelector('[data-mol-id="ask-user-option-0"]')).not.toBeNull()
  })

  it('leaves out an ask_user whose block is present', () => {
    const host = renderReply({
      msg: reply({
        blocks: [{ type: 'tool_call', id: 'tc9' }],
        toolCalls: [
          {
            id: 'tc9',
            name: 'ask_user',
            input: { question: 'Pick one', options: [{ label: 'Yes' }] },
            output: { status: 'awaiting_response' },
            status: 'running',
          },
        ],
      }),
    })
    expect(host.querySelectorAll('[data-mol-id="ask-user-option-0"]')).toHaveLength(1)
  })
})

describe('MessageItem — the reply state', () => {
  it('says the response was stopped when it was aborted', () => {
    const host = renderReply({ msg: reply({ content: 'partial', aborted: true }) })
    expect(host.textContent).toContain('Response stopped')
  })

  it('renders the loop-limit card once the turn has finished', () => {
    const host = renderReply({ msg: reply({ loopLimitReached: 50 }) })
    expect(host.textContent).toContain('Reached the maximum of 50 tool iterations.')
    const buttons = host.querySelectorAll('button')
    expect(buttons).toHaveLength(3)
    expect(host.textContent).toContain('Change model')
    expect(host.textContent).toContain('Increase max loops')
    expect(host.textContent).toContain('Continue')
    // Only the first choice is disabled while a turn runs.
    expect((buttons[0] as HTMLButtonElement).disabled).toBe(false)
  })

  it('keeps the loop-limit card out while the reply still streams', () => {
    const host = renderReply({ msg: reply({ loopLimitReached: 50, isStreaming: true }) })
    expect(host.textContent).not.toContain('Reached the maximum')
  })

  it('disables the Change model choice while a turn runs', () => {
    const host = renderReply({ msg: reply({ loopLimitReached: 50 }), isLoading: true })
    const buttons = host.querySelectorAll('button')
    expect((buttons[0] as HTMLButtonElement).disabled).toBe(true)
    expect((buttons[1] as HTMLButtonElement).disabled).toBe(false)
  })

  it('opens the model picker when Change model is chosen', () => {
    const setInputAndCursorEnd = vi.fn()
    const setModelPicker = vi.fn()
    const host = renderReply({
      msg: reply({ loopLimitReached: 50 }),
      setInputAndCursorEnd,
      setModelPicker,
      chatMode: 'plan',
    })
    ;(host.querySelectorAll('button')[0] as HTMLButtonElement).click()
    expect(setInputAndCursorEnd).toHaveBeenCalledWith('/model ')
    expect(setModelPicker).toHaveBeenCalledWith({ selectedIdx: -1, mode: 'plan', text: '/model ' })
  })

  it('prefills the max-loops command from its choice', () => {
    const setInputAndCursorEnd = vi.fn()
    const host = renderReply({ msg: reply({ loopLimitReached: 50 }), setInputAndCursorEnd })
    ;(host.querySelectorAll('button')[1] as HTMLButtonElement).click()
    expect(setInputAndCursorEnd).toHaveBeenCalledWith('/maxloops ')
  })

  it('sends the continuation prompt from Continue', () => {
    const sendMessage = vi.fn()
    const host = renderReply({ msg: reply({ loopLimitReached: 50 }), sendMessage })
    ;(host.querySelectorAll('button')[2] as HTMLButtonElement).click()
    expect(sendMessage).toHaveBeenCalledWith('Continue implementing from where you left off.')
  })

  it('passes an undone tool call through to its card as undone', () => {
    const host = renderReply({
      msg: reply({
        blocks: [{ type: 'tool_call', id: 'tc1' }],
        toolCalls: [
          {
            id: 'tc1',
            name: 'edit_file',
            input: { path: 'src/app.ts', old_string: 'a', new_string: 'b' },
            fileDiff: { original: 'a', modified: 'b' },
            status: 'done',
          },
        ],
      }),
      handleFileRevert: vi.fn(),
      undoneTcIds: new Set(['tc1']),
    })
    // The undone card offers re-apply rather than undo.
    expect(host.querySelector('[title="Re-apply this change"]')).not.toBeNull()
  })
})
