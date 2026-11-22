// @vitest-environment jsdom
/**
 * The port's effect-order guarantee: the inner chat's mount effects run BEFORE
 * the outer panel's, as React's child effects do.
 *
 * React runs a child's effects before its parent's, so every request and
 * callback the outer `ChatPanel` makes on mount lands after `ChatInner`'s. Vue
 * gives the same order through `onMounted` (a parent's hook runs after all of
 * its children's) — but only if nothing runs during setup, where the parent's
 * work would land BEFORE the children exist. This mounts the real panel and
 * reads the order of the two mount reports.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import type { ChatMessage } from '@molecule/app-ai-chat'
import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { resetChatStoresForTests } from '@molecule/app-vue'

import {
  buildChatProvider,
  buildRejectingHttpClient,
  makeStorage,
  mountPanel,
  type PanelMount,
} from './chat-panel-harness.js'

/** One recorded `console.warn` call, flattened to text. */
const textOf = (call: unknown[]): string => call.map(String).join(' ')

/**
 * The outgoing requests plus the mount reports, in the order they happened.
 *
 * @param base - The rejecting client whose other methods are reused.
 * @param events - The shared event log.
 * @returns The recording client.
 */
function buildRecordingHttpClient(base: HttpClient, events: string[]): HttpClient {
  const record = (url: string): Promise<never> => {
    events.push(`http:GET ${url}`)
    return Promise.reject(new Error('http disabled in test'))
  }
  return { ...base, get: record }
}

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

/** The console.warn spy the port's `notPorted` reports reach. */
let warn: ReturnType<typeof vi.spyOn>

/** The interleaved mount-report / request log for the current mount. */
let events: string[] = []

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  resetChatStoresForTests()
  Object.defineProperty(globalThis, 'localStorage', {
    value: makeStorage(),
    configurable: true,
    writable: true,
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: makeStorage(),
    configurable: true,
    writable: true,
  })
  events = []
  warn = vi.spyOn(console, 'warn').mockImplementation((...call: unknown[]) => {
    events.push(`warn:${textOf(call)}`)
  })
})

afterEach(() => {
  mounted?.unmount()
  mounted = null
  warn.mockRestore()
})

it('runs the inner chat mount effects before the outer panel mount effect', () => {
  mounted = mountPanel({
    http: buildRecordingHttpClient(buildRejectingHttpClient(), events),
    chat: buildChatProvider([] as ChatMessage[]),
    props: {
      // The ported `chat:chat:1` effect reports the session's loading state on
      // mount; the outer panel's mount work fetches the conversation list.
      onLoadingChange: (loading: boolean) => {
        events.push(`loading:${loading}`)
      },
    },
  })

  const inner = events.findIndex((event) => event === 'loading:false')
  const outer = events.findIndex((event) => event === 'http:GET /projects/proj-test/conversations')

  expect(inner).toBeGreaterThanOrEqual(0)
  expect(outer).toBeGreaterThanOrEqual(0)
  expect(inner).toBeLessThan(outer)
})
