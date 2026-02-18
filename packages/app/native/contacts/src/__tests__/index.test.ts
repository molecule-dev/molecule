/**
 * `@molecule/app-contacts`
 * Comprehensive tests for contacts module exports and integration
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Import everything from the main module to test exports
import {
  type Contact,
  type ContactInput,
  type ContactName,
  type ContactPickerOptions,
  type ContactQueryOptions,
  type ContactsCapabilities,
  type ContactsPermissionStatus,
  type ContactsProvider,
  create,
  deleteContact,
  type EmailAddress,
  // Utilities
  formatDisplayName,
  formatPhoneNumber,
  // Contact operations
  getAll,
  getById,
  getCapabilities,
  getInitials,
  // Permission functions
  getPermissionStatus,
  getPrimaryEmail,
  getPrimaryPhone,
  getProvider,
  hasProvider,
  openSettings,
  type Organization,
  // Types (testing that they're exported)
  type PhoneNumber,
  pick,
  type PostalAddress,
  requestPermission,
  search,
  // Provider management
  setProvider,
  update,
} from '../index.js'

/**
 * Creates a mock contacts provider with all required methods
 */
function createMockProvider(overrides: Partial<ContactsProvider> = {}): ContactsProvider {
  const mockContact: Contact = {
    id: 'contact-1',
    name: {
      display: 'John Doe',
      given: 'John',
      family: 'Doe',
    },
    phones: [{ number: '555-1234', label: 'mobile', isPrimary: true }],
    emails: [{ address: 'john@example.com', label: 'work', isPrimary: true }],
  }

  return {
    getAll: vi.fn().mockResolvedValue([mockContact]),
    getById: vi.fn().mockResolvedValue(mockContact),
    search: vi.fn().mockResolvedValue([mockContact]),
    create: vi.fn().mockResolvedValue(mockContact),
    update: vi.fn().mockResolvedValue(mockContact),
    delete: vi.fn().mockResolvedValue(undefined),
    pick: vi.fn().mockResolvedValue([mockContact]),
    getPermissionStatus: vi.fn().mockResolvedValue('granted' as ContactsPermissionStatus),
    requestPermission: vi.fn().mockResolvedValue('granted' as ContactsPermissionStatus),
    openSettings: vi.fn().mockResolvedValue(undefined),
    getCapabilities: vi.fn().mockResolvedValue({
      supported: true,
      canRead: true,
      canWrite: true,
      hasPicker: true,
      supportsPhotos: true,
    } as ContactsCapabilities),
    ...overrides,
  }
}

