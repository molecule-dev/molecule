/**
 * Subscriber utility functions.
 *
 * @module
 */

import { randomBytes } from 'node:crypto'

import type {
  PublicSubscriber,
  SubscriberChannel,
  SubscriberRow,
  SubscriberStatus,
} from './types.js'
import { SUBSCRIBER_CHANNELS, SUBSCRIBER_STATUSES } from './types.js'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^\+?[1-9]\d{6,14}$/
const URL_REGEX = /^https?:\/\/.+/i

/**
 * Generates a cryptographically random URL-safe token suitable for a one-time
 * confirm or unsubscribe link.
 *
 * @param byteLength - Number of random bytes (default 32 → 43 base64url chars).
 * @returns A URL-safe random token.
 */
export function generateToken(byteLength = 32): string {
  return randomBytes(byteLength).toString('base64url')
}

/**
 * Validates a channel-specific address (email, E.164 phone, or HTTP(S) URL).
 *
 * @param channel - The delivery channel.
 * @param address - The address to validate.
 * @returns True if the address is structurally valid for the channel.
 */
export function isValidAddress(channel: SubscriberChannel, address: string): boolean {
  if (!address || typeof address !== 'string') return false
  switch (channel) {
    case 'email':
      return EMAIL_REGEX.test(address)
    case 'sms':
      return PHONE_REGEX.test(address)
    case 'webhook':
      return URL_REGEX.test(address)
    default:
      return false
  }
}

/**
 * Type guard for {@link SubscriberChannel}.
 *
 * @param value - Value to test.
 * @returns True if the value is a valid channel.
 */
export function isSubscriberChannel(value: unknown): value is SubscriberChannel {
  return typeof value === 'string' && (SUBSCRIBER_CHANNELS as readonly string[]).includes(value)
}

/**
 * Type guard for {@link SubscriberStatus}.
 *
 * @param value - Value to test.
 * @returns True if the value is a valid status.
 */
export function isSubscriberStatus(value: unknown): value is SubscriberStatus {
  return typeof value === 'string' && (SUBSCRIBER_STATUSES as readonly string[]).includes(value)
}

/**
 * Converts a database row into the public-safe {@link PublicSubscriber} view.
 * Strips the private confirm/unsubscribe tokens.
 *
 * @param row - Raw database row.
 * @returns Public subscriber view (no tokens).
 */
export function toPublicSubscriber(row: SubscriberRow): PublicSubscriber {
  return {
    id: row.id,
    channel: row.channel as SubscriberChannel,
    address: row.address,
    topic: row.topic,
    status: row.status as SubscriberStatus,
    metadata: parseMetadata(row.metadata),
    confirmedAt: row.confirmedAt,
    unsubscribedAt: row.unsubscribedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/**
 * Parses a JSON-serialized metadata column.
 *
 * @param raw - Raw column value (string, object, or null).
 * @returns Parsed metadata object, or null on missing/invalid input.
 */
export function parseMetadata(
  raw: string | Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'object') return raw
  try {
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}
