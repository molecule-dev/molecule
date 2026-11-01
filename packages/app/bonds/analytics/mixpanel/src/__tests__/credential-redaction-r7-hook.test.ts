import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.resetModules()
})

describe('round-seven Mixpanel hook composition', () => {
  it('keeps a pre-initialized app hook and scrubs after it', async () => {
    const bodies: string[] = []
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
        bodies.push(String(body))
        this.readyState = 4
        this.onreadystatechange?.()
      }
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
      document,
      navigator: { userAgent: 'round-seven-test', onLine: true },
      screen: { width: 1024, height: 768 },
      XMLHttpRequest: TransportXHR,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
      CustomEvent: class {},
    }
    vi.stubGlobal('window', window)
    vi.stubGlobal('document', document)
    vi.stubGlobal('location', location)
    vi.stubGlobal('navigator', window.navigator)
    vi.stubGlobal('screen', window.screen)
    vi.stubGlobal('XMLHttpRequest', TransportXHR)

    const { default: mixpanel } = await import('mixpanel-browser')
    const appHook = vi.fn((event) => {
      if (event.event === 'drop.private') return null
      event.properties.$current_url = '/callback?token=app-hook-secret&view=full'
      event.properties.appHook = 'kept'
      return event
    })
    mixpanel.init('mixpanel-test-project', {
      track_pageview: false,
      hooks: { before_send_events: appHook },
      disable_persistence: true,
      batch_requests: false,
      api_payload_format: 'json',
    })
    const { createProvider } = await import('../provider.js')
    const analytics = await import('@molecule/app-analytics')
    analytics.setProvider(createProvider({ token: 'mixpanel-test-project' }))
    mixpanel.set_config({
      batch_requests: false,
      api_payload_format: 'json',
      disable_persistence: true,
      track_marketing: false,
    })

    await analytics.track({ name: 'callback.completed', properties: { safe: 'byte-for-byte' } })
    await analytics.track({ name: 'drop.private' })

    const payload = decodeURIComponent(bodies.join('\n'))
    expect(appHook).toHaveBeenCalled()
    expect(payload).toContain('kept')
    expect(payload).not.toContain('app-hook-secret')
    expect(payload).not.toContain('drop.private')
    expect(payload).toContain('$current_url')
    expect(payload).not.toContain('mixpanel-sdk-secret')
    expect(payload).not.toContain('mixpanel-referrer-secret')
    expect(payload).toContain('view=full')
    expect(payload).toContain('byte-for-byte')
    mixpanel.reset()
  })
})
