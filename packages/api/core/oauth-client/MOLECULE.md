# @molecule/api-oauth-client

oauth-client core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/api-oauth-client
```

## API

### Interfaces

#### `OauthClientConfig`

```typescript
interface OauthClientConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `OauthClientProvider`

```typescript
interface OauthClientProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): OauthClientProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): OauthClientProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: OauthClientProvider): void
```
