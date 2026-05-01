# @molecule/api-video-render

Server-side video rendering for molecule.dev. Takes a `VideoTimeline`
(clips + tracks + effects) and queues an ffmpeg-driven render that
produces an MP4 (or WebM) file at a caller-supplied `outputPath`.

Renders run asynchronously: {@link renderVideo} enqueues a job onto the
bonded `@molecule/api-queue` provider and returns a `{ jobId, status:
'queued' }` handle. Workers process jobs by calling
{@link processRenderJob}, which spawns ffmpeg with a sanitized,
argv-only command line — never a shell string. Status is observed via
{@link getRenderStatus}; jobs are cancelled via {@link cancelRender}.

## Quick Start

```ts
import {
  renderVideo,
  getRenderStatus,
  cancelRender,
} from '@molecule/api-video-render'

const job = await renderVideo(
  {
    duration: 10,
    resolution: { width: 1920, height: 1080 },
    fps: 30,
    tracks: [
      {
        id: 'v0',
        kind: 'video',
        clips: [
          { id: 'c0', source: '/uploads/intro.mp4', start: 0, duration: 5 },
          { id: 'c1', source: '/uploads/main.mp4',  start: 5, duration: 5 },
        ],
        effects: [{ id: 'fx0', kind: 'fade-in', start: 0, duration: 1 }],
      },
    ],
  },
  { format: 'mp4', outputPath: '/tmp/out.mp4' },
)

// Poll for completion.
let status = await getRenderStatus(job.jobId)
while (status.status === 'queued' || status.status === 'rendering') {
  await new Promise((r) => setTimeout(r, 250))
  status = await getRenderStatus(job.jobId)
}
```

```ts
// Express adapter (POST /render/video, GET/DELETE /render/jobs/:id)
import express from 'express'
import {
  createEnqueueRenderHandler,
  createGetRenderStatusHandler,
  createCancelRenderHandler,
} from '@molecule/api-video-render'

const router = express.Router()
const enqueue = createEnqueueRenderHandler()
const status = createGetRenderStatusHandler()
const cancel = createCancelRenderHandler()

router.post('/render/video', (req, res, next) => {
  enqueue(
    { body: req.body },
    {
      setStatus: (s) => { res.status(s) },
      sendJson: (j) => { res.json(j) },
    },
  ).catch(next)
})

router.get('/render/jobs/:id', (req, res, next) => {
  status(
    { params: req.params },
    {
      setStatus: (s) => { res.status(s) },
      sendJson: (j) => { res.json(j) },
    },
  ).catch(next)
})

router.delete('/render/jobs/:id', (req, res, next) => {
  cancel(
    { params: req.params },
    {
      setStatus: (s) => { res.status(s) },
      sendJson: (j) => { res.json(j) },
    },
  ).catch(next)
})
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-video-render
```

## API

### Interfaces

#### `CreateEnqueueRenderHandlerOptions`

Options for {@link createEnqueueRenderHandler}. The optional `validate`
hook can reject requests pre-flight (e.g. tier limits, max duration).

```typescript
interface CreateEnqueueRenderHandlerOptions {
  /** Pre-flight validator — throw to reject with HTTP 400. */
  validate?: (timeline: VideoTimeline, options: RenderVideoOptions) => void | Promise<void>
}
```

#### `FfmpegProcess`

The minimal child-process surface the worker observes. Real
`ChildProcess`es satisfy this; tests provide a `EventEmitter`-shaped fake.

```typescript
interface FfmpegProcess {
  stderr: FfmpegStderr | null
  on(event: 'close', listener: (code: number | null) => void): void
  on(event: 'error', listener: (error: Error) => void): void
  /** Sends SIGTERM (or another signal) to the child. */
  kill(signal?: NodeJS.Signals | number): boolean
}
```

#### `FfmpegStderr`

Subset of `child_process.ChildProcess`'s `stderr` we care about — enough
to listen for the textual progress lines ffmpeg writes to stderr.

```typescript
interface FfmpegStderr {
  on(event: 'data', listener: (chunk: Buffer | string) => void): void
}
```

#### `JobStore`

The minimal contract job-status backends must satisfy. All operations are
async to allow remote stores (Redis, database, etc.).

