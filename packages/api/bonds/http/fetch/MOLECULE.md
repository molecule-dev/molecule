# @molecule/api-http-fetch

Native fetch HTTP client provider for molecule.dev.

## Quick Start

```typescript
import { setClient } from '@molecule/api-http'
import { provider } from '@molecule/api-http-fetch'

setClient(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-http-fetch
```

## API

### Constants

#### `fetchClient`

HTTP client using native fetch.

```typescript
const fetchClient: HttpClient
```

#### `provider`

Default fetch-based HTTP provider.

```typescript
const provider: HttpClient
```

## Core Interface
Implements `@molecule/api-http` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setClient } from '@molecule/api-http'
import { provider } from '@molecule/api-http-fetch'

export function setupHttpFetch(): void {
  setClient(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-http` ^1.0.0
