# @molecule/app-stepper

stepper core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/app-stepper
```

## API

### Interfaces

#### `StepperConfig`

```typescript
interface StepperConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `StepperProvider`

```typescript
interface StepperProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): StepperProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): StepperProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: StepperProvider): void
```
