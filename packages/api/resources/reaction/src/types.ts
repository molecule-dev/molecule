/**
 * Reaction resource type definitions.
 *
 * Polymorphic reactions (like/emoji) that can attach to any resource type.
 * Each user can have one reaction per type per resource.
 *
 * @module
 */

/**
 * A reaction attached to a resource by a user.
 */
export interface Reaction {
  /** Unique reaction identifier. */
  id: string
  /** The type of resource this reaction is on (e.g. 'post', 'comment'). */
  resourceType: string
  /** The ID of the resource this reaction is on. */
  resourceId: string
  /** The ID of the user who reacted. */
  userId: string
  /** The reaction type (e.g. 'like', 'love', 'laugh'). */
  type: string
  /** When the reaction was created (ISO 8601). */
  createdAt: string
  /** When the reaction was last updated (ISO 8601). */
  updatedAt: string
}

/**
 * Summary of reactions on a resource, with counts per type and user reactions.
 */
export interface ReactionSummary {
  /** Total number of reactions across all types. */
  total: number
  /** Count of reactions per type. */
  counts: Record<string, number>
  /** The reaction types from the current user, if any. */
  userReactions: string[]
}

/**
 * Default reaction types supported out of the box.
 */
export const DEFAULT_REACTION_TYPES = ['like', 'love', 'laugh', 'wow', 'sad', 'angry'] as const

/**
 * A default reaction type string.
 */
export type DefaultReactionType = (typeof DEFAULT_REACTION_TYPES)[number]
