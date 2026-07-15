# @molecule/api-shipping-shippo

Shippo shipping provider for molecule.dev.

Implements the `@molecule/api-shipping` core interface against the
Shippo REST API (`https://api.goshippo.com`). Supports rate quotes,
label purchase via transactions, label refund (Shippo's equivalent of
void — Shippo does not support true voids), and tracking lookups
across the carriers Shippo supports (USPS, UPS, FedEx, DHL, etc.).

## Quick Start

```typescript
import { setProvider } from '@molecule/api-shipping'
import { provider } from '@molecule/api-shipping-shippo'

setProvider(provider)

// Then anywhere in your app:
import { getRates, createLabel, trackPackage } from '@molecule/api-shipping'
const rates = await getRates({ from, to, parcels: [{ length, width, height, weight }] })
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-shipping-shippo @molecule/api-bond @molecule/api-secrets @molecule/api-shipping
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

Shippo buys labels via `POST /transactions` referencing the rate's
`object_id` directly — there is no per-shipment "buy" endpoint. The
`shipmentId` argument is accepted to satisfy the
`ShippingProvider` interface but is not used by Shippo.

```typescript
function createLabel(_shipmentId: string, rate: ShippingRate): Promise<ShippingLabel>
```

- `shipmentId` — Shipment identifier (ignored by Shippo; rate ID is sufficient).
- `rate` — The rate selected for purchase. Must include `rateId`.

**Returns:** The purchased label normalized to `ShippingLabel`.

#### `getRates(shipment)`

Requests rate quotes for a shipment. Creates a Shippo shipment via
`POST /shipments` and normalizes the returned rates.

Shippo embeds rates inline in the shipment response — there is no
separate "fetch rates" call. Each rate's `object_id` becomes the
`rateId` consumed by {@link createLabel}.

```typescript
function getRates(shipment: Shipment): Promise<ShippingRate[]>
```

- `shipment` — Normalized shipment payload.

**Returns:** Array of normalized shipping rates.

#### `listSupportedCarriers()`

Lists the carriers supported by this Shippo bond.

```typescript
function listSupportedCarriers(): Promise<string[]>
```

**Returns:** Lowercase carrier identifiers.

#### `trackPackage(carrier, trackingNumber)`

Retrieves the current tracking status for a package via
`GET /tracks/:carrier/:tracking_number` and normalizes the response.

```typescript
function trackPackage(carrier: string, trackingNumber: string): Promise<TrackingStatus>
```

- `carrier` — Carrier identifier (e.g., `usps`, `ups`).
- `trackingNumber` — Carrier-assigned tracking number.

**Returns:** Normalized tracking status.

#### `voidLabel(labelId)`

Refunds a previously purchased label.

Shippo does **not** support voiding labels — the equivalent operation is
a refund request, which Shippo evaluates against carrier rules and may
approve, queue, or reject. This method calls
`POST /refunds` with the transaction `object_id`. Successful return
means the refund was *requested*, not necessarily granted.

```typescript
function voidLabel(labelId: string): Promise<void>
```

- `labelId` — Shippo transaction `object_id` returned by

### Constants

#### `provider`

The Shippo shipping provider implementing the `ShippingProvider` interface.

```typescript
const provider: ShippingProvider
```

#### `shippingShippoSecretDefinitions`

Secret definitions required by the Shippo shipping bond.

```typescript
const shippingShippoSecretDefinitions: SecretDefinition[]
```

## Core Interface
Implements `@molecule/api-shipping` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-shipping'
import { provider } from '@molecule/api-shipping-shippo'

export function setupShippingShippo(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-secrets` ^1.0.0
- `@molecule/api-shipping` ^1.0.0

### Environment Variables

- `SHIPPO_API_KEY` *(required)* — Shippo API token
  - Setup: Copy the test or live token from Shippo → Settings → API.
  - Get it here: [https://apps.goshippo.com/settings/api](https://apps.goshippo.com/settings/api)
  - Example: `shippo_test_...`

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-secrets`
- `@molecule/api-shipping`

Requires `SHIPPO_API_KEY` in the environment (test or live token).
Optionally `SHIPPO_API_URL` to override the base URL (sandbox / proxy).

Shippo does **not** support voiding labels — `voidLabel()` issues a refund
request via `POST /refunds`. Refunds are subject to carrier-specific
rules and may be queued or rejected; a successful return only means the
refund was requested.
