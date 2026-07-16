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

## E2E Tests

Playback verification — drive the real rendered UI (live preview, no mocks),
adapt each item to this app's actual audio screens/controls, and check every
box off one by one. This core is PLAYBACK ONLY (no recording); a box you
can't check is an integration bug to fix — not a skip:
- [ ] Loading a track and pressing the play control actually plays: the
  current-time readout advances, the progress bar moves, and the UI shows the
  playing state (isPlaying() true, getCurrentTime() keeps climbing). Confirm
  sound is audible, not just that the state flipped — start it from a
  click/tap so autoplay policy does not silently block it.
- [ ] The pause control halts playback: current time freezes, the progress
  bar stops, and the control toggles back to "play"; pressing play resumes
  from the same position, not the start.
- [ ] Dragging/clicking the scrubber to a target position seeks there:
  getCurrentTime() jumps to that time and the displayed elapsed time matches.
- [ ] The volume/mute control changes output: raising/lowering the slider is
  audible and getVolume() reflects it; muting (volume 0) silences the audio
  without pausing it.
- [ ] Total duration and elapsed time render correctly once metadata loads
  (getDuration() > 0, read via onProgress), not "0:00 / 0:00" stuck on screen.
- [ ] Reaching the end fires the ended state: the onEnd callback runs and the
  UI resets to the start (or advances to the next track), not a silent hang.
- [ ] The audio source loads from the app's own origin (a bundled/served
  asset), not a broken external URL — no 404/CORS error in the console and
  sound actually reaches the output.
