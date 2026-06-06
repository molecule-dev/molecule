# @molecule/app-bias-indicator-react

React political-bias / source-credibility indicator.

Exports `<BiasIndicator>` — left/right scale with marker plus
optional reliability dot/chip — for news-aggregator article
headers and dense article lists (compact variant).

## Quick Start

```tsx
import { BiasIndicator } from '@molecule/app-bias-indicator-react'

<BiasIndicator bias={-0.4} reliability={0.8} sourceLabel="Reuters" />
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-bias-indicator-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-bias-indicator`.
