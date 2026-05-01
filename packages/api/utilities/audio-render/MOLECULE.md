# @molecule/api-audio-render

Offline multi-track audio mixdown for molecule.dev — flagship use case
is the music-daw app.

Same shape as `@molecule/api-video-render`: take a multi-track
{@link AudioSession} (channels with clips, per-channel volume / pan /
effects), enqueue a render job via the bonded `queue` provider, and
have a worker spawn ffmpeg to produce a single mixed-down audio file
(WAV, MP3, or FLAC).

## Quick Start

```ts
import { renderAudio, getRenderStatus } from '@molecule/api-audio-render'

const job = await renderAudio(
  {
    duration: 8,
    channels: [
      {
        id: 'drums',
        clips: [{ audioUrl: '/tmp/loop.wav', startTime: 0, duration: 8 }],
        volume: 0.9,
      },
      {
        id: 'lead',
        clips: [{ audioUrl: '/tmp/lead.wav', startTime: 2, duration: 4 }],
        pan: 0.3,
      },
    ],
  },
  { format: 'mp3', bitrate: '256k' },
)

// …later…
const status = getRenderStatus(job.id)
```

```ts
// Worker side — typically a long-running process.
import { startAudioRenderWorker } from '@molecule/api-audio-render'

const stop = startAudioRenderWorker({
  ffmpegPath: '/usr/local/bin/ffmpeg',
  onJobComplete: (result) => console.log('rendered', result.jobId),
})
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-audio-render
```

## API

### Interfaces

#### `AudioChannel`

A single mixer channel: an ordered list of clips plus per-channel
volume / pan / effects.

```typescript
interface AudioChannel {
  /** Stable channel id — required because clips reference timing in seconds, not bars. */
  id: string
  /** Display label (caller-supplied, never localized by this package). */
  label?: string
  /** Clips placed on this channel's timeline. */
  clips: AudioClip[]
  /**
   * Linear volume gain. `1` = unity, `0` = silent, `2` = +6 dB.
   * Defaults to 1 when omitted.
   */
  volume?: number
  /**
   * Stereo pan from `-1` (hard left) to `1` (hard right). `0` = center.
   * Defaults to 0 when omitted.
   */
  pan?: number
  /** Whether this channel is muted in the final mix. Defaults to false. */
  muted?: boolean
  /** Optional per-channel effects, applied in array order before summing. */
  effects?: AudioEffect[]
}
```

#### `AudioClip`

A single audio clip placed on a {@link AudioChannel} timeline.

Time fields are seconds in the session's master timeline. The renderer
pads silence before the clip's `startTime` and trims to `duration` so
timeline placement is preserved exactly.

```typescript
interface AudioClip {
  /** Stable clip id — appears in error messages and progress events. */
  id?: string
  /**
   * Source audio. Either a local filesystem path or an `http(s):` URL.
   * Strings containing NUL/newline/control characters are rejected so
   * the value is always safe to pass to ffmpeg as a positional argument.
   */
  audioUrl: string
  /** Seconds from session t=0 at which this clip should begin playing. */
  startTime: number
  /** Length of the clip's contribution to the mix, in seconds. */
  duration: number
  /**
   * Optional offset into the source file (seconds). Defaults to 0 — the
   * clip plays from the start of `audioUrl`.
   */
  sourceOffset?: number
}
```

#### `AudioEffect`

A simple audio effect applied to a channel before mixdown.

The shape is intentionally minimal — providers translate `kind` into
the right ffmpeg `-af` filter. Unknown kinds are ignored at render time
(warned, not failed) so future effect types are forward-compatible.

```typescript
interface AudioEffect {
  /** Effect kind — `gain`, `lowpass`, `highpass`, `reverb`, etc. */
  kind: string
  /** Effect-specific parameters (numeric or string). */
  params?: Record<string, number | string>
}
```

#### `AudioRenderJobPayload`

Payload placed on the queue for the worker to consume.

```typescript
interface AudioRenderJobPayload {
  jobId: string
  session: AudioSession
  options: AudioRenderOptions
  outputPath: string
  format: AudioRenderFormat
}
```

#### `AudioRenderOptions`

Options accepted by {@link renderAudio}.

