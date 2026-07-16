/**
 * Builds a per-frame {@link CanvasDocument}-shaped snapshot from an
 * {@link AnimationDocument} at time `t` — the input the canvas-render
 * bond ingests during MP4/GIF frame production.
 *
 * Kept as a pure function so the same snapshot can be tested without
 * involving the bond, and so multiple raster implementations can consume
 * the output without coupling to animation-renderer internals.
 *
 * @module
 */

import { valueAtTime } from './interpolate.js'
import type { AnimationDocument, AnimationLayer } from './types.js'

/**
 * The canvas-render layer shape we produce. Mirrors the public layer
 * union from `@molecule/api-canvas-render` but is deliberately typed as
 * plain `Record<string, unknown>` here so the package depends on only
 * the bond interface, not the concrete `Layer` type.
 */
type SnapshotLayer = Record<string, unknown> & {
  kind: AnimationLayer['kind']
  children?: SnapshotLayer[]
}

/**
 * The canvas-render document shape we produce.
 */
export interface SnapshotDocument {
  width: number
  height: number
  background?: string
  layers: SnapshotLayer[]
}

/**
 * Materialize the document at time `t` (seconds).
 *
 * Each layer's `shape` is shallow-copied; for every key that appears in
 * `layer.tracks`, the keyframed value at time `t` overrides the static
 * value. Transform tracks (keys starting with `"transform."`) write to
 * the resulting layer's top-level transform fields (`x`, `y`,
 * `rotation`, etc.) which the canvas-render adapter consumes directly.
 *
 * @param doc - The animation document.
 * @param t - Time in seconds.
 * @returns A canvas-render-shaped document containing the frame snapshot.
 */
export function snapshotAtTime(doc: AnimationDocument, t: number): SnapshotDocument {
  return {
    width: doc.width,
    height: doc.height,
    ...(doc.background ? { background: doc.background } : {}),
    layers: doc.layers.map((layer) => snapshotLayer(layer, t)),
  }
}

/**
 * Snapshot a single layer (recursively, for groups).
 *
 * @param layer - The animation layer.
 * @param t - Time in seconds.
 * @returns A canvas-render-shaped layer.
 */
function snapshotLayer(layer: AnimationLayer, t: number): SnapshotLayer {
  const out: SnapshotLayer = { ...layer.shape, kind: layer.kind }

  if (layer.transform) {
    Object.assign(out, applyTransform({}, layer.transform))
  }

  if (layer.tracks) {
    for (const [key, track] of Object.entries(layer.tracks)) {
      if (track.length === 0) continue
      const v = valueAtTime(track, t)
      if (v === undefined) continue
      if (key.startsWith('transform.')) {
        out[key.slice('transform.'.length)] = v
      } else {
        out[key] = v
      }
    }
  }

  if (layer.kind === 'group' && layer.children) {
    out.children = layer.children.map((child) => snapshotLayer(child, t))
  }

  return out
}

/**
 * Copy transform fields onto an output object, skipping defaults so the
 * canvas-render side can use its own defaults for missing values.
 *
 * @param out - Output object to mutate.
 * @param transform - Source transform.
 * @returns The mutated output object.
 */
function applyTransform(
  out: Record<string, unknown>,
  transform: NonNullable<AnimationLayer['transform']>,
): Record<string, unknown> {
  if (transform.x !== undefined) out['x'] = transform.x
  if (transform.y !== undefined) out['y'] = transform.y
  if (transform.rotation !== undefined) out['rotation'] = transform.rotation
  if (transform.scaleX !== undefined) out['scaleX'] = transform.scaleX
  if (transform.scaleY !== undefined) out['scaleY'] = transform.scaleY
  if (transform.opacity !== undefined) out['opacity'] = transform.opacity
  return out
}
