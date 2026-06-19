/**
 * Property resource types.
 *
 * @module
 */

/** Property status indicating availability and visibility. */
export type PropertyStatus = 'draft' | 'active' | 'inactive' | 'archived'

/** Property type categorising the kind of real estate. */
export type PropertyType =
  | 'apartment'
  | 'house'
  | 'condo'
  | 'townhouse'
  | 'hotel'
  | 'commercial'
  | 'land'
  | 'other'

/**
 * A property record (apartment building, house, hotel, etc.).
 */
export interface Property {
  /** Unique identifier. */
  id: string
  /** ID of the user who owns this property. Null for legacy rows created before ownership tracking. */
  ownerId: string | null
  /** Display name. */
  name: string
  /** URL-friendly slug derived from name. */
  slug: string
  /** Optional long-form description. */
  description: string | null
  /** Property type. */
  type: PropertyType
  /** Property status controlling visibility. */
  status: PropertyStatus
  /** Street address line 1. */
  addressLine1: string
  /** Optional street address line 2. */
  addressLine2: string | null
  /** City. */
  city: string
  /** Region / state / province. */
  region: string | null
  /** Postal / ZIP code. */
  postalCode: string | null
  /** ISO 3166-1 alpha-2 country code. */
  countryCode: string
  /** Optional latitude in decimal degrees. */
  latitude: number | null
  /** Optional longitude in decimal degrees. */
  longitude: number | null
  /** Total number of units in this property. */
  unitCount: number
  /** Optional URL to the primary cover photo. */
  coverImageUrl: string | null
  /** ISO 8601 creation timestamp. */
  createdAt: string
  /** ISO 8601 last-updated timestamp. */
  updatedAt: string
  /** ISO 8601 soft-delete timestamp, or null if active. */
  deletedAt: string | null
}

/**
 * A unit (room, apartment, suite) within a property.
 */
export interface PropertyUnit {
  /** Unique identifier. */
  id: string
  /** Foreign key to the parent property. */
  propertyId: string
  /** Unit name or number (e.g. '101', 'Suite 4B'). */
  name: string
  /** Optional description. */
  description: string | null
  /** Floor number, or null if not applicable. */
  floor: number | null
  /** Number of bedrooms, or null if not applicable. */
  bedrooms: number | null
  /** Number of bathrooms, or null if not applicable. */
  bathrooms: number | null
  /** Maximum occupancy, or null if untracked. */
  maxOccupancy: number | null
  /** Floor area in square metres, or null if untracked. */
  areaSquareMetres: number | null
  /** Whether this unit is currently available. */
  isAvailable: boolean
  /** ISO 8601 creation timestamp. */
  createdAt: string
  /** ISO 8601 last-updated timestamp. */
  updatedAt: string
}

/**
 * A photo attached to a property.
 */
export interface PropertyPhoto {
  /** Unique identifier. */
  id: string
  /** Foreign key to the parent property. */
  propertyId: string
  /** URL of the photo. */
  url: string
  /** Optional caption. */
  caption: string | null
  /** Display ordering index (lower numbers appear first). */
  position: number
  /** ISO 8601 creation timestamp. */
  createdAt: string
}

/**
 * An amenity offered by a property (pool, gym, parking, etc.).
 */
export interface PropertyAmenity {
  /** Unique identifier. */
  id: string
  /** Foreign key to the parent property. */
  propertyId: string
  /** Machine-readable amenity code (e.g. 'pool', 'gym', 'parking'). */
  code: string
  /** Human-readable amenity label (locale-overridable in clients). */
  label: string
  /** ISO 8601 creation timestamp. */
  createdAt: string
}

/**
 * Input for creating a new property.
 */
export interface CreatePropertyInput {
  /** Display name. */
  name: string
  /** Optional description. */
  description?: string | null
  /** Property type. Defaults to 'apartment'. */
  type?: PropertyType
  /** Property status. Defaults to 'draft'. */
  status?: PropertyStatus
  /** Street address line 1. */
  addressLine1: string
  /** Optional street address line 2. */
  addressLine2?: string | null
  /** City. */
  city: string
  /** Optional region / state / province. */
  region?: string | null
  /** Optional postal / ZIP code. */
  postalCode?: string | null
  /** ISO 3166-1 alpha-2 country code. */
  countryCode: string
  /** Optional latitude. */
  latitude?: number | null
  /** Optional longitude. */
  longitude?: number | null
  /** Optional cover image URL. */
  coverImageUrl?: string | null
}

/**
 * Input for updating an existing property.
 */
export type UpdatePropertyInput = Partial<CreatePropertyInput>

/**
 * Input for creating a property unit.
 */
export interface CreateUnitInput {
  /** Unit name or number. */
  name: string
  /** Optional description. */
  description?: string | null
  /** Optional floor number. */
  floor?: number | null
  /** Optional bedroom count. */
  bedrooms?: number | null
  /** Optional bathroom count. */
  bathrooms?: number | null
  /** Optional maximum occupancy. */
  maxOccupancy?: number | null
  /** Optional floor area in square metres. */
  areaSquareMetres?: number | null
  /** Optional availability flag. Defaults to true. */
  isAvailable?: boolean
}

/**
 * Input for creating a property photo.
 */
export interface CreatePhotoInput {
  /** URL of the photo. */
  url: string
  /** Optional caption. */
  caption?: string | null
  /** Optional ordering position. Defaults to 0. */
  position?: number
}

/**
 * Input for creating a property amenity.
 */
export interface CreateAmenityInput {
  /** Machine-readable amenity code. */
  code: string
  /** Human-readable amenity label. */
  label: string
}
