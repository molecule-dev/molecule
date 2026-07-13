# @molecule/api-animation-renderer

Server-side animation rendering for molecule.dev. Consumes an
{@link AnimationDocument} (the keyframe representation produced by
`@molecule/app-feature-animation-canvas`) and produces either:

- a Lottie 5.x JSON document (lossless; the canvas at every frame
  reconstructs in any Lottie player), or
- an MP4 / animated GIF (frame-by-frame raster via the `canvas-render`
  bond, then concatenated with an injected ffmpeg adapter).

The package is queue-driven — `renderAnimation()` enqueues a job and
returns a {@link RenderJob} handle whose `done` promise resolves to a
{@link RenderResult}. {@link getRenderStatus} polls a job by id;
{@link cancelRender} aborts a queued or running job.

## Quick Start

```ts
// Wire adapters once at startup.
import { configureAnimationRenderer, type FfmpegAdapter } from '@molecule/api-animation-renderer'
import { type CanvasDocument, renderCanvasDocument } from '@molecule/api-canvas-render'

// Thin ffmpeg wrapper — e.g. shell out to `ffmpeg` and resolve the encoded buffer.
const ffmpeg: FfmpegAdapter = {
  encodeMp4: async (frames, { fps, width, height }) => { ... },
  encodeGif: async (frames, { fps, width, height }) => { ... },
}

configureAnimationRenderer({
  // Each per-frame snapshot is canvas-render-shaped — its layers ARE canvas-render layers.
  canvas: { renderFrame: (doc, opts) => renderCanvasDocument(doc as CanvasDocument, opts) },
  ffmpeg,
  concurrency: 2,
})
```

```ts
// Submit a render and poll for completion.
import { renderAnimation, getRenderStatus } from '@molecule/api-animation-renderer'

const job = renderAnimation(doc, { format: 'mp4', resolution: { width: 1080, height: 1920 } })
const result = await job.done

// Or, in an HTTP-driven flow:
const snapshot = getRenderStatus(job.id) // → { status: 'rendering', framesRendered: 17, ... }
```

```ts
// Express adapter wiring all three handlers.
import {
  createAnimationRenderHandler,
  createAnimationStatusHandler,
  createAnimationCancelHandler,
} from '@molecule/api-animation-renderer'

const submit = createAnimationRenderHandler()
const status = createAnimationStatusHandler()
const cancel = createAnimationCancelHandler()

router.post('/animation/render', (req, res, next) =>
  submit({ body: req.body }, expressShim(res)).catch(next))
router.get('/animation/render/:id', (req, res, next) =>
  status({ params: req.params }, expressShim(res)).catch(next))
router.delete('/animation/render/:id', (req, res, next) =>
  cancel({ params: req.params }, expressShim(res)).catch(next))
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-animation-renderer
```

## API

### Interfaces

#### `AnimationDocument`

Top-level animation document consumed by {@link renderAnimation}.

```typescript
interface AnimationDocument {
  /** Width in user-space units. */
  width: number
  /** Height in user-space units. */
  height: number
  /** Frames per second. Defaults to 30 if omitted at the call site. */
  fps?: number
  /** Total duration in seconds. */
  duration: number
  /** Optional document background color (CSS string). */
  background?: string
  /** Layers in z-order (later = on top). */
  layers: AnimationLayer[]
}
```

#### `AnimationLayer`

A {@link CanvasDocument}-style shape (rectangle, ellipse, line, path,
text, image) whose visual properties may be animated by per-property
keyframe tracks.

The renderer never owns a {@link CanvasDocument} — instead, at every
output frame it builds one from the layer's static fields plus the
interpolated keyframe values, and hands that {@link CanvasDocument} to
the canvas-render bond. This keeps animation-renderer fully decoupled
from any specific renderer implementation: substitute the bond and the
same animation document can target a server-side raster, a PDF, or a
test fixture.

