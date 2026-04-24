# @molecule/app-audio-howler

Howler.js provider for \@molecule/app-audio.

Provides an in-memory audio player implementation conforming to
the molecule audio provider interface.

## Quick Start

```typescript
import { provider } from '@molecule/app-audio-howler'
import { setProvider } from '@molecule/app-audio'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-audio-howler
```

## API

### Interfaces

#### `HowlerConfig`

Provider-specific configuration options.

```typescript
interface HowlerConfig {
  /** Whether to use HTML5 Audio instead of Web Audio API. Defaults to `false`. */
  html5?: boolean

  /** Global volume for all sounds. Defaults to `1.0`. */
  volume?: number
}
```

### Functions

#### `createProvider(_config)`

Creates a Howler-based audio provider.

```typescript
function createProvider(_config?: HowlerConfig): AudioProvider
```

- `_config` — Optional provider configuration.

**Returns:** A configured AudioProvider.

### Constants

#### `provider`

Default Howler audio provider instance.

```typescript
const provider: AudioProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-audio` ^1.0.0
