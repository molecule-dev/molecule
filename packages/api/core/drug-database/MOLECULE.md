# @molecule/api-drug-database

Drug catalog + interactions core interface

## Type
`core`

## Bond

- Bond category: `drug-database`
- Bond shape: singleton — `bond('drug-database', provider)`
- Implemented by provider bond packages (e.g.
  `@molecule/api-drug-database-rxnorm`).

## Public API

```ts
import {
  setProvider,
  hasProvider,
  searchDrug,
  getDrug,
  checkInteractions,
  getNDCs,
} from '@molecule/api-drug-database'
```

- `searchDrug(query)` — free-text search by brand or generic name.
  Returns normalized `DrugMatch[]`.
- `getDrug(id)` — full drug detail (dosage forms, ingredients, names).
  Returns `DrugDetail | null`.
- `checkInteractions(drugIds)` — reported interactions between supplied
  drug ids. Returns `DrugInteraction[]`. Empty array means "no
  interactions reported by this provider", NOT a clinical guarantee.
- `getNDCs(drugId)` — National Drug Code identifiers associated with a
  drug. Returns `string[]`.

## Injection Notes

### Requirements
- A bonded `@molecule/api-drug-database-*` provider (RxNorm, openFDA,
  etc.). Convenience functions throw a translated
  `drugDatabase.error.noProvider` error when none is bonded.

### Post-Injection Steps
- Run `npm install` to install dependencies
- Run `npm run build` to compile

### Known Limitations
- Some upstream APIs (notably the NIH NLM RxNorm interactions endpoint)
  are being deprecated. Bonds whose upstream is unavailable resolve to
  `[]` for `checkInteractions` rather than throwing — application code
  MUST surface that ambiguity to end-users when relevant.
- Coverage varies by provider. RxNorm covers FDA-approved US drugs;
  openFDA layers in adverse-event and labeling data; international
  catalogs (EMA, WHO ATC) require separate bonds.