```typescript
interface AnimationLayer {
  /**
   * Stable layer identifier. Used in Lottie output as the layer's `nm`
   * (name) field and as the seed for deterministic z-ordering.
   */
  id: string
  /** Layer kind — mirrors the `kind` field on canvas-render layers. */
  kind: 'rect' | 'ellipse' | 'line' | 'path' | 'text' | 'image' | 'group'
  /** Static layer payload. Animated properties live in `tracks`. */
  shape: Record<string, unknown>
  /**
   * Per-property keyframe tracks. The key is the path of the animated
   * property in `shape` (top-level keys only — e.g. `"x"`, `"width"`,
   * `"fill"`), and the value is a list of keyframes ordered by `time`.
   *
   * Transform-level animations live in their own dedicated keys
   * (`"transform.x"`, `"transform.opacity"`, etc.) which the renderer
   * applies to the resulting {@link CanvasDocument}'s top-level transform
   * fields.
   */
  tracks?: Record<string, Keyframe<number | string>[]>
  /** Optional initial transform — folded into per-frame transform values. */
  transform?: AnimationTransform
  /** When `kind === 'group'`, the children animate inside this layer's transform. */
  children?: AnimationLayer[]
}
```

#### `AnimationRenderer`

Bound, pre-configured renderer instance — output of
{@link createAnimationRenderer}. Identical surface to the singleton
functions exported below.

```typescript
interface AnimationRenderer {
  renderAnimation: (doc: AnimationDocument, options?: RenderAnimationOptions) => RenderJob
  getRenderStatus: (jobId: string) => RenderJobSnapshot | undefined
  cancelRender: (jobId: string) => boolean
}
```

#### `AnimationRenderRequest`

Minimal request shape consumed by the handlers.

```typescript
interface AnimationRenderRequest {
  /** Parsed JSON body — `{ doc, options }`. Only used by the submit handler. */
  body?: unknown
  /** Path/query parameter holding the job id. Used by status / cancel handlers. */
  params?: { id?: string }
  /** Whether the client requested the result buffer inline (`?download=1`). */
  query?: { download?: string }
}
```

#### `AnimationRenderResponse`

Minimal response shape consumed by the handlers.

```typescript
interface AnimationRenderResponse {
  /** Set a single response header. */
  setHeader: (name: string, value: string) => void
  /** Set the HTTP status code. */
  setStatus: (status: number) => void
  /** Write a binary buffer body and end the response. */
  sendBuffer: (buffer: Buffer) => void
  /** Write a JSON body and end the response. */
  sendJson: (body: unknown) => void
}
```

#### `AnimationTransform`

2D affine transform applied to an animation layer.

```typescript
interface AnimationTransform {
  x?: number
  y?: number
  rotation?: number
  scaleX?: number
  scaleY?: number
  opacity?: number
}
```

#### `CanvasRenderAdapter`

Adapter that rasterizes a single canvas snapshot to a PNG buffer.

In production this is satisfied by `bond('canvas-render')` — i.e.
`renderCanvasDocument` from `@molecule/api-canvas-render`. The package
accepts it as an injectable dependency rather than `import`ing the
canvas-render module directly so the bond can be swapped at runtime
(PNG via `@napi-rs/canvas`, alternative WASM raster, headless browser,
etc.) without rewriting the animation pipeline.

```typescript
interface CanvasRenderAdapter {
  /**
   * Render one frame.
   *
   * @param doc - A canvas-render-style document — `{ width, height,
   * background?, layers: [...] }` with each layer matching the
   * canvas-render `Layer` discriminated union.
   * @param options - Output options. The animation renderer always asks
   * for PNG; alternative formats are not used for frame composition.
   */
  renderFrame: (
    doc: { width: number; height: number; background?: string; layers: unknown[] },
    options: { format: 'png'; width: number; height: number; dpi?: number },
  ) => Promise<{ buffer: Buffer }>
}
```

#### `CreateAnimationRenderHandlerOptions`

Options for {@link createAnimationRenderHandler}.

