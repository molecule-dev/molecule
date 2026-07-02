# @molecule/api-ai-google

Google ai-google provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-google
```

## API

### Interfaces

#### `GoogleConfig`

Google provider configuration (TODO: expand required fields).

```typescript
interface GoogleConfig {
  // TODO: Define provider-specific config
  [key: string]: unknown
}
```

### Classes

#### `GoogleAIProvider`

Stub Google AI provider scaffold (TODO: implement API wiring).

### Functions

#### `createProvider(config)`

Creates a Google AI provider instance for bonding.

```typescript
function createProvider(config?: GoogleConfig): GoogleAIProvider
```

- `config` — Google provider configuration.

**Returns:** A Google-backed provider instance.

### Constants

#### `aiGoogleSecretDefinitions`

Secret definitions required by the Google AI bond.

```typescript
const aiGoogleSecretDefinitions: SecretDefinition[]
```

## Core Interface
Implements `@molecule/api-ai` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `GOOGLE_AI_API_KEY` *(required)* — Google AI (Gemini) API key
  - Setup: Create a Gemini API key in Google AI Studio.
  - Get it here: [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
  - Example: `AIza...`
