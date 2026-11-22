// @vitest-environment jsdom
/**
 * The mount effect order between `ChatInner` and its parent `ChatPanel`.
 *
 * React runs a child's effects before its parent's. Svelte creates a parent's
 * effects first, so `ChatPanel` defers its mount fetch with `tick()`; this test
 * proves the deferral puts `ChatInner`'s mount effects — recorded here through
 * the ported `chat:chat:1` loading report — ahead of the outer conversation
 * fetch.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import type { ChatPanelProps } from '../props.js'
import {
  buildChatProvider,
  buildRejectingHttpClient,
  flush,
  mountPanel,
  responseOf,
  unmountPanel,
} from './chat-panel-harness.js'

describe('ChatPanel mount effect order', () => {
  beforeEach(() => {
    setClassMap(classMap)
    // The header renders the bonded glyphs (share, bug, gear); a name-keyed
    // proxy set keeps the icons from needing a concrete bond package here.
    setIconSet(
      new Proxy(
        {},
        {
          get: (_target, name) => ({
            paths: [{ d: `glyph:${String(name)}` }],
            viewBox: '0 0 16 16',
          }),
        },
      ),
    )
  })

  afterEach(() => {
    unmountPanel()
  })

  it('runs ChatInner’s mount effects before the outer conversation fetch', async () => {
    const events: string[] = []
    const base = buildRejectingHttpClient()
    const http: HttpClient = {
      ...base,
      get: async <T>(url: string): Promise<HttpResponse<T>> => {
        events.push(`get:${url}`)
        return responseOf({ conversations: [] })
      },
    }
    const props: Partial<ChatPanelProps> = {
      projectId: 'p1',
      // The ported `chat:chat:1` effect reports the session's loading state on
      // mount; the outer panel's mount work fetches the conversation list.
      onLoadingChange: (loading: boolean) => {
        events.push(`loading:${loading}`)
      },
    }

    mountPanel({ http, chat: buildChatProvider([]), props })
    await flush()

    const innerEffect = events.indexOf('loading:false')
    const outerFetch = events.findIndex((event) =>
      event.startsWith('get:/projects/p1/conversations'),
    )
    expect(innerEffect).toBeGreaterThanOrEqual(0)
    expect(outerFetch).toBeGreaterThanOrEqual(0)
    expect(outerFetch).toBeGreaterThan(innerEffect)
  })
})