```typescript
interface CreateAnimationRenderHandlerOptions {
  /**
   * Optional pre-flight validator. Throw to reject the request; the
   * thrown error's `.message` becomes the JSON `error` field with HTTP 400.
   */
  validate?: (doc: AnimationDocument, options: RenderAnimationOptions) => void | Promise<void>
}
```

#### `FfmpegAdapter`

Adapter that concatenates per-frame PNG buffers into an MP4 or GIF.

Implementations typically shell out to `ffmpeg` (the recommended path —
no Node-side video encoding) but the surface is deliberately abstract
so tests can substitute an in-memory implementation that simply
concatenates the buffers it receives. Keeping this an injectable seam
means the package itself never imports `child_process` or
`fluent-ffmpeg` — host applications wire whatever encoder they prefer.

```typescript
interface FfmpegAdapter {
  /**
   * Concatenate PNG frame buffers into an MP4.
   *
   * @param frames - Array of PNG buffers, one per output frame.
   * @param options - Frame rate + dimensions.
   */
  encodeMp4: (
    frames: Buffer[],
    options: { fps: number; width: number; height: number },
  ) => Promise<Buffer>
  /**
   * Concatenate PNG frame buffers into an animated GIF.
   *
   * @param frames - Array of PNG buffers, one per output frame.
   * @param options - Frame rate + dimensions.
   */
  encodeGif: (
    frames: Buffer[],
    options: { fps: number; width: number; height: number },
  ) => Promise<Buffer>
}
```

#### `Keyframe`

Numeric or color value held at a particular point in time.

`time` is an absolute time in seconds, counted from the start of the
animation (`0`). The interpolated value at any time `t` is:

1. find the latest keyframe whose `time <= t` (call it `a`)
2. find the earliest keyframe whose `time > t` (call it `b`)
3. apply `a.easing` to `(t - a.time) / (b.time - a.time)` to get `u`
4. return `lerp(a.value, b.value, u)` (numeric) or
   `lerpColor(a.value, b.value, u)` (color).

If `t < firstKeyframe.time`, the first value is held; if
`t > lastKeyframe.time`, the last value is held.

```typescript
interface Keyframe<TValue = number> {
  /** Absolute time in seconds. Must be `>= 0`. */
  time: number
  /** Property value at this point in time. */
  value: TValue
  /** Easing applied between this keyframe and the next. Defaults to `linear`. */
  easing?: Easing
}
```

#### `LottieDocument`

Lottie root document shape (the bits we emit). The full schema accepts
many more optional fields; consumers tolerate missing-but-allowed keys.

```typescript
interface LottieDocument {
  /** Lottie schema version. */
  v: string
  /** Frame rate. */
  fr: number
  /** In point (frames). Always 0. */
  ip: number
  /** Out point (frames) — `floor(duration * fps)`. */
  op: number
  /** Width in pixels. */
  w: number
  /** Height in pixels. */
  h: number
  /** Document name. */
  nm: string
  /** Document direction (1 = LTR; spec default). */
  ddd: 0
  /** Asset references — empty in our output. */
  assets: unknown[]
  /** Layer list. */
  layers: LottieLayer[]
}
```

#### `RenderAnimationOptions`

Options accepted by {@link renderAnimation}.

```typescript
interface RenderAnimationOptions {
  /** Output format. Defaults to `"lottie"`. */
  format?: AnimationFormat
  /**
   * Output resolution as `{ width, height }` in pixels. Defaults to the
   * document's `width`/`height`.
   */
  resolution?: { width: number; height: number }
  /** Frames per second. Overrides `doc.fps`. Defaults to `doc.fps ?? 30`. */
  fps?: number
  /** Optional, stable identifier — useful when callers want job ids derived from app state. */
  jobId?: string
}
```

#### `RendererConfig`

Adapter set passed to {@link configureAnimationRenderer} /
{@link createAnimationRenderer}.

