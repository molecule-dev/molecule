# @molecule/api-flights

Flight search + offer pricing core interface

## Type
`core`

## Bond

- Bond category: `flights`
- Bond shape: singleton — `bond('flights', provider)`
- Implemented by provider bond packages (e.g. `@molecule/api-flights-amadeus`,
  `@molecule/api-flights-duffel`).

## Public API

```ts
import {
  setProvider,
  hasProvider,
  searchFlights,
  getOffer,
  priceOffer,
} from '@molecule/api-flights'
```

- `searchFlights({ origin, destination, departureDate, returnDate?, adults?, children?, infants?, cabin?, maxResults? })`
  — search for flight offers. Returns `FlightOffer[]`.
- `getOffer(offerId)` — fetch a previously-searched offer in detail.
  Returns `FlightOfferDetail`.
- `priceOffer(offerId)` — confirm the up-to-the-minute price.
  Returns `PricingResult`.

`cabin` defaults to `'economy'`. Dates are ISO 8601 calendar dates
(`'YYYY-MM-DD'`); segment instants are full ISO 8601 timestamps with
timezone offset.

## Injection Notes

### Requirements
- A bonded `@molecule/api-flights-*` provider (Amadeus, Duffel, etc.).
  Convenience functions throw a translated `flights.error.noProvider`
  error when none is bonded.

### Post-Injection Steps
- Run `npm install` to install dependencies
- Run `npm run build` to compile

### Known Limitations
- Provider sandboxes (e.g. Amadeus Self-Service test) typically rate-limit
  and may surface stale fares. Add a cache layer (`@molecule/api-cache`)
  when wiring a real-traffic provider.
- `getOffer` is implemented by some providers (e.g. Amadeus) as a
  re-pricing round-trip rather than a true detail fetch — expect a small
  upstream call cost.
