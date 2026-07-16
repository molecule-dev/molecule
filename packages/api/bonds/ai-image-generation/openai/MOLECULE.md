# @molecule/api-ai-image-generation-openai

OpenAI image-generation provider for molecule.dev (gpt-image-1 + DALL·E 3).

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-image-generation-openai @molecule/api-ai-image-generation @molecule/api-secrets
```

## API

### Interfaces

#### `OpenaiImageGenerationConfig`

Configuration for the OpenAI image generation provider.

```typescript
interface OpenaiImageGenerationConfig {
  /** OpenAI API key. Defaults to OPENAI_API_KEY env var. */
  apiKey?: string
  /** Default model for generation. Defaults to 'gpt-image-1'. */
  defaultModel?: string
  /** Base URL for the OpenAI API. Defaults to 'https://api.openai.com'. */
  baseUrl?: string
  /** Default image size. Defaults to '1024x1024'. */
  defaultSize?: string
  /**
   * Default quality level. Omitted from requests unless set — 'auto' is only
   * valid for gpt-image-1; dall-e-3 accepts 'standard' | 'hd'. When unset,
   * OpenAI applies the model-appropriate default.
   */
  defaultQuality?: string
}
```

### Functions

#### `createProvider(config)`

Creates an OpenAI image generation provider instance.

```typescript
function createProvider(config?: OpenaiImageGenerationConfig): AIImageGenerationProvider
```

- `config` — OpenAI-specific configuration (API key, model, base URL, size, quality).

**Returns:** An `AIImageGenerationProvider` backed by the OpenAI Images API.

### Constants

#### `aiImageGenerationOpenaiSecretDefinitions`

Secret definitions required by the OpenAI image generation bond.

```typescript
const aiImageGenerationOpenaiSecretDefinitions: SecretDefinition[]
```

## Core Interface
Implements `@molecule/api-ai-image-generation` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai-image-generation` >=1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `OPENAI_API_KEY` *(required)* — OpenAI API key
  - Setup: Create a secret key on the OpenAI platform (API keys page).
  - Get it here: [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
  - Example: `sk-proj-...`

### Runtime Dependencies

- `@molecule/api-ai-image-generation`
- `@molecule/api-secrets`

This bond exports `createProvider()` ONLY — there is no eager `provider`
const (unlike sibling bonds). Wire it with the core's
`setProvider(createProvider())` from `@molecule/api-ai-image-generation` —
NOT `bond('ai-image-generation', …)`: that core keeps its own singleton and
never reads the bond registry (see the core's docs).

Config: `OPENAI_API_KEY` (SERVER-side only; NOT fail-fast — a missing key
surfaces as the upstream 401 on first use), optional `defaultModel`
(default `gpt-image-1`), `defaultSize` (default `1024x1024`), and `baseUrl`
(`OPENAI_BASE_URL` env var, for proxies/gateways).

Size/quality quirks are normalized for you: a requested `size` outside the
active model's whitelist is mapped to the closest supported one (dall-e-3:
1024x1024 | 1024x1792 | 1792x1024; gpt-image-1: 1024x1024 | 1024x1536 |
1536x1024 | auto), and `quality` is omitted unless explicitly set — 'auto'
is only valid for gpt-image-1; dall-e-3 accepts 'standard' | 'hd'.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Entering a prompt in the UI and submitting produces a REAL rendered
  image in the live preview — not a broken img (image icon / alt text), a
  grey placeholder, or an error toast. Confirm the `img` element actually
  decoded (its `naturalWidth`/`naturalHeight` are non-zero) and the picture
  visibly reflects the prompt (a "red bicycle" prompt shows a red bicycle).
- [ ] Two different prompts produce two visibly different images — a fixed
  stub, or a cached first result that never changes, is a broken integration.
- [ ] The image is STORED AND SERVED FROM THE APP'S OWN ORIGIN: the rendered
  `img` `src` (and any saved record) points at the app's uploads/storage, not
  the provider's temporary URL. Provider `url` results expire — reload the
  page (or revisit the record later) and the image must still load. Download
  the provider result server-side and persist it (uploads bond); never
  hotlink the provider URL — it 404s later and can leak the API request
  context. (`base64`/`data` results must likewise be saved, not held only in
  the response.)
- [ ] Any exposed generation options take effect: changing size/dimensions
  yields a differently-sized image; requesting a count (`n`) of N renders N
  images. If the UI exposes no such options, this box is n/a — say so.
- [ ] A rejected or policy-violating prompt, or a provider/rate-limit error,
  surfaces a clear message in the UI — not a crash, a blank screen, or a
  silently-broken img. The user can recover and try another prompt.
- [ ] Generation is server-side and authorized: the provider API key never
  reaches the browser (check the network tab / built client bundle — no key,
  no direct provider call from the page), the generate endpoint requires
  auth, and a caller cannot run unbounded costly generations through an open
  or unrate-limited route. Every image is billed.
