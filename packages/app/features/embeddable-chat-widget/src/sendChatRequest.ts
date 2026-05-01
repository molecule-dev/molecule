/**
 * Network helper for the embeddable chat widget. Posts the user's
 * message to `${apiBaseUrl}/chat` and forwards stream deltas to the
 * caller. Isolated from the React component so it's trivially mockable.
 *
 * @module
 */

import { readChatStream } from './stream.js'
import type { EmbeddableChatWidgetConfig } from './types.js'

interface SendChatRequestArgs {
  /** The user message to post. */
  message: string
  /** Resolved widget config (provides `apiBaseUrl` + optional `fetchImpl`). */
  config: EmbeddableChatWidgetConfig
  /** Called for every assistant content delta as the stream arrives. */
  onDelta: (delta: string) => void
  /** Optional abort signal to cancel an in-flight request. */
  signal?: AbortSignal
}

/**
 * Sends a chat message and streams the response back. Throws on transport
 * errors or non-OK HTTP statuses; resolves cleanly on `done` / stream end.
 *
 * @param args - Send args (`message`, `config`, `onDelta`, optional `signal`).
 */
export async function sendChatRequest({
  message,
  config,
  onDelta,
  signal,
}: SendChatRequestArgs): Promise<void> {
  const fetchImpl = config.fetchImpl ?? globalThis.fetch
  if (!fetchImpl) {
    throw new Error('fetch is not available')
  }
  const url = `${config.apiBaseUrl.replace(/\/$/, '')}/chat`
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ message }),
    signal,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`HTTP ${response.status}${text ? `: ${text}` : ''}`)
  }

  if (!response.body) {
    throw new Error('No response body')
  }

  let errored: string | null = null
  let done = false
  await readChatStream(response.body, (event) => {
    if (event.type === 'content') {
      onDelta(event.delta)
    } else if (event.type === 'done') {
      done = true
    } else if (event.type === 'error') {
      errored = event.message || 'Stream error'
    }
  })
  if (errored) {
    throw new Error(errored)
  }
  // `done` is informational — many backends just close the stream.
  void done
}
