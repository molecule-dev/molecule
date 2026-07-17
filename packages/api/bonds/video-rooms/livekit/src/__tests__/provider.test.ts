import {
  EncodedFileOutput,
  RoomCompositeEgressRequest,
  RoomEgress,
  S3Upload,
} from 'livekit-server-sdk'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { VideoRoomsProvider } from '@molecule/api-video-rooms'

import { createProvider } from '../provider.js'
import type {
  AccessTokenCtor,
  LiveKitEgressClient,
  LiveKitEgressInfo,
  LiveKitRoom,
  LiveKitRoomServiceClient,
} from '../types.js'

interface AccessTokenCallRecord {
  apiKey: string | undefined
  apiSecret: string | undefined
  options: unknown
  grants: Array<Record<string, unknown>>
}

/**
 * Test double for `livekit-server-sdk`'s `AccessToken`. Records the
 * constructor args and `addGrant` calls and produces a deterministic
 * fake JWT so we can assert what would have been signed.
 */
function makeAccessTokenCtor(): {
  ctor: AccessTokenCtor
  calls: AccessTokenCallRecord[]
} {
  const calls: AccessTokenCallRecord[] = []

  class FakeAccessToken {
    private record: AccessTokenCallRecord
    constructor(apiKey?: string, apiSecret?: string, options?: unknown) {
      this.record = { apiKey, apiSecret, options, grants: [] }
      calls.push(this.record)
    }
    addGrant(grant: Record<string, unknown>): void {
      this.record.grants.push(grant)
    }
    addInferenceGrant(): void {
      /* unused */
    }
    addSIPGrant(): void {
      /* unused */
    }
    addObservabilityGrant(): void {
      /* unused */
    }
    async toJwt(): Promise<string> {
      return `fake.jwt.for.${(this.record.options as { ttl?: number } | undefined)?.ttl ?? 'no-ttl'}`
    }
  }

  return { ctor: FakeAccessToken as unknown as AccessTokenCtor, calls }
}

/**
 * Test double for the LiveKit `RoomServiceClient`. Each method records
 * its call into `roomCalls` and either returns the queued response or
 * throws the queued error.
 */
function makeRoomServiceStub(): {
  client: LiveKitRoomServiceClient
  roomCalls: Array<{ op: string; args: unknown }>
  queueCreateRoom: (room: LiveKitRoom) => void
  queueListRooms: (rooms: LiveKitRoom[]) => void
  queueDeleteRoom: (result?: void) => void
  queueError: (op: 'createRoom' | 'listRooms' | 'deleteRoom', error: Error) => void
} {
  const roomCalls: Array<{ op: string; args: unknown }> = []
  const responses: Record<string, Array<{ value?: unknown; error?: Error }>> = {
    createRoom: [],
    listRooms: [],
    deleteRoom: [],
  }

  function dequeue(op: string): { value?: unknown; error?: Error } {
    return responses[op]!.shift() ?? { value: undefined }
  }

  const client: LiveKitRoomServiceClient = {
    async createRoom(args) {
      roomCalls.push({ op: 'createRoom', args })
      const next = dequeue('createRoom')
      if (next.error) throw next.error
      return next.value as LiveKitRoom
    },
    async listRooms(args) {
      roomCalls.push({ op: 'listRooms', args })
      const next = dequeue('listRooms')
      if (next.error) throw next.error
      return (next.value as LiveKitRoom[]) ?? []
    },
    async deleteRoom(args) {
      roomCalls.push({ op: 'deleteRoom', args })
      const next = dequeue('deleteRoom')
      if (next.error) throw next.error
    },
  }

  return {
    client,
    roomCalls,
    queueCreateRoom: (room) => responses.createRoom!.push({ value: room }),
    queueListRooms: (rooms) => responses.listRooms!.push({ value: rooms }),
    queueDeleteRoom: () => responses.deleteRoom!.push({ value: undefined }),
    queueError: (op, error) => responses[op]!.push({ error }),
  }
}

/**
 * Test double for the LiveKit `EgressClient`.
 */
function makeEgressStub(): {
  client: LiveKitEgressClient
  egressCalls: Array<{ args: unknown }>
  queue: (rows: LiveKitEgressInfo[]) => void
  queueError: (error: Error) => void
} {
  const egressCalls: Array<{ args: unknown }> = []
  const responses: Array<{ value?: LiveKitEgressInfo[]; error?: Error }> = []

  const client: LiveKitEgressClient = {
    async listEgress(args) {
      egressCalls.push({ args })
      const next = responses.shift() ?? { value: [] }
      if (next.error) throw next.error
      return next.value ?? []
    },
  }

  return {
    client,
    egressCalls,
    queue: (rows) => responses.push({ value: rows }),
    queueError: (error) => responses.push({ error }),
  }
}

