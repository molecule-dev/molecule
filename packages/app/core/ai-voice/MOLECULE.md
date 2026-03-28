# @molecule/app-ai-voice

ai-voice core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/app-ai-voice
```

## API

### Interfaces

#### `AIVoiceConfig`

```typescript
interface AIVoiceConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `AIVoiceProvider`

```typescript
interface AIVoiceProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): AIVoiceProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): AIVoiceProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: AIVoiceProvider): void
```
