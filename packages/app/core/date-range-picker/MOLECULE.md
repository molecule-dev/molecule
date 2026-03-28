# @molecule/app-date-range-picker

date-range-picker core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/app-date-range-picker
```

## API

### Interfaces

#### `DateRangePickerConfig`

```typescript
interface DateRangePickerConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `DateRangePickerProvider`

```typescript
interface DateRangePickerProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): DateRangePickerProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): DateRangePickerProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: DateRangePickerProvider): void
```
