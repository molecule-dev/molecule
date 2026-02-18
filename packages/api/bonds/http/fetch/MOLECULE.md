# @molecule/api-http-fetch

Native fetch HTTP client provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-http-fetch
```

## Usage

```typescript
import { setClient } from '@molecule/api-http'
import { provider } from '@molecule/api-http-fetch'

setClient(provider)
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-http` ^1.0.0
