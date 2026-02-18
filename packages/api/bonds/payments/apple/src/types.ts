/**
 * Type definitions for the Apple In-App Purchase provider.
 *
 * @module
 */

export type {
  NormalizedPurchase,
  NormalizedSubscription,
  PaymentProvider,
  SubscriptionStatus,
} from '@molecule/api-payments'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /**
     * Process Env interface.
     */
    export interface ProcessEnv {
      /**
       * The shared secret for verifying App Store receipts.
       *
       * Found in App Store Connect under your app's "App Information" section.
       */
      APPLE_SHARED_SECRET?: string
    }
  }
}

/**
 * Receipt verification response from Apple.
 */
export interface VerifyReceiptResponse {
  status: number
  environment?: 'Production' | 'Sandbox'
  receipt?: {
    bundle_id: string
    application_version: string
    in_app?: InAppPurchase[]
  }
  latest_receipt_info?: InAppPurchase[]
  pending_renewal_info?: PendingRenewal[]
}

/**
 * In-app purchase record.
 */
export interface InAppPurchase {
  quantity: string
  product_id: string
  transaction_id: string
  original_transaction_id: string
  purchase_date: string
  purchase_date_ms: string
  purchase_date_pst: string
  original_purchase_date: string
  original_purchase_date_ms: string
  original_purchase_date_pst: string
  expires_date?: string
  expires_date_ms?: string
  expires_date_pst?: string
  is_trial_period?: string
  is_in_intro_offer_period?: string
  cancellation_date?: string
  cancellation_date_ms?: string
  cancellation_reason?: string
}

/**
 * Pending renewal information.
 */
export interface PendingRenewal {
  auto_renew_product_id: string
  auto_renew_status: string
  expiration_intent?: string
  is_in_billing_retry_period?: string
  product_id: string
  original_transaction_id: string
}
