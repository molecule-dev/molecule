# @molecule/app-audio

Audio player core interface for molecule.dev.

Provides a standardized API for audio playback. Bond a provider
(e.g. `@molecule/app-audio-howler`) to supply the concrete implementation.

## Quick Start

```typescript
import { requireProvider } from '@molecule/app-audio'

const player = requireProvider().createPlayer({
  src: '/audio/track.mp3',
  volume: 0.8,
  onEnd: () => console.log('Playback finished'),
})
player.play()
```

## Type
`core`

## Installation
```bash
npm install @molecule/app-audio
```

## API

### Interfaces

#### `AudioPlayerInstance`

A live audio player instance returned by the provider.

```typescript
interface AudioPlayerInstance {
  /**
   * Starts or resumes playback.
   */
  play(): void

  /**
   * Pauses playback.
   */
  pause(): void

  /**
   * Stops playback and resets position to the beginning.
   */
  stop(): void

  /**
   * Seeks to a specific time position.
   *
   * @param time - Position in seconds to seek to.
   */
  seek(time: number): void

  /**
   * Sets the playback volume.
   *
   * @param volume - Volume level from 0.0 (muted) to 1.0 (full).
   */
  setVolume(volume: number): void

  /**
   * Returns the current playback volume.
   *
   * @returns Volume level from 0.0 to 1.0.
   */
  getVolume(): number

  /**
   * Returns the total duration of the audio in seconds.
   *
   * @returns Duration in seconds.
   */
  getDuration(): number

  /**
   * Returns the current playback position in seconds.
   *
   * @returns Current time in seconds.
   */
  getCurrentTime(): number

  /**
   * Checks whether the audio is currently playing.
   *
   * @returns `true` if audio is playing.
   */
  isPlaying(): boolean

  /**
   * Destroys the player instance and releases all resources.
   */
  destroy(): void
}
```

#### `AudioPlayerOptions`

Configuration options for creating an audio player.

```typescript
interface AudioPlayerOptions {
  /** Audio source URL(s). Multiple URLs provide format fallbacks. */
  src: string | string[]

  /** Whether to start playing automatically. Defaults to `false`. */
  autoplay?: boolean

  /** Whether to loop playback. Defaults to `false`. */
  loop?: boolean

  /** Initial volume level (0.0 to 1.0). Defaults to `1.0`. */
  volume?: number

  /** Callback when playback reaches the end. */
  onEnd?: () => void

  /** Callback invoked during playback with current time and total duration. */
  onProgress?: (time: number, duration: number) => void
}
```

#### `AudioProvider`

Audio player provider interface.

All audio providers must implement this interface to create
and manage audio playback.

```typescript
interface AudioProvider {
  /** Provider name identifier. */
  readonly name: string

  /**
   * Creates a new audio player instance.
   *
   * @param options - Configuration for the player.
   * @returns An audio player instance.
   */
  createPlayer(options: AudioPlayerOptions): AudioPlayerInstance
}
```

### Functions

#### `getProvider()`

Retrieves the bonded audio provider, or `null` if none is bonded.

```typescript
function getProvider(): AudioProvider | null
```

**Returns:** The active audio provider, or `null`.

#### `hasProvider()`

Checks whether an audio provider has been bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if an audio provider is available.

#### `requireProvider()`

Retrieves the bonded audio provider, throwing if none is configured.

```typescript
function requireProvider(): AudioProvider
```

**Returns:** The active audio provider.

#### `setProvider(provider)`

Registers an audio provider as the active singleton.

```typescript
function setProvider(provider: AudioProvider): void
```

- `provider` — The audio provider implementation to bond.
