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
import { createShipment, createLabel, trackPackage } from '@molecule/api-shipping'
const { shipmentId, rates } = await createShipment({
  from, to, parcels: [{ length, width, height, weight }],
})
const label = await createLabel(shipmentId, rates[0])
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
    /** Linear unit for length, width, and height. Defaults to `'in'` when omitted (all bonds agree). */
    distanceUnit?: 'in' | 'cm';
    /** Mass unit for weight. Defaults to `'lb'` when omitted (all bonds agree). */
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
     * Creates a shipment and returns its provider-assigned id together with the
     * rate quotes for it. This is the primary quoting path: the returned
     * `shipmentId` is the handle {@link createLabel} needs to purchase a label, so
     * callers who intend to buy a label should use this (not {@link getRates}) and
     * persist the id alongside the chosen {@link ShippingRate}.
     *
     * Every provider assigns a shipment an id when it is created (EasyPost's
     * `POST /shipments`, Shippo's `POST /shipments/`), so both bonds return the id
     * and rates natively in a single round-trip — no bond-specific quote helper.
     *
     * @param shipment - The shipment to create and rate.
     * @returns The created shipment's id and its available rates.
     */
    createShipment(shipment: Shipment): Promise<ShipmentQuote>;
    /**
     * Requests rate quotes for a shipment, discarding the shipment id.
     *
     * Convenience over {@link createShipment} for display-only flows that quote
     * rates without (yet) purchasing. To buy a label you also need the
     * `shipmentId` — call {@link createShipment} and keep both.
     *
     * @param shipment - The shipment to rate.
     * @returns Array of available rates.
     */
    getRates(shipment: Shipment): Promise<ShippingRate[]>;
    /**
     * Purchases a shipping label for the given rate.
     *
     * @param shipmentId - Provider-assigned shipment identifier from a prior
     *   {@link createShipment} call.
     * @param rate - The rate selected for purchase (one of the
     *   {@link ShipmentQuote.rates} returned alongside `shipmentId`).
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

#### `createLabel(_shipmentId, rate)`

Purchases a shipping label for a previously-quoted rate.

Shippo buys labels via `POST /transactions` referencing the rate's
`object_id` directly — there is no per-shipment "buy" endpoint — so the
`shipmentId` from {@link createShipment} is accepted to satisfy the core
`ShippingProvider` contract but is not needed by Shippo's transaction API.
This is a genuine provider difference (EasyPost's buy endpoint needs the
shipment id; Shippo's does not), not a per-bond workaround: both bonds obtain
the id from the same core `createShipment` path.

```typescript
function createLabel(_shipmentId: string, rate: ShippingRate): Promise<ShippingLabel>
```

- `_shipmentId` — Shipment identifier from {@link createShipment} (unused by Shippo; the rate's `rateId` is the purchase handle).
- `rate` — The rate selected for purchase. Must include `rateId`.

**Returns:** The purchased label normalized to `ShippingLabel`.

#### `createShipment(shipment)`

Creates a Shippo shipment via `POST /shipments/` and returns its
`object_id` together with the normalized rates. Shippo embeds rates inline
in the shipment response — there is no separate "fetch rates" call — and
assigns the shipment an `object_id` on creation, so both the id and the rates
come back in one round-trip, matching the core `createShipment` contract that
`@molecule/api-shipping-easypost` also satisfies natively. Each rate's
`object_id` becomes the `rateId` consumed by {@link createLabel}.

Every parcel in `shipment.parcels` is sent — Shippo's `parcels` field is an
array (a multi-piece shipment), so none are dropped. Carrier limits still
apply (e.g. USPS does not support multi-piece and the carrier returns the
error; UPS allows up to 50).

```typescript
function createShipment(shipment: Shipment): Promise<ShipmentQuote>
```

- `shipment` — Normalized shipment payload.

**Returns:** The Shippo shipment id and its normalized rates.

#### `getRates(shipment)`

Requests rate quotes for a shipment, discarding the Shippo shipment id.
Convenience over {@link createShipment} for display-only flows.

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

- `labelId` — Shippo transaction `object_id` returned by {@link createLabel} as `ShippingLabel.id`.

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

**All parcels are quoted** — `shipment.parcels` is sent as a Shippo multi-piece
shipment (Shippo's `parcels` field is an array), so every parcel is included and
none are dropped. Carrier limits still apply (e.g. USPS does not support
multi-piece and the carrier returns the error; UPS allows up to 50).

Parcel units: `Parcel.distanceUnit`/`massUnit` are honored per parcel and default
to `'in'`/`'lb'` when unspecified — metric parcels MUST set them or dimensions are
interpreted as inches/pounds.

`createLabel(shipmentId, rate)` ignores `shipmentId` — Shippo's transaction API
buys by `rateId` alone. The id still comes from the core `createShipment(shipment)`
→ `{ shipmentId, rates }` path (the same one EasyPost's buy endpoint requires), so
callers wire the flow identically regardless of the bonded provider.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip.
Run the whole flow against the provider's TEST mode (a test API key — e.g.
EasyPost/Shippo test keys) so rates and labels are free test artifacts that
carry test tracking numbers; never mock the carrier, and never flip to a
production key just to "make it real" (a real label purchase costs money):
- [ ] Requesting RATES for a real parcel (from + to address, weight,
  dimensions) renders MULTIPLE carrier/service options in the UI, each with a
  price AND an ETA — never an empty list, a spinner that never resolves, or a
  null/$0 amount. Remember amount.amount is a STRING (display it, don't NaN it).
- [ ] The rates REFLECT the input: re-quote with a heavier or farther-away
  parcel and the prices go UP (compare decimal-safe, not as floats) — proving
  live carrier quotes, not a hardcoded/fixture list.
- [ ] Buying a LABEL for a rate the user PICKED from that quote returns a real
  artifact (a PDF/PNG/ZPL) plus a trackingNumber, both shown in the UI. Pass
  back the exact ShippingRate object from getRates — its rateId is the purchase
  handle, so a hand-rebuilt rate is rejected.
- [ ] The label artifact is FETCHED and stored on the app's own storage/
  uploads and the UI links to that copy — NOT the raw labelUrl, which is an
  expiring vendor URL that 404s once it lapses.
- [ ] TRACKING a purchased shipment (trackPackage with the label's carrier +
  trackingNumber) returns a real status plus an ordered event history in the
  UI, and re-tracking as the parcel moves advances the status (pre_transit →
  in_transit → delivered) instead of a frozen placeholder. If the app wires an
  inbound carrier tracking webhook, a delivered callback advances the STORED
  status AND a forged/unsigned callback is rejected.
- [ ] A bad/undeliverable address or a provider error surfaces a graceful,
  readable message in the UI (not a raw stack trace, not a silent empty rate
  list) — user-supplied addresses/parcels are validated server-side before
  they reach the carrier.
- [ ] SECURITY — the provider API key stays server-side only (this package is
  server-only and never ships to the client bundle), and a user can only rate,
  label, void, or track their OWN shipments: guessing another user's label id
  or tracking number must NOT return that label artifact or tracking status.
