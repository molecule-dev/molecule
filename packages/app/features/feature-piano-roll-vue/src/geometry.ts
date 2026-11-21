/**
 * Pure geometry helpers and constants of the Vue piano roll — the same values
 * and the same math as `@molecule/app-feature-piano-roll-react`, so the helper
 * exports every framework must reproduce by value are identical.
 *
 * @module
 */

import type { PianoRollSnap } from './types.js'

/** Pixel width of the leading piano-keys column. */
export const PIANO_KEYS_WIDTH_PX = 56

/** Minimum note duration in beats — notes can't be resized below this. */
export const MIN_NOTE_DURATION_BEATS = 1 / 32

/** Pointer-distance threshold (px) before a press becomes a drag. */
export const DRAG_DISTANCE_THRESHOLD_PX = 3

/** Default MIDI velocity assigned to freshly-painted notes. */
export const DEFAULT_NOTE_VELOCITY = 96

/** Pitch class indices (0..11) that correspond to black keys on a piano. */
const BLACK_KEY_PITCH_CLASSES = new Set<number>([1, 3, 6, 8, 10])

/** Note names for the 12-tone chromatic scale, anchored at C. */
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

/**
 * Convert a snap setting to its size in beats.
 *
 * @param snap - Snap resolution.
 * @returns Snap step size in beats.
 */
export function snapToBeats(snap: PianoRollSnap): number {
  switch (snap) {
    case '1/16':
      return 0.25
    case '1/8':
      return 0.5
    case '1/4':
      return 1
    case '1/2':
      return 2
    case '1':
      return 4
    default:
      return 0.25
  }
}

/**
 * Snap a beat value to the nearest multiple of the snap step (rounding down).
 *
 * @param beat - Raw beat value (may be fractional).
 * @param snap - Snap resolution.
 * @returns The floored snapped beat (>= 0).
 */
export function snapBeat(beat: number, snap: PianoRollSnap): number {
  if (!Number.isFinite(beat)) return 0
  const step = snapToBeats(snap)
  if (step <= 0) return Math.max(0, beat)
  const snapped = Math.floor(beat / step) * step
  return snapped < 0 ? 0 : snapped
}

/**
 * Round a beat value to the nearest snap step.
 *
 * @param beat - Raw beat value (may be fractional).
 * @param snap - Snap resolution.
 * @returns The rounded snapped beat (>= 0).
 */
export function snapBeatRound(beat: number, snap: PianoRollSnap): number {
  if (!Number.isFinite(beat)) return 0
  const step = snapToBeats(snap)
  if (step <= 0) return Math.max(0, beat)
  const snapped = Math.round(beat / step) * step
  return snapped < 0 ? 0 : snapped
}

/**
 * Convert a pixel offset into beats given the horizontal scale.
 *
 * @param pixels - Offset in pixels.
 * @param pixelsPerBeat - Horizontal scale.
 * @returns Beats represented by the offset (may be negative).
 */
export function pixelsToBeats(pixels: number, pixelsPerBeat: number): number {
  const safeScale = pixelsPerBeat > 0 ? pixelsPerBeat : 1
  return pixels / safeScale
}

/**
 * Convert a beat value into pixels given the horizontal scale.
 *
 * @param beats - Beat value.
 * @param pixelsPerBeat - Horizontal scale.
 * @returns Pixel offset.
 */
export function beatsToPixels(beats: number, pixelsPerBeat: number): number {
  const safeScale = pixelsPerBeat > 0 ? pixelsPerBeat : 1
  return beats * safeScale
}

/**
 * Convert a vertical pixel offset into a MIDI pitch. Higher pitches sit at the
 * top, so `y = 0` maps to `highestPitch`.
 *
 * @param y - Vertical pixel offset from the top of the grid.
 * @param noteHeight - Row height per pitch.
 * @param highestPitch - Top-most pitch in the visible range.
 * @param lowestPitch - Bottom-most pitch in the visible range.
 * @returns A MIDI pitch clamped into `[lowestPitch, highestPitch]`.
 */
export function yToPitch(
  y: number,
  noteHeight: number,
  highestPitch: number,
  lowestPitch: number,
): number {
  const safeHeight = noteHeight > 0 ? noteHeight : 1
  const row = Math.floor(y / safeHeight)
  const pitch = highestPitch - row
  if (pitch > highestPitch) return highestPitch
  if (pitch < lowestPitch) return lowestPitch
  return pitch
}

/**
 * Convert a MIDI pitch into the vertical pixel offset of its row.
 *
 * @param pitch - MIDI pitch number.
 * @param noteHeight - Row height per pitch.
 * @param highestPitch - Top-most pitch in the visible range.
 * @returns Vertical pixel offset for the pitch's row.
 */
export function pitchToY(pitch: number, noteHeight: number, highestPitch: number): number {
  return (highestPitch - pitch) * noteHeight
}

/**
 * Determine whether a MIDI pitch corresponds to a black key on a piano
 * keyboard.
 *
 * @param pitch - MIDI pitch number.
 * @returns `true` if the pitch is a black key.
 */
export function isBlackKey(pitch: number): boolean {
  const pc = ((pitch % 12) + 12) % 12
  return BLACK_KEY_PITCH_CLASSES.has(pc)
}

/**
 * Format a MIDI pitch as a scientific-pitch-notation label.
 *
 * @param pitch - MIDI pitch number.
 * @returns Formatted label.
 */
export function pitchLabel(pitch: number): string {
  const pc = ((pitch % 12) + 12) % 12
  // Standard MIDI octave numbering: C4 = 60. (C-1 = 0.)
  const octave = Math.floor(pitch / 12) - 1
  return `${NOTE_NAMES[pc]}${octave}`
}
