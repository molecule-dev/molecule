/**
 * `@molecule/app-contacts`
 * Type definitions for contacts module
 */

/**
 * A phone number entry for a contact with label (mobile, home, work) and primary flag.
 */
export interface PhoneNumber {
  /** Phone number string */
  number: string
  /** Label (e.g., 'mobile', 'home', 'work') */
  label?: string
  /** Whether this is the primary phone */
  isPrimary?: boolean
}

/**
 * An email address entry for a contact with label (home, work) and primary flag.
 */
export interface EmailAddress {
  /** Email address string */
  address: string
  /** Label (e.g., 'home', 'work') */
  label?: string
  /** Whether this is the primary email */
  isPrimary?: boolean
}

/**
 * A postal/mailing address for a contact (street, city, state, postal code, country).
 */
export interface PostalAddress {
  /** Street address line 1 */
  street?: string
  /** Street address line 2 */
  street2?: string
  /** City */
  city?: string
  /** State/province */
  state?: string
  /** Postal/ZIP code */
  postalCode?: string
  /** Country */
  country?: string
  /** Label (e.g., 'home', 'work') */
  label?: string
  /** Formatted address string */
  formatted?: string
}

/**
 * Contact organization
 */
export interface Organization {
  /** Company/organization name */
  company?: string
  /** Job title */
  title?: string
  /** Department */
  department?: string
}

/**
 * Structured name components for a contact (given, family, middle, prefix, suffix, display).
 */
export interface ContactName {
  /** Full display name */
  display?: string
  /** Given/first name */
  given?: string
  /** Middle name */
  middle?: string
  /** Family/last name */
  family?: string
  /** Name prefix (e.g., 'Mr.', 'Dr.') */
  prefix?: string
  /** Name suffix (e.g., 'Jr.', 'III') */
  suffix?: string
}

/**
 * Full contact record with name, phones, emails, addresses, organization, and metadata.
 */
export interface Contact {
  /** Contact ID */
  id: string
  /** Contact name */
  name: ContactName
  /** Phone numbers */
  phones?: PhoneNumber[]
  /** Email addresses */
  emails?: EmailAddress[]
  /** Postal addresses */
  addresses?: PostalAddress[]
  /** Organization info */
  organization?: Organization
  /** Birthday (ISO date string) */
  birthday?: string
  /** Note/memo */
  note?: string
  /** Photo as base64 data URL */
  photo?: string
  /** URLs (websites, social) */
  urls?: { url: string; label?: string }[]
  /** Custom fields */
  customFields?: Record<string, string>
}

/**
 * Contact creation/update data
 */
export type ContactInput = Omit<Contact, 'id'> & { id?: string }

/**
 * Contact query options
 */
export interface ContactQueryOptions {
  /** Search query string */
  query?: string
  /** Fields to include in results */
  fields?: (keyof Contact)[]
  /** Sort by field */
  sortBy?: 'name' | 'created' | 'modified'
  /** Sort direction */
  sortOrder?: 'asc' | 'desc'
  /** Maximum results */
  limit?: number
  /** Results offset */
  offset?: number
}

/**
 * Contact picker options
 */
export interface ContactPickerOptions {
  /** Allow multiple selection */
  multiple?: boolean
  /** Fields to request */
  fields?: (keyof Contact)[]
}

/**
 * Permission status
 */
export type ContactsPermissionStatus = 'granted' | 'denied' | 'limited' | 'prompt' | 'unsupported'

/**
 * Contacts capabilities
 */
export interface ContactsCapabilities {
  /** Whether contacts access is supported */
  supported: boolean
  /** Whether reading is supported */
  canRead: boolean
  /** Whether writing is supported */
  canWrite: boolean
  /** Whether contact picker is supported */
  hasPicker: boolean
  /** Whether photos are supported */
  supportsPhotos: boolean
  /** Maximum contacts that can be fetched */
  maxResults?: number
}

/**
 * Contacts provider interface
 */
export interface ContactsProvider {
  /**
   * Get all contacts, optionally filtered and sorted.
   * @param options - Query options (search, fields, sorting, pagination).
   * @returns An array of Contact objects matching the query.
   */
  getAll(options?: ContactQueryOptions): Promise<Contact[]>

  /**
   * Get a single contact by its ID.
   * @param id - The contact ID to look up.
   * @returns The matching Contact, or null if not found.
   */
  getById(id: string): Promise<Contact | null>

  /**
   * Search contacts
   * @param query - Search query
   * @param options - Query options
   */
  search(query: string, options?: Omit<ContactQueryOptions, 'query'>): Promise<Contact[]>

  /**
   * Create a new contact
   * @param contact - Contact data
   */
  create(contact: ContactInput): Promise<Contact>

  /**
   * Update an existing contact
   * @param id - Contact ID
   * @param contact - Updated contact data
   */
  update(id: string, contact: Partial<ContactInput>): Promise<Contact>

  /**
   * Delete a contact
   * @param id - Contact ID
   */
  delete(id: string): Promise<void>

  /**
   * Open native contact picker
   * @param options - Picker options
   */
  pick(options?: ContactPickerOptions): Promise<Contact[]>

  /**
   * Get permission status
   */
  getPermissionStatus(): Promise<ContactsPermissionStatus>

  /**
   * Request permission
   */
  requestPermission(): Promise<ContactsPermissionStatus>

  /**
   * Open system settings for contacts permission
   */
  openSettings(): Promise<void>

  /**
   * Get the platform's contacts capabilities.
   * @returns The capabilities indicating which contacts features are supported.
   */
  getCapabilities(): Promise<ContactsCapabilities>
}
