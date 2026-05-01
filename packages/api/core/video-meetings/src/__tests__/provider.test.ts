import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type {
  CreateMeetingOptions,
  ListMeetingsOptions,
  Meeting,
  MeetingPage,
  UpdateMeetingOptions,
  VideoMeetingsProvider,
} from '../types.js'
import type * as VideoMeetingsModule from '../video-meetings.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let createMeeting: typeof VideoMeetingsModule.createMeeting
let getMeeting: typeof VideoMeetingsModule.getMeeting
let updateMeeting: typeof VideoMeetingsModule.updateMeeting
let deleteMeeting: typeof VideoMeetingsModule.deleteMeeting
let listMeetings: typeof VideoMeetingsModule.listMeetings

describe('video-meetings provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    const videoMeetingsModule = await import('../video-meetings.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    createMeeting = videoMeetingsModule.createMeeting
    getMeeting = videoMeetingsModule.getMeeting
    updateMeeting = videoMeetingsModule.updateMeeting
    deleteMeeting = videoMeetingsModule.deleteMeeting
    listMeetings = videoMeetingsModule.listMeetings
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Video meetings provider not configured. Call setProvider() first.',
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

  describe('createMeeting', () => {
    it('should throw when no provider is set', async () => {
      await expect(createMeeting({ topic: 'x' })).rejects.toThrow(
        'Video meetings provider not configured',
      )
    })

    it('should pass options and userId through', async () => {
      const options: CreateMeetingOptions = {
        topic: 'Quarterly review',
        startTime: new Date('2027-01-15T17:00:00Z'),
        durationMinutes: 60,
        settings: { waitingRoom: true, autoRecording: 'cloud' },
      }
      const meeting: Meeting = {
        id: '12345',
        topic: options.topic,
        joinUrl: 'https://zoom.us/j/12345',
        startTime: options.startTime,
        durationMinutes: 60,
      }
      const mockProvider = createMockProvider({
        createMeeting: vi.fn().mockResolvedValue(meeting),
      })
      setProvider(mockProvider)

      const res = await createMeeting(options, 'user-1')
      expect(res).toBe(meeting)
      expect(mockProvider.createMeeting).toHaveBeenCalledWith(options, 'user-1')
    })

    it('should pass undefined userId when omitted', async () => {
      const mockProvider = createMockProvider({
        createMeeting: vi.fn().mockResolvedValue({
          id: '1',
          topic: 't',
          joinUrl: 'https://zoom.us/j/1',
        } satisfies Meeting),
      })
      setProvider(mockProvider)

      await createMeeting({ topic: 't' })
      expect(mockProvider.createMeeting).toHaveBeenCalledWith({ topic: 't' }, undefined)
    })
  })

  describe('getMeeting', () => {
    it('should throw when no provider is set', async () => {
      await expect(getMeeting('1')).rejects.toThrow('Video meetings provider not configured')
    })

    it('should return null when not found', async () => {
      const mockProvider = createMockProvider({
        getMeeting: vi.fn().mockResolvedValue(null),
      })
      setProvider(mockProvider)
      expect(await getMeeting('missing')).toBeNull()
      expect(mockProvider.getMeeting).toHaveBeenCalledWith('missing')
    })

    it('should return the meeting when present', async () => {
      const meeting: Meeting = { id: '42', topic: 'Sync', joinUrl: 'https://zoom.us/j/42' }
      const mockProvider = createMockProvider({
        getMeeting: vi.fn().mockResolvedValue(meeting),
      })
      setProvider(mockProvider)
      expect(await getMeeting('42')).toBe(meeting)
    })
  })

  describe('updateMeeting', () => {
    it('should throw when no provider is set', async () => {
      await expect(updateMeeting('1', {})).rejects.toThrow('Video meetings provider not configured')
    })

    it('should pass patch through', async () => {
      const patch: UpdateMeetingOptions = { topic: 'New topic', durationMinutes: 30 }
      const updated: Meeting = {
        id: '1',
        topic: 'New topic',
        joinUrl: 'https://zoom.us/j/1',
        durationMinutes: 30,
      }
      const mockProvider = createMockProvider({
        updateMeeting: vi.fn().mockResolvedValue(updated),
      })
      setProvider(mockProvider)
      const res = await updateMeeting('1', patch)
      expect(res).toBe(updated)
      expect(mockProvider.updateMeeting).toHaveBeenCalledWith('1', patch)
    })
  })

  describe('deleteMeeting', () => {
    it('should throw when no provider is set', async () => {
      await expect(deleteMeeting('1')).rejects.toThrow('Video meetings provider not configured')
    })

    it('should delegate to provider', async () => {
      const mockProvider = createMockProvider({
        deleteMeeting: vi.fn().mockResolvedValue(undefined),
      })
      setProvider(mockProvider)
      await deleteMeeting('1')
      expect(mockProvider.deleteMeeting).toHaveBeenCalledWith('1')
    })
  })

  describe('listMeetings', () => {
    it('should throw when no provider is set', async () => {
      await expect(listMeetings('me')).rejects.toThrow('Video meetings provider not configured')
    })

    it('should pass userId and options through', async () => {
      const options: ListMeetingsOptions = { type: 'scheduled', pageSize: 10 }
      const page: MeetingPage = {
        meetings: [{ id: '1', topic: 'a', joinUrl: 'https://zoom.us/j/1' }],
        nextPageToken: 'cursor',
      }
      const mockProvider = createMockProvider({
        listMeetings: vi.fn().mockResolvedValue(page),
      })
      setProvider(mockProvider)
      const res = await listMeetings('me', options)
      expect(res).toBe(page)
      expect(mockProvider.listMeetings).toHaveBeenCalledWith('me', options)
    })

    it('should default options to undefined when omitted', async () => {
      const mockProvider = createMockProvider({
        listMeetings: vi.fn().mockResolvedValue({ meetings: [] }),
      })
      setProvider(mockProvider)
      await listMeetings('me')
      expect(mockProvider.listMeetings).toHaveBeenCalledWith('me', undefined)
    })
  })
})

