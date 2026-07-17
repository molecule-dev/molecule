# @molecule/api-ai-translation-deepl

DeepL translation provider for molecule.dev.

Implements the full `@molecule/api-ai-translation` contract (`translate`,
`getSupportedLanguages`, `getUsage`) over the DeepL REST API, auto-batching
large inputs (50 texts per request, DeepL's limit).

## Quick Start

```typescript
import { setProvider, requireProvider } from '@molecule/api-ai-translation'
import { provider } from '@molecule/api-ai-translation-deepl'

setProvider(provider) // at startup — lazy; reads DEEPL_API_KEY on first use

const { translations } = await requireProvider().translate({
  text: 'Hello, world!',
  targetLang: 'DE',
})
```

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

#### `provider`

The provider implementation.

```typescript
const provider: AITranslationProvider
```

## Core Interface
Implements `@molecule/api-ai-translation` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-ai-translation'
import { provider } from '@molecule/api-ai-translation-deepl'

export function setupAiTranslationDeepl(): void {
  setProvider(provider)
}
```

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

- **Wiring**: bond the lazy `provider` export once — `setProvider(provider)` — or
  `setProvider(createProvider(config?))` to pass explicit config. Use the core's
  `setProvider`, NOT `bond('ai-translation', …)`.
- Config: `DEEPL_API_KEY` (required; free keys end in `:fx` and auto-route to
  `https://api-free.deepl.com`, pro keys to `https://api.deepl.com`); `DEEPL_BASE_URL`
  (optional) overrides the endpoint outright — it deliberately wins over the key-shape
  heuristic so credential brokers/gateways work with either key type.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip.
The sandbox has a live AI provider, so translations run for real; output is
non-deterministic, so assert on the resulting LANGUAGE/meaning, never an
exact string:
- [ ] Translating real text to a target language through the UI returns text
  ACTUALLY in that language — English→Spanish produces recognizably Spanish,
  not the original echoed back or left in English.
- [ ] Switching the target language (from the picker populated by
  getSupportedLanguages('target')) changes the output language for the same
  input — the same source re-translates into the newly chosen language.
- [ ] With sourceLang omitted the provider auto-detects: a known-language
  input comes back with the correct detectedSourceLang, and if the UI shows
  a detected-language label it names the right one.
- [ ] Text already in the target language is left sensible — unchanged or a
  valid paraphrase, never mangled, doubled, or emptied.
- [ ] Empty or untranslatable input (whitespace, emoji, a bare code snippet)
  is handled gracefully — a clear UI state, nothing crashes.
- [ ] A provider failure (bad key, quota exhausted, network drop) surfaces a
  visible error in the UI, not an unhandled 500 or a silently blank result.
- [ ] The translate call runs server-side only — the provider key never
  reaches the browser (check the network panel: no key in any request).
