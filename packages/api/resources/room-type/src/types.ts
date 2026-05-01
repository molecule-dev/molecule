/**
 * Room-type types.
 *
 * A `RoomType` is a category of bookable unit within a property — e.g.
 * "Deluxe King", "Studio Apartment", "Whole House" — describing capacity,
 * pricing baselines, and amenities. Individual bookable inventory units
 * reference a room type rather than duplicating its attributes.
 *
 * Room types belong to a property (see `@molecule/api-resource-property`)
 * via `propertyId`. The relationship is enforced at the application layer,
 * so this package can be used stand-alone if a consumer prefers a flatter
 * model.
 *
 * @module
 */

/**
 * A bookable category of unit within a property.
 *
 * Capacity and pricing are baselines; the booking flow may apply per-night
 * variations through a separate rate-plan layer (not modelled here).
 */
export interface RoomType {
  /** Unique room-type identifier. */
  id: string
  /** The property this room type belongs to. */
  propertyId: string
  /** Display name (e.g., "Deluxe King"). */
  name: string
  /** Optional long-form description. */
  description?: string
  /** Maximum number of guests this unit type accommodates. */
  capacity: number
  /** Base nightly rate in the property's billing currency, in minor units (cents). */
  baseRateCents: number
  /** ISO 4217 currency code (e.g., "USD"). */
  currency: string
  /** Amenity codes (e.g., "wifi", "kitchen", "parking"). */
  amenities: string[]
  /** Image URLs displayed in listings. */
  photos: string[]
  /** Total physical inventory of this type at the property (e.g., 12 deluxe-king rooms). */
  totalUnits: number
  /** Whether this room type is currently bookable. */
  active: boolean
  /** Arbitrary metadata attached to the room type. */
  metadata?: Record<string, unknown>
  /** Creation timestamp. */
  createdAt: string
  /** Last modification timestamp. */
  updatedAt: string
}

/**
 * Input payload for creating a room type.
 */
export interface CreateRoomTypeInput {
  /** Property the room type belongs to. */
  propertyId: string
  /** Display name. */
  name: string
  /** Optional long-form description. */
  description?: string
  /** Maximum guests. */
  capacity: number
  /** Base nightly rate in minor units. */
  baseRateCents: number
  /** ISO 4217 currency code. */
  currency: string
  /** Amenity codes. */
  amenities?: string[]
  /** Image URLs. */
  photos?: string[]
  /** Total physical inventory. */
  totalUnits: number
  /** Whether this room type is bookable on creation. Defaults to `true`. */
  active?: boolean
  /** Arbitrary metadata. */
  metadata?: Record<string, unknown>
}

/**
 * Input payload for updating a room type. All fields are optional.
 */
export interface UpdateRoomTypeInput {
  /** Display name. */
  name?: string
  /** Long-form description. */
  description?: string
  /** Maximum guests. */
  capacity?: number
  /** Base nightly rate in minor units. */
  baseRateCents?: number
  /** ISO 4217 currency code. */
  currency?: string
  /** Amenity codes. */
  amenities?: string[]
  /** Image URLs. */
  photos?: string[]
  /** Total physical inventory. */
  totalUnits?: number
  /** Bookable flag. */
  active?: boolean
  /** Arbitrary metadata. */
  metadata?: Record<string, unknown>
}

/**
 * Query options for listing room types.
 */
export interface RoomTypeQuery {
  /** Filter by property. */
  propertyId?: string
  /** Restrict to currently bookable room types. */
  activeOnly?: boolean
  /** Minimum guest capacity. */
  minCapacity?: number
  /** Page number (1-based). */
  page?: number
  /** Items per page. */
  limit?: number
}

/**
 * A page of room-type results.
 */
export interface PaginatedRoomTypes {
  /** The page of results. */
  data: RoomType[]
  /** Total matching records (across all pages). */
  total: number
  /** Current page number. */
  page: number
  /** Page size. */
  limit: number
}

/**
 * Internal database row representation. JSON columns are strings on the wire.
 */
export interface RoomTypeRow {
  /** Unique identifier. */
  id: string
  /** Owning property. */
  propertyId: string
  /** Display name. */
  name: string
  /** Optional description. */
  description: string | null
  /** Maximum guests. */
  capacity: number
  /** Base nightly rate in minor units. */
  baseRateCents: number
  /** Currency code. */
  currency: string
  /** JSON-serialized amenity codes. */
  amenities: string | null
  /** JSON-serialized image URLs. */
  photos: string | null
  /** Total physical inventory. */
  totalUnits: number
  /** Bookable flag. */
  active: boolean
  /** JSON-serialized metadata. */
  metadata: string | null
  /** Creation timestamp. */
  createdAt: string
  /** Last modification timestamp. */
  updatedAt: string
}
