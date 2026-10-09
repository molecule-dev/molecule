/**
 * Kandinsky 6.0 facts the provider applies: the distilled-checkpoint
 * steps/guidance pairing, the frame-count rule (`4k+1`), and the 16-pixel
 * dimension grid the VAE forces.
 *
 * @module
 */

/**
 * The default model id, as vLLM-Omni serves it: the 3B Lite distilled
 * checkpoint — the only Kandinsky 6.0 variant that plausibly fits a single
 * consumer/datacenter GPU at useful latency (10-step distill).
 */
export const KANDINSKY_6_LITE_DISTILL_MODEL = 'kandinskylab/Kandinsky-6.0-Lite-distill-5s-Diffusers'

/** The server's registered production geometry: width 864, height 480. */
export const KANDINSKY_6_DEFAULT_SIZE = '864x480'

/** Default frame rate of every Kandinsky 6.0 checkpoint (5 s = 121 frames). */
export const KANDINSKY_6_FPS = 24

/**
 * Inference steps a `-distill` checkpoint is trained for (model card: run
 * distilled checkpoints at 10–16 steps).
 */
export const KANDINSKY_6_DISTILL_STEPS = 10

/**
 * Guidance scale every `-distill` checkpoint requires. The base checkpoints
 * use 5.0, but distilled ones ship a `PiflowScheduler` that silently produces
 * wrong results at any other value — the model card calls this out.
 */
export const KANDINSKY_6_DISTILL_GUIDANCE_SCALE = 1.0

/** Kandinsky's VAE compresses 8× and patches 2× — every dimension must be divisible by 16. */
export const KANDINSKY_6_DIMENSION_MULTIPLE = 16

/**
 * Whether a model id names a distilled Kandinsky 6.0 checkpoint (any casing).
 *
 * @param model - The model id sent to the server.
 * @returns `true` for `-distill` checkpoints.
 */
export function isKandinskyDistilled(model: string): boolean {
  return /-distill/i.test(model)
}

/**
 * Snaps a pixel dimension to Kandinsky's 16-pixel grid (8× VAE compression
 * times a 2× patch). Non-multiples are rejected by the pipeline, so `481`
 * becomes `480` and `100` becomes `96`; the grid has a FLOOR of 16
 * (a dimension below it would not describe a video), so `0` or a negative
 * value snaps UP to 16. `value` must be finite — the provider refuses a
 * non-finite width/height before reaching here.
 *
 * @param value - The requested width or height in pixels (finite).
 * @returns The nearest multiple of 16 that is at least 16.
 */
export function kandinskyDimension(value: number): number {
  const multiple = KANDINSKY_6_DIMENSION_MULTIPLE
  return Math.max(multiple, Math.round(value / multiple) * multiple)
}

/**
 * Converts a clip length to Kandinsky's required `1 + 4k` frame count
 * (`4k+1` frames; the 5-second clip shape is 121 frames at 24 fps).
 *
 * @param durationSeconds - The requested clip length in seconds.
 * @param fps - The effective frame rate (defaults to 24).
 * @returns A frame count of the form `1 + 4k`, at least 1.
 */
export function framesForDuration(durationSeconds: number, fps: number): number {
  const rate = fps > 0 ? fps : KANDINSKY_6_FPS
  const target = Math.max(1, Math.round(durationSeconds * rate))
  const k = Math.max(0, Math.round((target - 1) / 4))
  return 1 + 4 * k
}
