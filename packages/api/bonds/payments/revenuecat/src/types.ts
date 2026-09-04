/**
 * Type definitions for the RevenueCat payment provider.
 *
 * @module
 */

export type {
  NormalizedPurchase,
  NormalizedSubscription,
  ParsedNotification,
  PaymentProvider,
  SubscriptionStatus,
  VerifiedSubscription,
  WebhookEvent,
} from '@molecule/api-payments'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /**
     * Process Env interface.
     */
    export interface ProcessEnv {
      /**
       * The RevenueCat **secret** (v1) API key used for server-to-server calls.
       *
       * RevenueCat dashboard → Project settings → API keys → "Secret API keys".
       * This is NOT the public SDK key that ships inside your app.
       */
      REVENUECAT_SECRET_API_KEY?: string

      /**
       * The exact `Authorization` header value configured on the RevenueCat
       * webhook integration, compared verbatim (constant-time) against the
       * header of every incoming webhook.
       */
      REVENUECAT_WEBHOOK_AUTHORIZATION?: string

      /**
       * The HMAC signing secret shown once when "HMAC webhook signing" is
       * enabled (or rotated) on the RevenueCat webhook integration.
       */
      REVENUECAT_WEBHOOK_SIGNING_SECRET?: string

      /**
       * Overrides the RevenueCat REST base URL (default
       * `https://api.revenuecat.com/v1`) for a broker, a compatible endpoint,
       * or a test double. Must include the API version path segment.
       */
      REVENUECAT_BASE_URL?: string

      /**
       * When `'true'`, sandbox purchases are accepted as real entitlements.
       * Defaults to `'false'` (fail-closed) — see `provider.ts`.
       */
      REVENUECAT_ALLOW_SANDBOX?: string

      /**
       * Maximum age, in seconds, of a signed webhook before it is rejected as
       * a replay. Defaults to `'300'` (5 minutes).
       */
      REVENUECAT_WEBHOOK_TOLERANCE_SECONDS?: string
    }
  }
}

/**
 * One entry of a customer's `subscriber.entitlements` map, keyed by entitlement
 * identifier (e.g. `pro_cat`).
 *
 * @see https://www.revenuecat.com/docs/api-v1/customer-info-model
 */
export interface RevenueCatEntitlement {
  /** ISO 8601 expiry of the entitlement, or `null` for a lifetime grant. */
  expires_date: string | null
  /** ISO 8601 expiry of the billing grace period, or `null`. */
  grace_period_expires_date?: string | null
  /** The product identifier that granted this entitlement. */
  product_identifier: string
  /** ISO 8601 purchase date of the granting transaction. */
  purchase_date: string
}

/**
 * One entry of a customer's `subscriber.subscriptions` map, keyed by product
 * identifier (e.g. `annual`).
 *
 * @see https://www.revenuecat.com/docs/api-v1/customer-info-model
 */
export interface RevenueCatSubscription {
  /** When a paused Google Play subscription resumes, or `null`. */
  auto_resume_date?: string | null
  /** ISO 8601 time a billing problem was first detected, or `null`. */
  billing_issues_detected_at?: string | null
  /** ISO 8601 expiry of the current period, or `null` for a lifetime purchase. */
  expires_date: string | null
  /** ISO 8601 expiry of the billing grace period, or `null`. */
  grace_period_expires_date?: string | null
  /** Whether the purchase came from the store's sandbox environment. */
  is_sandbox?: boolean
  /** ISO 8601 date of the first purchase in this subscription. */
  original_purchase_date?: string | null
  /** `PURCHASED` or `FAMILY_SHARED`. */
  ownership_type?: string
  /** `normal`, `trial`, `intro`, `promotional`, or `prepaid`. */
  period_type?: string
  /** ISO 8601 date of the transaction that started the current period. */
  purchase_date: string
  /** ISO 8601 time the purchase was refunded, or `null`. */
  refunded_at?: string | null
  /** The store the purchase belongs to (e.g. `app_store`, `play_store`). */
  store?: string
  /**
   * The store's identifier for the latest transaction.
   *
   * RevenueCat serializes this as a NUMBER for App Store purchases and a
   * string elsewhere, so always coerce before comparing.
   */
  store_transaction_id?: string | number | null
  /** ISO 8601 time the customer turned auto-renew OFF, or `null`. */
  unsubscribe_detected_at?: string | null
}