```typescript
interface JobStore {
  /** Read the latest status snapshot for a job. */
  get(jobId: string): Promise<RenderJobStatus | undefined>
  /** Write/replace the status snapshot for a job. */
  set(jobId: string, status: RenderJobStatus): Promise<void>
  /** Merge partial fields into the existing status (creating it if absent). */
  patch(jobId: string, patch: Partial<RenderJobStatus>): Promise<RenderJobStatus>
  /** Remove a job's status entry. Used by `cancelRender` cleanup. */
  delete(jobId: string): Promise<void>
}
```

#### `ProcessRenderJobDeps`

Optional dependency overrides for {@link processRenderJob}. Defaults to
the bonded job store + ffmpeg runner.

```typescript
interface ProcessRenderJobDeps {
  /** Override the job store. Defaults to {@link getDefaultJobStore}. */
  jobStore?: JobStore
  /** Override the ffmpeg runner. Defaults to {@link getDefaultFfmpegRunner}. */
  ffmpegRunner?: FfmpegRunner
}
```

#### `RenderJob`

Result of {@link renderVideo}. The job is queued; callers must poll
{@link getRenderStatus} to observe progress.

```typescript
interface RenderJob {
  /** Stable job identifier. Use this to poll status and to cancel. */
  jobId: string
  /** Initial job state — always `queued`. */
  status: 'queued'
  /** Queue name the job was enqueued onto. */
  queueName: string
}
```

#### `RenderJobMessage`

Internal envelope written to the queue for each render request. Workers
deserialize this back into the renderer.

```typescript
interface RenderJobMessage {
  /** Job identifier. */
  jobId: string
  /** Timeline definition. */
  timeline: VideoTimeline
  /** Resolved render options (defaults already applied). */
  options: RenderVideoOptions & { format: VideoRenderFormat; codec: VideoCodec }
}
```

#### `RenderJobStatus`

Status snapshot for a render job, returned by {@link getRenderStatus}.

```typescript
interface RenderJobStatus {
  /** Current state of the job. */
  status: RenderJobState
  /** Progress fraction 0..1 when in `rendering` state. */
  progress?: number
  /** Output URL/path when in `completed` state. */
  outputUrl?: string
  /** Error message when in `failed` state. */
  error?: string
  /** Wall-clock timestamps for state transitions. */
  startedAt?: Date
  /** Wall-clock timestamps for state transitions. */
  finishedAt?: Date
}
```

#### `RenderVideoOptions`

Render-time options accepted by {@link renderVideo}.

```typescript
interface RenderVideoOptions {
  /** Output container format. Defaults to `mp4`. */
  format?: VideoRenderFormat
  /**
   * Override the timeline's output resolution. Useful for proxy renders.
   */
  resolution?: VideoResolution
  /**
   * Override the timeline's output FPS.
   */
  fps?: VideoFps
  /**
   * Encoder codec. Defaults to `libx264` for mp4, `libvpx-vp9` for webm.
   */
  codec?: VideoCodec
  /**
   * Constant Rate Factor (quality knob) — lower = higher quality. Codec-specific
   * range. Defaults are sensible (`23` for x264).
   */
  crf?: number
  /**
   * Output destination path. The worker writes the rendered file here.
   * Must be an absolute path; the worker validates this before opening it.
   */
  outputPath: string
  /**
   * Queue name used for enqueuing render jobs. Defaults to `video-render`.
   */
  queueName?: string
  /**
   * Optional caller-supplied job ID. When omitted, an auto-generated random
   * ID is used.
   */
  jobId?: string
}
```

#### `VideoClip`

A single source clip placed on a timeline track. The renderer trims the
source from `[sourceStart, sourceStart + duration)` and places it at
`start` on the track timeline.

`source` is a path or `https?:`/`file:` URL — never a user-controlled
argument-string. Filenames are escaped before being passed to ffmpeg.

```typescript
interface VideoClip {
  /** Stable identifier for the clip (used for status / progress correlation). */
  id: string
  /**
   * Source file path or absolute URL. The worker validates that the value
   * is a plain string with no shell metacharacters before passing to ffmpeg.
   */
  source: string
  /** Track-local start time (seconds). */
  start: number
  /** Clip duration on the timeline (seconds). */
  duration: number
  /** Source-local trim-in point (seconds). Defaults to 0. */
  sourceStart?: number
  /** Override clip volume (linear, `1` = unity). Defaults to 1. */
  volume?: number
  /**
   * Whether to mute audio for this clip. When true, no audio stream is
   * pulled from the source.
   */
  muted?: boolean
}
```

