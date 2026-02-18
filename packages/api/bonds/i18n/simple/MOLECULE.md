# @molecule/api-i18n-simple

Simple i18n provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-i18n-simple
```

## Usage

```typescript
import { setProvider } from '@molecule/api-i18n'
import { provider } from '@molecule/api-i18n-simple'

setProvider(provider)
```

## API

### Functions

#### `createSimpleI18nProvider(initialLocale, initialLocales)`

Creates a simple i18n provider that implements the `I18nProvider` interface
using in-memory translations, `Intl` APIs for formatting, and CLDR plural rules.

```typescript
function createSimpleI18nProvider(initialLocale?: string, initialLocales?: LocaleConfig[]): I18nProvider
```

- `initialLocale` — The starting locale code (default: `'en'`).
- `initialLocales` — Pre-loaded locale configurations with translations.

**Returns:** An `I18nProvider` with translation, formatting, and pluralization support.

### Constants

#### `provider`

Default simple provider.

```typescript
const provider: I18nProvider
```

## Core Interface
Implements `@molecule/api-i18n` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-i18n` ^1.0.0
