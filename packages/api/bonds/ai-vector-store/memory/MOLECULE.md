# @molecule/api-ai-vector-store-memory

In-memory ai-vector-store-memory provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-vector-store-memory
```

## API

### Constants

#### `provider`

In-memory vector store provider.

Implements the `AIVectorStoreProvider` interface with process-local state and
a brute-force similarity scan. No persistence, no external services.

```typescript
const provider: AIVectorStoreProvider
```

## Core Interface
Implements `@molecule/api-ai-vector-store` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-ai-vector-store'
import { provider } from '@molecule/api-ai-vector-store-memory'

export function setupAiVectorStoreMemory(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai-vector-store` >=1.0.0
