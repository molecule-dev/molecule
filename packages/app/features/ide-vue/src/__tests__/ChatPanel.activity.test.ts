// @vitest-environment jsdom
/**
 * The `chat:activity` slice and its timeline dispatch: the conversation's saved
 * activity cards are restored at mount, rendered in the transcript through the
 * shared `ActivityCard`, and (for an editor) written back through the same
 * endpoint; a read-only viewer never writes them back.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ChatMessage } from '@molecule/app-ai-chat'
import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { resetChatStoresForTests } from '@molecule/app-vue'

import {
  buildChatProvider,
  buildRejectingHttpClient,
  flush,
  makeStorage,
  mountPanel,
  type PanelMount,
  responseOf,
} from './chat-panel-harness.js'

/** The saved activity card the conversation restores. */
const SAVED_CARD = {
  id: 'act-1',
  activity: {
    id: 'act-1',
    type: 'email' as const,
    status: 'sent' as const,
    recipient: 'ada@example.test',
    summary: 'Welcome aboard',
    timestamp: '2023-11-14T22:13:22.000Z',
  },
  timestamp: 1699999940000,
}

/** One recorded request. */
interface Recorded {
  /** The method, uppercased. */
  method: string
  /** The requested path. */
  url: string
  /** The request body, when it had one. */
  data?: unknown
}

/**
 * An HTTP client that records every call and answers from a route table.
 *
 * @param requests - The recorded request sink.
 * @returns The recording client.
 */
function recordingHttp(requests: Recorded[]): HttpClient {
  const get = async <T>(url: string): Promise<HttpResponse<T>> => {
    requests.push({ method: 'GET', url })
    if (url.endsWith('/activity-cards')) {
      return responseOf({ activityCards: [SAVED_CARD] }) as HttpResponse<T>
    }
    if (url.startsWith('/ai/models'))
      return responseOf({ models: [], defaults: {} }) as HttpResponse<T>
    if (url.endsWith('/git-status')) return responseOf({ files: [] }) as HttpResponse<T>
    if (url.endsWith('/files-list')) return responseOf({ files: [] }) as HttpResponse<T>
    if (url.endsWith('/conversations')) return responseOf({ conversations: [] }) as HttpResponse<T>
    return responseOf({ settings: {} }) as HttpResponse<T>
  }
  const put = async <T>(url: string, data?: unknown): Promise<HttpResponse<T>> => {
    requests.push({ method: 'PUT', url, data })
    return responseOf({}) as HttpResponse<T>
  }
  return { ...buildRejectingHttpClient(), get, put }
}

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet(new Proxy({}, { get: () => ({ paths: [], viewBox: '0 0 16 16' }) }))
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
  Element.prototype.scrollIntoView = (): void => {}
})

afterEach(() => {
  mounted?.unmount()
  mounted = null
  document.body.innerHTML = ''
  resetChatStoresForTests()
})

/**
 * Mounts the real panel on a conversation with the saved card.
 *
 * @param canEdit - Whether the viewer may edit (drives the write-back).
 * @returns The requests recorded for this mount.
 */
async function mountWithSavedCard(canEdit: boolean | undefined): Promise<Recorded[]> {
  const requests: Recorded[] = []
  mounted = mountPanel({
    http: recordingHttp(requests),
    chat: buildChatProvider([] as ChatMessage[]),
    projectId: 'p1',
    props: { endpoint: '/projects/p1/chat?conversationId=c1', canEdit },
  })
  // Let the mount effects fire and the activity fetch resolve.
  for (let i = 0; i < 6; i += 1) await flush()
  return requests
}

describe('chat:activity restore and dispatch', () => {
  it('restores the saved cards from the conversation and renders them', async () => {
    const requests = await mountWithSavedCard(undefined)
    expect(
      requests.some(
        (request) =>
          request.method === 'GET' &&
          request.url === '/projects/p1/conversations/c1/activity-cards',
      ),
    ).toBe(true)
    expect(mounted).not.toBeNull()
    expect(mounted!.container.querySelector('[data-mol-id="activity-card-act-1"]')).not.toBeNull()
    expect(mounted?.container.textContent).toContain('Welcome aboard')
  })

  it('writes the viewer-captured cards back once the restore settles', async () => {
    const requests = await mountWithSavedCard(undefined)
    const put = requests.find(
      (request) =>
        request.method === 'PUT' && request.url === '/projects/p1/conversations/c1/activity-cards',
    )
    expect(put).toBeDefined()
    expect(put?.data).toEqual({ activityCards: [SAVED_CARD] })
  })

  it('never writes the cards back for a read-only viewer', async () => {
    const requests = await mountWithSavedCard(false)
    expect(
      requests.some(
        (request) =>
          request.method === 'PUT' &&
          request.url === '/projects/p1/conversations/c1/activity-cards',
      ),
    ).toBe(false)
    // The cards still restore and render for the viewer to read.
    expect(mounted).not.toBeNull()
    expect(mounted!.container.querySelector('[data-mol-id="activity-card-act-1"]')).not.toBeNull()
  })
})
