/**
 * Type definitions for analytics core interface.
 *
 * @module
 */

/**
 * User properties for analytics identification.
 */
export interface AnalyticsUserProps {
  /**
   * Unique user identifier.
   */
  userId: string

  /**
   * User email address.
   */
  email?: string

  /**
   * User display name.
   */
  name?: string

  /**
   * Additional user traits.
   */
  traits?: Record<string, unknown>
}

/**
 * Event properties for analytics tracking.
 */
export interface AnalyticsEvent {
  /**
   * Event name (e.g., 'user.signup', 'purchase.completed').
   */
  name: string

  /**
   * Event properties.
   */
  properties?: Record<string, unknown>

  /**
   * Timestamp of the event (defaults to now).
   */
  timestamp?: Date

  /**
   * User ID associated with the event.
   */
  userId?: string

  /**
   * Anonymous ID for non-authenticated users.
   */
  anonymousId?: string
}

/**
 * Page view event.
 */
export interface AnalyticsPageView {
  /**
   * Page name or title.
   */
  name?: string

  /**
   * Page category.
   */
  category?: string

  /**
   * Page URL.
   */
  url?: string

  /**
   * Page path.
   */
  path?: string

  /**
   * Referrer URL.
   */
  referrer?: string

  /**
   * Additional page properties.
   */
  properties?: Record<string, unknown>
}

/**
 * Analytics provider interface.
 *
 * All analytics providers must implement this interface.
 */
export interface AnalyticsProvider {
  /**
   * Identifies a user with traits.
   */
  identify(user: AnalyticsUserProps): Promise<void>

  /**
   * Tracks an event.
   */
  track(event: AnalyticsEvent): Promise<void>

  /**
   * Tracks a page view.
   */
  page(pageView: AnalyticsPageView): Promise<void>

  /**
   * Associates the current user with a group/organization.
   */
  group?(groupId: string, traits?: Record<string, unknown>): Promise<void>

  /**
   * Resets the analytics state (e.g., on logout).
   */
  reset?(): Promise<void>

  /**
   * Flushes any queued events.
   */
  flush?(): Promise<void>
}
