# @molecule/api-shipping-easypost

EasyPost shipping provider for molecule.dev.

Implements the `@molecule/api-shipping` core interface against the
EasyPost REST API (`https://api.easypost.com/v2`). Supports rate quotes,
label purchase, label void/refund, and tracker creation across the
carriers EasyPost itself supports (USPS, UPS, FedEx, DHL, etc.).

## Quick Start

```typescript
import { setProvider } from '@molecule/api-shipping'
import { provider } from '@molecule/api-shipping-easypost'

setProvider(provider)

// Then anywhere in your app:
import { getRates, createLabel, trackPackage } from '@molecule/api-shipping'
const rates = await getRates({ from, to, parcels: [{ length, width, height, weight }] })
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-shipping-easypost
```

## API

### Interfaces

#### `DeliveryEstimate`

Estimated delivery window, if known.

```typescript
interface DeliveryEstimate {
    /** Earliest expected delivery date or datetime. */
    earliest?: Date;
    /** Latest expected delivery date or datetime. */
    latest?: Date;
    /** Number of business days estimated for delivery. */
    businessDays?: number;
}
```

#### `MonetaryAmount`

A monetary amount paired with its currency.

```typescript
interface MonetaryAmount {
    /** Decimal amount represented as a string to avoid float precision loss. */
    amount: string;
    /** ISO 4217 currency code. */
    currency: string;
}
```

#### `Parcel`

Physical parcel dimensions and weight.

```typescript
interface Parcel {
    /** Parcel length. */
    length: number;
    /** Parcel width. */
    width: number;
    /** Parcel height. */
    height: number;
    /** Parcel weight. */
    weight: number;
    /** Linear unit for length, width, and height. */
    distanceUnit?: 'in' | 'cm';
    /** Mass unit for weight. */
    massUnit?: 'lb' | 'oz' | 'kg' | 'g';
}
```

#### `Shipment`

Description of a shipment used to request rates or create a label.

```typescript
interface Shipment {
    /** Origin address. */
    from: ShippingAddress;
    /** Destination address. */
    to: ShippingAddress;
    /** One or more parcels included in this shipment. */
    parcels: Parcel[];
    /** Optional service-level filter (e.g., a carrier-specific service code). */
    serviceLevel?: string;
    /** Optional declared value for insurance/customs. */
    declaredValue?: MonetaryAmount;
}
```

#### `ShippingAddress`

A postal address used as the origin or destination of a shipment.

```typescript
interface ShippingAddress {
    /** Recipient or sender name. */
    name?: string;
    /** Company name, if applicable. */
    company?: string;
    /** Primary street address line. */
    street1: string;
    /** Secondary street address line (apartment, suite, etc.). */
    street2?: string;
    /** City or locality. */
    city: string;
    /** State, province, or region code. */
    state?: string;
    /** Postal or ZIP code. */
    postalCode: string;
    /** ISO 3166-1 alpha-2 country code. */
    country: string;
    /** Contact phone number in E.164 format. */
    phone?: string;
    /** Contact email address. */
    email?: string;
}
```

#### `ShippingLabel`

A purchased shipping label.

```typescript
interface ShippingLabel {
    /** Provider-assigned label or shipment identifier. */
    id: string;
    /** Carrier tracking number assigned to the shipment. */
    trackingNumber: string;
    /** URL where the printable label can be downloaded. */
    labelUrl: string;
    /** Carrier identifier. */
    carrier: string;
    /** Carrier-specific service code or name. */
    service: string;
    /** Total amount paid for the label. */
    amount?: MonetaryAmount;
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
    listSupportedCarriers(): Promise<string[]>;
    /**
     * Requests rate quotes for a shipment.
     *
     * @param shipment - The shipment to rate.
     * @returns Array of available rates.
     */
    getRates(shipment: Shipment): Promise<ShippingRate[]>;
    /**
     * Purchases a shipping label for the given rate.
     *
     * @param shipmentId - Provider-assigned shipment identifier returned from a prior rate quote.
     * @param rate - The rate selected for purchase.
     * @returns The purchased label.
     */
    createLabel(shipmentId: string, rate: ShippingRate): Promise<ShippingLabel>;
    /**
     * Voids a previously purchased label, if permitted by the carrier.
     *
     * @param labelId - Provider-assigned label identifier to void.
     */
    voidLabel(labelId: string): Promise<void>;
    /**
     * Retrieves the current tracking status for a package.
     *
     * @param carrier - Carrier identifier.
     * @param trackingNumber - Carrier-assigned tracking number.
     * @returns The aggregated tracking status.
     */
    trackPackage(carrier: string, trackingNumber: string): Promise<TrackingStatus>;
}
```

#### `ShippingRate`

