# @molecule/api-ai-local

Local (OpenAI-compatible) ai-local provider for molecule.dev.

Streams chat completions from any local inference server that speaks the
OpenAI `chat/completions` protocol (Ollama, LM Studio, llama.cpp, vLLM),
keyless by default.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-local
```

## API

### Interfaces

#### `LocalConfig`

Local (OpenAI-compatible) provider configuration.

```typescript
interface LocalConfig {
  /**
   * Base URL of the OpenAI-compatible endpoint, INCLUDING the version segment
   * (e.g. `http://localhost:11434/v1`). Overrides `LOCAL_AI_BASE_URL` /
   * `OLLAMA_BASE_URL`. Defaults to Ollama's `http://localhost:11434/v1`.
   */
  baseUrl?: string
  /**
   * Optional API key. Most local servers ignore auth; when omitted (and no
   * `LOCAL_AI_API_KEY` env var is set) no `Authorization` header is sent.
   */
  apiKey?: string
  /**
   * Default model when a call doesn't specify one. Overrides `LOCAL_AI_MODEL`.
   * Defaults to `llama3.1`.
   */
  model?: string
}
```

### Classes

#### `LocalAIProvider`

Local (OpenAI-compatible) chat provider implementing the `AIProvider`
interface. Mirrors `@molecule/api-ai-openai` so the same handler code can
dispatch to a local endpoint.

### Functions

#### `createProvider(config)`

Create a local (OpenAI-compatible) AI provider instance.

Constructs WITHOUT requiring any secret — local endpoints run keyless.

```typescript
function createProvider(config?: LocalConfig): AIProvider
```

- `config` — Local provider configuration.

**Returns:** An `AIProvider` backed by an OpenAI-compatible local endpoint.

### Constants

#### `aiLocalSecretDefinitions`

Optional secret/config overrides recognised by the local AI bond.

```typescript
const aiLocalSecretDefinitions: SecretDefinition[]
```

#### `provider`

The provider implementation. Constructs keyless — no secret required.

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

**Error message disambiguation**: a plain 400 that ISN'T a context-length error (bad param,
malformed tool schema) gets its own non-retryable message distinct from the generic
"AI service error. Please try again." used for retryable failures.