```typescript
interface RendererConfig {
  /**
   * Adapter for rasterising one frame to PNG. In production this wraps
   * `bond('canvas-render')` (i.e. `renderCanvasDocument` from
   * `@molecule/api-canvas-render`). Optional — only the lottie path can
   * complete without it.
   */
  canvas?: CanvasRenderAdapter
  /**
   * Adapter for concatenating per-frame PNGs into MP4 / GIF. In
   * production this shells out to ffmpeg. Optional — only the lottie
   * path can complete without it.
   */
  ffmpeg?: FfmpegAdapter
  /**
   * Maximum concurrent jobs. Defaults to `1` (sequential), since the
   * frame-rasterization path tends to be CPU-bound and the ffmpeg path
   * spawns child processes.
   */
  concurrency?: number
}
```

#### `RenderJob`

Handle returned by {@link renderAnimation} — gives callers a way to
track progress, retrieve the final result, or cancel the job.

```typescript
interface RenderJob {
  /** Stable, unique identifier. */
  id: string
  /** Current status. */
  status: RenderJobStatus
  /** Output format. */
  format: AnimationFormat
  /** Total frames the job will produce. */
  totalFrames: number
  /** Frames rendered so far. Always `0` for the lottie path. */
  framesRendered: number
  /** Populated when `status === 'complete'`. */
  result?: RenderResult
  /** Populated when `status === 'failed'`. */
  error?: string
  /** Promise that resolves once the job reaches a terminal state. */
  done: Promise<RenderResult>
}
```

#### `RenderJobSnapshot`

Snapshot of a job — the shape returned by {@link getRenderStatus}.

```typescript
interface RenderJobSnapshot {
  id: string
  status: RenderJobStatus
  format: AnimationFormat
  totalFrames: number
  framesRendered: number
  contentType?: string
  extension?: 'json' | 'mp4' | 'gif'
  error?: string
}
```

#### `RenderQueueOptions`

Configuration for {@link RenderQueue}.

```typescript
interface RenderQueueOptions {
  /** Maximum jobs that may run simultaneously. Defaults to `1`. */
  concurrency?: number
  /**
   * Function that performs the actual render — injected so tests can
   * replace it with a deterministic stub. Receives the {@link AnimationDocument},
   * the resolved options, and the per-job cancellation signal.
   */
  runner: (
    doc: AnimationDocument,
    options: ResolvedRenderOptions,
    signal: AbortSignal,
    onProgress: (frame: number) => void,
  ) => Promise<RenderResult>
}
```

#### `RenderResult`

Result of a successful render.

```typescript
interface RenderResult {
  /** Output buffer. */
  buffer: Buffer
  /** MIME type — `application/json` for lottie, `video/mp4`, `image/gif`. */
  contentType: string
  /** Suggested filename extension (no leading dot). */
  extension: 'json' | 'mp4' | 'gif'
  /** Number of frames the output contains (for lottie this is `floor(duration * fps)`). */
  frameCount: number
}
```

#### `ResolvedRenderOptions`

Options after defaults have been applied — the shape the queue
runner is guaranteed to receive.

```typescript
interface ResolvedRenderOptions extends RenderAnimationOptions {
  format: 'lottie' | 'mp4' | 'gif'
  width: number
  height: number
  fps: number
  totalFrames: number
}
```

#### `SnapshotDocument`

The canvas-render document shape we produce.

```typescript
interface SnapshotDocument {
  width: number
  height: number
  background?: string
  layers: SnapshotLayer[]
}
```

### Types

#### `AnimationFormat`

Output formats supported by {@link renderAnimation}.

```typescript
type AnimationFormat = 'lottie' | 'mp4' | 'gif'
```

#### `Easing`

Easing function applied between two keyframes. `linear` is the default
(no easing). `step` snaps from `from` to `to` at the start of the
interval. The cubic bezier curves match the canonical CSS easing names
to keep the animation document portable to web players.

```typescript
type Easing = 'linear' | 'step' | 'ease-in' | 'ease-out' | 'ease-in-out'
```

#### `RenderJobStatus`

Job lifecycle states. The state machine is strictly forward-only:
`queued` → `rendering` → `complete` (or `cancelled` / `failed` from any
non-terminal state).

```typescript
type RenderJobStatus = 'queued' | 'rendering' | 'complete' | 'cancelled' | 'failed'
```