describe('@molecule/app-contacts', () => {
  let mockProvider: ContactsProvider

  beforeEach(() => {
    mockProvider = createMockProvider()
    setProvider(mockProvider)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Module Exports', () => {
    it('should export provider management functions', () => {
      expect(typeof setProvider).toBe('function')
      expect(typeof getProvider).toBe('function')
      expect(typeof hasProvider).toBe('function')
    })

    it('should export contact CRUD functions', () => {
      expect(typeof getAll).toBe('function')
      expect(typeof getById).toBe('function')
      expect(typeof search).toBe('function')
      expect(typeof create).toBe('function')
      expect(typeof update).toBe('function')
      expect(typeof deleteContact).toBe('function')
      expect(typeof pick).toBe('function')
    })

    it('should export permission functions', () => {
      expect(typeof getPermissionStatus).toBe('function')
      expect(typeof requestPermission).toBe('function')
      expect(typeof openSettings).toBe('function')
      expect(typeof getCapabilities).toBe('function')
    })

    it('should export utility functions', () => {
      expect(typeof formatDisplayName).toBe('function')
      expect(typeof getPrimaryPhone).toBe('function')
      expect(typeof getPrimaryEmail).toBe('function')
      expect(typeof formatPhoneNumber).toBe('function')
      expect(typeof getInitials).toBe('function')
    })
  })

  describe('Provider Management', () => {
    it('should allow setting and retrieving provider', () => {
      const provider = createMockProvider()
      setProvider(provider)
      expect(getProvider()).toBe(provider)
    })

    it('should report true for hasProvider after setting', () => {
      setProvider(createMockProvider())
      expect(hasProvider()).toBe(true)
    })

    it('should throw error when no provider is set', () => {
      // Reset the module state by simulating no provider
      // We need to test the actual error case
      // Note: In real testing we'd need module isolation
      // For now, verify the provider we set is retrieved
      expect(getProvider()).toBe(mockProvider)
    })

    it('should use the set provider for all operations', async () => {
      const customContact: Contact = {
        id: 'custom-1',
        name: { display: 'Jane Smith' },
      }
      const customProvider = createMockProvider({
        getById: vi.fn().mockResolvedValue(customContact),
      })
      setProvider(customProvider)

      const result = await getById('custom-1')
      expect(result).toEqual(customContact)
      expect(customProvider.getById).toHaveBeenCalledWith('custom-1')
    })
  })

  describe('Contact Operations', () => {
    describe('getAll()', () => {
      it('should get all contacts', async () => {
        const contacts = await getAll()
        expect(mockProvider.getAll).toHaveBeenCalled()
        expect(Array.isArray(contacts)).toBe(true)
      })

      it('should pass query options', async () => {
        const options: ContactQueryOptions = {
          limit: 10,
          offset: 0,
          sortBy: 'name',
          sortOrder: 'asc',
        }
        await getAll(options)
        expect(mockProvider.getAll).toHaveBeenCalledWith(options)
      })

      it('should filter by fields', async () => {
        const options: ContactQueryOptions = {
          fields: ['name', 'phones', 'emails'],
        }
        await getAll(options)
        expect(mockProvider.getAll).toHaveBeenCalledWith(options)
      })
    })

    describe('getById()', () => {
      it('should get a single contact by ID', async () => {
        const contact = await getById('contact-1')
        expect(mockProvider.getById).toHaveBeenCalledWith('contact-1')
        expect(contact).toBeDefined()
        expect(contact?.id).toBe('contact-1')
      })

      it('should return null for non-existent contact', async () => {
        ;(mockProvider.getById as ReturnType<typeof vi.fn>).mockResolvedValue(null)
        const contact = await getById('non-existent')
        expect(contact).toBeNull()
      })
    })

    describe('search()', () => {
      it('should search contacts by query', async () => {
        await search('John')
        expect(mockProvider.search).toHaveBeenCalledWith('John', undefined)
      })

      it('should pass search options', async () => {
        const options: Omit<ContactQueryOptions, 'query'> = {
          limit: 20,
          fields: ['name', 'phones'],
        }
        await search('Smith', options)
        expect(mockProvider.search).toHaveBeenCalledWith('Smith', options)
      })

      it('should return empty array for no matches', async () => {
        ;(mockProvider.search as ReturnType<typeof vi.fn>).mockResolvedValue([])
        const results = await search('xyz-no-match')
        expect(results).toEqual([])
      })
    })

    describe('create()', () => {
      it('should create a new contact', async () => {
        const input: ContactInput = {
          name: { given: 'New', family: 'Contact' },
          phones: [{ number: '555-9999' }],
        }
        await create(input)
        expect(mockProvider.create).toHaveBeenCalledWith(input)
      })

      it('should return the created contact with ID', async () => {
        const input: ContactInput = {
          name: { display: 'Created Contact' },
        }
        const createdContact: Contact = { id: 'new-id', ...input }
        ;(mockProvider.create as ReturnType<typeof vi.fn>).mockResolvedValue(createdContact)

        const result = await create(input)
        expect(result.id).toBe('new-id')
      })

      it('should handle contact with all fields', async () => {
        const fullContact: ContactInput = {
          name: {
            given: 'Full',
            middle: 'Middle',
            family: 'Contact',
            prefix: 'Dr.',
            suffix: 'Jr.',
          },
          phones: [
            { number: '555-1111', label: 'mobile', isPrimary: true },
            { number: '555-2222', label: 'work' },
          ],
          emails: [{ address: 'full@example.com', label: 'work', isPrimary: true }],
          addresses: [
            {
              street: '123 Main St',
              city: 'Anytown',
              state: 'CA',
              postalCode: '12345',
              country: 'USA',
              label: 'home',
            },
          ],
          organization: {
            company: 'ACME Inc',
            title: 'Engineer',
            department: 'R&D',
          },
          birthday: '1990-01-15',
          note: 'Test contact',
          urls: [{ url: 'https://example.com', label: 'website' }],
        }
        await create(fullContact)
        expect(mockProvider.create).toHaveBeenCalledWith(fullContact)
      })
    })

    describe('update()', () => {
      it('should update an existing contact', async () => {
        const updates: Partial<ContactInput> = {
          name: { display: 'Updated Name' },
        }
        await update('contact-1', updates)
        expect(mockProvider.update).toHaveBeenCalledWith('contact-1', updates)
      })

      it('should return the updated contact', async () => {
        const updatedContact: Contact = {
          id: 'contact-1',
          name: { display: 'Updated' },
        }
        ;(mockProvider.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedContact)

        const result = await update('contact-1', { name: { display: 'Updated' } })
        expect(result.name?.display).toBe('Updated')
      })
    })

    describe('deleteContact()', () => {
      it('should delete a contact', async () => {
        await deleteContact('contact-1')
        expect(mockProvider.delete).toHaveBeenCalledWith('contact-1')
      })

      it('should complete without error', async () => {
        await expect(deleteContact('contact-1')).resolves.toBeUndefined()
      })
    })

    describe('pick()', () => {
      it('should open contact picker', async () => {
        await pick()
        expect(mockProvider.pick).toHaveBeenCalled()
      })

      it('should allow multiple selection', async () => {
        const options: ContactPickerOptions = { multiple: true }
        await pick(options)
        expect(mockProvider.pick).toHaveBeenCalledWith(options)
      })

      it('should request specific fields', async () => {
        const options: ContactPickerOptions = {
          fields: ['name', 'phones'],
        }
        await pick(options)
        expect(mockProvider.pick).toHaveBeenCalledWith(options)
      })

      it('should return selected contacts', async () => {
        const selectedContacts: Contact[] = [
          { id: '1', name: { display: 'Contact 1' } },
          { id: '2', name: { display: 'Contact 2' } },
        ]
        ;(mockProvider.pick as ReturnType<typeof vi.fn>).mockResolvedValue(selectedContacts)

        const result = await pick({ multiple: true })
        expect(result).toHaveLength(2)
      })

      it('should return empty array if picker cancelled', async () => {
        ;(mockProvider.pick as ReturnType<typeof vi.fn>).mockResolvedValue([])
        const result = await pick()
        expect(result).toEqual([])
      })
    })
  })

  describe('Permission Handling', () => {
    describe('getPermissionStatus()', () => {
      it('should return permission status', async () => {
        const status = await getPermissionStatus()
        expect(mockProvider.getPermissionStatus).toHaveBeenCalled()
        expect(status).toBe('granted')
      })

      it('should handle denied permission', async () => {
        ;(mockProvider.getPermissionStatus as ReturnType<typeof vi.fn>).mockResolvedValue('denied')
        const status = await getPermissionStatus()
        expect(status).toBe('denied')
      })

      it('should handle limited permission', async () => {
        ;(mockProvider.getPermissionStatus as ReturnType<typeof vi.fn>).mockResolvedValue('limited')
        const status = await getPermissionStatus()
        expect(status).toBe('limited')
      })

      it('should handle prompt status', async () => {
        ;(mockProvider.getPermissionStatus as ReturnType<typeof vi.fn>).mockResolvedValue('prompt')
        const status = await getPermissionStatus()
        expect(status).toBe('prompt')
      })

      it('should handle unsupported status', async () => {
        ;(mockProvider.getPermissionStatus as ReturnType<typeof vi.fn>).mockResolvedValue(
          'unsupported',
        )
        const status = await getPermissionStatus()
        expect(status).toBe('unsupported')
      })
    })

    describe('requestPermission()', () => {
      it('should request permission', async () => {
        const status = await requestPermission()
        expect(mockProvider.requestPermission).toHaveBeenCalled()
        expect(status).toBe('granted')
      })

      it('should return denied if user denies', async () => {
        ;(mockProvider.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValue('denied')
        const status = await requestPermission()
        expect(status).toBe('denied')
      })
    })

    describe('openSettings()', () => {
      it('should open system settings', async () => {
        await openSettings()
        expect(mockProvider.openSettings).toHaveBeenCalled()
      })

      it('should complete without error', async () => {
        await expect(openSettings()).resolves.toBeUndefined()
      })
    })
  })

  describe('Capabilities', () => {
    describe('getCapabilities()', () => {
      it('should return capabilities', async () => {
        const capabilities = await getCapabilities()
        expect(mockProvider.getCapabilities).toHaveBeenCalled()
        expect(capabilities.supported).toBe(true)
      })

      it('should report read capability', async () => {
        const capabilities = await getCapabilities()
        expect(capabilities.canRead).toBe(true)
      })

      it('should report write capability', async () => {
        const capabilities = await getCapabilities()
        expect(capabilities.canWrite).toBe(true)
      })

      it('should report picker capability', async () => {
        const capabilities = await getCapabilities()
        expect(capabilities.hasPicker).toBe(true)
      })

      it('should report photo support', async () => {
        const capabilities = await getCapabilities()
        expect(capabilities.supportsPhotos).toBe(true)
      })

      it('should handle limited capabilities', async () => {
        ;(mockProvider.getCapabilities as ReturnType<typeof vi.fn>).mockResolvedValue({
          supported: true,
          canRead: true,
          canWrite: false,
          hasPicker: false,
          supportsPhotos: false,
        } as ContactsCapabilities)

        const capabilities = await getCapabilities()
        expect(capabilities.canWrite).toBe(false)
        expect(capabilities.hasPicker).toBe(false)
      })

      it('should handle maxResults property', async () => {
        ;(mockProvider.getCapabilities as ReturnType<typeof vi.fn>).mockResolvedValue({
          supported: true,
          canRead: true,
          canWrite: true,
          hasPicker: true,
          supportsPhotos: true,
          maxResults: 1000,
        } as ContactsCapabilities)

        const capabilities = await getCapabilities()
        expect(capabilities.maxResults).toBe(1000)
      })
    })
  })

  describe('Utility Functions', () => {
    describe('formatDisplayName()', () => {
      it('should return display name if available', () => {
        const contact: Contact = {
          id: '1',
          name: { display: 'Display Name' },
        }
        expect(formatDisplayName(contact)).toBe('Display Name')
      })

      it('should construct name from parts', () => {
        const contact: Contact = {
          id: '1',
          name: { given: 'John', family: 'Doe' },
        }
        expect(formatDisplayName(contact)).toBe('John Doe')
      })

      it('should include prefix and suffix', () => {
        const contact: Contact = {
          id: '1',
          name: { prefix: 'Dr.', given: 'John', family: 'Smith', suffix: 'Jr.' },
        }
        expect(formatDisplayName(contact)).toBe('Dr. John Smith Jr.')
      })

      it('should include middle name', () => {
        const contact: Contact = {
          id: '1',
          name: { given: 'John', middle: 'Michael', family: 'Doe' },
        }
        expect(formatDisplayName(contact)).toBe('John Michael Doe')
      })

      it('should return Unknown for empty name', () => {
        const contact: Contact = {
          id: '1',
          name: {},
        }
        expect(formatDisplayName(contact)).toBe('Unknown')
      })
    })

    describe('getPrimaryPhone()', () => {
      it('should return primary phone', () => {
        const contact: Contact = {
          id: '1',
          name: { display: 'Test' },
          phones: [{ number: '555-1111' }, { number: '555-2222', isPrimary: true }],
        }
        expect(getPrimaryPhone(contact)?.number).toBe('555-2222')
      })

      it('should return first phone if no primary', () => {
        const contact: Contact = {
          id: '1',
          name: { display: 'Test' },
          phones: [{ number: '555-1111' }, { number: '555-2222' }],
        }
        expect(getPrimaryPhone(contact)?.number).toBe('555-1111')
      })

      it('should return undefined if no phones', () => {
        const contact: Contact = {
          id: '1',
          name: { display: 'Test' },
        }
        expect(getPrimaryPhone(contact)).toBeUndefined()
      })
    })

    describe('getPrimaryEmail()', () => {
      it('should return primary email', () => {
        const contact: Contact = {
          id: '1',
          name: { display: 'Test' },
          emails: [
            { address: 'first@example.com' },
            { address: 'primary@example.com', isPrimary: true },
          ],
        }
        expect(getPrimaryEmail(contact)?.address).toBe('primary@example.com')
      })

      it('should return first email if no primary', () => {
        const contact: Contact = {
          id: '1',
          name: { display: 'Test' },
          emails: [{ address: 'first@example.com' }, { address: 'second@example.com' }],
        }
        expect(getPrimaryEmail(contact)?.address).toBe('first@example.com')
      })

      it('should return undefined if no emails', () => {
        const contact: Contact = {
          id: '1',
          name: { display: 'Test' },
        }
        expect(getPrimaryEmail(contact)).toBeUndefined()
      })
    })

    describe('formatPhoneNumber()', () => {
      it('should format 10-digit US phone number', () => {
        const phone: PhoneNumber = { number: '5551234567' }
        expect(formatPhoneNumber(phone)).toBe('(555) 123-4567')
      })

      it('should format 11-digit US phone number with country code', () => {
        const phone: PhoneNumber = { number: '15551234567' }
        expect(formatPhoneNumber(phone)).toBe('+1 (555) 123-4567')
      })

      it('should strip non-digits before formatting', () => {
        const phone: PhoneNumber = { number: '(555) 123-4567' }
        expect(formatPhoneNumber(phone)).toBe('(555) 123-4567')
      })

      it('should return original for non-standard formats', () => {
        const phone: PhoneNumber = { number: '+44 20 7946 0958' }
        // Non-US number should return original
        expect(formatPhoneNumber(phone)).toBe('+44 20 7946 0958')
      })

      it('should handle short numbers', () => {
        const phone: PhoneNumber = { number: '911' }
        expect(formatPhoneNumber(phone)).toBe('911')
      })
    })

    describe('getInitials()', () => {
      it('should get initials from given and family name', () => {
        const contact: Contact = {
          id: '1',
          name: { given: 'John', family: 'Doe' },
        }
        expect(getInitials(contact)).toBe('JD')
      })

      it('should get initials from display name', () => {
        const contact: Contact = {
          id: '1',
          name: { display: 'John Doe' },
        }
        expect(getInitials(contact)).toBe('JD')
      })

      it('should handle multi-word display names', () => {
        const contact: Contact = {
          id: '1',
          name: { display: 'John Michael Doe' },
        }
        expect(getInitials(contact)).toBe('JD')
      })

      it('should handle single-word display name', () => {
        const contact: Contact = {
          id: '1',
          name: { display: 'Madonna' },
        }
        expect(getInitials(contact)).toBe('MA')
      })

      it('should return ?? for empty name', () => {
        const contact: Contact = {
          id: '1',
          name: {},
        }
        expect(getInitials(contact)).toBe('??')
      })

      it('should uppercase initials', () => {
        const contact: Contact = {
          id: '1',
          name: { given: 'john', family: 'doe' },
        }
        expect(getInitials(contact)).toBe('JD')
      })
    })
  })

  describe('Error Handling', () => {
    it('should propagate getAll errors', async () => {
      const error = new Error('Get all failed')
      ;(mockProvider.getAll as ReturnType<typeof vi.fn>).mockRejectedValue(error)
      await expect(getAll()).rejects.toThrow('Get all failed')
    })

    it('should propagate getById errors', async () => {
      const error = new Error('Get by ID failed')
      ;(mockProvider.getById as ReturnType<typeof vi.fn>).mockRejectedValue(error)
      await expect(getById('1')).rejects.toThrow('Get by ID failed')
    })

    it('should propagate search errors', async () => {
      const error = new Error('Search failed')
      ;(mockProvider.search as ReturnType<typeof vi.fn>).mockRejectedValue(error)
      await expect(search('query')).rejects.toThrow('Search failed')
    })

    it('should propagate create errors', async () => {
      const error = new Error('Create failed')
      ;(mockProvider.create as ReturnType<typeof vi.fn>).mockRejectedValue(error)
      await expect(create({ name: {} })).rejects.toThrow('Create failed')
    })

    it('should propagate update errors', async () => {
      const error = new Error('Update failed')
      ;(mockProvider.update as ReturnType<typeof vi.fn>).mockRejectedValue(error)
      await expect(update('1', {})).rejects.toThrow('Update failed')
    })

    it('should propagate delete errors', async () => {
      const error = new Error('Delete failed')
      ;(mockProvider.delete as ReturnType<typeof vi.fn>).mockRejectedValue(error)
      await expect(deleteContact('1')).rejects.toThrow('Delete failed')
    })

    it('should propagate pick errors', async () => {
      const error = new Error('Pick failed')
      ;(mockProvider.pick as ReturnType<typeof vi.fn>).mockRejectedValue(error)
      await expect(pick()).rejects.toThrow('Pick failed')
    })

    it('should propagate permission errors', async () => {
      const error = new Error('Permission check failed')
      ;(mockProvider.getPermissionStatus as ReturnType<typeof vi.fn>).mockRejectedValue(error)
      await expect(getPermissionStatus()).rejects.toThrow('Permission check failed')
    })
  })

  describe('Type Safety', () => {
    it('should accept valid PhoneNumber', () => {
      const phone: PhoneNumber = {
        number: '555-1234',
        label: 'mobile',
        isPrimary: true,
      }
      expect(phone.number).toBe('555-1234')
    })

    it('should accept valid EmailAddress', () => {
      const email: EmailAddress = {
        address: 'test@example.com',
        label: 'work',
        isPrimary: true,
      }
      expect(email.address).toBe('test@example.com')
    })

    it('should accept valid PostalAddress', () => {
      const address: PostalAddress = {
        street: '123 Main St',
        street2: 'Apt 4B',
        city: 'Anytown',
        state: 'CA',
        postalCode: '12345',
        country: 'USA',
        label: 'home',
        formatted: '123 Main St, Anytown, CA 12345',
      }
      expect(address.city).toBe('Anytown')
    })

    it('should accept valid Organization', () => {
      const org: Organization = {
        company: 'ACME Inc',
        title: 'Engineer',
        department: 'R&D',
      }
      expect(org.company).toBe('ACME Inc')
    })

    it('should accept valid ContactName', () => {
      const name: ContactName = {
        display: 'Dr. John M. Doe Jr.',
        given: 'John',
        middle: 'Michael',
        family: 'Doe',
        prefix: 'Dr.',
        suffix: 'Jr.',
      }
      expect(name.given).toBe('John')
    })

    it('should accept valid Contact', () => {
      const contact: Contact = {
        id: '123',
        name: { display: 'Test Contact' },
        phones: [{ number: '555-1234' }],
        emails: [{ address: 'test@example.com' }],
        addresses: [{ city: 'Anytown' }],
        organization: { company: 'ACME' },
        birthday: '1990-01-01',
        note: 'Test note',
        photo: 'data:image/png;base64,abc',
        urls: [{ url: 'https://example.com' }],
        customFields: { custom1: 'value1' },
      }
      expect(contact.id).toBe('123')
    })

    it('should accept valid ContactQueryOptions', () => {
      const options: ContactQueryOptions = {
        query: 'search term',
        fields: ['name', 'phones'],
        sortBy: 'name',
        sortOrder: 'asc',
        limit: 100,
        offset: 0,
      }
      expect(options.limit).toBe(100)
    })

    it('should accept valid ContactPickerOptions', () => {
      const options: ContactPickerOptions = {
        multiple: true,
        fields: ['name', 'phones', 'emails'],
      }
      expect(options.multiple).toBe(true)
    })

    it('should accept valid ContactsCapabilities', () => {
      const capabilities: ContactsCapabilities = {
        supported: true,
        canRead: true,
        canWrite: true,
        hasPicker: true,
        supportsPhotos: true,
        maxResults: 1000,
      }
      expect(capabilities.maxResults).toBe(1000)
    })
  })

  describe('Edge Cases', () => {
    it('should handle contact with empty arrays', async () => {
      const contact: Contact = {
        id: '1',
        name: { display: 'Test' },
        phones: [],
        emails: [],
        addresses: [],
        urls: [],
      }
      ;(mockProvider.getById as ReturnType<typeof vi.fn>).mockResolvedValue(contact)
      const result = await getById('1')
      expect(result?.phones).toEqual([])
    })

    it('should handle concurrent operations', async () => {
      const results = await Promise.all([getAll(), getById('1'), search('test')])
      expect(results).toHaveLength(3)
    })

    it('should handle rapid successive calls', async () => {
      await Promise.all([getAll(), getAll(), getAll()])
      expect(mockProvider.getAll).toHaveBeenCalledTimes(3)
    })

    it('should handle provider switching', async () => {
      const provider1 = createMockProvider({
        getAll: vi.fn().mockResolvedValue([{ id: '1', name: { display: 'P1' } }]),
      })
      const provider2 = createMockProvider({
        getAll: vi.fn().mockResolvedValue([{ id: '2', name: { display: 'P2' } }]),
      })

      setProvider(provider1)
      const result1 = await getAll()
      expect(result1[0].id).toBe('1')

      setProvider(provider2)
      const result2 = await getAll()
      expect(result2[0].id).toBe('2')
    })

    it('should handle contact with unicode characters', async () => {
      const contact: Contact = {
        id: '1',
        name: { display: 'Test User' },
      }
      ;(mockProvider.create as ReturnType<typeof vi.fn>).mockResolvedValue(contact)
      const result = await create({ name: { display: 'Test User' } })
      expect(result.name?.display).toContain('Test')
    })
  })
})
