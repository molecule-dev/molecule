# @molecule/api-cron

cron core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/api-cron
```

## API

### Interfaces

#### `CronConfig`

```typescript
interface CronConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `CronProvider`

```typescript
interface CronProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): CronProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): CronProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: CronProvider): void
```
