/**
 * Lottie 5.x JSON serializer.
 *
 * Maps an {@link AnimationDocument} to the Bodymovin/Lottie schema:
 * https://lottiefiles.github.io/lottie-docs/schema/
 *
 * The output is intentionally a *minimal* but spec-conformant Lottie
 * payload — every field a Lottie player needs to compute a frame at any
 * time is present, but we do not emit the full set of optional metadata
 * (markers, masks, time-remap, etc.) that the schema permits but the
 * animation document never produces.
 *
 * @module
 */

import type { AnimationDocument, AnimationLayer, Easing, Keyframe } from './types.js'

const LOTTIE_VERSION = '5.7.6' as const

/**
 * Lottie root document shape (the bits we emit). The full schema accepts
 * many more optional fields; consumers tolerate missing-but-allowed keys.
 */
export interface LottieDocument {
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

interface LottieLayer {
  /** Layer name (mirrors `AnimationLayer.id`). */
  nm: string
  /** Layer type — `4` = shape, the only one we emit today. */
  ty: number
  /** Render order index. */
  ind: number
  /** Time-stretch factor — 1 = normal speed. */
  sr: 1
  /** In point (frames). */
  ip: number
  /** Out point (frames). */
  op: number
  /** Start time (frames). 0 in our output. */
  st: 0
  /** Blend mode — 0 = normal. */
  bm: 0
  /** Transform block. */
  ks: LottieTransform
  /** Shape descriptors. */
  shapes: unknown[]
}

interface LottieScalar {
  /** Animated flag — `0 = static`, `1 = animated`. */
  a: 0 | 1
  /** Static value, when `a === 0`. */
  k: number | number[]
  /** Animated keyframes, when `a === 1`. */
  // (Lottie permits `k` to be `number | number[] | KeyframeBlock[]` based on `a`.)
}

interface LottieTransform {
  /** Anchor point (x, y, z). */
  a: LottieScalar
  /** Position (x, y, z). */
  p: LottieScalar
  /** Scale (x, y, z) — percentage. */
  s: LottieScalar
  /** Rotation (degrees). */
  r: LottieScalar
  /** Opacity (0..100). */
  o: LottieScalar
}

/**
 * Convert an {@link AnimationDocument} to a Lottie 5.x JSON document.
 *
 * @param doc - Source animation document.
 * @param options - FPS + dimensions overrides.
 * @returns A Lottie 5.x-shaped object that can be `JSON.stringify`-ed
 * directly into a `.json` payload.
 */
export function toLottie(
  doc: AnimationDocument,
  options: { fps: number; width: number; height: number },
): LottieDocument {
  const totalFrames = Math.max(1, Math.floor(doc.duration * options.fps))
  return {
    v: LOTTIE_VERSION,
    fr: options.fps,
    ip: 0,
    op: totalFrames,
    w: options.width,
    h: options.height,
    nm: 'molecule-animation',
    ddd: 0,
    assets: [],
    layers: doc.layers.map((layer, index) => toLottieLayer(layer, index, doc, options)),
  }
}

/**
 * Convert one {@link AnimationLayer} into a Lottie shape layer.
 *
 * @param layer - Source layer.
 * @param index - Z-order index (0 = bottom).
 * @param doc - The owning animation document — needed for the layer's
 * total duration in frames.
 * @param options - FPS used to convert seconds to frames.
 * @returns A Lottie layer object.
 */
function toLottieLayer(
  layer: AnimationLayer,
  index: number,
  doc: AnimationDocument,
  options: { fps: number },
): LottieLayer {
  const totalFrames = Math.max(1, Math.floor(doc.duration * options.fps))
  return {
    nm: layer.id,
    ty: 4,
    ind: index,
    sr: 1,
    ip: 0,
    op: totalFrames,
    st: 0,
    bm: 0,
    ks: toLottieTransform(layer, options.fps),
    shapes: [toShape(layer)],
  }
}

/**
 * Build the Lottie transform block from a layer's static `transform` plus
 * any `transform.*` tracks.
 *
 * @param layer - Source layer.
 * @param fps - Frame rate (used to translate seconds → Lottie frame indices).
 * @returns Lottie transform object.
 */
function toLottieTransform(layer: AnimationLayer, fps: number): LottieTransform {
  const tracks = layer.tracks ?? {}
  const t = layer.transform ?? {}

  const xTrack = tracks['transform.x']
  const yTrack = tracks['transform.y']
  const positionStatic = [t.x ?? 0, t.y ?? 0, 0]

  // Lottie position is a single 2-D track. If either x or y is animated,
  // we synthesize a track over the union of their keyframe times.
  let position: LottieScalar
  if (xTrack || yTrack) {
    const times = mergeKeyframeTimes(xTrack, yTrack)
    const keyframes = times.map((time, i) => {
      const xValue = xTrack
        ? (toNumber(xTrack[Math.min(i, xTrack.length - 1)]?.value) ?? t.x ?? 0)
        : (t.x ?? 0)
      const yValue = yTrack
        ? (toNumber(yTrack[Math.min(i, yTrack.length - 1)]?.value) ?? t.y ?? 0)
        : (t.y ?? 0)
      const easing = (xTrack?.[i] ?? yTrack?.[i])?.easing
      return {
        t: Math.round(time * fps),
        s: [xValue, yValue, 0],
        ...easingToLottie(easing),
      }
    })
    position = { a: 1, k: keyframes as unknown as number[] }
  } else {
    position = { a: 0, k: positionStatic }
  }

  return {
    a: { a: 0, k: [0, 0, 0] },
    p: position,
    s: scalarTrack(tracks['transform.scaleX'], (t.scaleX ?? 1) * 100, 100, fps, true),
    r: scalarTrack(tracks['transform.rotation'], t.rotation ?? 0, 0, fps),
    o: scalarTrack(tracks['transform.opacity'], (t.opacity ?? 1) * 100, 100, fps, true),
  }
}

/**
 * Convert a scalar track to a Lottie scalar field. If the track is
 * missing or empty, emits a static value; otherwise emits an animated
 * keyframe block.
 *
 * @param track - Optional keyframe track.
 * @param staticValue - Static fallback used when the track is absent.
 * @param defaultValue - Lottie default for the property (so an absent
 * value can still be written when no track is available).
 * @param fps - Frame rate for time conversion.
 * @param scale100 - When `true`, multiply numeric values by 100 (Lottie
 * uses percentage units for `o` and `s`).
 * @returns Lottie scalar.
 */
function scalarTrack(
  track: Keyframe<number | string>[] | undefined,
  staticValue: number,
  defaultValue: number,
  fps: number,
  scale100 = false,
): LottieScalar {
  void defaultValue
  if (!track || track.length === 0) {
    return { a: 0, k: staticValue }
  }
  if (track.length === 1) {
    const v = toNumber(track[0]!.value) ?? staticValue
    return { a: 0, k: scale100 ? v * 100 : v }
  }
  const keyframes = track.map((kf) => ({
    t: Math.round(kf.time * fps),
    s: [scale100 ? (toNumber(kf.value) ?? 0) * 100 : (toNumber(kf.value) ?? 0)],
    ...easingToLottie(kf.easing),
  }))
  return { a: 1, k: keyframes as unknown as number[] }
}

/**
 * Convert one of our {@link Easing} curves into the Lottie keyframe
 * easing fields (`i` / `o` bezier handles).
 *
 * @param easing - Optional easing name.
 * @returns Object with `i`/`o` cubic bezier handles (per Lottie schema).
 */
function easingToLottie(easing: Easing | undefined): Record<string, unknown> {
  switch (easing) {
    case undefined:
    case 'linear':
      return { i: { x: [1], y: [1] }, o: { x: [0], y: [0] } }
    case 'step':
      return { h: 1 }
    case 'ease-in':
      return { i: { x: [1], y: [1] }, o: { x: [0.42], y: [0] } }
    case 'ease-out':
      return { i: { x: [0.58], y: [1] }, o: { x: [0], y: [0] } }
    case 'ease-in-out':
      return { i: { x: [0.58], y: [1] }, o: { x: [0.42], y: [0] } }
    default: {
      const _exhaustive: never = easing
      throw new Error(`Unknown easing: ${String(_exhaustive)}`)
    }
  }
}

/**
 * Build a Lottie shape descriptor for a layer. We emit the canonical
 * `kind`-tagged objects so the Lottie viewer / our test code can pick
 * the right path.
 *
 * @param layer - Source layer.
 * @returns Lottie shape object.
 */
function toShape(layer: AnimationLayer): Record<string, unknown> {
  return {
    ty: shapeType(layer.kind),
    nm: `${layer.id}-shape`,
    kind: layer.kind,
    payload: layer.shape,
  }
}

/**
 * Lottie shape type code for the `ty` field on a shape descriptor. The
 * canonical mapping (rect = `rc`, ellipse = `el`, etc.) is kept verbatim
 * for compatibility with Lottie players that use it.
 *
 * @param kind - Animation layer kind.
 * @returns Lottie shape type code.
 */
function shapeType(kind: AnimationLayer['kind']): string {
  switch (kind) {
    case 'rect':
      return 'rc'
    case 'ellipse':
      return 'el'
    case 'line':
      return 'sh'
    case 'path':
      return 'sh'
    case 'text':
      return 'tx'
    case 'image':
      return 'im'
    case 'group':
      return 'gr'
    default: {
      const _exhaustive: never = kind
      throw new Error(`Unknown shape kind: ${String(_exhaustive)}`)
    }
  }
}

/**
 * Coerce a possibly-string track value to a number. Returns `undefined`
 * when the value is non-numeric (e.g. a color string applied to a
 * transform track, which the schema does not allow).
 *
 * @param v - Track value.
 * @returns Numeric value or `undefined`.
 */
function toNumber(v: number | string | undefined): number | undefined {
  if (typeof v === 'number') return v
  return undefined
}

/**
 * Merge the `time` axis of two keyframe tracks, deduplicated and sorted.
 *
 * @param a - Optional first track.
 * @param b - Optional second track.
 * @returns Sorted array of unique time values.
 */
function mergeKeyframeTimes(
  a: Keyframe<number | string>[] | undefined,
  b: Keyframe<number | string>[] | undefined,
): number[] {
  const set = new Set<number>()
  for (const kf of a ?? []) set.add(kf.time)
  for (const kf of b ?? []) set.add(kf.time)
  return Array.from(set).sort((x, y) => x - y)
}
