/**
 * Behavior tests for the shipped push service-worker source — the EXACT
 * bytes `importScripts`-ed into every fleet app's generated worker are
 * evaluated against a mock worker global, then real `push` /
 * `notificationclick` events are dispatched at the registered handlers.
 */

import { describe, expect, it, vi } from 'vitest'

import { moleculePushServiceWorkerPlugin, PUSH_SW_FILENAME, PUSH_SW_SOURCE } from '../push-sw.js'

interface FakeWindowClient {
  focus: ReturnType<typeof vi.fn>
  navigate?: ReturnType<typeof vi.fn>
}

/** Evaluate PUSH_SW_SOURCE against a fresh mock `self`; return the harness. */
const bootWorker = (clients: FakeWindowClient[] = []) => {
  const listeners = new Map<string, (event: unknown) => void>()
  const self = {
    addEventListener: (type: string, listener: (event: unknown) => void) => {
      listeners.set(type, listener)
    },
    registration: {
      showNotification: vi.fn().mockResolvedValue(undefined),
    },
    clients: {
      matchAll: vi.fn().mockResolvedValue(clients),
      openWindow: vi.fn().mockResolvedValue(null),
    },
  }
  // The source is an IIFE over `self`; the parameter shadows any global.
  new Function('self', PUSH_SW_SOURCE)(self)
  return { self, listeners }
}

/** Dispatch a push event carrying `payload` (or raw text when a string). */
const dispatchPush = async (
  harness: ReturnType<typeof bootWorker>,
  payload: unknown,
): Promise<void> => {
  const handler = harness.listeners.get('push')
  expect(handler, 'a push listener is registered').toBeDefined()
  const waits: Promise<unknown>[] = []
  handler!({
    data:
      payload === undefined
        ? null
        : {
            json: () => {
              if (typeof payload === 'string') throw new Error('not json')
              return payload
            },
            text: () => (typeof payload === 'string' ? payload : JSON.stringify(payload)),
          },
    waitUntil: (p: Promise<unknown>) => waits.push(p),
  })
  await Promise.all(waits)
}

/** Dispatch a notificationclick for a notification carrying `data`. */
const dispatchClick = async (
  harness: ReturnType<typeof bootWorker>,
  data: unknown,
): Promise<void> => {
  const handler = harness.listeners.get('notificationclick')
  expect(handler, 'a notificationclick listener is registered').toBeDefined()
  const waits: Promise<unknown>[] = []
  handler!({
    notification: { close: vi.fn(), data },
    waitUntil: (p: Promise<unknown>) => waits.push(p),
  })
  await Promise.all(waits)
}

describe('push handler', () => {
  it('shows a notification from the flat { title, body, href } payload (template fan-outs)', async () => {
    const harness = bootWorker()
    await dispatchPush(harness, {
      title: 'Game Final',
      body: 'ATL 3 - CHI 2 (Final)',
      href: '/matches/42',
    })
    expect(harness.self.registration.showNotification).toHaveBeenCalledWith('Game Final', {
      body: 'ATL 3 - CHI 2 (Final)',
      data: { href: '/matches/42' },
    })
  })

  it('shows a notification from the NotificationPayload { title, options } shape', async () => {
    const harness = bootWorker()
    await dispatchPush(harness, {
      title: 'Reminder',
      options: { body: 'Take 1 tablet', icon: '/icons/icon-192.svg', data: { href: '/today' } },
    })
    expect(harness.self.registration.showNotification).toHaveBeenCalledWith('Reminder', {
      body: 'Take 1 tablet',
      icon: '/icons/icon-192.svg',
      data: { href: '/today' },
    })
  })

  it('degrades a non-JSON payload to text-as-title', async () => {
    const harness = bootWorker()
    await dispatchPush(harness, 'plain text ping')
    expect(harness.self.registration.showNotification).toHaveBeenCalledWith('plain text ping', {
      data: {},
    })
  })

  it('shows nothing for an empty payload or one without a title', async () => {
    const harness = bootWorker()
    await dispatchPush(harness, undefined)
    await dispatchPush(harness, { body: 'no title' })
    expect(harness.self.registration.showNotification).not.toHaveBeenCalled()
  })
})

describe('notificationclick handler', () => {
  it('focuses an existing window and navigates it to the payload href', async () => {
    const client: FakeWindowClient = {
      focus: vi.fn().mockResolvedValue(undefined),
      navigate: vi.fn().mockResolvedValue(undefined),
    }
    const harness = bootWorker([client])
    await dispatchClick(harness, { href: '/matches/42' })
    expect(client.focus).toHaveBeenCalled()
    expect(client.navigate).toHaveBeenCalledWith('/matches/42')
    expect(harness.self.clients.openWindow).not.toHaveBeenCalled()
  })

  it('opens a new window at the href when no window exists', async () => {
    const harness = bootWorker([])
    await dispatchClick(harness, { href: '/channels/7' })
    expect(harness.self.clients.openWindow).toHaveBeenCalledWith('/channels/7')
  })

  it('opens the app root when the notification carries no href', async () => {
    const harness = bootWorker([])
    await dispatchClick(harness, undefined)
    expect(harness.self.clients.openWindow).toHaveBeenCalledWith('/')
  })

  it('only focuses (no navigate) when there is no href', async () => {
    const client: FakeWindowClient = {
      focus: vi.fn().mockResolvedValue(undefined),
      navigate: vi.fn().mockResolvedValue(undefined),
    }
    const harness = bootWorker([client])
    await dispatchClick(harness, {})
    expect(client.focus).toHaveBeenCalled()
    expect(client.navigate).not.toHaveBeenCalled()
  })
})

describe('moleculePushServiceWorkerPlugin', () => {
  it('emits push-sw.js into the bundle with the exact handler source', () => {
    const plugin = moleculePushServiceWorkerPlugin()
    const emitFile = vi.fn()
    const generateBundle = plugin.generateBundle as unknown as (this: {
      emitFile: typeof emitFile
    }) => void
    generateBundle.call({ emitFile })
    expect(emitFile).toHaveBeenCalledWith({
      type: 'asset',
      fileName: PUSH_SW_FILENAME,
      source: PUSH_SW_SOURCE,
    })
  })

  it('serves /push-sw.js from the dev server middleware', () => {
    const plugin = moleculePushServiceWorkerPlugin()
    const use = vi.fn()
    const configureServer = plugin.configureServer as unknown as (server: {
      middlewares: { use: typeof use }
    }) => void
    configureServer({ middlewares: { use } })
    expect(use).toHaveBeenCalledWith(`/${PUSH_SW_FILENAME}`, expect.any(Function))

    const handler = use.mock.calls[0][1] as (
      req: unknown,
      res: { setHeader: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> },
    ) => void
    const res = { setHeader: vi.fn(), end: vi.fn() }
    handler({}, res)
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/javascript')
    expect(res.end).toHaveBeenCalledWith(PUSH_SW_SOURCE)
  })
})
