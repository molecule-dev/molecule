import { gunzipSync } from 'node:zlib'

import { afterEach, describe, expect, it, vi } from 'vitest'

const decodeBody = async (body: unknown): Promise<string> => {
  if (typeof body === 'string') return body
  if (body instanceof Blob) body = await body.arrayBuffer()
  const bytes = ArrayBuffer.isView(body)
    ? new Uint8Array(body.buffer, body.byteOffset, body.byteLength)
    : new Uint8Array(body as ArrayBuffer)
  return new TextDecoder().decode(bytes[0] === 31 && bytes[1] === 139 ? gunzipSync(bytes) : bytes)
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.resetModules()
})

const storage = (): Storage => {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  }
}

describe('round-seven PostHog XHR transport control', () => {
  it('keeps safe fields while scrubbing XHR events', async () => {
    const bodies: unknown[] = []
    let xhrCalls = 0
    const localStorage = storage()
    class TransportXHR {
      status = 200
      statusText = 'OK'
      readyState = 0
      responseText = '{}'
      withCredentials = false
      onreadystatechange?: () => void
      open(): void {}
      setRequestHeader(): void {}
      getResponseHeader(): null {
        return null
      }
      getAllResponseHeaders(): string {
        return ''
      }
      send(body: unknown): void {
        xhrCalls++
        bodies.push(body)
        this.readyState = 4
        this.onreadystatechange?.()
      }
    }
    const location = {
      href: 'https://app.example.test/callback?token=posthog-sdk-secret&view=full',
      origin: 'https://app.example.test',
      protocol: 'https:',
      host: 'app.example.test',
      hostname: 'app.example.test',
      pathname: '/callback',
      search: '?token=posthog-sdk-secret&view=full',
      hash: '',
    }
    const document = {
      referrer: 'https://ref.example.test/start?session=posthog-referrer-secret&safe=1',
      location,
      title: 'Callback',
      cookie: '',
      createElement: () => ({ style: {} }),
      getElementsByTagName: () => [],
      documentElement: {},
      body: { appendChild: () => {} },
    }
    const window = {
      location,
      document,
      navigator: {
        userAgent: 'round-seven-test',
        onLine: true,
        sendBeacon: (_url: unknown, body: unknown) => {
          bodies.push(body)
          return true
        },
      },
      XMLHttpRequest: TransportXHR,
      localStorage,
      screen: { width: 1024, height: 768 },
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }
    vi.stubGlobal('XMLHttpRequest', TransportXHR)
    vi.stubGlobal('window', window)
    vi.stubGlobal('document', document)
    vi.stubGlobal('location', location)
    vi.stubGlobal('navigator', window.navigator)
    vi.stubGlobal('screen', window.screen)
    vi.stubGlobal('localStorage', localStorage)
    vi.stubGlobal(
      'fetch',
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.body) bodies.push(init.body)
        return Promise.resolve(
          new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
        )
      }),
    )

    const { posthog } = await import('posthog-js')
    const { createProvider } = await import('../provider.js')
    const analytics = await import('@molecule/app-analytics')
    analytics.setProvider(
      createProvider({ apiKey: 'posthog-test-project', host: 'https://posthog.invalid' }),
    )
    posthog.set_config({
      request_batching: false,
      disable_compression: true,
      advanced_disable_decide: true,
      advanced_disable_feature_flags: true,
      disable_session_recording: true,
      disable_surveys: true,
    })

    await analytics.track({ name: 'callback.completed', properties: { safe: 'byte-for-byte' } })
    posthog.capture('xhr.completed', { safe: 'byte-for-byte' }, { transport: 'XHR' })
    expect(xhrCalls).toBeGreaterThan(0)
    await vi.waitFor(() => expect(bodies.length).toBeGreaterThan(0), { timeout: 3000 })
    const payload = (await Promise.all(bodies.map(decodeBody))).join('\n')

    expect(payload).toContain('$current_url')
    expect(payload).not.toContain('posthog-sdk-secret')
    expect(payload).not.toContain('posthog-referrer-secret')
    expect(payload).toContain('view=full')
    expect(payload).toContain('byte-for-byte')
    posthog.reset()
  })
})
