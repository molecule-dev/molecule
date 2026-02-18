# @molecule/app-video

Video player interface for molecule.dev.

Provides a unified API for video playback that works with
different video player libraries (Video.js, Plyr, Vidstack, etc.).

## Type
`feature`

## Installation
```bash
npm install @molecule/app-video
```

## API

### Interfaces

#### `ControlsConfig`

Video player control toggles (play/pause, progress, volume, fullscreen, PiP, captions, quality, etc.).

```typescript
interface ControlsConfig {
  /**
   * Enable/disable all controls.
   */
  enabled?: boolean

  /**
   * Individual control toggles.
   */
  playPause?: boolean
  progress?: boolean
  currentTime?: boolean
  duration?: boolean
  volume?: boolean
  mute?: boolean
  fullscreen?: boolean
  pip?: boolean
  settings?: boolean
  captions?: boolean
  quality?: boolean
  playbackRate?: boolean
  download?: boolean
  seekForward?: boolean
  seekBackward?: boolean

  /**
   * Seek time in seconds.
   */
  seekTime?: number

  /**
   * Available playback rates.
   */
  playbackRates?: number[]
}
```

#### `PlayerConfig`

Video player initialization options (sources, poster, autoplay, controls, tracks, aspect ratio, etc.).

```typescript
interface PlayerConfig {
  /**
   * Container element.
   */
  container: HTMLElement | string

  /**
   * Video sources.
   */
  sources: VideoSource[]

  /**
   * Poster image URL.
   */
  poster?: string

  /**
   * Autoplay.
   */
  autoplay?: boolean

  /**
   * Loop playback.
   */
  loop?: boolean

  /**
   * Muted.
   */
  muted?: boolean

  /**
   * Initial volume (0-1).
   */
  volume?: number

  /**
   * Playback rate.
   */
  playbackRate?: number

  /**
   * Preload mode.
   */
  preload?: 'none' | 'metadata' | 'auto'

  /**
   * Text tracks (captions/subtitles).
   */
  tracks?: TextTrack[]

  /**
   * Controls configuration.
   */
  controls?: ControlsConfig | boolean

  /**
   * Inline playback (iOS).
   */
  playsinline?: boolean

  /**
   * Cross-origin mode.
   */
  crossorigin?: 'anonymous' | 'use-credentials'

  /**
   * Aspect ratio (e.g., '16:9', '4:3').
   */
  aspectRatio?: string

  /**
   * Fluid width (responsive).
   */
  fluid?: boolean

  /**
   * Fill container.
   */
  fill?: boolean

  /**
   * Custom CSS class.
   */
  className?: string

  /**
   * Language for UI.
   */
  language?: string

  /**
   * Keyboard shortcuts.
   */
  keyboard?: boolean

  /**
   * Click to play/pause.
   */
  clickToPlay?: boolean

  /**
   * Double-click to fullscreen.
   */
  doubleClickFullscreen?: boolean

  /**
   * Hide controls delay (ms).
   */
  hideControlsDelay?: number
}
```

#### `PlayerState`

Current video player state (playing, paused, time, duration, volume, buffered, quality).

```typescript
interface PlayerState {
  /**
   * Current playback time in seconds.
   */
  currentTime: number

  /**
   * Total duration in seconds.
   */
  duration: number

  /**
   * Buffered time ranges.
   */
  buffered: { start: number; end: number }[]

  /**
   * Whether the video is playing.
   */
  playing: boolean

  /**
   * Whether the video is paused.
   */
  paused: boolean

  /**
   * Whether the video has ended.
   */
  ended: boolean

  /**
   * Whether the video is seeking.
   */
  seeking: boolean

  /**
   * Whether the video is waiting for data.
   */
  waiting: boolean

  /**
   * Whether the video is muted.
   */
  muted: boolean

  /**
   * Volume level (0-1).
   */
  volume: number

  /**
   * Playback rate.
   */
  playbackRate: number

  /**
   * Whether fullscreen is active.
   */
  fullscreen: boolean

  /**
   * Whether picture-in-picture is active.
   */
  pip: boolean

  /**
   * Current quality level.
   */
  quality?: QualityLevel

  /**
   * Error (if any).
   */
  error?: Error
}
```

#### `QualityLevel`

Available video quality level (resolution, bitrate, label, and active flag).

```typescript
interface QualityLevel {
  /**
   * Quality ID.
   */
  id: string | number

  /**
   * Label (e.g., '1080p HD', '720p', 'Auto').
   */
  label: string

  /**
   * Height in pixels.
   */
  height?: number

  /**
   * Width in pixels.
   */
  width?: number

  /**
   * Bitrate in kbps.
   */
  bitrate?: number
}
```

