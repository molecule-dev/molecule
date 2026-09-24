// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { post } from '@molecule/app-http'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { MessageComposer, type MessageData, MessageList } from '../index.js'

const me = { id: 'u1', name: 'Alice', avatarSrc: '/avatars/alice.png' }
const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })

/**
 * The README example, verbatim.
 *
 * @returns The conversation page.
 */
function ConversationPage(): React.JSX.Element {
  const [messages, setMessages] = useState<MessageData[]>([
    {
      id: 'm1',
      author: { id: 'u2', name: 'Bob' },
      body: 'Hi Alice! Ready for the demo?',
      timestamp: '10:01 AM',
    },
  ])
  /**
   * Appends the message locally and posts it to the API.
   *
   * @param text - The trimmed message text.
   */
  async function send(text: string): Promise<void> {
    setMessages((ms) => [
      ...ms,
      { id: crypto.randomUUID(), author: me, body: text, timestamp: time.format(new Date()) },
    ])
    await post('/conversations/c1/messages', { body: text })
  }
  return (
    <section>
      <MessageList messages={messages} selfAuthorId={me.id} emptyState={<p>No messages yet.</p>} />
      <MessageComposer onSubmit={(text) => void send(text)} />
    </section>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('shows the thread, appends a sent message, and posts it to the API', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <ConversationPage />
      </I18nProvider>,
    )
    expect(view.getByText('Hi Alice! Ready for the demo?')).toBeTruthy()
    expect(view.getByText('Bob')).toBeTruthy()
    expect(view.getByText('10:01 AM')).toBeTruthy()

    const send = view.getByRole('button', { name: 'Send' }) as HTMLButtonElement
    expect(send.disabled).toBe(true)
    fireEvent.change(view.getByPlaceholderText('Write a message…'), {
      target: { value: '  Yes, starting now  ' },
    })
    fireEvent.click(send)

    expect(view.getByText('Yes, starting now')).toBeTruthy()
    expect(view.getByText('Alice')).toBeTruthy()
    expect((view.getByPlaceholderText('Write a message…') as HTMLTextAreaElement).value).toBe('')
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('/conversations/c1/messages')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({ body: 'Yes, starting now' })
  })
})
