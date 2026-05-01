/**
 * Public types for `@molecule/api-video-render`.
 *
 * A {@link VideoTimeline} is a framework-neutral, JSON-serializable description
 * of a video composition — duration, output dimensions/fps, and an ordered set
 * of {@link VideoTrack}s containing {@link VideoClip}s and {@link VideoEffect}s.
 *
 * The renderer enqueues work via the bonded queue provider; a worker process
 * pulls jobs and shells out to ffmpeg, then writes the rendered output to a
 * configured destination. Job state is reported back through
 * {@link RenderJobStatus}.
 *
 * @module
 */

/**
 * Output container format. Drives the codec defaults and file extension.
 */
export type VideoRenderFormat = 'mp4' | 'webm'

/**
 * Render output resolution as discrete pixel dimensions. The renderer scales
 * each clip's source to fit. Dimensions must be even (codec requirement).
 */
export interface VideoResolution {
  /** Output width in pixels. Must be even. */
  width: number
  /** Output height in pixels. Must be even. */
  height: number
}

/**
 * Frames per second for the rendered output. Defaults to 30.
 */
export type VideoFps = number

/**
 * Encoder codec. Sensible defaults are picked per format when omitted —
 * `libx264` for mp4, `libvpx-vp9` for webm.
 */
export type VideoCodec = 'libx264' | 'libx265' | 'libvpx' | 'libvpx-vp9' | 'libaom-av1'

/**
 * A single source clip placed on a timeline track. The renderer trims the
 * source from `[sourceStart, sourceStart + duration)` and places it at
 * `start` on the track timeline.
 *
 * `source` is a path or `https?:`/`file:` URL — never a user-controlled
 * argument-string. Filenames are escaped before being passed to ffmpeg.
 */
export interface VideoClip {
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

/**
 * A pre-baked effect placed on a clip or track. Effects are name-keyed; the
 * worker resolves them to safe ffmpeg filter graphs from a built-in
 * allow-list. Free-form `-vf` filter strings are NEVER accepted from
 * user input — all parameters are typed and validated.
 */
export interface VideoEffect {
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

/**
 * A timeline track. Tracks render bottom-to-top (last track on top). Clips
 * within a track render in `start`-order; overlaps composite via the
 * renderer's mixing rules.
 */
export interface VideoTrack {
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

/**
 * Top-level timeline definition consumed by {@link renderVideo}.
 */
export interface VideoTimeline {
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

/**
 * Render-time options accepted by {@link renderVideo}.
 */
export interface RenderVideoOptions {
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

/**
 * Render job lifecycle states.
 */
export type RenderJobState = 'queued' | 'rendering' | 'completed' | 'failed' | 'cancelled'

/**
 * Result of {@link renderVideo}. The job is queued; callers must poll
 * {@link getRenderStatus} to observe progress.
 */
export interface RenderJob {
  /** Stable job identifier. Use this to poll status and to cancel. */
  jobId: string
  /** Initial job state — always `queued`. */
  status: 'queued'
  /** Queue name the job was enqueued onto. */
  queueName: string
}

/**
 * Status snapshot for a render job, returned by {@link getRenderStatus}.
 */
export interface RenderJobStatus {
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

/**
 * Internal envelope written to the queue for each render request. Workers
 * deserialize this back into the renderer.
 */
export interface RenderJobMessage {
  /** Job identifier. */
  jobId: string
  /** Timeline definition. */
  timeline: VideoTimeline
  /** Resolved render options (defaults already applied). */
  options: RenderVideoOptions & { format: VideoRenderFormat; codec: VideoCodec }
}