#### `VideoEffect`

A pre-baked effect placed on a clip or track. Effects are name-keyed; the
worker resolves them to safe ffmpeg filter graphs from a built-in
allow-list. Free-form `-vf` filter strings are NEVER accepted from
user input — all parameters are typed and validated.

```typescript
interface VideoEffect {
  /** Stable identifier. */
  id: string
  /** Allow-listed effect kind. */
  kind: 'fade-in' | 'fade-out' | 'crossfade' | 'crop' | 'scale' | 'volume'
  /** Track-local start time (seconds). Effects apply from `start` to `start + duration`. */
  start: number
  /** Effect duration (seconds). */
  duration: number
  /**
   * Numeric parameters for the effect. Validated against the effect kind by
   * the worker (e.g. `crop` requires `x`, `y`, `width`, `height`).
   */
  params?: Record<string, number>
}
```

#### `VideoRenderRequest`

Minimal request shape used by the render handlers.

```typescript
interface VideoRenderRequest {
  /** Parsed JSON body — only needed for the enqueue endpoint. */
  body?: unknown
  /** Path parameters — `{ id: string }` for status/cancel. */
  params?: Record<string, string | undefined>
}
```

#### `VideoRenderResponse`

Minimal response shape used by the render handlers.

```typescript
interface VideoRenderResponse {
  /** Set the HTTP status code. */
  setStatus(status: number): void
  /** Write a JSON body and end the response. */
  sendJson(body: unknown): void
}
```

#### `VideoResolution`

Render output resolution as discrete pixel dimensions. The renderer scales
each clip's source to fit. Dimensions must be even (codec requirement).

```typescript
interface VideoResolution {
  /** Output width in pixels. Must be even. */
  width: number
  /** Output height in pixels. Must be even. */
  height: number
}
```

#### `VideoTimeline`

Top-level timeline definition consumed by {@link renderVideo}.

