/**
 * Room-type utility functions.
 *
 * @module
 */

import type { RoomType, RoomTypeRow } from './types.js'

/**
 * Safely parse a JSON-serialized string array. Returns an empty array when
 * the input is null/undefined or unparseable.
 *
 * @param raw - JSON string or null.
 * @returns A `string[]` (possibly empty).
 */
export function parseStringArray(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch (_error) {
    // Malformed JSON is treated as an empty list — safe fallback, no state is lost.
    return []
  }
}

/**
 * Safely parse a JSON-serialized record. Returns `undefined` for null/empty
 * or malformed input so the caller can omit the field cleanly.
 *
 * @param raw - JSON string or null.
 * @returns A record or `undefined`.
 */
export function parseMetadata(raw: string | null | undefined): Record<string, unknown> | undefined {
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    return undefined
  } catch (_error) {
    // Malformed JSON is treated as absent metadata — safe fallback, caller omits the field.
    return undefined
  }
}

/**
 * Convert a database row into a typed {@link RoomType}.
 *
 * @param row - The raw database row.
 * @returns The deserialized room type.
 */
export function toRoomType(row: RoomTypeRow): RoomType {
  const result: RoomType = {
    id: row.id,
    propertyId: row.propertyId,
    name: row.name,
    capacity: row.capacity,
    baseRateCents: row.baseRateCents,
    currency: row.currency,
    amenities: parseStringArray(row.amenities),
    photos: parseStringArray(row.photos),
    totalUnits: row.totalUnits,
    active: row.active,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
  if (row.description) result.description = row.description
  const metadata = parseMetadata(row.metadata)
  if (metadata) result.metadata = metadata
  return result
}

/**
 * Validate a {@link RoomType}-creation payload. Returns an error key on the
 * first failed check, or `null` when valid. The key can be passed directly
 * to `t()` so callers don't need to map keys to messages themselves.
 *
 * @param input - Candidate creation payload (loose shape — request bodies are untyped).
 * @returns A locale key for the first failed rule, or `null` if all checks pass.
 */
export function validateCreateInput(input: Record<string, unknown>): string | null {
  if (
    typeof input.propertyId !== 'string' ||
    input.propertyId.length === 0 ||
    typeof input.name !== 'string' ||
    input.name.length === 0 ||
    typeof input.currency !== 'string' ||
    input.currency.length === 0
  ) {
    return 'roomType.error.fieldsRequired'
  }
  if (
    typeof input.capacity !== 'number' ||
    !Number.isFinite(input.capacity) ||
    input.capacity < 1
  ) {
    return 'roomType.error.invalidCapacity'
  }
  if (
    typeof input.baseRateCents !== 'number' ||
    !Number.isFinite(input.baseRateCents) ||
    input.baseRateCents < 0
  ) {
    return 'roomType.error.invalidRate'
  }
  if (
    typeof input.totalUnits !== 'number' ||
    !Number.isFinite(input.totalUnits) ||
    input.totalUnits < 0
  ) {
    return 'roomType.error.invalidTotalUnits'
  }
  return null
}
