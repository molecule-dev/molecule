import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_USER_AGENT, fetchText } from '../fetcher.js'

/**
 * Build a minimal `Response`-like object for the fetcher's read path.
 *
 * @param body - Body text to stream back.
 * @param contentType - Response content-type header.
 * @returns A `Response` with a 200 status.
 */
function okResponse(body: string, contentType: string): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(body))
      controller.close()
    },
  })
  return new Response(stream, {
    status: 200,
    headers: { 'content-type': contentType },
  })
}

describe('oembed default User-Agent', () => {
  it('is brand-neutral (does not advertise any specific product)', () => {
    // A shared package must not brand outbound scrape traffic as molecule.dev.
    expect(DEFAULT_USER_AGENT).not.toMatch(/molecule\.dev/i)
    expect(DEFAULT_USER_AGENT.length).toBeGreaterThan(0)
  })

  it('sends the brand-neutral default User-Agent on the wire', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(okResponse('<html><head></head></html>', 'text/html'))

    await fetchText('https://example.com/page', {
      fetch: fetchMock as unknown as typeof globalThis.fetch,
    })

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined
    const headers = init?.headers as Record<string, string> | undefined
    expect(headers?.['user-agent']).toBe(DEFAULT_USER_AGENT)
    expect(headers?.['user-agent']).not.toMatch(/molecule\.dev/i)
  })
})
