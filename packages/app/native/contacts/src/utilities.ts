/**
 * `@molecule/app-contacts`
 * Utility functions for contacts module
 */

import type { Contact, EmailAddress, PhoneNumber } from './types.js'

/**
 * Format a contact's display name from their name parts. Falls back to "Unknown" if no name parts exist.
 * @param contact - The contact to format.
 * @param t - Optional i18n translation function for the "Unknown" fallback.
 * @returns The formatted display name string.
 */
export function formatDisplayName(
  contact: Contact,
  t?: (
    key: string,
    values?: Record<string, unknown>,
    options?: { defaultValue?: string },
  ) => string,
): string {
  const { name } = contact

  if (name.display) {
    return name.display
  }

  const parts: string[] = []
  if (name.prefix) parts.push(name.prefix)
  if (name.given) parts.push(name.given)
  if (name.middle) parts.push(name.middle)
  if (name.family) parts.push(name.family)
  if (name.suffix) parts.push(name.suffix)

  return (
    parts.join(' ') ||
    (t ? t('contacts.unknown', undefined, { defaultValue: 'Unknown' }) : 'Unknown')
  )
}

/**
 * Get the primary phone number for a contact, falling back to the first number.
 * @param contact - The contact to extract the phone number from.
 * @returns The primary PhoneNumber, or undefined if the contact has no phone numbers.
 */
export function getPrimaryPhone(contact: Contact): PhoneNumber | undefined {
  return contact.phones?.find((p) => p.isPrimary) || contact.phones?.[0]
}

/**
 * Get the primary email address for a contact, falling back to the first email.
 * @param contact - The contact to extract the email from.
 * @returns The primary EmailAddress, or undefined if the contact has no emails.
 */
export function getPrimaryEmail(contact: Contact): EmailAddress | undefined {
  return contact.emails?.find((e) => e.isPrimary) || contact.emails?.[0]
}

/**
 * Format a phone number for display using basic US formatting.
 * 10-digit numbers become "(xxx) xxx-xxxx", 11-digit numbers with leading 1 become "+1 (xxx) xxx-xxxx".
 * @param phone - The PhoneNumber to format.
 * @returns The formatted phone number string.
 */
export function formatPhoneNumber(phone: PhoneNumber): string {
  // Basic US phone formatting
  const digits = phone.number.replace(/\D/g, '')

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }

  return phone.number
}

/**
 * Get initials from a contact's name (e.g., "JD" for "John Doe"). Falls back to "??" if no name is available.
 * @param contact - The contact to extract initials from.
 * @returns A 1-2 character uppercase string of initials.
 */
export function getInitials(contact: Contact): string {
  const { name } = contact

  if (name.given && name.family) {
    return `${name.given[0]}${name.family[0]}`.toUpperCase()
  }

  if (name.display) {
    const parts = name.display.trim().split(/\s+/)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name.display.slice(0, 2).toUpperCase()
  }

  return '??'
}
