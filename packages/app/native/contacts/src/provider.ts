/**
 * `@molecule/app-contacts`
 * Provider management for contacts module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'
import { t } from '@molecule/app-i18n'

import type {
  Contact,
  ContactInput,
  ContactPickerOptions,
  ContactQueryOptions,
  ContactsCapabilities,
  ContactsPermissionStatus,
  ContactsProvider,
} from './types.js'

// ============================================================================
// Provider Management
// ============================================================================

const BOND_TYPE = 'contacts'

/**
 * Set the contacts provider.
 * @param provider - ContactsProvider implementation to register.
 */
export function setProvider(provider: ContactsProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Get the current contacts provider.
 * @throws {Error} If no provider has been set via setProvider.
 * @returns The active ContactsProvider instance.
 */
export function getProvider(): ContactsProvider {
  const provider = bondGet<ContactsProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      t('contacts.error.noProvider', undefined, {
        defaultValue:
          '@molecule/app-contacts: No provider set. Call setProvider() with a ContactsProvider implementation (e.g., from @molecule/app-contacts-capacitor).',
      }),
    )
  }
  return provider
}

/**
 * Check if a contacts provider has been registered.
 * @returns Whether a ContactsProvider has been bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get all contacts, optionally filtered and sorted.
 * @param options - Query options (search, fields, sorting, pagination).
 * @returns An array of Contact objects matching the query.
 */
export async function getAll(options?: ContactQueryOptions): Promise<Contact[]> {
  return getProvider().getAll(options)
}

/**
 * Get a single contact by its ID.
 * @param id - The contact ID to look up.
 * @returns The matching Contact, or null if not found.
 */
export async function getById(id: string): Promise<Contact | null> {
  return getProvider().getById(id)
}

/**
 * Search contacts by name, email, phone, or other fields.
 * @param query - The search query string.
 * @param options - Additional query options (fields, sorting, pagination).
 * @returns An array of matching Contact objects.
 */
export async function search(
  query: string,
  options?: Omit<ContactQueryOptions, 'query'>,
): Promise<Contact[]> {
  return getProvider().search(query, options)
}

/**
 * Create a new contact on the device.
 * @param contact - The contact data to create.
 * @returns The created Contact with its assigned ID.
 */
export async function create(contact: ContactInput): Promise<Contact> {
  return getProvider().create(contact)
}

/**
 * Update an existing contact on the device.
 * @param id - The ID of the contact to update.
 * @param contact - The partial contact data to merge with the existing contact.
 * @returns The updated Contact.
 */
export async function update(id: string, contact: Partial<ContactInput>): Promise<Contact> {
  return getProvider().update(id, contact)
}

/**
 * Delete a contact from the device.
 * @param id - The ID of the contact to delete.
 * @returns A promise that resolves when the contact is deleted.
 */
export async function deleteContact(id: string): Promise<void> {
  return getProvider().delete(id)
}

/**
 * Open the native contact picker dialog.
 * @param options - Picker options (multiple selection, requested fields).
 * @returns An array of selected Contact objects.
 */
export async function pick(options?: ContactPickerOptions): Promise<Contact[]> {
  return getProvider().pick(options)
}

/**
 * Get the current contacts permission status.
 * @returns The permission status: 'granted', 'denied', 'limited', 'prompt', or 'unsupported'.
 */
export async function getPermissionStatus(): Promise<ContactsPermissionStatus> {
  return getProvider().getPermissionStatus()
}

/**
 * Request contacts permissions from the user.
 * @returns The resulting permission status after the request.
 */
export async function requestPermission(): Promise<ContactsPermissionStatus> {
  return getProvider().requestPermission()
}

/**
 * Open the system settings screen for contacts permissions.
 * @returns A promise that resolves when the settings screen is opened.
 */
export async function openSettings(): Promise<void> {
  return getProvider().openSettings()
}

/**
 * Get the platform's contacts capabilities.
 * @returns The capabilities indicating which contacts features are supported.
 */
export async function getCapabilities(): Promise<ContactsCapabilities> {
  return getProvider().getCapabilities()
}
