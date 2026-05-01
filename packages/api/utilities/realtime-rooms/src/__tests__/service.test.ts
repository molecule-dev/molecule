/**
 * Service tests — mock DataStore + realtime bond, exercise lifecycle,
 * authorisation, capacity, join-code, member listing, and broadcast
 * wiring.
 */

const {
  mockCreate,
  mockFindOne,
  mockFindMany,
  mockCount,
  mockDeleteMany,
  mockBroadcast,
  mockOnMessage,
} = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindOne: vi.fn(),
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
  mockDeleteMany: vi.fn(),
  mockBroadcast: vi.fn(),
  mockOnMessage: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findOne: mockFindOne,
  findMany: mockFindMany,
  count: mockCount,
  deleteMany: mockDeleteMany,
}))

vi.mock('@molecule/api-realtime', () => ({
  broadcast: mockBroadcast,
  onMessage: mockOnMessage,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  InvalidJoinCodeError,
  RoomCapacityExceededError,
  RoomNotFoundError,
  UnauthorizedRoomActionError,
} from '../errors.js'
import {
  assertCanAct,
  broadcast,
  channelFor,
  closeRoom,
  createRoom,
  joinRoom,
  leaveRoom,
  listMembers,
  subscribe,
} from '../service.js'

const ROOM_ID = '00000000-0000-0000-0000-000000000001'
const HOST = 'host-user'
const GUEST = 'guest-user'
const STRANGER = 'stranger-user'

const sampleRoomRow = (overrides: Record<string, unknown> = {}) => ({
  id: ROOM_ID,
  kind: 'quiz-session',
  owner_id: HOST,
  capacity: null,
  join_code: null,
  is_public: true,
  created_at: '2026-05-01T12:00:00Z',
  ...overrides,
})

const sampleMemberRow = (overrides: Record<string, unknown> = {}) => ({
  room_id: ROOM_ID,
  user_id: HOST,
  role: 'host',
  joined_at: '2026-05-01T12:00:00Z',
  ...overrides,
})

describe('@molecule/api-realtime-rooms service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreate.mockResolvedValue({ data: null, affected: 1 })
    mockDeleteMany.mockResolvedValue({ data: null, affected: 0 })
    mockFindMany.mockResolvedValue([])
    mockFindOne.mockResolvedValue(null)
    mockCount.mockResolvedValue(0)
    mockBroadcast.mockResolvedValue(undefined)
  })

  describe('channelFor', () => {
    it('returns a stable namespaced channel id', () => {
      expect(channelFor('abc')).toBe('realtime-rooms:abc')
    })
  })

  describe('createRoom', () => {
    it('inserts a public room and registers the owner as host', async () => {
      mockCreate.mockResolvedValueOnce({ data: sampleRoomRow(), affected: 1 })
      mockCreate.mockResolvedValueOnce({ data: null, affected: 1 })

      const room = await createRoom({ kind: 'quiz-session', ownerId: HOST })

      expect(room).toMatchObject({
        id: ROOM_ID,
        kind: 'quiz-session',
        ownerId: HOST,
        isPublic: true,
      })
      expect(mockCreate).toHaveBeenNthCalledWith(
        1,
        'realtime_rooms',
        expect.objectContaining({
          kind: 'quiz-session',
          owner_id: HOST,
          is_public: true,
          capacity: null,
          join_code: null,
        }),
      )
      expect(mockCreate).toHaveBeenNthCalledWith(
        2,
        'realtime_room_members',
        expect.objectContaining({ room_id: ROOM_ID, user_id: HOST, role: 'host' }),
      )
    })

    it('forces isPublic=false when a join code is supplied', async () => {
      mockCreate.mockResolvedValueOnce({
        data: sampleRoomRow({ join_code: 'ABC123', is_public: false }),
        affected: 1,
      })
      mockCreate.mockResolvedValueOnce({ data: null, affected: 1 })

      const room = await createRoom({
        kind: 'quiz-session',
        ownerId: HOST,
        joinCode: 'ABC123',
        isPublic: true, // explicitly true — should be overridden
      })

      expect(room.isPublic).toBe(false)
      expect(mockCreate).toHaveBeenNthCalledWith(
        1,
        'realtime_rooms',
        expect.objectContaining({ join_code: 'ABC123', is_public: false }),
      )
    })

    it('rejects capacity < 1', async () => {
      await expect(
        createRoom({ kind: 'quiz-session', ownerId: HOST, capacity: 0 }),
      ).rejects.toThrow(/capacity/)
    })

    it('refetches the row when DataStore returns null data', async () => {
      mockCreate.mockResolvedValueOnce({ data: null, affected: 1 })
      mockFindOne.mockResolvedValueOnce(sampleRoomRow())
      mockCreate.mockResolvedValueOnce({ data: null, affected: 1 })

      const room = await createRoom({
        kind: 'quiz-session',
        ownerId: HOST,
        id: ROOM_ID,
      })
      expect(room.id).toBe(ROOM_ID)
      expect(mockFindOne).toHaveBeenCalledWith('realtime_rooms', [
        { field: 'id', operator: '=', value: ROOM_ID },
      ])
    })
  })

  describe('joinRoom', () => {
    it('returns existing membership without re-inserting', async () => {
      mockFindOne
        .mockResolvedValueOnce(sampleRoomRow()) // loadRoom
        .mockResolvedValueOnce(sampleMemberRow({ user_id: GUEST, role: 'guest' })) // existing member

      const member = await joinRoom(ROOM_ID, GUEST)
      expect(member).toMatchObject({ roomId: ROOM_ID, userId: GUEST, role: 'guest' })
      // Only one create call expected — the membership insert did NOT fire.
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('rejects joins to non-existent rooms', async () => {
      mockFindOne.mockResolvedValueOnce(null)
      await expect(joinRoom(ROOM_ID, GUEST)).rejects.toBeInstanceOf(RoomNotFoundError)
    })

    it('rejects mismatched join codes', async () => {
      mockFindOne
        .mockResolvedValueOnce(sampleRoomRow({ join_code: 'ABC123', is_public: false }))
      await expect(joinRoom(ROOM_ID, GUEST, 'WRONG')).rejects.toBeInstanceOf(
        InvalidJoinCodeError,
      )
    })

    it('rejects missing join codes when one is required', async () => {
      mockFindOne.mockResolvedValueOnce(
        sampleRoomRow({ join_code: 'ABC123', is_public: false }),
      )
      await expect(joinRoom(ROOM_ID, GUEST)).rejects.toBeInstanceOf(InvalidJoinCodeError)
    })

    it('accepts a matching join code', async () => {
      mockFindOne
        .mockResolvedValueOnce(sampleRoomRow({ join_code: 'ABC123', is_public: false }))
        .mockResolvedValueOnce(null) // no existing member

      const member = await joinRoom(ROOM_ID, GUEST, 'ABC123')
      expect(member).toMatchObject({ roomId: ROOM_ID, userId: GUEST, role: 'guest' })
      expect(mockCreate).toHaveBeenCalledWith(
        'realtime_room_members',
        expect.objectContaining({ room_id: ROOM_ID, user_id: GUEST, role: 'guest' }),
      )
    })

    it('enforces capacity', async () => {
      mockFindOne
        .mockResolvedValueOnce(sampleRoomRow({ capacity: 2 }))
        .mockResolvedValueOnce(null)
      mockCount.mockResolvedValueOnce(2)

      await expect(joinRoom(ROOM_ID, GUEST)).rejects.toBeInstanceOf(
        RoomCapacityExceededError,
      )
    })

    it('admits when capacity has room remaining', async () => {
      mockFindOne
        .mockResolvedValueOnce(sampleRoomRow({ capacity: 5 }))
        .mockResolvedValueOnce(null)
      mockCount.mockResolvedValueOnce(3)

      const member = await joinRoom(ROOM_ID, GUEST)
      expect(member.role).toBe('guest')
    })
  })

  describe('leaveRoom', () => {
    it('issues a delete on the membership table', async () => {
      await leaveRoom(ROOM_ID, GUEST)
      expect(mockDeleteMany).toHaveBeenCalledWith('realtime_room_members', [
        { field: 'room_id', operator: '=', value: ROOM_ID },
        { field: 'user_id', operator: '=', value: GUEST },
      ])
    })
  })

  describe('closeRoom', () => {
    it('deletes members then the room', async () => {
      await closeRoom(ROOM_ID)
      expect(mockDeleteMany).toHaveBeenNthCalledWith(1, 'realtime_room_members', [
        { field: 'room_id', operator: '=', value: ROOM_ID },
      ])
      expect(mockDeleteMany).toHaveBeenNthCalledWith(2, 'realtime_rooms', [
        { field: 'id', operator: '=', value: ROOM_ID },
      ])
    })
  })

  describe('listMembers', () => {
    it('returns members ordered by joined_at ascending', async () => {
      mockFindMany.mockResolvedValueOnce([
        sampleMemberRow({ user_id: HOST, role: 'host', joined_at: '2026-05-01T12:00:00Z' }),
        sampleMemberRow({
          user_id: GUEST,
          role: 'guest',
          joined_at: '2026-05-01T12:30:00Z',
        }),
      ])

      const members = await listMembers(ROOM_ID)
      expect(members).toHaveLength(2)
      expect(members[0]).toMatchObject({ userId: HOST, role: 'host' })
      expect(members[1]).toMatchObject({ userId: GUEST, role: 'guest' })

      const [, opts] = mockFindMany.mock.calls[0]!
      expect(opts.where).toEqual([{ field: 'room_id', operator: '=', value: ROOM_ID }])
      expect(opts.orderBy).toEqual([{ field: 'joined_at', direction: 'asc' }])
    })
  })

  describe('assertCanAct', () => {
    it('throws when the user is not a member', async () => {
      mockFindOne.mockResolvedValueOnce(null)
      await expect(assertCanAct(ROOM_ID, STRANGER)).rejects.toBeInstanceOf(
        UnauthorizedRoomActionError,
      )
    })

    it('returns the membership when no role is required', async () => {
      mockFindOne.mockResolvedValueOnce(
        sampleMemberRow({ user_id: GUEST, role: 'guest' }),
      )
      const member = await assertCanAct(ROOM_ID, GUEST)
      expect(member).toMatchObject({ userId: GUEST, role: 'guest' })
    })

    it('throws when host role is required but caller is a guest', async () => {
      mockFindOne.mockResolvedValueOnce(
        sampleMemberRow({ user_id: GUEST, role: 'guest' }),
      )
      await expect(assertCanAct(ROOM_ID, GUEST, 'host')).rejects.toBeInstanceOf(
        UnauthorizedRoomActionError,
      )
    })

    it('passes when host role is required and caller is the host', async () => {
      mockFindOne.mockResolvedValueOnce(sampleMemberRow({ user_id: HOST, role: 'host' }))
      const member = await assertCanAct(ROOM_ID, HOST, 'host')
      expect(member.role).toBe('host')
    })

    it('passes when guest role is required and caller is host (host >= guest)', async () => {
      mockFindOne.mockResolvedValueOnce(sampleMemberRow({ user_id: HOST, role: 'host' }))
      const member = await assertCanAct(ROOM_ID, HOST, 'guest')
      expect(member.role).toBe('host')
    })

    it('exposes the offending room/user on the error', async () => {
      mockFindOne.mockResolvedValueOnce(null)
      try {
        await assertCanAct(ROOM_ID, STRANGER, 'host')
        expect.unreachable('expected throw')
      } catch (err) {
        expect(err).toBeInstanceOf(UnauthorizedRoomActionError)
        const e = err as UnauthorizedRoomActionError
        expect(e.roomId).toBe(ROOM_ID)
        expect(e.userId).toBe(STRANGER)
        expect(e.requiredRole).toBe('host')
      }
    })
  })

  describe('broadcast', () => {
    it('publishes to the bonded realtime provider on the room channel', async () => {
      const sentAt = new Date('2026-05-01T12:00:00Z')
      const result = await broadcast(ROOM_ID, {
        kind: 'question-asked',
        payload: { qid: 7 },
        sentAt,
      })

      expect(mockBroadcast).toHaveBeenCalledWith(
        channelFor(ROOM_ID),
        'question-asked',
        expect.objectContaining({
          roomId: ROOM_ID,
          payload: { qid: 7 },
          sentAt: sentAt.toISOString(),
        }),
      )
      expect(result).toEqual({
        roomId: ROOM_ID,
        kind: 'question-asked',
        payload: { qid: 7 },
        sentAt,
      })
    })

    it('defaults sentAt to the current time when omitted', async () => {
      const before = Date.now()
      const result = await broadcast(ROOM_ID, {
        kind: 'ping',
        payload: null,
      })
      const after = Date.now()
      expect(result.sentAt.getTime()).toBeGreaterThanOrEqual(before)
      expect(result.sentAt.getTime()).toBeLessThanOrEqual(after)
    })
  })

  describe('subscribe', () => {
    it('installs a realtime onMessage listener filtered to the room channel', () => {
      const handler = vi.fn()
      const unsubscribe = subscribe(ROOM_ID, handler)
      expect(mockOnMessage).toHaveBeenCalledTimes(1)

      const installed = mockOnMessage.mock.calls[0]?.[0] as (
        channel: string,
        clientId: string,
        kind: string,
        data: unknown,
      ) => void

      // Wrong channel — handler must NOT fire.
      installed('realtime-rooms:other', 'c-1', 'ping', { payload: 1 })
      expect(handler).not.toHaveBeenCalled()

      // Right channel — handler fires with normalised RoomEvent.
      const sentAt = '2026-05-01T12:00:00Z'
      installed(channelFor(ROOM_ID), 'c-1', 'ping', {
        roomId: ROOM_ID,
        payload: { x: 1 },
        sentAt,
      })
      expect(handler).toHaveBeenCalledTimes(1)
      const event = handler.mock.calls[0]?.[0] as {
        roomId: string
        kind: string
        payload: unknown
        sentAt: Date
      }
      expect(event.roomId).toBe(ROOM_ID)
      expect(event.kind).toBe('ping')
      expect(event.payload).toEqual({ x: 1 })
      expect(event.sentAt).toBeInstanceOf(Date)
      expect(event.sentAt.getTime()).toBe(new Date(sentAt).getTime())

      // After unsubscribe, the handler stops firing.
      unsubscribe()
      installed(channelFor(ROOM_ID), 'c-1', 'ping', { payload: { x: 2 } })
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('falls back to using the raw data as payload when shape is non-standard', () => {
      const handler = vi.fn()
      subscribe(ROOM_ID, handler)
      const installed = mockOnMessage.mock.calls[0]?.[0] as (
        channel: string,
        clientId: string,
        kind: string,
        data: unknown,
      ) => void
      installed(channelFor(ROOM_ID), 'c-1', 'raw', 'just-a-string')
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0]?.[0].payload).toBe('just-a-string')
    })
  })
})
