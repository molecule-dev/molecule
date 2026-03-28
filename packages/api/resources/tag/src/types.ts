/**
 * Tag types.
 *
 * @module
 */

/**
 * A tag record with name, slug, optional color, and optional description.
 */
export interface Tag {
  /** Unique identifier. */
  id: string
  /** Display name. */
  name: string
  /** URL-friendly slug derived from name. */
  slug: string
  /** Optional hex color for visual display (e.g. '#ff5733'). */
  color: string | null
  /** Optional description of the tag. */
  description: string | null
  /** ISO 8601 creation timestamp. */
  createdAt: string
  /** ISO 8601 last-updated timestamp. */
  updatedAt: string
}

/**
 * A join record linking a tag to any resource.
 */
export interface ResourceTag {
  /** Unique identifier. */
  id: string
  /** Foreign key to the tag. */
  tagId: string
  /** The type of resource (e.g. 'project', 'product'). */
  resourceType: string
  /** The ID of the tagged resource. */
  resourceId: string
  /** ISO 8601 creation timestamp. */
  createdAt: string
}

/**
 * Input for creating a new tag.
 */
export type CreateTagInput = Pick<Tag, 'name'> & {
  /** Optional hex color. */
  color?: string | null
  /** Optional description. */
  description?: string | null
}

/**
 * Input for updating an existing tag.
 */
export type UpdateTagInput = Partial<Pick<Tag, 'name' | 'color' | 'description'>>
