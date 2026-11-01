import { afterEach, describe, expect, it, vi } from 'vitest'

const cleanups: Array<() => void> = []
const documents: Array<{ referrer: string }> = []
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.resetModules()
})

const setup = async (
  hooks?: Record<string, unknown>,
  batchRequests = false,
  referrer = 'https://ref.example.test/start?session=mixpanel-referrer-secret&safe=1',
) => {
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
    referrer,
    location,
    title: 'Callback',
    cookie: '',
    createElement: () => ({ style: {} }),
    getElementsByTagName: () => [],
    documentElement: {},
    body: { appendChild: () => {} },
  }
  documents.push(document)
  for (const retained of documents) retained.referrer = referrer
  const window = {
    location,
    document,
    navigator: { userAgent: 'round-eight-test', onLine: true },
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
    hooks,
    disable_persistence: true,
    batch_requests: batchRequests,
    api_payload_format: 'json',
  } as Parameters<typeof mixpanel.init>[1])
  // reset() clears identity, not the initialized singleton: replace hooks for each isolated case.
  mixpanel.set_config({ hooks: hooks ?? {} } as Parameters<typeof mixpanel.set_config>[0])
  if (batchRequests) {
    mixpanel.init_batchers()
    mixpanel.start_batch_senders()
  }
  const { createProvider } = await import('../provider.js')
  const analytics = await import('@molecule/app-analytics')
  analytics.setProvider(createProvider({ token: 'mixpanel-test-project' }))
  mixpanel.set_config({
    batch_requests: batchRequests,
    api_payload_format: 'json',
    disable_persistence: true,
    track_marketing: false,
  })
  cleanups.push(() => {
    mixpanel.stop_batch_senders()
    mixpanel.reset()
  })
  return { mixpanel, analytics, bodies }
}

const payload = (bodies: string[]): string => decodeURIComponent(bodies.join('\n'))

const expectCommonControls = (bodies: string[]): void => {
  const serialized = payload(bodies)
  expect(serialized).toContain('$current_url')
  expect(serialized).not.toContain('mixpanel-sdk-secret')
  expect(serialized).not.toContain('mixpanel-referrer-secret')
  expect(serialized).toContain('view=full')
  expect(serialized).toContain('byte-for-byte')
}

