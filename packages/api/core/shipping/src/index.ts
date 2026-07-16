/**
 * Shipping core interface for molecule.dev.
 *
 * Defines the standard interface for shipping/carrier providers
 * (EasyPost, Shippo, etc.). Used for rate quotes, label generation,
 * label voiding, and package tracking.
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider, getRates, createLabel, trackPackage } from '@molecule/api-shipping'
 * import { provider } from '@molecule/api-shipping-easypost' // or '@molecule/api-shipping-shippo'
 *
 * // Bond a provider at startup
 * setProvider(provider)
 *
 * // 1. Quote rates — keep the returned ShippingRate objects intact (they carry rateId).
 * const rates = await getRates({
 *   from: { street1: '...', city: '...', postalCode: '...', country: 'US' },
 *   to: { street1: '...', city: '...', postalCode: '...', country: 'US' },
 *   parcels: [{ length: 10, width: 6, height: 4, weight: 2 }],
 * })
 *
 * // 2. Purchase a label for a QUOTED rate. The first argument is the provider-assigned
 * // shipment id from the SAME quote step (see @remarks — some bonds ignore it, others
 * // expose it via a bond-specific quote helper); the rate MUST be one returned by
 * // getRates — bonds reject a hand-built rate without rateId.
 * const label = await createLabel(shipmentId, rates[0])
 *
 * // 3. Track using values from the purchased label.
 * const status = await trackPackage(label.carrier, label.trackingNumber)
 * ```
 *
 * @remarks
 * - **`createLabel` consumes the EXACT rate object returned by `getRates`** — its `rateId`
 *   is the provider's purchase handle and every bond rejects a rate without it. Persist the
 *   chosen {@link ShippingRate} (not a reconstruction of carrier/service/amount) between the
 *   quote step and the purchase step.
 * - **The `shipmentId` argument is provider-assigned during the quote — the core API does
 *   not produce it.** Bonds whose purchase API only needs the rate ignore it (pass any
 *   string); bonds that require it expose a quote variant returning
 *   `{ shipmentId, rates }` — check the bonded provider's docs before wiring the purchase
 *   flow, and store the shipment id alongside the quoted rates.
 * - Label purchases cost real money outside the provider's TEST mode — use test API keys in
 *   development, and re-quote before purchase (rate quotes expire).
 * - Addresses and parcels are user input: validate server-side (`country` is ISO 3166-1
 *   alpha-2; set `distanceUnit`/`massUnit` explicitly rather than assuming defaults).
 * - {@link MonetaryAmount.amount} is a STRING to avoid float loss — never do arithmetic on
 *   it directly; display it or convert via a decimal-safe path.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip.
 * Run the whole flow against the provider's TEST mode (a test API key — e.g.
 * EasyPost/Shippo test keys) so rates and labels are free test artifacts that
 * carry test tracking numbers; never mock the carrier, and never flip to a
 * production key just to "make it real" (a real label purchase costs money):
 * - [ ] Requesting RATES for a real parcel (from + to address, weight,
 *   dimensions) renders MULTIPLE carrier/service options in the UI, each with a
 *   price AND an ETA — never an empty list, a spinner that never resolves, or a
 *   null/$0 amount. Remember amount.amount is a STRING (display it, don't NaN it).
 * - [ ] The rates REFLECT the input: re-quote with a heavier or farther-away
 *   parcel and the prices go UP (compare decimal-safe, not as floats) — proving
 *   live carrier quotes, not a hardcoded/fixture list.
 * - [ ] Buying a LABEL for a rate the user PICKED from that quote returns a real
 *   artifact (a PDF/PNG/ZPL) plus a trackingNumber, both shown in the UI. Pass
 *   back the exact ShippingRate object from getRates — its rateId is the purchase
 *   handle, so a hand-rebuilt rate is rejected.
 * - [ ] The label artifact is FETCHED and stored on the app's own storage/
 *   uploads and the UI links to that copy — NOT the raw labelUrl, which is an
 *   expiring vendor URL that 404s once it lapses.
 * - [ ] TRACKING a purchased shipment (trackPackage with the label's carrier +
 *   trackingNumber) returns a real status plus an ordered event history in the
 *   UI, and re-tracking as the parcel moves advances the status (pre_transit →
 *   in_transit → delivered) instead of a frozen placeholder. If the app wires an
 *   inbound carrier tracking webhook, a delivered callback advances the STORED
 *   status AND a forged/unsigned callback is rejected.
 * - [ ] A bad/undeliverable address or a provider error surfaces a graceful,
 *   readable message in the UI (not a raw stack trace, not a silent empty rate
 *   list) — user-supplied addresses/parcels are validated server-side before
 *   they reach the carrier.
 * - [ ] SECURITY — the provider API key stays server-side only (this package is
 *   server-only and never ships to the client bundle), and a user can only rate,
 *   label, void, or track their OWN shipments: guessing another user's label id
 *   or tracking number must NOT return that label artifact or tracking status.
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './shipping.js'
export * from './types.js'