const HOST = 'https://lk.example.test'

describe('@molecule/api-video-rooms-livekit', () => {
  let tokenCtor: ReturnType<typeof makeAccessTokenCtor>
  let roomStub: ReturnType<typeof makeRoomServiceStub>
  let egressStub: ReturnType<typeof makeEgressStub>

  beforeEach(() => {
    tokenCtor = makeAccessTokenCtor()
    roomStub = makeRoomServiceStub()
    egressStub = makeEgressStub()
    process.env.LIVEKIT_API_KEY = 'APItestkey'
    process.env.LIVEKIT_API_SECRET = 'super-test-secret-12345'
    process.env.LIVEKIT_URL = HOST
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.LIVEKIT_API_KEY
    delete process.env.LIVEKIT_API_SECRET
    delete process.env.LIVEKIT_URL
  })

  function buildProvider(overrides: Record<string, unknown> = {}): VideoRoomsProvider {
    return createProvider({
      host: HOST,
      apiKey: 'APItestkey',
      apiSecret: 'super-test-secret-12345',
      roomServiceClient: roomStub.client,
      egressClient: egressStub.client,
      accessTokenCtor: tokenCtor.ctor,
      ...overrides,
    })
  }

  describe('createProvider', () => {
    it('throws when no host is configured', () => {
      delete process.env.LIVEKIT_URL
      expect(() =>
        createProvider({
          apiKey: 'k',
          apiSecret: 's',
          accessTokenCtor: tokenCtor.ctor,
          roomServiceClient: roomStub.client,
          egressClient: egressStub.client,
        }),
      ).toThrow(/host is required/)
    })

    it('throws when no api key is configured', () => {
      delete process.env.LIVEKIT_API_KEY
      expect(() =>
        createProvider({
          host: HOST,
          apiSecret: 's',
          accessTokenCtor: tokenCtor.ctor,
          roomServiceClient: roomStub.client,
          egressClient: egressStub.client,
        }),
      ).toThrow(/apiKey is required/)
    })

    it('throws when no api secret is configured and never includes the secret in the message', () => {
      delete process.env.LIVEKIT_API_SECRET
      try {
        createProvider({
          host: HOST,
          apiKey: 'APItestkey',
          accessTokenCtor: tokenCtor.ctor,
          roomServiceClient: roomStub.client,
          egressClient: egressStub.client,
        })
      } catch (error) {
        expect(String(error)).toMatch(/apiSecret is required/)
        return
      }
      throw new Error('expected createProvider to throw')
    })

    it('reads env vars when no explicit config is given', async () => {
      const provider = createProvider({
        roomServiceClient: roomStub.client,
        egressClient: egressStub.client,
        accessTokenCtor: tokenCtor.ctor,
      })

      roomStub.queueCreateRoom({ name: 'class-101', maxParticipants: 0 })
      const result = await provider.createRoom({ name: 'class-101' })
      expect(result.name).toBe('class-101')
      expect(tokenCtor.calls[0]!.apiKey).toBe('APItestkey')
      expect(tokenCtor.calls[0]!.apiSecret).toBe('super-test-secret-12345')
    })

    it('rewrites a wss:// host into https:// for service clients while exposing wss:// to clients', async () => {
      const provider = createProvider({
        host: 'wss://lk.example.test',
        apiKey: 'k',
        apiSecret: 's',
        roomServiceClient: roomStub.client,
        egressClient: egressStub.client,
        accessTokenCtor: tokenCtor.ctor,
      })

      roomStub.queueCreateRoom({ name: 'class-101' })
      const result = await provider.createRoom({ name: 'class-101' })
      expect(result.url).toBe('wss://lk.example.test')
    })
  })

  describe('createRoom', () => {
    let provider: VideoRoomsProvider

    beforeEach(() => {
      provider = buildProvider()
    })

    it('creates the room, mints an owner token, and returns a normalised result', async () => {
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
      roomStub.queueCreateRoom({
        name: 'class-101',
        maxParticipants: 30,
        emptyTimeout: 600,
      })

      const result = await provider.createRoom({
        name: 'class-101',
        maxParticipants: 30,
        privacy: 'private',
        expiresAt,
      })

      expect(roomStub.roomCalls).toHaveLength(1)
      expect(roomStub.roomCalls[0]!.op).toBe('createRoom')
      const args = roomStub.roomCalls[0]!.args as Record<string, unknown>
      expect(args.name).toBe('class-101')
      expect(args.maxParticipants).toBe(30)
      expect(typeof args.emptyTimeout).toBe('number')
      // No recording requested → no auto-egress attached.
      expect(args.egress).toBeUndefined()

      expect(result.name).toBe('class-101')
      expect(result.url).toBe(HOST.replace('https://', 'wss://'))
      expect(result.maxParticipants).toBe(30)
      // LiveKit is always token-gated → the true privacy state is `private`.
      expect(result.privacy).toBe('private')
      // Recording was not requested → not reported as enabled.
      expect(result.recording).toBeUndefined()
      expect(result.expiresAt).toBe(expiresAt)
      expect(typeof result.token).toBe('string')
      expect(result.token).toMatch(/^fake\.jwt\.for\./)

      // Owner token: roomAdmin: true, plus publish/subscribe.
      const grant = tokenCtor.calls[0]!.grants[0]!
      expect(grant.room).toBe('class-101')
      expect(grant.roomJoin).toBe(true)
      expect(grant.roomAdmin).toBe(true)
      expect(grant.canPublish).toBe(true)
      expect(grant.canSubscribe).toBe(true)
    })

    it('reports privacy as private even when privacy is omitted (all rooms are token-gated)', async () => {
      roomStub.queueCreateRoom({ name: 'class-101' })
      const result = await provider.createRoom({ name: 'class-101' })
      expect(result.privacy).toBe('private')
    })

    it('throws when a public room is requested and never creates a room', async () => {
      await expect(provider.createRoom({ name: 'class-101', privacy: 'public' })).rejects.toThrow(
        /does not support public/,
      )
      // Fails before touching the SDK — no orphan room is created.
      expect(roomStub.roomCalls).toHaveLength(0)
    })

    it('attaches the configured recordingEgress to the room and reports recording enabled', async () => {
      const egressSpec = new RoomEgress({
        room: new RoomCompositeEgressRequest({
          roomName: 'class-101',
          output: {
            case: 'file',
            value: new EncodedFileOutput({
              filepath: 'recordings/class-101.mp4',
              output: { case: 's3', value: new S3Upload({ bucket: 'rec-bucket' }) },
            }),
          },
        }),
      })
      const recordingProvider = buildProvider({ recordingEgress: egressSpec })

      // The freshly created room has no active egress yet (no participants).
      roomStub.queueCreateRoom({ name: 'class-101', activeRecording: false })

      const result = await recordingProvider.createRoom({ name: 'class-101', recording: true })

      const args = roomStub.roomCalls[0]!.args as { egress?: RoomEgress }
      // The real SDK auto-egress spec reaches RoomServiceClient.createRoom.
      expect(args.egress).toBe(egressSpec)
      // Recording is enabled for the room even before it becomes active.
      expect(result.recording).toBe(true)
    })

    it('passes the room name to a recordingEgress factory and forwards its result', async () => {
      const built: Array<{ roomName: string; egress: RoomEgress }> = []
      const recordingProvider = buildProvider({
        recordingEgress: (roomName: string) => {
          const egress = new RoomEgress({
            room: new RoomCompositeEgressRequest({ roomName }),
          })
          built.push({ roomName, egress })
          return egress
        },
      })

      roomStub.queueCreateRoom({ name: 'standup' })
      await recordingProvider.createRoom({ name: 'standup', recording: true })

      expect(built).toHaveLength(1)
      expect(built[0]!.roomName).toBe('standup')
      const args = roomStub.roomCalls[0]!.args as { egress?: RoomEgress }
      expect(args.egress).toBe(built[0]!.egress)
    })

    it('throws when recording is requested but no recordingEgress is configured', async () => {
      await expect(provider.createRoom({ name: 'class-101', recording: true })).rejects.toThrow(
        /no egress output is configured/,
      )
      // Fails before touching the SDK — no room is created without recording.
      expect(roomStub.roomCalls).toHaveLength(0)
    })

    it('does not attach egress or report recording when recording is false', async () => {
      const egressSpec = new RoomEgress({})
      const recordingProvider = buildProvider({ recordingEgress: egressSpec })
      roomStub.queueCreateRoom({ name: 'class-101' })

      const result = await recordingProvider.createRoom({ name: 'class-101', recording: false })

      const args = roomStub.roomCalls[0]!.args as { egress?: RoomEgress }
      expect(args.egress).toBeUndefined()
      expect(result.recording).toBeUndefined()
    })

    it('auto-generates a name when none is provided', async () => {
      roomStub.queueCreateRoom({ name: 'whatever-the-server-returns' })

      const result = await provider.createRoom({})
      const args = roomStub.roomCalls[0]!.args as { name: string }
      expect(args.name).toMatch(/^room-/)
      expect(result.name).toBe('whatever-the-server-returns')
    })

    it('redacts the api secret from createRoom errors', async () => {
      roomStub.queueError('createRoom', new Error('boom: super-test-secret-12345 leaked'))
      try {
        await provider.createRoom({ name: 'x' })
      } catch (error) {
        const msg = String(error)
        expect(msg).toContain('LiveKit createRoom failed')
        expect(msg).not.toContain('super-test-secret-12345')
        expect(msg).toContain('[redacted]')
        return
      }
      throw new Error('expected createRoom to throw')
    })
  })

  describe('deleteRoom', () => {
    let provider: VideoRoomsProvider

    beforeEach(() => {
      provider = buildProvider()
    })

    it('forwards to RoomServiceClient.deleteRoom', async () => {
      roomStub.queueDeleteRoom()
      await provider.deleteRoom('class-101')
      expect(roomStub.roomCalls.at(-1)!.op).toBe('deleteRoom')
      expect(roomStub.roomCalls.at(-1)!.args).toBe('class-101')
    })

    it('treats not_found errors as a no-op (idempotent)', async () => {
      roomStub.queueError('deleteRoom', new Error('twirp error not_found: room missing'))
      await expect(provider.deleteRoom('missing')).resolves.toBeUndefined()
    })

    it('treats errors with code=not_found as a no-op', async () => {
      const err = new Error('upstream rejected the request')
      ;(err as Error & { code?: string }).code = 'not_found'
      roomStub.queueError('deleteRoom', err)
      await expect(provider.deleteRoom('missing')).resolves.toBeUndefined()
    })

    it('rethrows non-not-found errors with the secret redacted', async () => {
      roomStub.queueError(
        'deleteRoom',
        new Error('500 internal error from super-test-secret-12345'),
      )
      try {
        await provider.deleteRoom('class-101')
      } catch (error) {
        const msg = String(error)
        expect(msg).toContain('LiveKit deleteRoom failed')
        expect(msg).not.toContain('super-test-secret-12345')
        return
      }
      throw new Error('expected deleteRoom to throw')
    })
  })

  describe('getRoom', () => {
    let provider: VideoRoomsProvider

    beforeEach(() => {
      provider = buildProvider()
    })

    it('returns the mapped room when listRooms includes it', async () => {
      roomStub.queueListRooms([
        { name: 'other', maxParticipants: 10 },
        { name: 'class-101', maxParticipants: 20, activeRecording: true },
      ])

      const room = await provider.getRoom('class-101')
      expect(roomStub.roomCalls.at(-1)!.op).toBe('listRooms')
      expect(roomStub.roomCalls.at(-1)!.args).toEqual(['class-101'])
      expect(room).toEqual({
        name: 'class-101',
        url: HOST.replace('https://', 'wss://'),
        maxParticipants: 20,
        recording: true,
      })
    })

    it('returns null when no room with that name is returned', async () => {
      roomStub.queueListRooms([{ name: 'other' }])
      expect(await provider.getRoom('class-101')).toBeNull()
    })

    it('returns null when the list is empty', async () => {
      roomStub.queueListRooms([])
      expect(await provider.getRoom('class-101')).toBeNull()
    })

    it('rethrows listRooms errors with the secret redacted', async () => {
      roomStub.queueError('listRooms', new Error('boom: super-test-secret-12345'))
      try {
        await provider.getRoom('class-101')
      } catch (error) {
        const msg = String(error)
        expect(msg).toContain('LiveKit getRoom failed')
        expect(msg).not.toContain('super-test-secret-12345')
        return
      }
      throw new Error('expected getRoom to throw')
    })
  })

  describe('createMeetingToken', () => {
    let provider: VideoRoomsProvider

    beforeEach(() => {
      provider = buildProvider()
    })

    it('issues an owner token (roomAdmin=true, full publish+subscribe)', async () => {
      const token = await provider.createMeetingToken('class-101', {
        isOwner: true,
        userName: 'Ada',
      })

      expect(typeof token).toBe('string')
      const call = tokenCtor.calls[0]!
      expect(call.apiKey).toBe('APItestkey')
      expect(call.apiSecret).toBe('super-test-secret-12345')
      const opts = call.options as { ttl: number; identity: string; name: string }
      expect(opts.identity).toBe('Ada')
      expect(opts.name).toBe('Ada')
      expect(opts.ttl).toBeGreaterThan(0)

      const grant = call.grants[0]!
      expect(grant.room).toBe('class-101')
      expect(grant.roomJoin).toBe(true)
      expect(grant.roomAdmin).toBe(true)
      expect(grant.canPublish).toBe(true)
      expect(grant.canSubscribe).toBe(true)
      expect(grant.canUpdateOwnMetadata).toBe(true)
    })

    it('issues a non-owner token without roomAdmin but with publish+subscribe', async () => {
      await provider.createMeetingToken('class-101')

      const grant = tokenCtor.calls[0]!.grants[0]!
      expect(grant.roomAdmin).toBe(false)
      expect(grant.canUpdateOwnMetadata).toBe(false)
      expect(grant.canPublish).toBe(true)
      expect(grant.canSubscribe).toBe(true)
    })

    it('uses the configured defaultTokenTtl when no expiresAt is given', async () => {
      const provider2 = buildProvider({ defaultTokenTtl: 99 })
      await provider2.createMeetingToken('class-101')
      const opts = tokenCtor.calls[0]!.options as { ttl: number }
      expect(opts.ttl).toBe(99)
    })

    it('redacts the api secret from token-issuance errors', async () => {
      class ExplodingAccessToken {
        constructor(_a?: string, _b?: string, _c?: unknown) {
          /* no-op */
        }
        addGrant(): void {
          /* no-op */
        }
        async toJwt(): Promise<string> {
          throw new Error('signing failed: super-test-secret-12345 was used')
        }
      }
      const provider2 = buildProvider({
        accessTokenCtor: ExplodingAccessToken as unknown as AccessTokenCtor,
      })

      try {
        await provider2.createMeetingToken('class-101')
      } catch (error) {
        const msg = String(error)
        expect(msg).toContain('LiveKit createMeetingToken failed')
        expect(msg).not.toContain('super-test-secret-12345')
        expect(msg).toContain('[redacted]')
        return
      }
      throw new Error('expected createMeetingToken to throw')
    })
  })

  describe('listRecordings', () => {
    let provider: VideoRoomsProvider

    beforeEach(() => {
      provider = buildProvider()
    })

    it('GETs ListEgress filtered by room and maps each row', async () => {
      egressStub.queue([
        {
          egressId: 'eg-1',
          roomName: 'class-101',
          status: 3, // EGRESS_COMPLETE
          startedAt: 1_700_000_000,
          fileResults: [
            { location: 'https://recordings.example/eg-1.mp4', duration: 1_800_000_000_000 },
          ],
        },
        {
          egressId: 'eg-2',
          roomName: 'class-101',
          status: 1, // EGRESS_ACTIVE
          startedAt: 1_700_010_000,
        },
        {
          egressId: 'eg-3',
          roomName: 'class-101',
          status: 4, // EGRESS_FAILED
        },
      ])

      const recordings = await provider.listRecordings('class-101')

      expect(egressStub.egressCalls).toHaveLength(1)
      expect(egressStub.egressCalls[0]!.args).toEqual({ roomName: 'class-101' })
      expect(recordings).toHaveLength(3)
      expect(recordings[0]).toEqual({
        id: 'eg-1',
        roomName: 'class-101',
        status: 'ready',
        startedAt: new Date(1_700_000_000 * 1000),
        downloadUrl: 'https://recordings.example/eg-1.mp4',
        duration: 1800,
      })
      expect(recordings[1]!.status).toBe('processing')
      expect(recordings[2]!.status).toBe('failed')
    })

    it('returns an empty array when no egresses match', async () => {
      egressStub.queue([])
      expect(await provider.listRecordings('class-101')).toEqual([])
    })

    it('redacts the api secret from listEgress errors', async () => {
      egressStub.queueError(new Error('500: super-test-secret-12345 boom'))
      try {
        await provider.listRecordings('class-101')
      } catch (error) {
        const msg = String(error)
        expect(msg).toContain('LiveKit listRecordings failed')
        expect(msg).not.toContain('super-test-secret-12345')
        return
      }
      throw new Error('expected listRecordings to throw')
    })

    it('coerces bigint timestamps and durations correctly', async () => {
      egressStub.queue([
        {
          egressId: 'eg-bigint',
          roomName: 'class-101',
          status: 3,
          startedAt: 1_700_000_000n,
          fileResults: [
            { location: 'https://recordings.example/x.mp4', duration: 600_000_000_000n },
          ],
        },
      ])

      const [rec] = await provider.listRecordings('class-101')
      expect(rec!.startedAt).toEqual(new Date(1_700_000_000 * 1000))
      expect(rec!.duration).toBe(600)
    })
  })
})