### Classes

#### `RenderQueue`

Sequential render queue. One queue instance owns its job records — call
{@link RenderQueue.submit} to enqueue a job and {@link RenderQueue.cancel}
to abort one.

### Functions

#### `applyEasing(u, easing)`

Apply an {@link Easing} curve to a normalized parameter `u ∈ [0, 1]`.

```typescript
function applyEasing(u: number, easing: Easing | undefined): number
```

- `u` — Normalized progress along the keyframe segment.
- `easing` — Easing function name. Defaults to `linear`.

**Returns:** Eased progress in `[0, 1]`.

#### `cancelRender(jobId)`

Cancel a queued or running job. Resolves to `true` if the job was
found and transitioned to `cancelled`; `false` otherwise.

```typescript
function cancelRender(jobId: string): boolean
```

- `jobId` — The id returned by {@link renderAnimation}.

**Returns:** Whether cancellation took effect.

#### `configureAnimationRenderer(config)`

Configure the singleton renderer. Call once at process startup with
the host's adapters wired (typically `bond('canvas-render')` plus a
thin ffmpeg wrapper). Subsequent calls replace the singleton and
detach the previous queue (in-flight jobs continue to completion but
status lookups against the old queue must use the returned instance).

```typescript
function configureAnimationRenderer(config?: RendererConfig): AnimationRenderer
```

- `config` — Adapter set + queue configuration.

**Returns:** The newly created singleton.

#### `createAnimationCancelHandler()`

Build a handler for `DELETE /animation/render/:id`. Cancels a queued
or running job. Returns 404 if no such job exists or 409 if the job
had already reached a terminal state.

```typescript
function createAnimationCancelHandler(): (req: AnimationRenderRequest, res: AnimationRenderResponse) => Promise<void>
```

**Returns:** Async handler.

#### `createAnimationRenderer(config)`

Build a fresh renderer with its own queue. Use this when an app needs
to keep multiple animation pipelines isolated from each other (e.g.
preview vs export queues).

```typescript
function createAnimationRenderer(config?: RendererConfig): AnimationRenderer
```

- `config` — Adapter set + queue configuration.

**Returns:** A bound renderer instance.

#### `createAnimationRenderHandler(handlerOptions)`

Build a handler for `POST /animation/render`. Validates the body,
enqueues the job, and returns the job id and initial status. The
response is sent immediately — the caller polls
{@link createAnimationStatusHandler} for completion.

```typescript
function createAnimationRenderHandler(handlerOptions?: CreateAnimationRenderHandlerOptions): (req: AnimationRenderRequest, res: AnimationRenderResponse) => Promise<void>
```

- `handlerOptions` — Optional validator.

**Returns:** Async handler accepting `{ body }` + a response shim.

#### `createAnimationStatusHandler()`

Build a handler for `GET /animation/render/:id`. Returns either the
current snapshot (for non-terminal states) or the final buffer with
the appropriate content-type when the job has completed and the
client requested it via `?download=1`.

```typescript
function createAnimationStatusHandler(): (req: AnimationRenderRequest, res: AnimationRenderResponse) => Promise<void>
```

**Returns:** Async handler.

#### `getRenderStatus(jobId)`

Look up the current state of a previously submitted job.

```typescript
function getRenderStatus(jobId: string): RenderJobSnapshot | undefined
```

- `jobId` — The id returned by {@link renderAnimation}.

**Returns:** Job snapshot, or `undefined` if no such job exists.

#### `lerp(a, b, u)`

Linear interpolate between two numbers.

```typescript
function lerp(a: number, b: number, u: number): number
```

- `a` — Start value.
- `b` — End value.
- `u` — Eased progress in `[0, 1]`.

**Returns:** Interpolated value.

#### `lerpColor(a, b, u)`

Interpolate a CSS-style hex color string between two endpoints. Both
inputs must be `#rgb`, `#rrggbb`, or `#rrggbbaa`. Non-hex strings (CSS
names, `rgb()`, etc.) snap on segment boundaries — the renderer is
expected to feed the keyframe machinery normalized hex values.

