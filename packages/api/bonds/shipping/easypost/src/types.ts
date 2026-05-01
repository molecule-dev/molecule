/**
 * Type definitions for the EasyPost shipping provider.
 *
 * Re-exports the core shipping types and declares EasyPost-specific
 * configuration env vars. EasyPost wire shapes are kept internal to
 * `provider.ts` so they never leak through the bond's public API.
 *
 * @module
 */

export type {
  DeliveryEstimate,
  MonetaryAmount,
  Parcel,
  Shipment,
  ShippingAddress,
  ShippingLabel,
  ShippingProvider,
  ShippingRate,
  TrackingEvent,
  TrackingStatus,
  TrackingStatusCode,
} from '@molecule/api-shipping'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /**
     * Process Env interface.
     */
    export interface ProcessEnv {
      /**
       * EasyPost API key (test or production). Used for HTTP Basic auth
       * against the EasyPost REST API.
       */
      EASYPOST_API_KEY?: string

      /**
       * Optional EasyPost API base URL. Defaults to
       * `https://api.easypost.com/v2` if unset. Override for sandbox or
       * proxy testing.
       */
      EASYPOST_API_URL?: string
    }
  }
}
