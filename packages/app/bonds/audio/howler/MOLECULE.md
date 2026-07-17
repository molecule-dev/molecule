# @molecule/app-audio-howler

Howler.js audio provider for `@molecule/app-audio` — real, audible playback.

Bonds Howler.js (`new Howl({ src: [...] })`) behind the core `AudioProvider`
contract. Each player wraps a live `Howl`, so playback is genuinely audible
and every read reflects real Howler state: `getDuration()` returns the loaded
track's duration, `getCurrentTime()` reflects the real seek position,
`isPlaying()`/`getVolume()` read Howler directly, and `onEnd`/`onProgress`
are driven by Howler's own events.

Core `AudioPlayerOptions` map onto Howler's constructor (`src` normalized to
an array, plus `loop`/`autoplay`/`volume`); the provider-level `HowlerConfig`
supplies the default `html5` backend and an optional global volume.

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
npm install @molecule/app-audio-howler @molecule/app-audio
```

## API

### Interfaces

#### `HowlerConfig`

Provider-specific configuration options.

```typescript
interface HowlerConfig {
  /**
   * Use HTML5 Audio instead of the Web Audio API as the default backend for
   * every player this provider creates (maps to Howler's `html5` option — best
   * for large/streamed files). Defaults to `false`.
   */
  html5?: boolean

  /**
   * Global volume applied to all sounds via Howler's global `Howler.volume(...)`
   * when the provider is created (0.0 to 1.0). Left untouched when omitted.
   */
  volume?: number
}
```

### Functions

#### `createHowlerPlayer(options, config)`

Creates a real, audible audio player backed by a Howler `Howl` instance.

The core `AudioPlayerOptions` are mapped onto Howler's constructor options
(`src` normalized to an array, plus `loop`/`autoplay`/`volume`), and the
provider-level {@link HowlerConfig} supplies the default `html5` backend.
Event subscriptions are wired through Howler's `.on(...)` API: `onEnd` fires
from the `end` event, and `onProgress` is driven by a `requestAnimationFrame`
loop that runs while the sound is playing (plus one emit on `load`, so the
real duration is reported as soon as metadata is available).

```typescript
function createHowlerPlayer(options: AudioPlayerOptions, config?: HowlerConfig): AudioPlayerInstance
```

- `options` — Core audio player configuration (source, callbacks, etc.).
- `config` — Provider-level Howler configuration.

**Returns:** An `AudioPlayerInstance` whose reads reflect live Howler state.

#### `createProvider(config)`

Creates a Howler-backed audio provider that plays real, audible audio.

`config.volume`, when provided, sets Howler's global volume for every sound;
`config.html5` selects the HTML5 Audio backend (over Web Audio) as the
default for the players this provider creates. Each `createPlayer()` builds a
live `Howl` and returns an `AudioPlayerInstance` whose reads reflect real
Howler state (see {@link createHowlerPlayer}).

```typescript
function createProvider(config?: HowlerConfig): AudioProvider
```

- `config` — Optional provider configuration.

**Returns:** A configured `AudioProvider` backed by Howler.

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

- **Browsers block autoplay.** `autoplay: true` or `play()` outside a user
  gesture is ignored until the user interacts with the page — start playback
  from a click/tap handler.
- **`getDuration()` is 0 until metadata loads.** Read it in `onProgress` (it
  emits once on Howler's `load` event) rather than synchronously right after
  `createPlayer`.
- **Call `destroy()` on unmount.** It stops the progress loop and calls
  `Howl.unload()` to release buffers and detach listeners.

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