#### `TextTrack`

Text track (captions/subtitles) configuration.

```typescript
interface TextTrack {
  /**
   * Track kind.
   */
  kind: 'subtitles' | 'captions' | 'descriptions' | 'chapters' | 'metadata'

  /**
   * Track label.
   */
  label: string

  /**
   * Language code.
   */
  language: string

  /**
   * Source URL.
   */
  src: string

  /**
   * Default track.
   */
  default?: boolean
}
```

#### `VideoPlayer`

Video player instance.

```typescript
interface VideoPlayer {
  /**
   * Plays the video.
   */
  play(): Promise<void>

  /**
   * Pauses the video.
   */
  pause(): void

  /**
   * Toggles play/pause.
   */
  togglePlay(): void

  /**
   * Stops the video.
   */
  stop(): void

  /**
   * Seeks to a time.
   */
  seek(time: number): void

  /**
   * Seeks forward.
   */
  seekForward(seconds?: number): void

  /**
   * Seeks backward.
   */
  seekBackward(seconds?: number): void

  /**
   * Gets current time.
   */
  getCurrentTime(): number

  /**
   * Gets duration.
   */
  getDuration(): number

  /**
   * Gets buffered time ranges.
   */
  getBuffered(): { start: number; end: number }[]

  /**
   * Sets volume.
   */
  setVolume(volume: number): void

  /**
   * Gets volume.
   */
  getVolume(): number

  /**
   * Mutes the video.
   */
  mute(): void

  /**
   * Unmutes the video.
   */
  unmute(): void

  /**
   * Toggles mute.
   */
  toggleMute(): void

  /**
   * Checks if muted.
   */
  isMuted(): boolean

  /**
   * Sets playback rate.
   */
  setPlaybackRate(rate: number): void

  /**
   * Gets playback rate.
   */
  getPlaybackRate(): number

  /**
   * Gets available quality levels.
   */
  getQualityLevels(): QualityLevel[]

  /**
   * Sets quality level.
   */
  setQuality(level: QualityLevel | string | number): void

  /**
   * Gets current quality.
   */
  getQuality(): QualityLevel | undefined

  /**
   * Enters fullscreen.
   */
  enterFullscreen(): Promise<void>

  /**
   * Exits fullscreen.
   */
  exitFullscreen(): Promise<void>

  /**
   * Toggles fullscreen.
   */
  toggleFullscreen(): Promise<void>

  /**
   * Checks if fullscreen.
   */
  isFullscreen(): boolean

  /**
   * Enters picture-in-picture.
   */
  enterPip(): Promise<void>

  /**
   * Exits picture-in-picture.
   */
  exitPip(): Promise<void>

  /**
   * Toggles picture-in-picture.
   */
  togglePip(): Promise<void>

  /**
   * Checks if in picture-in-picture.
   */
  isPip(): boolean

  /**
   * Loads new sources.
   */
  load(sources: VideoSource[], poster?: string): void

  /**
   * Gets current source.
   */
  getSource(): VideoSource | undefined

  /**
   * Gets player state.
   */
  getState(): PlayerState

  /**
   * Adds event listener.
   */
  on(event: PlayerEvent, handler: (data: unknown) => void): () => void

  /**
   * Removes event listener.
   */
  off(event: PlayerEvent, handler: (data: unknown) => void): void

  /**
   * Gets available text tracks.
   */
  getTextTracks(): TextTrack[]

  /**
   * Sets active text track.
   */
  setTextTrack(language: string | null): void

  /**
   * Gets active text track.
   */
  getActiveTextTrack(): TextTrack | undefined

  /**
   * Shows controls.
   */
  showControls(): void

  /**
   * Hides controls.
   */
  hideControls(): void

  /**
   * Gets the video element.
   */
  getVideoElement(): HTMLVideoElement

  /**
   * Gets the container element.
   */
  getContainer(): HTMLElement

  /**
   * Gets the underlying player instance.
   */
  getInstance(): unknown

  /**
   * Takes a screenshot.
   */
  screenshot(): string

  /**
   * Destroys the player.
   */
  destroy(): void
}
```

#### `VideoProvider`

Video provider interface.