```typescript
function lerpColor(a: string, b: string, u: number): string
```

- `a` — Start color (hex string).
- `b` — End color (hex string).
- `u` — Eased progress in `[0, 1]`.

**Returns:** Interpolated `#rrggbb` (or `#rrggbbaa` if either input had alpha).

#### `makeStandardRunner(adapters)`

Build the standard runner that the public API uses — splits on output
format and dispatches to the lottie / mp4 / gif paths.

Exported so callers building a custom queue (e.g. Redis-backed) can
compose the same render pipeline with their own scheduling layer.

```typescript
function makeStandardRunner(adapters: { canvas?: CanvasRenderAdapter; ffmpeg?: FfmpegAdapter; toLottie: (doc: AnimationDocument, opts: { fps: number; width: number; height: number; }) => unknown; snapshotAtTime: (doc: AnimationDocument, t: number) => unknown; }): (doc: AnimationDocument, options: ResolvedRenderOptions, signal: AbortSignal, onProgress: (frame: number) => void) => Promise<RenderResult>
```

- `adapters` — Canvas + ffmpeg adapters.

**Returns:** A function suitable as {@link RenderQueueOptions.runner}.

#### `renderAnimation(doc, options)`

Submit an animation document to the singleton renderer. Returns
synchronously with a {@link RenderJob} handle whose `done` promise
resolves to the rendered buffer.

For MP4 / GIF output the singleton must have been configured with a
canvas adapter and an ffmpeg adapter via
{@link configureAnimationRenderer}; the lottie path needs neither.

```typescript
function renderAnimation(doc: AnimationDocument, options?: RenderAnimationOptions): RenderJob
```

- `doc` — Animation document.
- `options` — Output format, resolution, fps, optional jobId.

**Returns:** The enqueued render job.

#### `snapshotAtTime(doc, t)`

Materialize the document at time `t` (seconds).

Each layer's `shape` is shallow-copied; for every key that appears in
`layer.tracks`, the keyframed value at time `t` overrides the static
value. Transform tracks (keys starting with `"transform."`) write to
the resulting layer's top-level transform fields (`x`, `y`,
`rotation`, etc.) which the canvas-render bond consumes directly.

```typescript
function snapshotAtTime(doc: AnimationDocument, t: number): SnapshotDocument
```

- `doc` — The animation document.
- `t` — Time in seconds.

**Returns:** A canvas-render-shaped document containing the frame snapshot.

#### `toLottie(doc, options)`

Convert an {@link AnimationDocument} to a Lottie 5.x JSON document.

```typescript
function toLottie(doc: AnimationDocument, options: { fps: number; width: number; height: number; }): LottieDocument
```

- `doc` — Source animation document.
- `options` — FPS + dimensions overrides.

**Returns:** A Lottie 5.x-shaped object that can be `JSON.stringify`-ed
 * directly into a `.json` payload.

#### `valueAtTime(track, t)`

Compute the value of a keyframe track at time `t` (seconds).

Implements the rules described in {@link Keyframe}: hold-before-first,
hold-after-last, segment-wise easing + linear interpolation.

```typescript
function valueAtTime(track: Keyframe<T>[], t: number): T | undefined
```

- `track` — Ordered keyframes (must be sorted ascending by `time`).
- `t` — Time in seconds.

**Returns:** Interpolated value or `undefined` if the track is empty.

## Injection Notes

The renderer is decoupled from any concrete canvas / ffmpeg
implementation — adapters are passed via
{@link configureAnimationRenderer} so the same animation pipeline can
target `@napi-rs/canvas`, a WASM raster, or a headless browser without
touching this package. Lottie output requires no adapters at all.

Resource intensity: a frame-rasterised export of a long, complex
animation will produce many megabytes of intermediate PNG buffers.
Run the queue on a dedicated worker (cron / job runner / sidecar
container) rather than inline on the request thread, and gate the
submit handler behind a tier check or rate limiter.
