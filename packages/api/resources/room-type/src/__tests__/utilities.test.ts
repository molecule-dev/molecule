import { describe, expect, it } from 'vitest'

import type { RoomTypeRow } from '../types.js'
import { parseMetadata, parseStringArray, toRoomType, validateCreateInput } from '../utilities.js'

const BASE_ROW: RoomTypeRow = {
  id: 'rt-1',
  propertyId: 'prop-1',
  name: 'Deluxe King',
  description: null,
  capacity: 2,
  baseRateCents: 25_000,
  currency: 'USD',
  amenities: null,
  photos: null,
  totalUnits: 12,
  active: true,
  metadata: null,
  createdAt: '2024-06-01T00:00:00.000Z',
  updatedAt: '2024-06-01T00:00:00.000Z',
}

describe('parseStringArray', () => {
  it('returns an empty array for null/undefined/empty input', () => {
    expect(parseStringArray(null)).toEqual([])
    expect(parseStringArray(undefined)).toEqual([])
    expect(parseStringArray('')).toEqual([])
  })

  it('parses a JSON-serialized string array', () => {
    expect(parseStringArray(JSON.stringify(['wifi', 'kitchen']))).toEqual(['wifi', 'kitchen'])
  })

  it('drops non-string entries', () => {
    expect(parseStringArray(JSON.stringify(['wifi', 1, true, 'parking']))).toEqual([
      'wifi',
      'parking',
    ])
  })

  it('returns an empty array for malformed JSON', () => {
    expect(parseStringArray('{not-json')).toEqual([])
  })

  it('returns an empty array when the value is not an array', () => {
    expect(parseStringArray(JSON.stringify({ foo: 'bar' }))).toEqual([])
  })
})

describe('parseMetadata', () => {
  it('returns undefined for null/empty input', () => {
    expect(parseMetadata(null)).toBeUndefined()
    expect(parseMetadata('')).toBeUndefined()
  })

  it('parses a JSON object', () => {
    expect(parseMetadata(JSON.stringify({ floor: 3, view: 'ocean' }))).toEqual({
      floor: 3,
      view: 'ocean',
    })
  })

  it('returns undefined for arrays', () => {
    expect(parseMetadata(JSON.stringify(['a', 'b']))).toBeUndefined()
  })

  it('returns undefined for malformed JSON', () => {
    expect(parseMetadata('{nope')).toBeUndefined()
  })
})

describe('toRoomType', () => {
  it('converts a minimal row, defaulting amenities and photos to empty arrays', () => {
    expect(toRoomType(BASE_ROW)).toEqual({
      id: 'rt-1',
      propertyId: 'prop-1',
      name: 'Deluxe King',
      capacity: 2,
      baseRateCents: 25_000,
      currency: 'USD',
      amenities: [],
      photos: [],
      totalUnits: 12,
      active: true,
      createdAt: '2024-06-01T00:00:00.000Z',
      updatedAt: '2024-06-01T00:00:00.000Z',
    })
  })

  it('includes description when present', () => {
    const result = toRoomType({ ...BASE_ROW, description: 'King-size bed, ocean view' })
    expect(result.description).toBe('King-size bed, ocean view')
  })

  it('parses amenities and photos', () => {
    const result = toRoomType({
      ...BASE_ROW,
      amenities: JSON.stringify(['wifi', 'parking']),
      photos: JSON.stringify(['https://cdn.example/a.jpg']),
    })
    expect(result.amenities).toEqual(['wifi', 'parking'])
    expect(result.photos).toEqual(['https://cdn.example/a.jpg'])
  })

  it('includes metadata when valid JSON object', () => {
    const result = toRoomType({ ...BASE_ROW, metadata: JSON.stringify({ floor: 3 }) })
    expect(result.metadata).toEqual({ floor: 3 })
  })

  it('omits metadata when malformed', () => {
    const result = toRoomType({ ...BASE_ROW, metadata: 'not-json{' })
    expect(result.metadata).toBeUndefined()
  })
})

describe('validateCreateInput', () => {
  const baseInput = {
    propertyId: 'prop-1',
    name: 'Deluxe King',
    capacity: 2,
    baseRateCents: 25_000,
    currency: 'USD',
    totalUnits: 12,
  }

  it('returns null for a valid payload', () => {
    expect(validateCreateInput({ ...baseInput })).toBeNull()
  })

  it('flags missing propertyId', () => {
    expect(validateCreateInput({ ...baseInput, propertyId: '' })).toBe(
      'roomType.error.fieldsRequired',
    )
  })

  it('flags missing name', () => {
    expect(validateCreateInput({ ...baseInput, name: '' })).toBe('roomType.error.fieldsRequired')
  })

  it('flags missing currency', () => {
    expect(validateCreateInput({ ...baseInput, currency: '' })).toBe(
      'roomType.error.fieldsRequired',
    )
  })

  it('flags missing fields with wrong types', () => {
    expect(validateCreateInput({})).toBe('roomType.error.fieldsRequired')
  })

  it('flags zero/negative capacity', () => {
    expect(validateCreateInput({ ...baseInput, capacity: 0 })).toBe(
      'roomType.error.invalidCapacity',
    )
    expect(validateCreateInput({ ...baseInput, capacity: -1 })).toBe(
      'roomType.error.invalidCapacity',
    )
  })

  it('flags non-numeric capacity', () => {
    expect(validateCreateInput({ ...baseInput, capacity: 'lots' })).toBe(
      'roomType.error.invalidCapacity',
    )
  })

  it('flags negative baseRateCents', () => {
    expect(validateCreateInput({ ...baseInput, baseRateCents: -1 })).toBe(
      'roomType.error.invalidRate',
    )
  })

  it('allows zero baseRateCents (e.g. comp rooms)', () => {
    expect(validateCreateInput({ ...baseInput, baseRateCents: 0 })).toBeNull()
  })

  it('flags negative totalUnits', () => {
    expect(validateCreateInput({ ...baseInput, totalUnits: -1 })).toBe(
      'roomType.error.invalidTotalUnits',
    )
  })

  it('allows zero totalUnits (placeholder before inventory is loaded)', () => {
    expect(validateCreateInput({ ...baseInput, totalUnits: 0 })).toBeNull()
  })
})
