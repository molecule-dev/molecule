# @molecule/api-crypto-prices

Crypto coin list + historical prices core interface

## Type
`core`

## Bond

- Bond category: `crypto-prices`
- Bond shape: singleton — `bond('crypto-prices', provider)`
- Implemented by provider bond packages (e.g. `@molecule/api-crypto-prices-coingecko`,
  `@molecule/api-crypto-prices-coinmarketcap`).

## Public API

```ts
import {
  setProvider,
  hasProvider,
  listCoins,
  getPrice,
  getHistorical,
  listSupportedSymbols,
  getMarketStats,
} from '@molecule/api-crypto-prices'
```

- `listCoins({ vsCurrency?, limit?, page?, order? })` — market-cap-ranked coin
  rows with latest spot price.
- `getPrice(id, vsCurrency?)` — latest spot price + 24h change for one coin.
- `getHistorical(id, days, vsCurrency?)` — historical price series.
- `listSupportedSymbols()` — provider-specific coin identifiers.
- `getMarketStats(id, vsCurrency?)` — price + market-cap + volume + supply.

`vsCurrency` defaults to `'usd'` and is conventionally lower-case.

## Injection Notes

### Requirements
- A bonded `@molecule/api-crypto-prices-*` provider (CoinGecko, CoinMarketCap,
  Binance, etc.). Convenience functions throw a translated
  `cryptoPrices.error.noProvider` error when none is bonded.

### Post-Injection Steps
- Run `npm install` to install dependencies
- Run `npm run build` to compile

### Known Limitations
- Free-tier providers (e.g. CoinGecko) typically rate-limit ~30 req/min;
  add a cache layer (`@molecule/api-cache`) when wiring a provider.
