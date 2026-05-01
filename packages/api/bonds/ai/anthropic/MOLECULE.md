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

### Environment Variables

- `ANTHROPIC_API_KEY` *(required)*

## Translations

Translation strings are provided by `@molecule/api-locales-ai-anthropic`.
