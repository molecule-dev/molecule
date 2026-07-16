/**
 * Public types for `@molecule/api-animation-renderer`.
 *
 * An {@link AnimationDocument} is a framework-neutral, JSON-serializable
 * description of an animated 2D scene — width / height / frame-rate /
 * duration plus an ordered list of {@link AnimationLayer}s, where each
 * layer carries a list of {@link Keyframe}s for its animatable properties.
 *
 * The renderer either:
 * - serializes the document directly to a Lottie 5.x-compatible JSON
 *   payload (lossless; the canvas at every frame can be reconstructed by
 *   any Lottie player), OR
 * - rasterizes one frame per output frame by transforming every keyframed
 *   property into a {@link CanvasDocument}-shaped snapshot, dispatching
 *   each snapshot through the `canvas-render` bond, and concatenating the
 *   resulting PNG buffers via the supplied ffmpeg adapter into an MP4 or
 *   animated GIF.
 *
 * @module
 */

/**
 * Output formats supported by {@link renderAnimation}.
 */
export type AnimationFormat = 'lottie' | 'mp4' | 'gif'

/**
 * Job lifecycle states. The state machine is strictly forward-only:
 * `queued` → `rendering` → `complete` (or `cancelled` / `failed` from any
 * non-terminal state).
 */
export type RenderJobStatus = 'queued' | 'rendering' | 'complete' | 'cancelled' | 'failed'

/**
 * Easing function applied between two keyframes. `linear` is the default
 * (no easing). `step` snaps from `from` to `to` at the start of the
 * interval. The cubic bezier curves match the canonical CSS easing names
 * to keep the animation document portable to web players.
 */
export type Easing = 'linear' | 'step' | 'ease-in' | 'ease-out' | 'ease-in-out'

/**
 * 2D affine transform applied to an animation layer.
 */
export interface AnimationTransform {
  x?: number
  y?: number
  rotation?: number
  scaleX?: number
  scaleY?: number
  opacity?: number
}

/**
 * Numeric or color value held at a particular point in time.
 *
 * `time` is an absolute time in seconds, counted from the start of the
 * animation (`0`). The interpolated value at any time `t` is:
 *
 * 1. find the latest keyframe whose `time <= t` (call it `a`)
 * 2. find the earliest keyframe whose `time > t` (call it `b`)
 * 3. apply `a.easing` to `(t - a.time) / (b.time - a.time)` to get `u`
 * 4. return `lerp(a.value, b.value, u)` (numeric) or
 *    `lerpColor(a.value, b.value, u)` (color).
 *
 * If `t < firstKeyframe.time`, the first value is held; if
 * `t > lastKeyframe.time`, the last value is held.
 */
export interface Keyframe<TValue = number> {
  /** Absolute time in seconds. Must be `>= 0`. */
  time: number
  /** Property value at this point in time. */
  value: TValue
  /** Easing applied between this keyframe and the next. Defaults to `linear`. */
  easing?: Easing
}

/**
 * A {@link CanvasDocument}-style shape (rectangle, ellipse, line, path,
 * text, image) whose visual properties may be animated by per-property
 * keyframe tracks.
 *
 * The renderer never owns a {@link CanvasDocument} — instead, at every
 * output frame it builds one from the layer's static fields plus the
 * interpolated keyframe values, and hands that {@link CanvasDocument} to
 * the injected canvas-render adapter. This keeps animation-renderer fully
 * decoupled from any specific renderer implementation: substitute the
 * adapter and the same animation document can target a server-side raster,
 * a PDF, or a test fixture.
 */
export interface AnimationLayer {
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

/**
 * Top-level animation document consumed by {@link renderAnimation}.
 */
export interface AnimationDocument {
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

/**
 * Options accepted by {@link renderAnimation}.
 */
export interface RenderAnimationOptions {
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

/**
 * Result of a successful render.
 */
export interface RenderResult {
  /** Output buffer. */
  buffer: Buffer
  /** MIME type — `application/json` for lottie, `video/mp4`, `image/gif`. */
  contentType: string
  /** Suggested filename extension (no leading dot). */
  extension: 'json' | 'mp4' | 'gif'
  /** Number of frames the output contains (for lottie this is `floor(duration * fps)`). */
  frameCount: number
}

/**
 * Handle returned by {@link renderAnimation} — gives callers a way to
 * track progress, retrieve the final result, or cancel the job.
 */
export interface RenderJob {
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

/**
 * Snapshot of a job — the shape returned by {@link getRenderStatus}.
 */
export interface RenderJobSnapshot {
  id: string
  status: RenderJobStatus
  format: AnimationFormat
  totalFrames: number
  framesRendered: number
  contentType?: string
  extension?: 'json' | 'mp4' | 'gif'
  error?: string
}

/**
 * Adapter that concatenates per-frame PNG buffers into an MP4 or GIF.
 *
 * Implementations typically shell out to `ffmpeg` (the recommended path —
 * no Node-side video encoding) but the surface is deliberately abstract
 * so tests can substitute an in-memory implementation that simply
 * concatenates the buffers it receives. Keeping this an injectable seam
 * means the package itself never imports `child_process` or
 * `fluent-ffmpeg` — host applications wire whatever encoder they prefer.
 */
export interface FfmpegAdapter {
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

/**
 * Adapter that rasterizes a single canvas snapshot to a PNG buffer.
 *
 * In production this typically wraps `renderCanvasDocument` from
 * `@molecule/api-canvas-render` (a direct-import utility — there is no
 * 'canvas-render' bond category). The package accepts it as an injectable
 * dependency rather than `import`ing the canvas-render module directly so
 * the adapter can be swapped at runtime (PNG via `@napi-rs/canvas`,
 * alternative WASM raster, headless browser, etc.) without rewriting the
 * animation pipeline.
 */
export interface CanvasRenderAdapter {
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
