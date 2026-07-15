# @molecule/api-shipping

Shipping core interface for molecule.dev.

Defines the standard interface for shipping/carrier providers
(EasyPost, Shippo, etc.). Used for rate quotes, label generation,
label voiding, and package tracking.

## Quick Start

```typescript
import { setProvider, getRates, createLabel, trackPackage } from '@molecule/api-shipping'

// Bond a provider at startup
setProvider(easypostProvider)

// Quote rates
const rates = await getRates({
  from: { street1: '...', city: '...', postalCode: '...', country: 'US' },
  to: { street1: '...', city: '...', postalCode: '...', country: 'US' },
  parcels: [{ length: 10, width: 6, height: 4, weight: 2 }],
})

// Purchase a label
const label = await createLabel('shp_123', rates[0])

// Track the package
const status = await trackPackage(label.carrier, label.trackingNumber)
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-shipping @molecule/api-bond @molecule/api-i18n
```

## API

### Interfaces

#### `DeliveryEstimate`

Estimated delivery window, if known.

```typescript
interface DeliveryEstimate {
  /** Earliest expected delivery date or datetime. */
  earliest?: Date

  /** Latest expected delivery date or datetime. */
  latest?: Date

  /** Number of business days estimated for delivery. */
  businessDays?: number
}
```

#### `MonetaryAmount`

A monetary amount paired with its currency.

```typescript
interface MonetaryAmount {
  /** Decimal amount represented as a string to avoid float precision loss. */
  amount: string

  /** ISO 4217 currency code. */
  currency: string
}
```

#### `Parcel`

Physical parcel dimensions and weight.

```typescript
interface Parcel {
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
```

#### `Shipment`

Description of a shipment used to request rates or create a label.

```typescript
interface Shipment {
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
```

#### `ShippingAddress`

A postal address used as the origin or destination of a shipment.

```typescript
interface ShippingAddress {
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
```

#### `ShippingLabel`

A purchased shipping label.

```typescript
interface ShippingLabel {
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
```

#### `ShippingProvider`

Shipping provider interface.

All shipping providers must implement this interface to provide rate
quoting, label purchasing, label voiding, tracking, and supported-carrier
discovery capabilities.

```typescript
interface ShippingProvider {
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
```

#### `ShippingRate`

A rate quote returned by a carrier for a given shipment.

```typescript
interface ShippingRate {
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
```

#### `TrackingEvent`

A single event in a package's tracking history.

```typescript
interface TrackingEvent {
  /** When the event was recorded by the carrier. */
  timestamp: Date

  /** Normalized status at the time of the event. */
  status: TrackingStatusCode

  /** Human-readable description of the event from the carrier. */
  description: string

  /** Free-form location string from the carrier, if provided. */
  location?: string
}
```

#### `TrackingStatus`

Aggregated tracking status for a single tracking number.

```typescript
interface TrackingStatus {
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
```

### Types

#### `TrackingStatusCode`

Possible high-level tracking statuses, normalized across carriers.

```typescript
type TrackingStatusCode =
  | 'pre_transit'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'available_for_pickup'
  | 'return_to_sender'
  | 'failure'
  | 'unknown'
```

### Functions

#### `createLabel(shipmentId, rate)`

Purchases a shipping label for the given rate using the bonded provider.

```typescript
function createLabel(shipmentId: string, rate: ShippingRate): Promise<ShippingLabel>
```

- `shipmentId` — Provider-assigned shipment identifier from a prior rate quote.
- `rate` — The rate selected for purchase.

**Returns:** The purchased label.

#### `getProvider()`

Retrieves the bonded shipping provider, throwing if none is configured.

```typescript
function getProvider(): ShippingProvider
```

**Returns:** The bonded shipping provider.

#### `getRates(shipment)`

Requests rate quotes for a shipment using the bonded provider.

```typescript
function getRates(shipment: Shipment): Promise<ShippingRate[]>
```

- `shipment` — The shipment to rate.

**Returns:** Array of available rates.

#### `hasProvider()`

Checks whether a shipping provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a shipping provider is bonded.

#### `listSupportedCarriers()`

Lists carriers supported by the bonded provider.

```typescript
function listSupportedCarriers(): Promise<string[]>
```

**Returns:** Array of carrier identifiers.

#### `setProvider(provider)`

Registers a shipping provider as the active singleton. Called by bond
packages during application startup.

```typescript
function setProvider(provider: ShippingProvider): void
```

- `provider` — The shipping provider implementation to bond.

#### `trackPackage(carrier, trackingNumber)`

Retrieves the current tracking status for a package using the bonded provider.

```typescript
function trackPackage(carrier: string, trackingNumber: string): Promise<TrackingStatus>
```

- `carrier` — Carrier identifier.
- `trackingNumber` — Carrier-assigned tracking number.

**Returns:** The aggregated tracking status.

#### `voidLabel(labelId)`

Voids a previously purchased label using the bonded provider.

```typescript
function voidLabel(labelId: string): Promise<void>
```

- `labelId` — Provider-assigned label identifier to void.

**Returns:** A promise that resolves when the label has been voided.

## Available Providers

| Provider | Package |
|----------|---------|
| EasyPost | `@molecule/api-shipping-easypost` |
| Shippo | `@molecule/api-shipping-shippo` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-i18n`
