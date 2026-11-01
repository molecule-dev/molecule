import { afterEach, describe, expect, it, vi } from 'vitest'

const cleanups: Array<() => void> = []
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.resetModules()
})

const setup = async () => {
  class TransportXHR {
    status = 200
    statusText = 'OK'
    readyState = 0
    responseText = '1'
    withCredentials = false
    onreadystatechange?: () => void
    open(): void {}
    setRequestHeader(): void {}
    send(): void {
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
    navigator: { userAgent: 'round-nine-test', onLine: true },
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
  mixpanel.init('mixpanel-test-project', {
    track_pageview: false,
    disable_persistence: true,
    api_payload_format: 'json',
  })
  const transport = vi.fn()
  Object.assign(window, { fetch: transport })
  const { createProvider } = await import('../provider.js')
  createProvider({ token: 'mixpanel-test-project' })
  cleanups.push(() => mixpanel.reset())
  return { mixpanel, window, transport }
}

describe('round-nine Mixpanel replay transport', () => {
  it('captures replay query metadata and rrweb request bodies at the real transport', async () => {
    const { mixpanel, window, transport } = await setup()
    const requests: Array<{ url: string; body: string }> = []
    transport.mockImplementation(async (url, init) => {
      requests.push({ url: String(url), body: String(init?.body) })
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
    })
    // @ts-expect-error The installed SDK's recorder has no public module declaration.
    const { SessionRecording } = await import('mixpanel-browser/src/recorder/session-recording.js')
    const recorder = new SessionRecording({
      mixpanelInstance: mixpanel,
      replayId: 'safe-replay-id',
      replayStartUrl: window.location.href,
      batchStartUrl: window.location.href,
    })
    try {
      await new Promise<void>((resolve) =>
        recorder._flushEvents(
          [
            {
              type: 4,
              timestamp: 1,
              data: { href: window.location.href, width: 1024, height: 768 },
            },
            {
              type: 2,
              timestamp: 2,
              data: {
                node: { type: 0, id: 1, childNodes: [] },
                initialOffset: { left: 0, top: 0 },
              },
            },
          ],
          {},
          () => resolve(),
        ),
      )
      expect(requests.length).toBeGreaterThan(0)
      const request = requests[0]
      expect(decodeURIComponent(request.url)).not.toContain('mixpanel-sdk-secret')
      expect(decodeURIComponent(request.url)).toContain('view=full')
      expect(decodeURIComponent(request.url)).toContain('safe-replay-id')
      expect(request.body).not.toContain('mixpanel-sdk-secret')
      expect(request.body).toContain('view=full')
      expect(request.body).toContain('"width":1024')
    } finally {
      recorder.stopRecording()
    }
  })

  it('passes non-recorder application requests through byte-for-byte', async () => {
    const { window, transport } = await setup()
    const requests: Array<{ url: string; body: string }> = []
    transport.mockImplementation(async (url, init) => {
      requests.push({ url: String(url), body: String(init?.body) })
      return new Response('{}')
    })
    const url = 'https://app.example.test/api?token=application-owned&safe=1'
    await window.fetch(url, { method: 'POST', body: 'password=application-owned' })
    expect(requests).toEqual([{ url, body: 'password=application-owned' }])
  })
})
