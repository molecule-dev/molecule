# @molecule/api-ai-translation-deepl

DeepL translation provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-translation-deepl @molecule/api-ai-translation @molecule/api-secrets
```

## API

### Interfaces

#### `DeeplConfig`

Configuration for the DeepL translation provider.

```typescript
interface DeeplConfig {
  /** DeepL API key. Defaults to DEEPL_API_KEY env var. */
  apiKey?: string
  /**
   * Base URL for the DeepL API.
   * Defaults to 'https://api-free.deepl.com' for free keys (ending in ':fx'),
   * or 'https://api.deepl.com' for pro keys.
   */
  baseUrl?: string
  /** Default formality preference. Defaults to 'default'. */
  defaultFormality?: 'default' | 'more' | 'less' | 'prefer_more' | 'prefer_less'
  /** Default model type preference. Defaults to 'latency_optimized'. */
  defaultModelType?: 'quality_optimized' | 'prefer_quality_optimized' | 'latency_optimized'
}
```

### Functions

#### `createProvider(config)`

Creates a DeepL translation provider instance.

```typescript
function createProvider(config?: DeeplConfig): AITranslationProvider
```

- `config` — DeepL-specific configuration (API key, base URL, defaults).

**Returns:** An `AITranslationProvider` backed by the DeepL REST API.

### Constants

#### `aiTranslationDeeplSecretDefinitions`

Secret definitions required by the DeepL translation bond.

```typescript
const aiTranslationDeeplSecretDefinitions: SecretDefinition[]
```

## Core Interface
Implements `@molecule/api-ai-translation` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai-translation` >=1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `DEEPL_API_KEY` *(required)* — DeepL API key
  - Setup: Copy the authentication key from your DeepL account (free keys end with ":fx").
  - Get it here: [https://www.deepl.com/en/your-account/keys](https://www.deepl.com/en/your-account/keys)
  - Example: `279a2e9d-...:fx`

### Runtime Dependencies

- `@molecule/api-ai-translation`
- `@molecule/api-secrets`