```typescript
interface AudioRenderOptions {
  /** Output format. Defaults to `'mp3'`. */
  format?: AudioRenderFormat
  /** Output sample rate in Hz. Defaults to `44100`. */
  sampleRate?: number
  /** Output channel count: 1 = mono, 2 = stereo. Defaults to `2`. */
  channels?: number
  /**
   * Output bitrate (e.g. `'192k'`). Honoured for `mp3`; ignored for
   * uncompressed `wav` and lossless `flac`. Defaults to `'192k'` for mp3.
   */
  bitrate?: string
  /**
   * Override the destination path. Defaults to a unique tmp path under the
   * caller's `os.tmpdir()` with the format-appropriate extension.
   */
  outputPath?: string
  /**
   * Override the queue name jobs are dispatched to. Defaults to
   * `'audio-render'`.
   */
  queueName?: string
}
```

#### `AudioRenderRequest`

Minimal request shape consumed by the handlers.

```typescript
interface AudioRenderRequest {
  /** Parsed JSON body (POST). */
  body?: unknown
  /** Path parameters (`:id`). */
  params?: Record<string, string | undefined>
}
```

#### `AudioRenderResponse`

Minimal response shape consumed by the handlers.

```typescript
interface AudioRenderResponse {
  setStatus: (status: number) => void
  sendJson: (body: unknown) => void
}
```

#### `AudioRenderRoutes`

Bundle of route handlers returned by {@link createAudioRenderRoutes}.

```typescript
interface AudioRenderRoutes {
  /** `POST /render/audio` — enqueue a session. */
  enqueue: (req: AudioRenderRequest, res: AudioRenderResponse) => Promise<void>
  /** `GET /render/jobs/:id` — fetch a job's status. */
  status: (req: AudioRenderRequest, res: AudioRenderResponse) => Promise<void>
  /** `DELETE /render/jobs/:id` — request cancellation. */
  cancel: (req: AudioRenderRequest, res: AudioRenderResponse) => Promise<void>
}
```

#### `AudioSession`

A complete multi-track session ready for mixdown.

The session is the single argument to {@link renderAudio}; it must be
fully self-describing — no implicit project state, no global mixer.

```typescript
interface AudioSession {
  /** Mixer channels. Empty arrays produce a silent track of `duration` seconds. */
  channels: AudioChannel[]
  /** Total session length in seconds (master timeline). */
  duration: number
  /** Optional master gain applied after summing the channels. Defaults to 1. */
  masterVolume?: number
}
```

#### `CreateAudioRenderRoutesOptions`

Options for {@link createAudioRenderRoutes}.

```typescript
interface CreateAudioRenderRoutesOptions {
  /**
   * Optional pre-flight validator. Throw to reject the enqueue request;
   * the thrown error's `.message` becomes the JSON `error` field with
   * HTTP 400.
   */
  validate?: (session: AudioSession, options: AudioRenderOptions) => void | Promise<void>
}
```

#### `FfmpegCommand`

Result of {@link buildFfmpegArgs} — the exact argv to spawn plus the
resolved filter graph (handy for diagnostics and tests).

```typescript
interface FfmpegCommand {
  /** Argument vector — element 0 is the first arg, NOT the binary name. */
  args: string[]
  /** The fully assembled `-filter_complex` script. */
  filterGraph: string
  /** Final output stream label fed into `-map`. */
  outputStreamLabel: string
}
```

#### `ProcessAudioRenderJobOptions`

Options for {@link processAudioRenderJob}.

```typescript
interface ProcessAudioRenderJobOptions {
  /** ffmpeg binary path. Defaults to `'ffmpeg'` (resolved on $PATH). */
  ffmpegPath?: string
  /** Override `child_process.spawn` for tests. */
  spawn?: SpawnFunction
  /** Maximum time (ms) to allow ffmpeg before killing it. Defaults to 600_000 (10 min). */
  timeoutMs?: number
}
```

#### `ProcessAudioRenderJobResult`

Result of a single render attempt.

```typescript
interface ProcessAudioRenderJobResult {
  jobId: string
  status: RenderJob['status']
  outputPath?: string
  exitCode?: number | null
  error?: string
  /** The exact argv passed to ffmpeg — useful for diagnostics in tests. */
  ffmpegArgs: string[]
}
```

