# @molecule/app-color-picker

color-picker core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/app-color-picker
```

## API

### Interfaces

#### `ColorPickerConfig`

```typescript
interface ColorPickerConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `ColorPickerProvider`

```typescript
interface ColorPickerProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): ColorPickerProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): ColorPickerProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: ColorPickerProvider): void
```
