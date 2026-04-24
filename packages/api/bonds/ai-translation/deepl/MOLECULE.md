# @molecule/api-ai-translation-deepl

DeepL translation provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-translation-deepl
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai-translation` >=1.0.0
