# @molecule/app-contacts

Contacts access interface for molecule.dev

## Type
`native`

## Installation
```bash
npm install @molecule/app-contacts
```

## API

### Interfaces

#### `Contact`

Full contact record with name, phones, emails, addresses, organization, and metadata.

```typescript
interface Contact {
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
```

#### `ContactName`

Structured name components for a contact (given, family, middle, prefix, suffix, display).

```typescript
interface ContactName {
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
```

#### `ContactPickerOptions`

Contact picker options

```typescript
interface ContactPickerOptions {
  /** Allow multiple selection */
  multiple?: boolean
  /** Fields to request */
  fields?: (keyof Contact)[]
}
```

#### `ContactQueryOptions`

Contact query options

```typescript
interface ContactQueryOptions {
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
```

#### `ContactsCapabilities`

Contacts capabilities

```typescript
interface ContactsCapabilities {
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
```

#### `ContactsProvider`

Contacts provider interface

```typescript
interface ContactsProvider {
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
```

#### `EmailAddress`

An email address entry for a contact with label (home, work) and primary flag.

```typescript
interface EmailAddress {
  /** Email address string */
  address: string
  /** Label (e.g., 'home', 'work') */
  label?: string
  /** Whether this is the primary email */
  isPrimary?: boolean
}
```

#### `Organization`

Contact organization

```typescript
interface Organization {
  /** Company/organization name */
  company?: string
  /** Job title */
  title?: string
  /** Department */
  department?: string
}
```

#### `PhoneNumber`

A phone number entry for a contact with label (mobile, home, work) and primary flag.

```typescript
interface PhoneNumber {
  /** Phone number string */
  number: string
  /** Label (e.g., 'mobile', 'home', 'work') */
  label?: string
  /** Whether this is the primary phone */
  isPrimary?: boolean
}
```

#### `PostalAddress`

A postal/mailing address for a contact (street, city, state, postal code, country).

```typescript
interface PostalAddress {
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
```

### Types

#### `ContactInput`

Contact creation/update data

```typescript
type ContactInput = Omit<Contact, 'id'> & { id?: string }
```

#### `ContactsPermissionStatus`

Permission status

```typescript
type ContactsPermissionStatus = 'granted' | 'denied' | 'limited' | 'prompt' | 'unsupported'
```

### Functions

#### `create(contact)`

Create a new contact on the device.

```typescript
function create(contact: ContactInput): Promise<Contact>
```

- `contact` — The contact data to create.

**Returns:** The created Contact with its assigned ID.

#### `deleteContact(id)`

Delete a contact from the device.

```typescript
function deleteContact(id: string): Promise<void>
```

- `id` — The ID of the contact to delete.

**Returns:** A promise that resolves when the contact is deleted.

#### `formatDisplayName(contact, t)`

Format a contact's display name from their name parts. Falls back to "Unknown" if no name parts exist.

```typescript
function formatDisplayName(contact: Contact, t?: ((key: string, values?: Record<string, unknown>, options?: { defaultValue?: string; }) => string)): string
```

- `contact` — The contact to format.
- `t` — Optional i18n translation function for the "Unknown" fallback.

**Returns:** The formatted display name string.

#### `formatPhoneNumber(phone)`

Format a phone number for display using basic US formatting.
10-digit numbers become "(xxx) xxx-xxxx", 11-digit numbers with leading 1 become "+1 (xxx) xxx-xxxx".

```typescript
function formatPhoneNumber(phone: PhoneNumber): string
```

- `phone` — The PhoneNumber to format.

**Returns:** The formatted phone number string.

#### `getAll(options)`

Get all contacts, optionally filtered and sorted.

```typescript
function getAll(options?: ContactQueryOptions): Promise<Contact[]>
```

- `options` — Query options (search, fields, sorting, pagination).

**Returns:** An array of Contact objects matching the query.

#### `getById(id)`

Get a single contact by its ID.

```typescript
function getById(id: string): Promise<Contact | null>
```

- `id` — The contact ID to look up.

**Returns:** The matching Contact, or null if not found.

#### `getCapabilities()`

Get the platform's contacts capabilities.

```typescript
function getCapabilities(): Promise<ContactsCapabilities>
```

**Returns:** The capabilities indicating which contacts features are supported.

#### `getInitials(contact)`

Get initials from a contact's name (e.g., "JD" for "John Doe"). Falls back to "??" if no name is available.

```typescript
function getInitials(contact: Contact): string
```

- `contact` — The contact to extract initials from.

**Returns:** A 1-2 character uppercase string of initials.

#### `getPermissionStatus()`

Get the current contacts permission status.

```typescript
function getPermissionStatus(): Promise<ContactsPermissionStatus>
```

**Returns:** The permission status: 'granted', 'denied', 'limited', 'prompt', or 'unsupported'.

#### `getPrimaryEmail(contact)`

Get the primary email address for a contact, falling back to the first email.

```typescript
function getPrimaryEmail(contact: Contact): EmailAddress | undefined
```

- `contact` — The contact to extract the email from.

**Returns:** The primary EmailAddress, or undefined if the contact has no emails.

#### `getPrimaryPhone(contact)`

Get the primary phone number for a contact, falling back to the first number.

```typescript
function getPrimaryPhone(contact: Contact): PhoneNumber | undefined
```

- `contact` — The contact to extract the phone number from.

**Returns:** The primary PhoneNumber, or undefined if the contact has no phone numbers.

#### `getProvider()`

Get the current contacts provider.

```typescript
function getProvider(): ContactsProvider
```

**Returns:** The active ContactsProvider instance.

#### `hasProvider()`

Check if a contacts provider has been registered.

```typescript
function hasProvider(): boolean
```

**Returns:** Whether a ContactsProvider has been bonded.

#### `openSettings()`

Open the system settings screen for contacts permissions.

```typescript
function openSettings(): Promise<void>
```

**Returns:** A promise that resolves when the settings screen is opened.

#### `pick(options)`

Open the native contact picker dialog.

```typescript
function pick(options?: ContactPickerOptions): Promise<Contact[]>
```

- `options` — Picker options (multiple selection, requested fields).

**Returns:** An array of selected Contact objects.

#### `requestPermission()`

Request contacts permissions from the user.

```typescript
function requestPermission(): Promise<ContactsPermissionStatus>
```

**Returns:** The resulting permission status after the request.

#### `search(query, options)`

Search contacts by name, email, phone, or other fields.

```typescript
function search(query: string, options?: Omit<ContactQueryOptions, "query">): Promise<Contact[]>
```

- `query` — The search query string.
- `options` — Additional query options (fields, sorting, pagination).

**Returns:** An array of matching Contact objects.

#### `setProvider(provider)`

Set the contacts provider.

```typescript
function setProvider(provider: ContactsProvider): void
```

- `provider` — ContactsProvider implementation to register.

#### `update(id, contact)`

Update an existing contact on the device.

```typescript
function update(id: string, contact: Partial<ContactInput>): Promise<Contact>
```

- `id` — The ID of the contact to update.
- `contact` — The partial contact data to merge with the existing contact.

**Returns:** The updated Contact.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-i18n` ^1.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-contacts`.
