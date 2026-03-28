# @molecule/api-cron-bullmq

Bullmq cron-bullmq provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-cron-bullmq
```

## API

### Interfaces

#### `BullmqConfig`

```typescript
interface BullmqConfig {
  // TODO: Define provider-specific config
  [key: string]: unknown
}
```

### Classes

#### `BullmqCronProvider`

### Functions

#### `createProvider(config)`

```typescript
function createProvider(config: BullmqConfig): BullmqCronProvider
```
