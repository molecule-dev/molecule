# @molecule/api-ai-anthropic

Anthropic ai-anthropic provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-anthropic
```

## API

### Interfaces

#### `AnthropicConfig`

Configuration for anthropic.

```typescript
interface AnthropicConfig {
  /** API key. Defaults to ANTHROPIC_API_KEY env var. */
  apiKey?: string
  /** Default model. Defaults to 'claude-opus-4-6'. */
  defaultModel?: string
  /** Maximum tokens for completions. */
  maxTokens?: number
  /** Base URL override (for proxies). */
  baseUrl?: string
}
```

#### `ProcessEnv`

Process Env interface.

```typescript
interface ProcessEnv {
  ANTHROPIC_API_KEY: string
  /** Base URL override (for credential brokers / gateways). */
  ANTHROPIC_BASE_URL?: string
}
```

### Functions

#### `createProvider(config)`

Creates an Anthropic Claude AI provider instance.

```typescript
function createProvider(config?: AnthropicConfig): AIProvider
```

- `config` — Anthropic-specific configuration (API key, model, max tokens, base URL).

**Returns:** An `AIProvider` backed by the Anthropic Messages API.

### Constants

#### `aiAnthropicSecretDefinitions`

Secret definitions required by the Anthropic AI bond.

```typescript
const aiAnthropicSecretDefinitions: SecretDefinition[]
```

#### `provider`

The provider implementation.

```typescript
const provider: AIProvider
```

## Core Interface
Implements `@molecule/api-ai` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai` ^1.0.0
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `ANTHROPIC_API_KEY` *(required)* — Anthropic API key
  - Setup: Create a key in the Anthropic Console under Settings → API keys.
  - Get it here: [https://console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
  - Example: `sk-ant-api03-...`

Bond this as an AI provider (see `@molecule/api-ai` for the `chat()` streaming loop and the
key-server-side / never-blindly-trust-model-output rules). Config: `ANTHROPIC_API_KEY`
(SERVER-side only — never shipped to the browser) plus an optional default model id. Drive it
through the core `chat()` / `requireProvider()`, NOT the Anthropic SDK directly, so the app
stays provider-agnostic and can swap models/providers by changing only the bond.

**Missing `ANTHROPIC_API_KEY` fails fast**: the provider throws naming the exact env var on
first use (the exported `provider` is a lazy proxy, so this fires on the first `chat()` call,
not at bond/module-load time) — it never silently sends an empty key and surfaces only as a
generic 401 later.

**Error message disambiguation**: a non-OK response yields a sanitized `error` ChatEvent
(never a throw). A permanently-invalid request — a plain 400 that ISN'T a context-length
error (bad param, malformed tool schema) — gets its own non-retryable message ("AI request
was invalid — check the model and request parameters.") distinct from the generic "AI service
error. Please try again." used for retryable failures; don't retry a plain 400 as if it might
succeed on a second attempt.

## Translations

Translation strings are provided by `@molecule/api-locales-ai-anthropic`.
