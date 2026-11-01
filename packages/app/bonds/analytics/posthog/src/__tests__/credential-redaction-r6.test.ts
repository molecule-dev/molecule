import { afterEach, describe, expect, it, vi } from 'vitest'

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

describe('round-six PostHog SDK egress', () => {
  it('scrubs URL properties the real SDK adds after the public analytics track call', async () => {
    const bodies: string[] = []
    const localStorage = storage()
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
      navigator: { userAgent: 'round-six-test', onLine: true },
      localStorage,
      screen: { width: 1024, height: 768 },
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }
    vi.stubGlobal('window', window)
    vi.stubGlobal('document', document)
    vi.stubGlobal('location', location)
    vi.stubGlobal('navigator', window.navigator)
    vi.stubGlobal('screen', window.screen)
    vi.stubGlobal('localStorage', localStorage)
    vi.stubGlobal(
      'fetch',
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.body) bodies.push(String(init.body))
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
    await vi.waitFor(() => expect(bodies.length).toBeGreaterThan(0))
    const payload = bodies.join('\n')

    expect(payload).toContain('$current_url')
    expect(payload).not.toContain('posthog-sdk-secret')
    expect(payload).not.toContain('posthog-referrer-secret')
    expect(payload).toContain('view=full')
    expect(payload).toContain('byte-for-byte')
    posthog.reset()
  })
})
