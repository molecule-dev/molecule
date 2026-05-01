/**
 * Type definitions for the Shippo shipping provider.
 *
 * Re-exports the core shipping types and declares Shippo-specific
 * configuration env vars. Shippo wire shapes are kept internal to
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
       * Shippo API token (test or live). Used as the bearer-style
       * `Authorization: ShippoToken <token>` header against the Shippo REST API.
       */
      SHIPPO_API_KEY?: string

      /**
       * Optional Shippo API base URL. Defaults to
       * `https://api.goshippo.com` if unset. Override for sandbox or
       * proxy testing.
       */
      SHIPPO_API_URL?: string
    }
  }
}
