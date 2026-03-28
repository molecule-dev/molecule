# @molecule/app-notification-center

notification-center core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/app-notification-center
```

## API

### Interfaces

#### `NotificationCenterConfig`

```typescript
interface NotificationCenterConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `NotificationCenterProvider`

```typescript
interface NotificationCenterProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): NotificationCenterProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): NotificationCenterProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: NotificationCenterProvider): void
```