#### `RenderJob`

The job descriptor returned by {@link renderAudio} and inspected by
{@link getRenderStatus}. Mutated in-place by the worker as state
advances; consumers should treat reads as a snapshot.

```typescript
interface RenderJob {
  /** Stable job id — opaque, generated by the queue provider. */
  id: string
  /** Current lifecycle state. */
  status: AudioRenderJobStatus
  /** Queue name the job was sent to. */
  queueName: string
  /** Resolved output path. */
  outputPath: string
  /** Resolved output format. */
  format: AudioRenderFormat
  /** Echo of the originating session — useful for re-rendering / diagnostics. */
  session: AudioSession
  /** Echo of the resolved options. */
  options: Required<Omit<AudioRenderOptions, 'outputPath' | 'queueName' | 'bitrate'>> & {
    bitrate?: string
  }
  /** When the job was enqueued. */
  enqueuedAt: Date
  /** Set when the worker begins processing. */
  startedAt?: Date
  /** Set when the worker finishes (success, failure, or cancellation). */
  finishedAt?: Date
  /** Populated when `status === 'failed'`. */
  error?: string
}
```

#### `StartAudioRenderWorkerOptions`

Options for {@link startAudioRenderWorker}.

```typescript
interface StartAudioRenderWorkerOptions extends ProcessAudioRenderJobOptions {
  /** Queue name to subscribe to. Defaults to `'audio-render'`. */
  queueName?: string
  /** Called whenever a job completes (success, failure, or cancellation). */
  onJobComplete?: (result: ProcessAudioRenderJobResult) => void
}
```

### Types

#### `AudioRenderFormat`

Supported output container/codec combinations.

- `wav`  — uncompressed PCM, default 16-bit signed (`pcm_s16le`).
- `mp3`  — lossy MPEG-1 Layer III via libmp3lame.
- `flac` — lossless FLAC.

```typescript
type AudioRenderFormat = 'wav' | 'mp3' | 'flac'
```

#### `AudioRenderJobStatus`

Lifecycle states a render job moves through.

`queued` → `processing` → (`completed` | `failed` | `cancelled`).
Cancellation requests on `queued` jobs short-circuit straight to
`cancelled` without ever entering `processing`.

```typescript
type AudioRenderJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'
```

#### `SpawnFunction`

Function signature compatible with `child_process.spawn`. Exposed as
the injection seam for tests.

```typescript
type SpawnFunction = (
  command: string,
  args: readonly string[],
  options?: SpawnOptions,
) => ChildProcess
```

### Functions

#### `buildFfmpegArgs(session, options, outputPath)`

Construct the full ffmpeg argv for an {@link AudioSession}.

```typescript
function buildFfmpegArgs(session: AudioSession, options: Required<Pick<AudioRenderOptions, "format" | "sampleRate" | "channels">> & { bitrate?: string; }, outputPath: string): FfmpegCommand
```

- `session` — The multi-track session to render.
- `options` — Resolved render options (caller has already merged defaults).
- `outputPath` — Destination file path.

**Returns:** The argv plus the filter-graph string for diagnostics.

#### `cancelRender(jobId)`

Mark a render job as cancelled.

Cancellation is cooperative: a job already in `processing` will be
marked but the worker decides whether to honour the flag (the bundled
worker checks before spawning ffmpeg and again on completion). Jobs in
a terminal state (`completed`, `failed`, `cancelled`) are not changed.

```typescript
function cancelRender(jobId: string): boolean
```

- `jobId` — The id returned in `RenderJob.id` from {@link renderAudio}.

**Returns:** `true` if the job was found and a cancellation flag applied,
 *          `false` if the id is unknown or the job is already terminal.

#### `createAudioRenderRoutes(routeOptions)`

Build the audio-render HTTP route handlers.

```typescript
function createAudioRenderRoutes(routeOptions?: CreateAudioRenderRoutesOptions): AudioRenderRoutes
```

- `routeOptions` — Optional pre-flight validator.

**Returns:** A bundle of three async handlers.

#### `getJob(jobId)`

Look up a job by id.

```typescript
function getJob(jobId: string): RenderJob | undefined
```