/**
 * One entry of a customer's `subscriber.non_subscriptions` map (one-time
 * purchases), keyed by product identifier.
 */
export interface RevenueCatNonSubscription {
  /** RevenueCat's identifier for the purchase. */
  id: string
  /** Whether the purchase came from the store's sandbox environment. */
  is_sandbox?: boolean
  /** ISO 8601 purchase date. */
  purchase_date: string
  /** The store the purchase belongs to. */
  store?: string
}

/**
 * The `subscriber` object of a RevenueCat customer-info response.
 */
export interface RevenueCatSubscriber {
  /** Entitlements keyed by entitlement identifier. */
  entitlements?: Record<string, RevenueCatEntitlement>
  /** ISO 8601 time this customer was first seen. */
  first_seen?: string
  /** Store URL where the customer manages their subscription, or `null`. */
  management_url?: string | null
  /** One-time purchases keyed by product identifier. */
  non_subscriptions?: Record<string, RevenueCatNonSubscription[]>
  /** The App User ID this customer was first known by. */
  original_app_user_id?: string
  /** ISO 8601 date of the customer's first purchase. */
  original_purchase_date?: string | null
  /** Subscriptions keyed by product identifier. */
  subscriptions?: Record<string, RevenueCatSubscription>
}

/**
 * Response body of `GET /v1/subscribers/{app_user_id}`.
 *
 * @see https://www.revenuecat.com/docs/api-v1/customers
 */
export interface RevenueCatSubscriberResponse {
  /** ISO 8601 time RevenueCat served the request. */
  request_date?: string
  /** Milliseconds since the epoch at which RevenueCat served the request. */
  request_date_ms?: number
  /** The customer's info. */
  subscriber: RevenueCatSubscriber
}

/**
 * The `event` object of a RevenueCat webhook body (the fields this bond reads).
 *
 * @see https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields
 */
export interface RevenueCatWebhookEventPayload {
  /** Every App User ID this subscriber has ever used. */
  aliases?: string[] | null
  /** The subscriber's LAST SEEN App User ID, which may be an alias. */
  app_user_id?: string
  /**
   * The subscriber's FIRST App User ID — stable across aliasing, and therefore
   * the customer id this bond keys on. Omitted from
   * `TEMPORARY_ENTITLEMENT_GRANT`, which carries only `app_user_id`.
   */
  original_app_user_id?: string
  /** Reason a `CANCELLATION` fired (e.g. `UNSUBSCRIBE`, `CUSTOMER_SUPPORT`). */
  cancel_reason?: string
  /** Entitlement identifiers the product maps to, or `null`. */
  entitlement_ids?: string[] | null
  /** `SANDBOX` or `PRODUCTION`. */
  environment?: string
  /** Milliseconds since the epoch at which the transaction expires, or `null`. */
  expiration_at_ms?: number | null
  /** Reason an `EXPIRATION` fired. */
  expiration_reason?: string
  /** RevenueCat's unique identifier for this event. */
  id?: string
  /** `TRIAL`, `INTRO`, `NORMAL`, `PROMOTIONAL`, or `PREPAID`. */
  period_type?: string
  /** The store product identifier. */
  product_id?: string
  /** Milliseconds since the epoch at which the transaction was purchased. */
  purchased_at_ms?: number
  /** The store the purchase belongs to (e.g. `APP_STORE`). */
  store?: string
  /** The event type (e.g. `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`). */
  type?: string
}

/**
 * The body RevenueCat `POST`s to a webhook URL.
 */
export interface RevenueCatWebhookBody {
  /** The webhook payload version (currently `'1.0'`). */
  api_version?: string
  /** The event itself. */
  event?: RevenueCatWebhookEventPayload
}
