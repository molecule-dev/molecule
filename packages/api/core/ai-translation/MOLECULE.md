# @molecule/api-ai-translation

AI text-translation core interface for molecule.dev.

Defines the `AITranslationProvider` contract — translate text between
languages (`translate`), list supported languages, and read billing-period
usage — plus the accessor (`setProvider`/`getProvider`/`hasProvider`/
`requireProvider`). Interface-only: bond a provider package (e.g.
`@molecule/api-ai-translation-deepl`).

## Quick Start

```typescript
import { setProvider, requireProvider } from '@molecule/api-ai-translation'
import { createProvider } from '@molecule/api-ai-translation-deepl'

// Wire at startup. See the bond package for its config/env (e.g. DEEPL_API_KEY).
setProvider(createProvider())

// Use anywhere after startup.
const { translations } = await requireProvider().translate({
  text: ['Hello world', 'Thanks for your order'],
  targetLang: 'DE',
})
console.log(translations[0].text, translations[0].detectedSourceLang) // 'Hallo Welt', 'EN'
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-ai-translation
```

## API

### Interfaces

#### `AITranslationConfig`

Base configuration for AITranslation providers.

```typescript
interface AITranslationConfig {
  /** API key for authentication. Typically falls back to an environment variable. */
  apiKey?: string
  /** Base URL for the translation API. */
  baseUrl?: string
}
```

#### `AITranslationProvider`

AITranslation provider interface.

Bond packages implement this interface to provide translation services
from different backends (DeepL, Google Translate, etc.).

```typescript
interface AITranslationProvider {
  /** Provider identifier (e.g., 'deepl', 'google'). */
  readonly name: string

  /**
   * Translate one or more texts to a target language.
   *
   * @param params - Translation parameters including text(s) and target language.
   * @returns Translation results with detected source languages.
   */
  translate(params: TranslateParams): Promise<TranslationResult>

  /**
   * Get the list of languages supported by this provider.
   *
   * @param type - Whether to list 'source' or 'target' languages. Defaults to 'source'.
   * @returns Array of supported languages with metadata.
   */
  getSupportedLanguages(type?: 'source' | 'target'): Promise<SupportedLanguage[]>

  /**
   * Get current API usage statistics for the billing period.
   *
   * @returns Character count and limit for the current period.
   */
  getUsage(): Promise<TranslationUsage>
}
```

#### `SupportedLanguage`

A language supported by the translation provider.

```typescript
interface SupportedLanguage {
  /** Language code (e.g., 'EN', 'DE', 'FR', 'PT-BR'). */
  language: string
  /** Human-readable language name (e.g., 'English', 'German'). */
  name: string
  /** Whether formality options are supported for this language. */
  supportsFormality?: boolean
}
```

#### `TranslatedText`

A single translated text with its detected source language.

```typescript
interface TranslatedText {
  /** The translated text. */
  text: string
  /** Detected source language code (e.g., 'EN', 'DE'). */
  detectedSourceLang: string
}
```

#### `TranslateParams`

Parameters for translating text.

```typescript
interface TranslateParams {
  /** Text or array of texts to translate. Maximum 50 texts per request. */
  text: string | string[]
  /** Target language code (e.g., 'DE', 'FR', 'ES', 'EN-US'). */
  targetLang: string
  /** Source language code. If omitted, the provider auto-detects the language. */
  sourceLang?: string
  /** Formality preference. Not all providers or target languages support this. */
  formality?: 'default' | 'more' | 'less' | 'prefer_more' | 'prefer_less'
  /** Whether to preserve original formatting conventions. */
  preserveFormatting?: boolean
  /** Glossary identifier for consistent terminology. May require sourceLang to be set. */
  glossaryId?: string
  /** How to handle markup tags in the text ('xml' or 'html'). */
  tagHandling?: 'xml' | 'html'
  /** Additional context to improve translation accuracy (not translated itself). */
  context?: string
  /** Model type preference for quality vs latency trade-off. */
  modelType?: 'quality_optimized' | 'prefer_quality_optimized' | 'latency_optimized'
}
```

#### `TranslationResult`

Result of a translation request containing one or more translated texts.

```typescript
interface TranslationResult {
  /** Array of translation results, one per input text. */
  translations: TranslatedText[]
}
```

#### `TranslationUsage`

API usage statistics for the current billing period.

```typescript
interface TranslationUsage {
  /** Number of characters translated in the current billing period. */
  characterCount: number
  /** Maximum character limit for the current billing period. */
  characterLimit: number
}
```

### Functions

#### `getProvider()`

Returns the bonded AI translation provider, or `null` if none is registered.

```typescript
function getProvider(): AITranslationProvider | null
```

**Returns:** The active provider, or `null`.

#### `hasProvider()`

Returns whether an AI translation provider has been registered.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a provider is bonded.

#### `requireProvider()`

Returns the bonded AI translation provider, throwing if none is configured.

```typescript
function requireProvider(): AITranslationProvider
```

**Returns:** The active provider.

#### `setProvider(provider)`

Registers the AI translation provider singleton.

```typescript
function setProvider(provider: AITranslationProvider): void
```

- `provider` — The AI translation provider implementation to register.

## Available Providers

| Provider | Package |
|----------|---------|
| Ai Translation | `@molecule/api-ai-translation-deepl` |

## Injection Notes

- **Wire it with THIS package's `setProvider()` — NOT `bond('ai-translation', …)`.**
  This core keeps its own singleton and does not read the `@molecule/api-bond`
  registry: a generic `bond(...)` call appears to succeed, but `requireProvider()`
  still throws at first use. Call `setProvider(...)` in the app's bond setup.
- **This translates CONTENT, not the UI.** App chrome/labels stay on the i18n
  system (`t(key, values, { defaultValue })` + locale bonds); use this bond for
  user-generated or dynamic text.
- **Language codes are provider-flavored** and regional variants matter on the
  target side (e.g. 'EN-US' vs 'EN', 'PT-BR') — don't hardcode a guessed list;
  populate pickers from `getSupportedLanguages('target')` and pass codes through
  verbatim.
- **`translate` is batched:** pass `text: string[]` (max 50 per request) instead
  of looping; results return one `TranslatedText` per input, each with
  `detectedSourceLang` when `sourceLang` was omitted.
- **Server-side only + quota-aware.** Keep the provider key on the API;
  translation is billed per character (`getUsage()` exposes the period quota) —
  auth and rate-limit any endpoint that translates caller-supplied text.
- `formality` and glossaries are provider/language-dependent — treat them as
  best-effort hints, not guarantees.

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
