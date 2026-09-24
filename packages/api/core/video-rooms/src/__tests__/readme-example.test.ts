/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real Daily.co bond with
 * only `fetch` (the Daily.co REST API) mocked.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/api-video-rooms-daily-co'

import { createMeetingToken, createRoom, listRecordings, setProvider } from '../index.js'

describe('README @example', () => {
  const fetchMock = vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
    const url = String(input)
    if (url.endsWith('/rooms')) {
      return new Response(
        JSON.stringify({
          name: 'class-101',
          url: 'https://acme.daily.co/class-101',
          privacy: 'private',
          config: { max_participants: 30, enable_recording: 'cloud' },
        }),
      )
    }
    if (url.endsWith('/meeting-tokens')) {
      return new Response(JSON.stringify({ token: 'student-token' }))
    }
    if (url.includes('/recordings?room_name=class-101')) {
      return new Response(
        JSON.stringify({
          data: [
            { id: 'rec-1', room_name: 'class-101', duration: 3120, status: 'finished' },
            { id: 'rec-2', room_name: 'class-101', status: 'in-progress' },
          ],
        }),
      )
    }
    throw new Error(`Unexpected fetch: ${url}`)
  })

  beforeEach(() => {
    vi.stubEnv('DAILY_CO_API_KEY', 'test-daily-key')
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('creates a private room, mints a per-user token, and lists ready recordings', async () => {
    setProvider(createProvider({ apiKey: process.env.DAILY_CO_API_KEY }))

    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000)
    const room = await createRoom({
      name: 'class-101',
      privacy: 'private',
      maxParticipants: 30,
      recording: true,
      expiresAt: oneHourFromNow,
    })
    expect(room).toMatchObject({
      name: 'class-101',
      url: 'https://acme.daily.co/class-101',
      privacy: 'private',
      maxParticipants: 30,
      recording: true,
    })

    const studentToken = await createMeetingToken(room.name, {
      userName: 'Ada',
      expiresAt: oneHourFromNow,
    })
    expect(studentToken).toBe('student-token')
    const tokenBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)) as {
      properties: Record<string, unknown>
    }
    expect(tokenBody.properties).toMatchObject({
      room_name: 'class-101',
      user_name: 'Ada',
      exp: Math.floor(oneHourFromNow.getTime() / 1000),
    })

    const recordings = await listRecordings(room.name)
    const ready = recordings.filter((recording) => recording.status === 'ready')
    expect(ready).toEqual([{ id: 'rec-1', roomName: 'class-101', duration: 3120, status: 'ready' }])
  })
})