describe('video-meetings types', () => {
  it('should expose VideoMeetingsProvider as a structural type', () => {
    const provider: VideoMeetingsProvider = createMockProvider()
    expect(typeof provider.createMeeting).toBe('function')
    expect(typeof provider.getMeeting).toBe('function')
    expect(typeof provider.updateMeeting).toBe('function')
    expect(typeof provider.deleteMeeting).toBe('function')
    expect(typeof provider.listMeetings).toBe('function')
  })

  it('should accept a Meeting without optional host-only fields', () => {
    const m: Meeting = { id: '1', topic: 't', joinUrl: 'https://zoom.us/j/1' }
    expect(m.startUrl).toBeUndefined()
    expect(m.password).toBeUndefined()
  })

  it('should accept all CreateMeetingOptions fields beyond topic as optional', () => {
    const opts: CreateMeetingOptions = { topic: 'just a topic' }
    expect(opts.startTime).toBeUndefined()
    expect(opts.settings).toBeUndefined()
  })
})

function createMockProvider(overrides?: Partial<VideoMeetingsProvider>): VideoMeetingsProvider {
  return {
    createMeeting: vi
      .fn()
      .mockResolvedValue({ id: 'mock', topic: 'mock', joinUrl: 'https://zoom.us/j/mock' }),
    getMeeting: vi.fn().mockResolvedValue(null),
    updateMeeting: vi
      .fn()
      .mockResolvedValue({ id: 'mock', topic: 'mock', joinUrl: 'https://zoom.us/j/mock' }),
    deleteMeeting: vi.fn().mockResolvedValue(undefined),
    listMeetings: vi.fn().mockResolvedValue({ meetings: [] }),
    ...overrides,
  }
}
