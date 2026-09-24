/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch` from the
 * LiveKit Twirp client) is stubbed — tokens are signed and verified with the
 * real `livekit-server-sdk`.
 *
 * @module
 */
import { TokenVerifier } from 'livekit-server-sdk'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createMeetingToken, createRoom, setProvider } from '@molecule/api-video-rooms'

import { createProvider } from '../index.js'

describe('README @example', () => {
  beforeEach(() => {
    vi.stubEnv('LIVEKIT_URL', 'wss://livekit.example.com')
    vi.stubEnv('LIVEKIT_API_KEY', 'test-api-key')
    vi.stubEnv('LIVEKIT_API_SECRET', 'test-api-secret-that-is-long-enough-for-hs256')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('creates a token-gated room and issues a participant token', async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response(
          JSON.stringify({ sid: 'RM_123', name: 'standup-2026-10-01', maxParticipants: 10 }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    )
    vi.stubGlobal('fetch', fetchMock)

    setProvider(
      createProvider({
        host: process.env.LIVEKIT_URL,
        apiKey: process.env.LIVEKIT_API_KEY,
        apiSecret: process.env.LIVEKIT_API_SECRET,
      }),
    )

    const room = await createRoom({ name: 'standup-2026-10-01', maxParticipants: 10 })

    const token = await createMeetingToken(room.name, {
      userName: 'grace-hopper',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    })

    expect(room).toMatchObject({
      name: 'standup-2026-10-01',
      url: 'wss://livekit.example.com',
      privacy: 'private',
      maxParticipants: 10,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toBe('https://livekit.example.com/twirp/livekit.RoomService/CreateRoom')
    expect(JSON.parse(String(init?.body))).toMatchObject({
      name: 'standup-2026-10-01',
      maxParticipants: 10,
    })

    const verifier = new TokenVerifier(
      'test-api-key',
      'test-api-secret-that-is-long-enough-for-hs256',
    )
    const ownerGrants = await verifier.verify(room.token ?? '')
    expect(ownerGrants.video).toMatchObject({
      room: 'standup-2026-10-01',
      roomJoin: true,
      roomAdmin: true,
    })

    const participant = await verifier.verify(token)
    expect(participant.sub).toBe('grace-hopper')
    expect(participant.video).toMatchObject({
      room: 'standup-2026-10-01',
      roomJoin: true,
      roomAdmin: false,
      canPublish: true,
      canSubscribe: true,
    })
  })
})
