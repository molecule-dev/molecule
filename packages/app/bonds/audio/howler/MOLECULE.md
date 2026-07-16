# @molecule/app-audio-howler

STUB audio provider for `@molecule/app-audio` — state-only, NO SOUND.

Despite the package name, this bond does not yet load Howler.js or any
audio backend: `play()`/`pause()`/`seek()` only mutate in-memory state,
`getDuration()` is always 0, and `options.src` is never fetched. It
satisfies the AudioProvider interface for tests and UI development, but
an app that needs AUDIBLE playback must implement a real provider (e.g.
wrap Howler or HTMLAudioElement) and wire that instead.

`HowlerConfig.html5` and `HowlerConfig.volume` are currently ignored.

## Quick Start

```typescript
import { provider } from '@molecule/app-audio-howler'
import { setProvider } from '@molecule/app-audio'

setProvider(provider) // state-only stub — see remarks
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-audio-howler @molecule/app-audio
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

## Core Interface
Implements `@molecule/app-audio` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-audio'
import { provider } from '@molecule/app-audio-howler'

export function setupAudioHowler(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-audio` ^1.0.0

### Runtime Dependencies

- `@molecule/app-audio`