- `jobId` — The job id to retrieve.

**Returns:** The job, or `undefined` if no such id has been registered.

#### `getRenderStatus(jobId)`

Look up a previously-enqueued render job by id.

```typescript
function getRenderStatus(jobId: string): RenderJob | undefined
```

- `jobId` — The id returned in `RenderJob.id` from {@link renderAudio}.

**Returns:** The job, or `undefined` if it isn't registered in this process.

#### `listJobIds()`

Snapshot of all currently-registered job ids — for diagnostics and tests.

```typescript
function listJobIds(): string[]
```

#### `processAudioRenderJob(payload, processOptions)`

Process a single render-job payload: build the ffmpeg argv, spawn
ffmpeg, await exit, and update the job-store entry to match.

Intended to be wired into a queue subscription via
{@link startAudioRenderWorker}, but exported on its own so callers
with custom queue topologies can drive the work directly.

```typescript
function processAudioRenderJob(payload: AudioRenderJobPayload, processOptions?: ProcessAudioRenderJobOptions): Promise<ProcessAudioRenderJobResult>
```

- `payload` — The job payload received from the queue.
- `processOptions` — Optional spawn / timeout overrides.

**Returns:** A summary of the attempt suitable for logging.

#### `registerJob(job)`

Register a freshly-enqueued job.

```typescript
function registerJob(job: RenderJob): void
```

- `job` — The job descriptor returned by `renderAudio`.

#### `renderAudio(session, options)`

Enqueue an {@link AudioSession} for offline mixdown.

Does NOT block on rendering. Returns immediately with a {@link RenderJob}
whose `status` starts at `'queued'`; poll {@link getRenderStatus} or
subscribe to the queue from a worker process to track progress.

```typescript
function renderAudio(session: AudioSession, options?: AudioRenderOptions): Promise<RenderJob>
```

- `session` — The multi-track session to render.
- `options` — Output format / sample rate / channel count / bitrate

**Returns:** The freshly-enqueued render job.

#### `resetJobStore()`

Drop all registered jobs — for tests.

```typescript
function resetJobStore(): void
```

#### `sanitizeAudioPath(value, label)`

Reject paths/URLs containing NUL, newline, or any other control
character. These can't appear in legitimate filesystem paths or URLs;
if one shows up it's almost certainly an injection attempt or a bug
upstream, and ffmpeg's filter-graph parser would mis-tokenize it.

```typescript
function sanitizeAudioPath(value: unknown, label: string): string
```

- `value` — The caller-supplied path or URL.
- `label` — Diagnostic label used in the thrown error.

**Returns:** The validated value, unchanged.

#### `startAudioRenderWorker(options)`

Subscribe to the render queue and process every incoming job.

```typescript
function startAudioRenderWorker(options?: StartAudioRenderWorkerOptions): () => void
```

- `options` — Queue name + spawn / timeout overrides.

**Returns:** The unsubscribe function returned by `subscribe()`.

#### `updateJob(jobId, patch)`

Apply an in-place patch to a registered job. No-op if the id is unknown.

```typescript
function updateJob(jobId: string, patch: Partial<RenderJob>): RenderJob | undefined
```

- `jobId` — The job id to update.
- `patch` — Partial fields to merge into the job descriptor.

**Returns:** The updated job, or `undefined` if no such id was registered.

### Constants

#### `DEFAULT_AUDIO_RENDER_QUEUE`

Default queue name jobs are dispatched to.

```typescript
const DEFAULT_AUDIO_RENDER_QUEUE: "audio-render"
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-queue` ^1.0.0

**Security:** Every caller-controlled string (clip `audioUrl`, output
path) is checked against {@link sanitizeAudioPath} before it reaches
ffmpeg's command line. ffmpeg itself is invoked via
`child_process.spawn` with an argv array — never via a shell — so
shell metacharacters in legitimate paths can't trigger interpretation.

**Resource intensity:** ffmpeg can saturate CPU and IO for large
sessions. The package is queue-driven on purpose so flagship apps can
gate concurrency at the queue tier rather than in the request path.

**No locale bond:** This package's surface is programmatic — no
user-visible strings are generated, so there's no companion
`@molecule/api-locales-audio-render`.
