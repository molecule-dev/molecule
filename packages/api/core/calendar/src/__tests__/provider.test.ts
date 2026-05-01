vi.mock('@molecule/api-bond', () => {
  let store: Record<string, unknown> = {}
  return {
    bond: vi.fn((type: string, provider: unknown) => {
      store[type] = provider
    }),
    get: vi.fn((type: string) => store[type]),
    isBonded: vi.fn((type: string) => type in store),
    require: vi.fn((type: string) => {
      if (!(type in store)) throw new Error(`No provider bonded for '${type}'`)
      return store[type]
    }),
    __reset: () => {
      store = {}
    },
  }
})

vi.mock('@molecule/api-i18n', () => ({
  t: vi.fn((_key: string, _values?: unknown, options?: { defaultValue?: string }) => {
    return options?.defaultValue ?? _key
  }),
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as BondModule from '@molecule/api-bond'

import type * as ProviderModule from '../provider.js'
import type { CalendarProvider, CalendarUserCredentials } from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let getOptionalProvider: typeof ProviderModule.getOptionalProvider
let listCalendars: typeof ProviderModule.listCalendars
let listEvents: typeof ProviderModule.listEvents
let createEvent: typeof ProviderModule.createEvent
let updateEvent: typeof ProviderModule.updateEvent
let deleteEvent: typeof ProviderModule.deleteEvent
let findFreeSlots: typeof ProviderModule.findFreeSlots

const credentials: CalendarUserCredentials = {
  accessToken: 'access',
  refreshToken: 'refresh',
}

const createMockProvider = (overrides: Partial<CalendarProvider> = {}): CalendarProvider => ({
  listCalendars: vi.fn().mockResolvedValue({ data: [] }),
  listEvents: vi.fn().mockResolvedValue({ data: [] }),
  createEvent: vi.fn().mockResolvedValue({ data: { summary: 'X', start: '', end: '' } }),
  updateEvent: vi.fn().mockResolvedValue({ data: { summary: 'X', start: '', end: '' } }),
  deleteEvent: vi.fn().mockResolvedValue({ data: undefined }),
  findFreeSlots: vi.fn().mockResolvedValue({ data: { busy: [], freeSlots: [] } }),
  ...overrides,
})

describe('calendar provider', () => {
  beforeEach(async () => {
    vi.resetModules()

    const bondModule = (await import('@molecule/api-bond')) as typeof BondModule & {
      __reset: () => void
    }
    bondModule.__reset()

    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    getOptionalProvider = providerModule.getOptionalProvider
    listCalendars = providerModule.listCalendars
    listEvents = providerModule.listEvents
    createEvent = providerModule.createEvent
    updateEvent = providerModule.updateEvent
    deleteEvent = providerModule.deleteEvent
    findFreeSlots = providerModule.findFreeSlots
  })

  describe('setProvider / getProvider / hasProvider', () => {
    it('throws with i18n message when no provider is bonded', () => {
      expect(() => getProvider()).toThrow(
        'Calendar provider not configured. Call setProvider() first.',
      )
    })

    it('bonds and retrieves a provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)

      expect(hasProvider()).toBe(true)
      expect(getProvider()).toBe(mockProvider)
    })

    it('returns null from getOptionalProvider when no provider is bonded', () => {
      expect(getOptionalProvider()).toBeNull()
    })

    it('returns the bonded provider from getOptionalProvider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(getOptionalProvider()).toBe(mockProvider)
    })
  })

  describe('convenience wrappers', () => {
    it('listCalendars throws when no provider is bonded', async () => {
      await expect(async () => listCalendars(credentials)).rejects.toThrow(
        'Calendar provider not configured. Call setProvider() first.',
      )
    })

    it('listCalendars delegates to bonded provider', async () => {
      const mockProvider = createMockProvider({
        listCalendars: vi.fn().mockResolvedValue({ data: [{ id: 'primary', summary: 'Me' }] }),
      })
      setProvider(mockProvider)

      const result = await listCalendars(credentials)

      expect(mockProvider.listCalendars).toHaveBeenCalledWith(credentials)
      expect(result.data).toEqual([{ id: 'primary', summary: 'Me' }])
    })

    it('listEvents delegates with calendarId + options', async () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)

      const options = { timeMin: 'a', timeMax: 'b', maxResults: 10 }
      await listEvents(credentials, 'primary', options)

      expect(mockProvider.listEvents).toHaveBeenCalledWith(credentials, 'primary', options)
    })

    it('createEvent delegates with payload', async () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)

      const event = { summary: 'Lunch', start: '2026-05-02T12:00:00Z', end: '2026-05-02T13:00:00Z' }
      await createEvent(credentials, 'primary', event)

      expect(mockProvider.createEvent).toHaveBeenCalledWith(credentials, 'primary', event)
    })

    it('updateEvent delegates with id + partial payload', async () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)

      const updates = { summary: 'New Title' }
      await updateEvent(credentials, 'primary', 'evt-1', updates)

      expect(mockProvider.updateEvent).toHaveBeenCalledWith(
        credentials,
        'primary',
        'evt-1',
        updates,
      )
    })

    it('deleteEvent delegates', async () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)

      await deleteEvent(credentials, 'primary', 'evt-1')

      expect(mockProvider.deleteEvent).toHaveBeenCalledWith(credentials, 'primary', 'evt-1')
    })

    it('findFreeSlots delegates with calendar ids + options', async () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)

      const options = { timeMin: 'a', timeMax: 'b', durationMinutes: 30 }
      await findFreeSlots(credentials, ['primary', 'work'], options)

      expect(mockProvider.findFreeSlots).toHaveBeenCalledWith(
        credentials,
        ['primary', 'work'],
        options,
      )
    })
  })
})
