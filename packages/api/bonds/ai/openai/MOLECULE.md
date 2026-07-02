# @molecule/api-ai-openai

Openai ai-openai provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-openai
```

## API

### Interfaces

#### `OpenaiConfig`

OpenAI provider configuration.

```typescript
interface OpenaiConfig {
  /** Override the API key (defaults to `process.env.OPENAI_API_KEY`). */
  apiKey?: string
  /** Default model when callers don't specify one. */
  defaultModel?: string
  /** Default max output tokens. */
  maxTokens?: number
  /** Override the API base URL (for proxies / Azure). */
  baseUrl?: string
}
```

### Classes

#### `OpenaiAIProvider`

OpenAI Chat Completions provider implementing the `AIProvider` interface.

### Functions

#### `createProvider(config)`

Create an OpenAI AI provider instance.

```typescript
function createProvider(config?: OpenaiConfig): AIProvider
```

- `config` — OpenAI-specific configuration.

**Returns:** An `AIProvider` backed by OpenAI's Chat Completions API.

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

### Environment Variables

- `OPENAI_API_KEY` *(required)* — OpenAI API key
  - Setup: Create a secret key on the OpenAI platform (API keys page).
  - Get it here: [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
  - Example: `sk-proj-...`
