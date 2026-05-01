import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type {
  CreateMeetingTokenOptions,
  CreateRoomOptions,
  Recording,
  Room,
  RoomCreated,
  VideoRoomsProvider,
} from '../types.js'
import type * as VideoRoomsModule from '../video-rooms.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let createRoom: typeof VideoRoomsModule.createRoom
let deleteRoom: typeof VideoRoomsModule.deleteRoom
let getRoom: typeof VideoRoomsModule.getRoom
let createMeetingToken: typeof VideoRoomsModule.createMeetingToken
let listRecordings: typeof VideoRoomsModule.listRecordings

describe('video-rooms provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    const videoRoomsModule = await import('../video-rooms.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    createRoom = videoRoomsModule.createRoom
    deleteRoom = videoRoomsModule.deleteRoom
    getRoom = videoRoomsModule.getRoom
    createMeetingToken = videoRoomsModule.createMeetingToken
    listRecordings = videoRoomsModule.listRecordings
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Video rooms provider not configured. Call setProvider() first.',
      )
    })

    it('should report no provider via hasProvider', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should set and get provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should report provider via hasProvider after setting', () => {
      setProvider(createMockProvider())
      expect(hasProvider()).toBe(true)
    })
  })

  describe('createRoom', () => {
    it('should throw when no provider is set', async () => {
      await expect(createRoom()).rejects.toThrow('Video rooms provider not configured')
    })

    it('should delegate to provider with empty options by default', async () => {
      const created: RoomCreated = {
        name: 'auto-generated',
        url: 'https://example.daily.co/auto-generated',
      }
      const mockProvider = createMockProvider({
        createRoom: vi.fn().mockResolvedValue(created),
      })
      setProvider(mockProvider)

      const res = await createRoom()
      expect(res).toBe(created)
      expect(mockProvider.createRoom).toHaveBeenCalledWith({})
    })

    it('should pass options through', async () => {
      const options: CreateRoomOptions = {
        name: 'class-101',
        privacy: 'private',
        maxParticipants: 30,
        recording: true,
        expiresAt: new Date('2026-12-31T00:00:00Z'),
      }
      const created: RoomCreated = {
        name: 'class-101',
        url: 'https://example.daily.co/class-101',
        privacy: 'private',
        maxParticipants: 30,
        recording: true,
        expiresAt: options.expiresAt,
        token: 'owner-token',
      }
      const mockProvider = createMockProvider({
        createRoom: vi.fn().mockResolvedValue(created),
      })
      setProvider(mockProvider)

      const res = await createRoom(options)
      expect(res).toEqual(created)
      expect(mockProvider.createRoom).toHaveBeenCalledWith(options)
    })
  })

  describe('deleteRoom', () => {
    it('should throw when no provider is set', async () => {
      await expect(deleteRoom('class-101')).rejects.toThrow('Video rooms provider not configured')
    })

    it('should delegate to provider', async () => {
      const mockProvider = createMockProvider({
        deleteRoom: vi.fn().mockResolvedValue(undefined),
      })
      setProvider(mockProvider)

      await deleteRoom('class-101')
      expect(mockProvider.deleteRoom).toHaveBeenCalledWith('class-101')
    })
  })

  describe('getRoom', () => {
    it('should throw when no provider is set', async () => {
      await expect(getRoom('class-101')).rejects.toThrow('Video rooms provider not configured')
    })

    it('should return null when the provider reports no room', async () => {
      const mockProvider = createMockProvider({
        getRoom: vi.fn().mockResolvedValue(null),
      })
      setProvider(mockProvider)

      const res = await getRoom('missing')
      expect(res).toBeNull()
      expect(mockProvider.getRoom).toHaveBeenCalledWith('missing')
    })

    it('should return the room when the provider has it', async () => {
      const room: Room = {
        name: 'class-101',
        url: 'https://example.daily.co/class-101',
        privacy: 'private',
      }
      const mockProvider = createMockProvider({
        getRoom: vi.fn().mockResolvedValue(room),
      })
      setProvider(mockProvider)

      const res = await getRoom('class-101')
      expect(res).toBe(room)
    })
  })

  describe('createMeetingToken', () => {
    it('should throw when no provider is set', async () => {
      await expect(createMeetingToken('class-101')).rejects.toThrow(
        'Video rooms provider not configured',
      )
    })

    it('should delegate to provider with no options', async () => {
      const mockProvider = createMockProvider({
        createMeetingToken: vi.fn().mockResolvedValue('signed-token'),
      })
      setProvider(mockProvider)

      const res = await createMeetingToken('class-101')
      expect(res).toBe('signed-token')
      expect(mockProvider.createMeetingToken).toHaveBeenCalledWith('class-101', undefined)
    })

    it('should pass options through', async () => {
      const options: CreateMeetingTokenOptions = {
        isOwner: true,
        userName: 'Ada',
        expiresAt: new Date('2026-12-31T00:00:00Z'),
      }
      const mockProvider = createMockProvider({
        createMeetingToken: vi.fn().mockResolvedValue('signed-token'),
      })
      setProvider(mockProvider)

      await createMeetingToken('class-101', options)
      expect(mockProvider.createMeetingToken).toHaveBeenCalledWith('class-101', options)
    })
  })

  describe('listRecordings', () => {
    it('should throw when no provider is set', async () => {
      await expect(listRecordings('class-101')).rejects.toThrow(
        'Video rooms provider not configured',
      )
    })

    it('should delegate to provider', async () => {
      const recordings: Recording[] = [
        {
          id: 'rec-1',
          roomName: 'class-101',
          startedAt: new Date('2026-04-01T10:00:00Z'),
          duration: 1800,
          status: 'ready',
          downloadUrl: 'https://recordings.example.com/rec-1.mp4',
        },
      ]
      const mockProvider = createMockProvider({
        listRecordings: vi.fn().mockResolvedValue(recordings),
      })
      setProvider(mockProvider)

      const res = await listRecordings('class-101')
      expect(res).toBe(recordings)
      expect(mockProvider.listRecordings).toHaveBeenCalledWith('class-101')
    })

    it('should return an empty array when the room has no recordings', async () => {
      const mockProvider = createMockProvider({
        listRecordings: vi.fn().mockResolvedValue([]),
      })
      setProvider(mockProvider)

      const res = await listRecordings('class-101')
      expect(res).toEqual([])
    })
  })
})

