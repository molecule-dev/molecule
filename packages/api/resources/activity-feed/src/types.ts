/**
 * ActivityFeed types.
 *
 * @module
 */

/**
 *
 */
export interface ActivityFeed {
  id: string
  createdAt: string
  updatedAt: string
  // TODO: Add fields
}

/**
 *
 */
export type CreateActivityFeedInput = Omit<ActivityFeed, 'id' | 'createdAt' | 'updatedAt'>
/**
 *
 */
export type UpdateActivityFeedInput = Partial<CreateActivityFeedInput>
