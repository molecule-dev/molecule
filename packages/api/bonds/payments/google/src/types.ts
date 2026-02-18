/**
 * Type definitions for Google Play In-App Purchase provider.
 *
 * @module
 */

import type { androidpublisher_v3 } from 'googleapis'

export type {
  NormalizedPurchase,
  NormalizedSubscription,
  PaymentProvider,
  SubscriptionStatus,
} from '@molecule/api-payments'

// Re-export androidpublisher types for convenience
export type { androidpublisher_v3 }

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /**
     * Process Env interface.
     */
    export interface ProcessEnv {
      /**
       * The Google Play package name (your app's package ID).
       */
      GOOGLE_PLAY_PACKAGE_NAME?: string

      /**
       * The Google API service key object as a JSON string.
       */
      GOOGLE_API_SERVICE_KEY_OBJECT?: string
    }
  }
}
