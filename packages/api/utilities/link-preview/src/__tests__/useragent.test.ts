import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_USER_AGENT, fetchHtml } from '../fetcher.js'

/**
 * Build a minimal `Response`-like object for the fetcher's read path.
 *
 * @param body - HTML body to stream back.
 * @returns A `Response` with a 200 status and a `text/html` content-type.
 */
function htmlResponse(body: string): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(body))
      controller.close()
    },
  })
  return new Response(stream, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}

describe('link-preview default User-Agent', () => {
  it('is brand-neutral (does not advertise any specific product)', () => {
    // A shared package must not brand outbound scrape traffic as molecule.dev.
    expect(DEFAULT_USER_AGENT).not.toMatch(/molecule\.dev/i)
    expect(DEFAULT_USER_AGENT.length).toBeGreaterThan(0)
  })

  it('sends the brand-neutral default User-Agent on the wire', async () => {
    const fetchMock = vi.fn().mockResolvedValue(htmlResponse('<html><head></head></html>'))

    await fetchHtml('https://example.com/article', {
      fetch: fetchMock as unknown as typeof globalThis.fetch,
    })

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined
    const headers = init?.headers as Record<string, string> | undefined
    expect(headers?.['user-agent']).toBe(DEFAULT_USER_AGENT)
    expect(headers?.['user-agent']).not.toMatch(/molecule\.dev/i)
  })
})
