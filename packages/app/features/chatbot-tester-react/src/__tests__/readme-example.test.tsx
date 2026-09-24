/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: real Tailwind ClassMap and the real
 * `@molecule/app-http` fetch client. Only the network edge (`fetch`) and the
 * browser's `scrollIntoView` (absent in jsdom) are stubbed.
 *
 * @module
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { type JSX, useState } from 'react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { createFetchClient } from '@molecule/app-http'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatbotTester, type TesterMessage } from '../index.js'

setClassMap(classMap)
const http = createFetchClient({ baseURL: '/api' })

const bots = [
  { id: 'support', name: 'Support bot' },
  { id: 'sales', name: 'Sales bot' },
]

/**
 * The README example, verbatim.
 *
 * @returns The chatbot tester.
 */
function TestChat(): JSX.Element {
  const [botId, setBotId] = useState('support')
  const [messages, setMessages] = useState<TesterMessage[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSend = async (text: string): Promise<void> => {
    setMessages((prev) => [...prev, { id: `u-${prev.length}`, role: 'user', content: text }])
    setSending(true)
    setError(null)
    try {
      const res = await http.post<{ id: string; content: string }>(`/bots/${botId}/test-messages`, {
        content: text,
      })
      setMessages((prev) => [
        ...prev,
        { id: res.data.id, role: 'assistant', content: res.data.content },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <ChatbotTester
      messages={messages}
      onSend={handleSend}
      loading={sending}
      bots={bots}
      botId={botId}
      onBotChange={(id) => {
        setBotId(id)
        setMessages([])
      }}
      error={error}
      emptyState={<p>Say hi to test your bot.</p>}
    />
  )
}

const fetchMock = vi.fn()

describe('README @example', () => {
  beforeAll(() => {
    vi.stubGlobal('fetch', fetchMock)
    Element.prototype.scrollIntoView = vi.fn()
  })
  afterEach(() => {
    cleanup()
  })
  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('sends on Enter, shows the bot reply, and switches bots', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 'a-1', content: 'Hi! How can I help?' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    render(<TestChat />)
    expect(screen.getByText('Say hi to test your bot.')).toBeTruthy()
    expect((screen.getByLabelText('Test bot') as HTMLSelectElement).value).toBe('support')

    const box = screen.getByPlaceholderText('Type a message…')
    fireEvent.change(box, { target: { value: '  hello  ' } })
    fireEvent.keyDown(box, { key: 'Enter' })

    expect(screen.getByText('hello')).toBeTruthy()
    await waitFor(() => expect(screen.getByText('Hi! How can I help?')).toBeTruthy())
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/bots/support/test-messages')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ content: 'hello' })
    expect((box as HTMLTextAreaElement).value).toBe('')

    fireEvent.change(screen.getByLabelText('Test bot'), { target: { value: 'sales' } })
    expect(screen.queryByText('hello')).toBeNull()
    expect(screen.getByText('Say hi to test your bot.')).toBeTruthy()
  })

  it('shows the API error in an alert', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Bot not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    render(<TestChat />)
    fireEvent.change(screen.getByPlaceholderText('Type a message…'), {
      target: { value: 'ping' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => expect(screen.getByRole('alert').textContent).not.toBe(''))
  })
})