```typescript
interface VideoTimeline {
  /** Total timeline duration (seconds). */
  duration: number
  /** Output resolution. */
  resolution: VideoResolution
  /** Output frames-per-second. */
  fps: VideoFps
  /** Tracks, rendered bottom-to-top. */
  tracks: VideoTrack[]
  /** Optional default background color (CSS `#rrggbb`). Defaults to black. */
  background?: string
}
```

#### `VideoTrack`

A timeline track. Tracks render bottom-to-top (last track on top). Clips
within a track render in `start`-order; overlaps composite via the
renderer's mixing rules.

```typescript
interface VideoTrack {
  /** Stable identifier. */
  id: string
  /** Track kind — `video` tracks contribute pixels, `audio` tracks contribute audio only. */
  kind: 'video' | 'audio'
  /** Clips on this track, in `start`-order. */
  clips: VideoClip[]
  /** Effects scoped to this track. */
  effects?: VideoEffect[]
  /** Track-level volume (linear). Defaults to 1. */
  volume?: number
  /** Whether the track is muted. */
  muted?: boolean
}
```

### Types

#### `FfmpegRunner`

Function that spawns ffmpeg with a fully-formed argv. The first element of
`args` is NOT the ffmpeg binary — implementations supply that themselves.

Implementations MUST NOT pass `args` through a shell.

```typescript
type FfmpegRunner = (args: readonly string[]) => FfmpegProcess
```

#### `RenderJobState`

Render job lifecycle states.

```typescript
type RenderJobState = 'queued' | 'rendering' | 'completed' | 'failed' | 'cancelled'
```

#### `VideoCodec`

Encoder codec. Sensible defaults are picked per format when omitted —
`libx264` for mp4, `libvpx-vp9` for webm.

```typescript
type VideoCodec = 'libx264' | 'libx265' | 'libvpx' | 'libvpx-vp9' | 'libaom-av1'
```

#### `VideoFps`

Frames per second for the rendered output. Defaults to 30.

```typescript
type VideoFps = number
```

#### `VideoRenderFormat`

Output container format. Drives the codec defaults and file extension.

```typescript
type VideoRenderFormat = 'mp4' | 'webm'
```

### Functions

#### `assertEvenDimension(value, label)`

Validate an even, positive integer dimension (codec requirement).

```typescript
function assertEvenDimension(value: unknown, label: string): number
```

- `value` — The candidate dimension.
- `label` — Field name for error messages.

#### `assertFiniteNonNegative(value, label, max)`

Validate a finite, non-negative number with an upper bound. Throws on bad
input.

```typescript
function assertFiniteNonNegative(value: unknown, label: string, max?: number): number
```

- `value` — The candidate number.
- `label` — Field name for error messages.
- `max` — Optional maximum (defaults to 24h in seconds).

#### `assertSafePath(value, label)`

Validate a source path or URL. Throws `TypeError` with a descriptive
message if the value is unsafe.

```typescript
function assertSafePath(value: unknown, label: string): void
```

- `value` — The candidate path/URL.
- `label` — Human-readable name (e.g. `'clip.source'`) for error messages.

#### `assertValidClip(clip, trackId)`

Validate a {@link VideoClip}'s shape and return a sanitized copy.

```typescript
function assertValidClip(clip: VideoClip, trackId: string): VideoClip
```

- `clip` — The candidate clip.
- `trackId` — Owning track ID, for error messages.

#### `assertValidTimeline(timeline)`

Validate a complete {@link VideoTimeline}.

```typescript
function assertValidTimeline(timeline: VideoTimeline): VideoTimeline
```

- `timeline` — The candidate timeline.

#### `assertValidTrack(track)`

Validate a {@link VideoTrack} and its clips/effects.

```typescript
function assertValidTrack(track: VideoTrack): VideoTrack
```

- `track` — The candidate track.

#### `buildFfmpegArgs(message)`

Build a flat, read-only argv array for ffmpeg from a validated render
message. Inputs are passed via `-i` per clip; effects translate to
a filter_complex graph via the allow-listed {@link effectToFilter}.

The returned array is the EXACT argv that gets passed to spawn — no
additional shell processing happens.

```typescript
function buildFfmpegArgs(message: RenderJobMessage): readonly string[]
```

- `message` — The validated render job message.

**Returns:** The ffmpeg argv (excluding the `ffmpeg` binary itself).

#### `cancelRender(jobId)`

Mark a render job as cancelled. If the worker has already started
processing, it is responsible for observing the cancelled state at the
next progress checkpoint and tearing down its ffmpeg child.

Returns the resulting status snapshot.

```typescript
function cancelRender(jobId: string): Promise<RenderJobStatus>
```

- `jobId` — The job identifier.

**Returns:** The post-cancel status.

#### `createCancelRenderHandler()`

Build the `DELETE /render/jobs/:id` handler.

```typescript
function createCancelRenderHandler(): (req: VideoRenderRequest, res: VideoRenderResponse) => Promise<void>
```

**Returns:** An async handler.

#### `createEnqueueRenderHandler(handlerOptions)`

Build the `POST /render/video` handler. The request body must be
`{ timeline, options }` (or `{ video, options }`).

```typescript
function createEnqueueRenderHandler(handlerOptions?: CreateEnqueueRenderHandlerOptions): (req: VideoRenderRequest, res: VideoRenderResponse) => Promise<void>
```

- `handlerOptions` — Optional validator hook.

**Returns:** An async handler.

#### `createGetRenderStatusHandler()`

Build the `GET /render/jobs/:id` handler.

```typescript
function createGetRenderStatusHandler(): (req: VideoRenderRequest, res: VideoRenderResponse) => Promise<void>
```

**Returns:** An async handler.

#### `createMemoryJobStore()`

In-memory job store backed by a `Map`. Process-local — restart loses state.

```typescript
function createMemoryJobStore(): JobStore
```

#### `defaultFfmpegRunner(args)`

Default runner — spawns the system `ffmpeg` binary directly, passing each
argv element as a discrete argument (no shell interpretation).

```typescript
function defaultFfmpegRunner(args: readonly string[]): FfmpegProcess
```

- `args` — The argv to pass after the binary name.

**Returns:** The spawned {@link FfmpegProcess}.

#### `effectToFilter(effect)`

Validate an effect kind against the allow-list and return a fixed,
parameter-only filter string. Numeric parameters are validated and
formatted; nothing user-typed is interpolated as a filter token.

```typescript
function effectToFilter(effect: VideoEffect): string
```

- `effect` — The effect to translate.

**Returns:** The ffmpeg filter expression for the effect.

#### `generateJobId()`

Generate a stable random job ID. Format: `vrj_<16 hex chars>`. Uses
`crypto.randomUUID()` when available (Node 19+), otherwise a `Math.random`
fallback (sufficient for non-cryptographic uniqueness).

```typescript
function generateJobId(): string
```

**Returns:** A new job ID.

#### `getFfmpegRunner()`

Returns the active ffmpeg runner — the default `child_process.spawn`-based
runner unless overridden by {@link setFfmpegRunner}.

```typescript
function getFfmpegRunner(): FfmpegRunner
```

**Returns:** The active {@link FfmpegRunner}.

#### `getJobStore()`

Returns the currently active job store. Defaults to the in-memory store.

```typescript
function getJobStore(): JobStore
```

**Returns:** The active {@link JobStore}.

#### `getRenderStatus(jobId)`

Read the current status of a render job. When the job is unknown to the
job store, returns a `failed`-shaped status with a clear `error` message.

```typescript
function getRenderStatus(jobId: string): Promise<RenderJobStatus>
```

- `jobId` — The job identifier returned by {@link renderVideo}.

**Returns:** The current {@link RenderJobStatus}.

#### `parseFfmpegProgressSeconds(chunk)`

ffmpeg reports progress as `time=HH:MM:SS.SS` lines on stderr. Parse and
convert to seconds. Returns `undefined` when no progress line is present
in the chunk.

```typescript
function parseFfmpegProgressSeconds(chunk: string): number | undefined
```

- `chunk` — A chunk of stderr text.

**Returns:** The current decoded position in seconds, if found.

#### `processRenderJob(message, deps)`

Process a single render job. Returns the terminal {@link RenderJobStatus}
after the worker observes ffmpeg's exit (or the job's cancellation).

Implementations of `@molecule/api-queue` consumers wire this up by
subscribing to the queue and calling `processRenderJob(message)` for each
received message.

```typescript
function processRenderJob(message: RenderJobMessage, deps?: ProcessRenderJobDeps): Promise<RenderJobStatus>
```

- `message` — The render job message to process.
- `deps` — Optional dependency overrides (primarily for tests).

**Returns:** The final job status.

#### `renderVideo(timeline, options)`

Enqueue a video render job.

The function validates the timeline + options, records an initial
`queued` status in the job store, and pushes a {@link RenderJobMessage}
onto the bonded queue. Workers consuming the queue invoke
`processRenderJob` to do the actual ffmpeg work.

```typescript
function renderVideo(timeline: VideoTimeline, options: RenderVideoOptions): Promise<RenderJob>
```

- `timeline` — The timeline definition.
- `options` — Render options (must include `outputPath`).

**Returns:** A handle containing the new `jobId` and initial `status`.

#### `setFfmpegRunner(runner)`

Replace the active ffmpeg runner. Tests pass a stub; production code
generally leaves this as the default. Pass `undefined` to reset.

```typescript
function setFfmpegRunner(runner: FfmpegRunner | undefined): void
```

- `runner` — The runner to use, or `undefined` to reset.

#### `setJobStore(store)`

Replace the active job store. Bond packages (e.g. a Redis-backed store)
call this during application startup. Pass `undefined` to reset to the
default in-memory store — primarily useful in tests.

```typescript
function setJobStore(store: JobStore | undefined): void
```

- `store` — The store implementation to use, or `undefined` to reset.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-queue` ^1.0.0

**Security model.** The argv passed to ffmpeg is built by
{@link buildFfmpegArgs} — a pure function that validates every field on
the timeline against a strict allow-list before emitting tokens.
Filenames must match `[A-Za-z0-9_./:\-+@%]+` and may not start with `-`
(which ffmpeg would otherwise read as an option). Effects compile to
fixed filter strings keyed by `effect.kind`; arbitrary `-vf` filter
strings from user input are NEVER accepted. The default ffmpeg runner
uses `child_process.spawn(args, { shell: false })` so argv elements
cannot be reinterpreted by a shell.

**Resource intensity.** Rendering even a short timeline can take
minutes and saturate a CPU core; the package is queue-driven by design.
Bond a real queue provider (e.g. `@molecule/api-queue-redis` /
`@molecule/api-queue-bullmq`) before calling `renderVideo` — without one,
the call throws because no queue provider is bonded.

**Locale.** This package is purely programmatic. There is no companion
locale bond; all error messages are English-only by design.