describe('round-eight Mixpanel final capture', () => {
  it('redacts registered credential fields in the serialized event body', async () => {
    const appHook = vi.fn((event) => {
      event.properties.$current_url = '/callback?token=app-hook-secret&view=full'
      event.properties.appHook = 'kept'
      return event
    })
    const { mixpanel, analytics, bodies } = await setup({ before_send_events: appHook })
    mixpanel.register({
      password: 'registered-password-secret',
      headers: { Authorization: 'Bearer registered-header-secret' },
    })

    await analytics.track({ name: 'callback.completed', properties: { safe: 'byte-for-byte' } })

    const serialized = payload(bodies)
    expect(appHook).toHaveBeenCalled()
    expect(serialized).toContain('kept')
    expect(serialized).not.toContain('registered-password-secret')
    expect(serialized).not.toContain('registered-header-secret')
    expect(serialized).toContain('mixpanel-test-project')
    expectCommonControls(bodies)
  })

  it('materializes a late serializer once and drops its credential result', async () => {
    const lateJSON = vi.fn(() => ({ password: 'late-json-secret' }))
    const appHook = vi.fn((event) => {
      if (event.event === 'drop.private') return null
      event.properties.$current_url = '/callback?token=app-hook-secret&view=full'
      event.properties.appHook = 'kept'
      event.properties.password = 'late-password-secret'
      event.properties.headers = { Authorization: 'Bearer late-header-secret' }
      event.properties.lateValue = { toJSON: lateJSON }
      return event
    })
    const { analytics, bodies } = await setup({ before_send_events: appHook })

    await analytics.track({ name: 'callback.completed', properties: { safe: 'byte-for-byte' } })
    await analytics.track({ name: 'drop.private' })

    const serialized = payload(bodies)
    expect(lateJSON).toHaveBeenCalledTimes(1)
    expect(serialized).toContain('kept')
    expect(serialized).not.toContain('app-hook-secret')
    expect(serialized).not.toContain('late-password-secret')
    expect(serialized).not.toContain('late-header-secret')
    expect(serialized).not.toContain('late-json-secret')
    expect(serialized).not.toContain('drop.private')
    expectCommonControls(bodies)
  })

  it('captures group updates after a preinitialized group hook', async () => {
    const appHook = vi.fn((event) => {
      event.$set = {
        ...event.$set,
        $current_url: '/callback?token=group-hook-secret&view=full',
        appHook: 'kept',
      }
      return event
    })
    const { analytics, bodies } = await setup({ before_send_groups: appHook })

    await analytics.group('company-1', { safe: 'byte-for-byte' })

    const serialized = payload(bodies)
    expect(appHook).toHaveBeenCalled()
    expect(serialized).toContain('kept')
    expect(serialized).not.toContain('group-hook-secret')
    expectCommonControls(bodies)
  })

  it('uses the same final capture for batched group updates', async () => {
    const appHook = vi.fn((event) => {
      event.$set = {
        ...event.$set,
        $current_url: '/callback?token=batch-group-secret&view=full',
      }
      return event
    })
    const { mixpanel, analytics, bodies } = await setup({ before_send_groups: appHook }, true)

    await analytics.group('company-1', { safe: 'byte-for-byte' })
    await vi.waitFor(() => expect(mixpanel.request_batchers.groups.queue.memQueue).toHaveLength(1))
    await mixpanel.request_batchers.groups.flush()

    expect(bodies.length).toBeGreaterThan(0)
    expect(payload(bodies)).not.toContain('batch-group-secret')
    expectCommonControls(bodies)
  })

  it('scrubs an identify on-track event name after earlier hooks change it', async () => {
    const onTrack = (name: string, properties: Record<string, unknown>) => [
      name === '$identify' ? '/identify?token=identify-name-secret&view=full' : name,
      properties,
    ]
    const { analytics, bodies } = await setup({ on_track: onTrack })

    await analytics.identify({ userId: 'user-1', traits: { safe: 'byte-for-byte' } })

    expect(payload(bodies)).not.toContain('identify-name-secret')
    expectCommonControls(bodies)
  })

  it('removes username-only userinfo from the SDK-derived referring domain', async () => {
    const { analytics, bodies } = await setup(
      undefined,
      false,
      'https://mixpanel-referrer-secret@ref.example.test/start?safe=1',
    )

    await analytics.track({ name: 'callback.completed', properties: { safe: 'byte-for-byte' } })

    const serialized = payload(bodies)
    expect(serialized).not.toContain('https://mixpanel-referrer-secret@')
    expect(serialized).toContain('[REDACTED]@ref.example.test')
    expectCommonControls(bodies)
  })

  it('does not walk ordinary event properties in on_track before their final event capture', async () => {
    const propertyRead = vi.fn(() => 'byte-for-byte')
    const onTrack = vi.fn((name: string, properties: Record<string, unknown>) => {
      Object.defineProperty(properties, 'readOnce', { enumerable: true, get: propertyRead })
      return [name, properties]
    })
    const beforeSend = vi.fn((event) => event)
    const { analytics } = await setup({ on_track: onTrack, before_send_events: beforeSend })

    await analytics.track({ name: 'callback.completed', properties: { safe: 'byte-for-byte' } })

    expect(onTrack).toHaveBeenCalled()
    expect(beforeSend).toHaveBeenCalled()
    // mixpanel's truncate performs the sole read; an on_track capture would add another.
    expect(propertyRead).toHaveBeenCalledTimes(1)
  })
})
