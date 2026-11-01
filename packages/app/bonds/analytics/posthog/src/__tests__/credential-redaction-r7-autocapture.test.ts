// @vitest-environment jsdom
import { gunzipSync } from 'node:zlib'

import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.resetModules()
})

it('scrubs URLs the real PostHog autocapture derives from a clicked DOM link at SDK transport', async () => {
  const bodies: string[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.body) {
        let body = init.body
        if (typeof body === 'object' && 'arrayBuffer' in body) {
          body = await (body as Blob).arrayBuffer()
        }
        if (typeof body === 'string') bodies.push(body)
        else {
          const bytes = new Uint8Array(body as ArrayBuffer)
          bodies.push(
            new TextDecoder().decode(
              bytes[0] === 31 && bytes[1] === 139 ? gunzipSync(bytes) : bytes,
            ),
          )
        }
      }
      return new Response('{"autocapture_opt_out":false}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }),
  )
  const { posthog } = await import('posthog-js')
  const { createProvider } = await import('../provider.js')
  createProvider({
    apiKey: 'posthog-test-project',
    host: 'https://posthog.invalid',
    autocapture: true,
  })
  posthog.set_config({
    request_batching: false,
    disable_compression: true,
    advanced_disable_flags: true,
    disable_session_recording: true,
    disable_surveys: true,
    disable_external_dependency_loading: true,
    opt_out_useragent_filter: true,
  })
  expect(posthog.__loaded).toBe(true)
  expect(posthog.autocapture?.isEnabled).toBe(true)
  posthog.capture('fixture.ready')
  await vi.waitFor(() => expect(bodies.join('')).toContain('fixture.ready'))
  const link = document.createElement('a')
  link.href = 'https://app.example.test/reset?token=autocapture-secret&view=full'
  link.textContent = 'Open recovery'
  link.addEventListener('click', (event) => event.preventDefault())
  document.body.appendChild(link)
  link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  await vi.waitFor(() => expect(bodies.join('')).toContain('$autocapture'))
  const payload = bodies.join('\n')
  posthog.reset()
  expect(payload).toContain('view=full')
  expect(payload).not.toContain('autocapture-secret')
})
