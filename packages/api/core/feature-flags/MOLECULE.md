# @molecule/api-feature-flags

feature-flags core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/api-feature-flags
```

## API

### Interfaces

#### `FeatureFlagsConfig`

```typescript
interface FeatureFlagsConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `FeatureFlagsProvider`

```typescript
interface FeatureFlagsProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): FeatureFlagsProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): FeatureFlagsProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: FeatureFlagsProvider): void
```
