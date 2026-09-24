/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real Zoom bond with only
 * `fetch` (Zoom's OAuth + REST API) mocked.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/api-video-meetings-zoom'

import type { Meeting } from '../index.js'
import { createMeeting, listMeetings, setProvider } from '../index.js'

const zoomMeeting = (id: number, topic: string): Record<string, unknown> => ({
  id,
  topic,
  type: 2,
  start_time: '2027-01-15T17:00:00Z',
  duration: 60,
  timezone: 'America/New_York',
  join_url: `https://zoom.us/j/${id}`,
  start_url: `https://zoom.us/s/${id}?zak=host`,
})

describe('README @example', () => {
  const fetchMock = vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
    const url = new URL(String(input))
    if (url.hostname === 'zoom.us' && url.pathname === '/oauth/token') {
      return new Response(JSON.stringify({ access_token: 'zoom-token', expires_in: 3600 }))
    }
    if (url.pathname === '/v2/users/me/meetings' && _init?.method === 'POST') {
      return new Response(JSON.stringify(zoomMeeting(111, 'Quarterly review')), { status: 201 })
    }
    if (url.pathname === '/v2/users/me/meetings') {
      return url.searchParams.get('next_page_token') === 'page-2'
        ? new Response(JSON.stringify({ meetings: [zoomMeeting(222, 'Standup')] }))
        : new Response(
            JSON.stringify({
              meetings: [zoomMeeting(111, 'Quarterly review')],
              next_page_token: 'page-2',
            }),
          )
    }
    throw new Error(`Unexpected fetch: ${url.href}`)
  })

  beforeEach(() => {
    vi.stubEnv('ZOOM_ACCOUNT_ID', 'test-account')
    vi.stubEnv('ZOOM_CLIENT_ID', 'test-client')
    vi.stubEnv('ZOOM_CLIENT_SECRET', 'test-secret')
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('schedules a meeting and pages through every scheduled meeting', async () => {
    setProvider(
      createProvider({
        accountId: process.env.ZOOM_ACCOUNT_ID,
        clientId: process.env.ZOOM_CLIENT_ID,
        clientSecret: process.env.ZOOM_CLIENT_SECRET,
      }),
    )

    const meeting = await createMeeting({
      topic: 'Quarterly review',
      startTime: new Date('2027-01-15T17:00:00Z'),
      durationMinutes: 60,
      timezone: 'America/New_York',
      settings: { waitingRoom: true, muteUponEntry: true },
    })
    expect(meeting).toMatchObject({
      id: '111',
      joinUrl: 'https://zoom.us/j/111',
      startUrl: 'https://zoom.us/s/111?zak=host',
      durationMinutes: 60,
    })

    const all: Meeting[] = []
    let pageToken: string | undefined
    do {
      const page = await listMeetings('me', { type: 'scheduled', pageSize: 100, pageToken })
      all.push(...page.meetings)
      pageToken = page.nextPageToken
    } while (pageToken)

    expect(all.map((m) => m.topic)).toEqual(['Quarterly review', 'Standup'])
  })
})