```typescript
interface VideoProvider {
  /**
   * Create a new video player instance with the given configuration.
   * @returns A VideoPlayer instance for controlling playback.
   */
  createPlayer(config: PlayerConfig): VideoPlayer | Promise<VideoPlayer>

  /**
   * Get the name of this video provider (e.g., 'html5', 'hls.js', 'shaka').
   * @returns The provider name string.
   */
  getName(): string

  /**
   * Check if the video provider's library has been loaded and is ready.
   * @returns Whether the provider is loaded and ready to create players.
   */
  isLoaded(): boolean

  /**
   * Get the list of video formats supported by this provider (e.g., 'mp4', 'webm', 'hls').
   * @returns Array of supported format strings.
   */
  getSupportedFormats(): string[]

  /**
   * Check if HTTP Live Streaming (HLS) playback is supported.
   * @returns Whether HLS is supported by this provider.
   */
  supportsHls(): boolean

  /**
   * Check if MPEG-DASH adaptive streaming is supported.
   * @returns Whether DASH is supported by this provider.
   */
  supportsDash(): boolean
}
```

#### `VideoSource`

Video source configuration.

```typescript
interface VideoSource {
  /**
   * Source URL.
   */
  src: string

  /**
   * Source type (e.g., 'video/mp4', 'video/webm', 'application/x-mpegURL').
   */
  type?: string

  /**
   * Source label (for quality selection).
   */
  label?: string

  /**
   * Resolution (e.g., '1080p', '720p', '480p').
   */
  resolution?: string

  /**
   * Bitrate in kbps.
   */
  bitrate?: number
}
```

### Types

#### `PlayerEvent`

Video player lifecycle events (play, pause, ended, seek, time update, error, etc.).

```typescript
type PlayerEvent =
  | 'play'
  | 'pause'
  | 'ended'
  | 'timeupdate'
  | 'progress'
  | 'seeking'
  | 'seeked'
  | 'volumechange'
  | 'ratechange'
  | 'waiting'
  | 'canplay'
  | 'canplaythrough'
  | 'loadedmetadata'
  | 'loadeddata'
  | 'durationchange'
  | 'error'
  | 'fullscreenchange'
  | 'enterpictureinpicture'
  | 'leavepictureinpicture'
  | 'qualitychange'
```

### Functions

#### `createNativePlayer(config)`

Create a native HTML5 video player instance. Uses the browser's `<video>` element
with standard playback controls, source management, and event handling.

```typescript
function createNativePlayer(config: PlayerConfig): VideoPlayer
```

- `config` — Player configuration (container, source, autoplay, controls, etc.).

**Returns:** A VideoPlayer instance for controlling the HTML5 video element.

#### `createNativeVideoProvider()`

Create a native HTML5 video provider. Supports standard formats (MP4, WebM, Ogg)
using the browser's built-in `<video>` element. Does not support HLS or DASH streaming.

```typescript
function createNativeVideoProvider(): VideoProvider
```

**Returns:** A VideoProvider backed by native HTML5 video.

#### `createPlayer(config)`

Create a new video player instance using the current provider.

```typescript
function createPlayer(config: PlayerConfig): VideoPlayer | Promise<VideoPlayer>
```

- `config` — Player configuration (container, source, autoplay, controls, etc.).

**Returns:** A VideoPlayer instance for controlling playback.

#### `formatTime(seconds)`

Format a duration in seconds as a human-readable time string.
Returns 'H:MM:SS' for durations over an hour, or 'M:SS' otherwise.

```typescript
function formatTime(seconds: number): string
```

- `seconds` — The duration in seconds.

**Returns:** A formatted time string (e.g., '1:23:45' or '3:07').

#### `getProvider()`

Get the current video provider. Falls back to a native HTML5 video
provider if none has been explicitly set.

```typescript
function getProvider(): VideoProvider
```

**Returns:** The active VideoProvider instance.

#### `getVideoType(url)`

Infer the MIME type of a video from its URL based on the file extension.
Supports MP4, WebM, Ogg, HLS (.m3u8), and DASH (.mpd).

```typescript
function getVideoType(url: string): string | undefined
```

- `url` — The video URL.

**Returns:** The MIME type string, or undefined if the format is unrecognized.

#### `hasProvider()`

Check if a video provider has been registered.

```typescript
function hasProvider(): boolean
```

**Returns:** Whether a VideoProvider has been bonded.

#### `parseTime(time)`

Parse a time string (H:MM:SS or M:SS or S) into total seconds.

```typescript
function parseTime(time: string): number
```

- `time` — The time string to parse.

**Returns:** The total duration in seconds.

#### `setProvider(provider)`

Set the video provider.

```typescript
function setProvider(provider: VideoProvider): void
```

- `provider` — VideoProvider implementation to register.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-i18n` 1.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-video`.
