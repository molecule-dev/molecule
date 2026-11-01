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

describe('round-seven Mixpanel batched event transport control', () => {
  it('keeps safe fields while scrubbing batched events', async () => {
    const bodies: unknown[] = []
    class TransportXHR {
      status = 200
      statusText = 'OK'
      readyState = 0
      responseText = '1'
      withCredentials = false
      onreadystatechange?: () => void
      open(): void {}
      setRequestHeader(): void {}
      send(body: unknown): void {
        bodies.push(body)
        this.readyState = 4
        this.onreadystatechange?.()
      }
    }
    const values = new Map<string, string>()
    const localStorage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: unknown) => values.set(key, String(value)),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() {
        return values.size
      },
    }
    const location = {
      href: 'https://app.example.test/callback?token=mixpanel-sdk-secret&view=full',
      origin: 'https://app.example.test',
      protocol: 'https:',
      host: 'app.example.test',
      hostname: 'app.example.test',
      pathname: '/callback',
      search: '?token=mixpanel-sdk-secret&view=full',
      hash: '',
    }
    const document = {
      referrer: 'https://ref.example.test/start?session=mixpanel-referrer-secret&safe=1',
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
      localStorage,
      document,
      navigator: {
        userAgent: 'round-seven-test',
        onLine: true,
        sendBeacon: (_url: unknown, body: unknown) => {
          bodies.push(body)
          return true
        },
      },
      screen: { width: 1024, height: 768 },
      XMLHttpRequest: TransportXHR,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
      CustomEvent: class {},
    }
    vi.stubGlobal('localStorage', localStorage)
    vi.stubGlobal('window', window)
    vi.stubGlobal('document', document)
    vi.stubGlobal('location', location)
    vi.stubGlobal('navigator', window.navigator)
    vi.stubGlobal('screen', window.screen)
    vi.stubGlobal('XMLHttpRequest', TransportXHR)

    const { default: mixpanel } = await import('mixpanel-browser')
    const { createProvider } = await import('../provider.js')
    const analytics = await import('@molecule/app-analytics')
    analytics.setProvider(createProvider({ token: 'mixpanel-test-project' }))
    mixpanel.set_config({
      batch_requests: true,
      api_payload_format: 'json',
      disable_persistence: true,
      track_marketing: false,
    })

    await analytics.track({ name: 'callback.completed', properties: { safe: 'byte-for-byte' } })
    expect(mixpanel.request_batchers.events).toBeDefined()
    await new Promise((resolve) => setTimeout(resolve, 25))
    await mixpanel.request_batchers.events.flush()
    expect(bodies.length).toBeGreaterThan(0)
    mixpanel.stop_batch_senders()

    const payload = decodeURIComponent((await Promise.all(bodies.map(decodeBody))).join('\n'))
    expect(payload).toContain('$current_url')
    expect(payload).not.toContain('mixpanel-sdk-secret')
    expect(payload).not.toContain('mixpanel-referrer-secret')
    expect(payload).toContain('view=full')
    expect(payload).toContain('byte-for-byte')
    mixpanel.reset()
  })
})
