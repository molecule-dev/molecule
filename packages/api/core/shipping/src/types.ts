/**
 * Shipping core types for molecule.dev.
 *
 * Defines the standard interfaces for shipping/carrier providers
 * (rate quotes, label generation, tracking events).
 *
 * @module
 */

/**
 * A postal address used as the origin or destination of a shipment.
 */
export interface ShippingAddress {
  /** Recipient or sender name. */
  name?: string

  /** Company name, if applicable. */
  company?: string

  /** Primary street address line. */
  street1: string

  /** Secondary street address line (apartment, suite, etc.). */
  street2?: string

  /** City or locality. */
  city: string

  /** State, province, or region code. */
  state?: string

  /** Postal or ZIP code. */
  postalCode: string

  /** ISO 3166-1 alpha-2 country code. */
  country: string

  /** Contact phone number in E.164 format. */
  phone?: string

  /** Contact email address. */
  email?: string
}

/**
 * Physical parcel dimensions and weight.
 */
export interface Parcel {
  /** Parcel length. */
  length: number

  /** Parcel width. */
  width: number

  /** Parcel height. */
  height: number

  /** Parcel weight. */
  weight: number

  /** Linear unit for length, width, and height. */
  distanceUnit?: 'in' | 'cm'

  /** Mass unit for weight. */
  massUnit?: 'lb' | 'oz' | 'kg' | 'g'
}

/**
 * A monetary amount paired with its currency.
 */
export interface MonetaryAmount {
  /** Decimal amount represented as a string to avoid float precision loss. */
  amount: string

  /** ISO 4217 currency code. */
  currency: string
}

/**
 * Estimated delivery window, if known.
 */
export interface DeliveryEstimate {
  /** Earliest expected delivery date or datetime. */
  earliest?: Date

  /** Latest expected delivery date or datetime. */
  latest?: Date

  /** Number of business days estimated for delivery. */
  businessDays?: number
}

/**
 * Description of a shipment used to request rates or create a label.
 */
export interface Shipment {
  /** Origin address. */
  from: ShippingAddress

  /** Destination address. */
  to: ShippingAddress

  /** One or more parcels included in this shipment. */
  parcels: Parcel[]

  /** Optional service-level filter (e.g., a carrier-specific service code). */
  serviceLevel?: string

  /** Optional declared value for insurance/customs. */
  declaredValue?: MonetaryAmount
}

/**
 * A rate quote returned by a carrier for a given shipment.
 */
export interface ShippingRate {
  /** Carrier identifier (e.g., `usps`, `ups`, `fedex`). */
  carrier: string

  /** Carrier-specific service code or name. */
  service: string

  /** Quoted price for the rate. */
  amount: MonetaryAmount

  /** Estimated delivery window for this rate, if available. */
  deliveryEstimate?: DeliveryEstimate

  /** Provider-assigned identifier used to purchase this rate. */
  rateId?: string
}

/**
 * A purchased shipping label.
 */
export interface ShippingLabel {
  /** Provider-assigned label or shipment identifier. */
  id: string

  /** Carrier tracking number assigned to the shipment. */
  trackingNumber: string

  /** URL where the printable label can be downloaded. */
  labelUrl: string

  /** Carrier identifier. */
  carrier: string

  /** Carrier-specific service code or name. */
  service: string

  /** Total amount paid for the label. */
  amount?: MonetaryAmount
}

/**
 * Possible high-level tracking statuses, normalized across carriers.
 */
export type TrackingStatusCode =
  | 'pre_transit'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'available_for_pickup'
  | 'return_to_sender'
  | 'failure'
  | 'unknown'

/**
 * A single event in a package's tracking history.
 */
export interface TrackingEvent {
  /** When the event was recorded by the carrier. */
  timestamp: Date

  /** Normalized status at the time of the event. */
  status: TrackingStatusCode

  /** Human-readable description of the event from the carrier. */
  description: string

  /** Free-form location string from the carrier, if provided. */
  location?: string
}

/**
 * Aggregated tracking status for a single tracking number.
 */
export interface TrackingStatus {
  /** Carrier identifier. */
  carrier: string

  /** Tracking number being reported on. */
  trackingNumber: string

  /** Current normalized status. */
  status: TrackingStatusCode

  /** Ordered list of tracking events from oldest to newest. */
  events: TrackingEvent[]

  /** Estimated delivery, if reported by the carrier. */
  estimatedDelivery?: DeliveryEstimate
}

/**
 * Shipping provider interface.
 *
 * All shipping providers must implement this interface to provide rate
 * quoting, label purchasing, label voiding, tracking, and supported-carrier
 * discovery capabilities.
 */
export interface ShippingProvider {
  /**
   * Lists carriers supported by this provider.
   *
   * @returns Array of carrier identifiers.
   */
  listSupportedCarriers(): Promise<string[]>

  /**
   * Requests rate quotes for a shipment.
   *
   * @param shipment - The shipment to rate.
   * @returns Array of available rates.
   */
  getRates(shipment: Shipment): Promise<ShippingRate[]>

  /**
   * Purchases a shipping label for the given rate.
   *
   * @param shipmentId - Provider-assigned shipment identifier returned from a prior rate quote.
   * @param rate - The rate selected for purchase.
   * @returns The purchased label.
   */
  createLabel(shipmentId: string, rate: ShippingRate): Promise<ShippingLabel>

  /**
   * Voids a previously purchased label, if permitted by the carrier.
   *
   * @param labelId - Provider-assigned label identifier to void.
   */
  voidLabel(labelId: string): Promise<void>

  /**
   * Retrieves the current tracking status for a package.
   *
   * @param carrier - Carrier identifier.
   * @param trackingNumber - Carrier-assigned tracking number.
   * @returns The aggregated tracking status.
   */
  trackPackage(carrier: string, trackingNumber: string): Promise<TrackingStatus>
}