describe('video-rooms types', () => {
  it('should accept a RoomCreated without optional token', () => {
    const created: RoomCreated = {
      name: 'class-101',
      url: 'https://example.daily.co/class-101',
    }
    expect(created.token).toBeUndefined()
  })

  it('should accept a RoomCreated with an owner token', () => {
    const created: RoomCreated = {
      name: 'class-101',
      url: 'https://example.daily.co/class-101',
      token: 'owner-token',
    }
    expect(created.token).toBe('owner-token')
  })

  it('should accept all CreateRoomOptions fields as optional', () => {
    const empty: CreateRoomOptions = {}
    expect(empty.name).toBeUndefined()
    expect(empty.privacy).toBeUndefined()
  })

  it('should expose VideoRoomsProvider as a structural type', () => {
    const provider: VideoRoomsProvider = createMockProvider()
    expect(typeof provider.createRoom).toBe('function')
    expect(typeof provider.deleteRoom).toBe('function')
    expect(typeof provider.getRoom).toBe('function')
    expect(typeof provider.createMeetingToken).toBe('function')
    expect(typeof provider.listRecordings).toBe('function')
  })
})

function createMockProvider(overrides?: Partial<VideoRoomsProvider>): VideoRoomsProvider {
  return {
    createRoom: vi.fn().mockResolvedValue({
      name: 'mock-room',
      url: 'https://example.daily.co/mock-room',
    }),
    deleteRoom: vi.fn().mockResolvedValue(undefined),
    getRoom: vi.fn().mockResolvedValue(null),
    createMeetingToken: vi.fn().mockResolvedValue('mock-token'),
    listRecordings: vi.fn().mockResolvedValue([]),
    ...overrides,
  }
}