A rate quote returned by a carrier for a given shipment.

```typescript
interface ShippingRate {
    /** Carrier identifier (e.g., `usps`, `ups`, `fedex`). */
    carrier: string;
    /** Carrier-specific service code or name. */
    service: string;
    /** Quoted price for the rate. */
    amount: MonetaryAmount;
    /** Estimated delivery window for this rate, if available. */
    deliveryEstimate?: DeliveryEstimate;
    /** Provider-assigned identifier used to purchase this rate. */
    rateId?: string;
}
```

#### `TrackingEvent`

A single event in a package's tracking history.

```typescript
interface TrackingEvent {
    /** When the event was recorded by the carrier. */
    timestamp: Date;
    /** Normalized status at the time of the event. */
    status: TrackingStatusCode;
    /** Human-readable description of the event from the carrier. */
    description: string;
    /** Free-form location string from the carrier, if provided. */
    location?: string;
}
```

#### `TrackingStatus`

Aggregated tracking status for a single tracking number.

```typescript
interface TrackingStatus {
    /** Carrier identifier. */
    carrier: string;
    /** Tracking number being reported on. */
    trackingNumber: string;
    /** Current normalized status. */
    status: TrackingStatusCode;
    /** Ordered list of tracking events from oldest to newest. */
    events: TrackingEvent[];
    /** Estimated delivery, if reported by the carrier. */
    estimatedDelivery?: DeliveryEstimate;
}
```

### Types

#### `TrackingStatusCode`

Possible high-level tracking statuses, normalized across carriers.

```typescript
type TrackingStatusCode = 'pre_transit' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'available_for_pickup' | 'return_to_sender' | 'failure' | 'unknown';
```

### Functions

#### `createLabel(shipmentId, rate)`

Purchases a shipping label for a previously-quoted rate.

```typescript
function createLabel(shipmentId: string, rate: ShippingRate): Promise<ShippingLabel>
```

- `shipmentId` — EasyPost shipment ID returned from a prior
- `rate` — The rate selected for purchase. Must include `rateId`.

**Returns:** The purchased label normalized to `ShippingLabel`.

#### `getRates(shipment)`

Requests rate quotes for a shipment. Creates an EasyPost shipment via
`POST /shipments` and normalizes the returned rates. The EasyPost
shipment `id` is required to subsequently buy a label — callers
should preserve it from `getRatesDetailed` (or supply their own
shipment ID via the underlying API) when calling {@link createLabel}.

```typescript
function getRates(shipment: Shipment): Promise<ShippingRate[]>
```

- `shipment` — Normalized shipment payload.

**Returns:** Array of normalized shipping rates.

#### `getRatesDetailed(shipment)`

Like {@link getRates}, but additionally returns the EasyPost shipment
ID needed to purchase a label via {@link createLabel}. EasyPost-specific
— call this when you need both pieces in one round-trip.

```typescript
function getRatesDetailed(shipment: Shipment): Promise<{ shipmentId: string; rates: ShippingRate[]; }>
```

- `shipment` — Normalized shipment payload.

**Returns:** Object with `shipmentId` (EasyPost shipment ID) and `rates`.

#### `listSupportedCarriers()`

Lists the carriers supported by this EasyPost bond.

```typescript
function listSupportedCarriers(): Promise<string[]>
```

**Returns:** Lowercase carrier identifiers.

#### `trackPackage(carrier, trackingNumber)`

Retrieves the current tracking status for a package. Creates a tracker
via `POST /trackers` (idempotent — EasyPost reuses an existing tracker
for the same carrier + tracking code) and normalizes the response.

```typescript
function trackPackage(carrier: string, trackingNumber: string): Promise<TrackingStatus>
```

- `carrier` — Carrier identifier (e.g., `usps`, `ups`).
- `trackingNumber` — Carrier-assigned tracking number.

**Returns:** Normalized tracking status.

#### `voidLabel(labelId)`

Voids (refunds) a previously purchased label. EasyPost handles void
via `POST /shipments/:id/refund`.

```typescript
function voidLabel(labelId: string): Promise<void>
```

- `labelId` — EasyPost shipment ID associated with the label.

### Constants

#### `provider`

The EasyPost shipping provider implementing the `ShippingProvider` interface.

```typescript
const provider: ShippingProvider
```

## Core Interface
Implements `@molecule/api-shipping` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-shipping'
import { provider } from '@molecule/api-shipping-easypost'

export function setupShippingEasypost(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-shipping` ^1.0.0

### Environment Variables

- `EASYPOST_API_KEY` *(required)*

Requires `EASYPOST_API_KEY` in the environment. Optionally
`EASYPOST_API_URL` to override the base URL (sandbox / proxy).
