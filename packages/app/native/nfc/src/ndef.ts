/**
 * `@molecule/app-nfc`
 * NDEF message builders and readers
 */

import { write } from './provider.js'
import type { NdefMessage, NdefRecord } from './types.js'

// ============================================================================
// NDEF Message Builders
// ============================================================================

/**
 * Create an NDEF text record with the given content and language code.
 * @param text - The text content for the record.
 * @param languageCode - BCP 47 language code (default: 'en').
 * @returns An NdefRecord of type 'text'.
 */
export function createTextRecord(text: string, languageCode = 'en'): NdefRecord {
  return {
    type: 'text',
    payload: text,
    languageCode,
  }
}

/**
 * Create an NDEF URI record for a URL or other URI.
 * @param uri - The URI or URL to encode.
 * @returns An NdefRecord of type 'uri'.
 */
export function createUriRecord(uri: string): NdefRecord {
  return {
    type: 'uri',
    payload: uri,
  }
}

/**
 * Create an NDEF MIME record for arbitrary typed data.
 * @param mimeType - The MIME type (e.g., 'application/json', 'image/png').
 * @param payload - The data as a string (base64 for binary data).
 * @returns An NdefRecord of type 'mime'.
 */
export function createMimeRecord(mimeType: string, payload: string): NdefRecord {
  return {
    type: 'mime',
    mimeType,
    payload,
  }
}

/**
 * Create an NDEF external record for application-specific data.
 * @param domain - The reverse domain name (e.g., 'com.example').
 * @param type - The application-specific type name.
 * @param payload - The data payload.
 * @returns An NdefRecord of type 'external' with recordType set to 'domain:type'.
 */
export function createExternalRecord(domain: string, type: string, payload: string): NdefRecord {
  return {
    type: 'external',
    recordType: `${domain}:${type}`,
    payload,
  }
}

/**
 * Create an NDEF message from one or more records.
 * @param records - The NDEF records to include in the message.
 * @returns An NdefMessage containing the provided records.
 */
export function createMessage(...records: NdefRecord[]): NdefMessage {
  return { records }
}

// ============================================================================
// NDEF Message Readers
// ============================================================================

/**
 * Extract the text payload from the first text record in an NDEF message.
 * @param message - The NDEF message to search.
 * @returns The text content, or null if no text record exists.
 */
export function getText(message: NdefMessage): string | null {
  const record = message.records.find((r) => r.type === 'text')
  return record?.payload ?? null
}

/**
 * Extract the URI payload from the first URI record in an NDEF message.
 * @param message - The NDEF message to search.
 * @returns The URI string, or null if no URI record exists.
 */
export function getUri(message: NdefMessage): string | null {
  const record = message.records.find((r) => r.type === 'uri')
  return record?.payload ?? null
}

/**
 * Get all text records from an NDEF message.
 * @param message - The NDEF message to filter.
 * @returns Array of NdefRecords with type 'text'.
 */
export function getTextRecords(message: NdefMessage): NdefRecord[] {
  return message.records.filter((r) => r.type === 'text')
}

/**
 * Get all URI records from an NDEF message.
 * @param message - The NDEF message to filter.
 * @returns Array of NdefRecords with type 'uri'.
 */
export function getUriRecords(message: NdefMessage): NdefRecord[] {
  return message.records.filter((r) => r.type === 'uri')
}

// ============================================================================
// Write Helpers
// ============================================================================

/**
 * Write a plain text string to an NFC tag. Creates a text record and writes it.
 * @param text - The text content to write to the tag.
 * @returns A promise that resolves when the text is written to the tag.
 */
export async function writeText(text: string): Promise<void> {
  const message = createMessage(createTextRecord(text))
  return write(message)
}

/**
 * Write a URL to an NFC tag. Creates a URI record and writes it.
 * @param url - The URL to write to the tag.
 * @returns A promise that resolves when the URL is written to the tag.
 */
export async function writeUrl(url: string): Promise<void> {
  const message = createMessage(createUriRecord(url))
  return write(message)
}
