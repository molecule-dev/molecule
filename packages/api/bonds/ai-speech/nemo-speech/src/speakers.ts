/**
 * Speaker-label normalization: the server numbers speakers with integers; the
 * core promises string labels like `"speaker_0"`.
 *
 * @module
 */

import type { TranscriptionSegment, TranscriptionWord } from '@molecule/api-ai-speech'

/** Most speakers Nemotron-3-Diarization (the Sortformer diarizer) can tell apart. */
export const MAX_DIARIZATION_SPEAKERS = 8

/**
 * Normalizes a raw speaker value to a `speaker_<n>` label.
 *
 * @param raw - An integer, a numeric string, or a `speaker_<n>`-style string.
 * @returns The normalized label, or `undefined` when no speaker was given.
 */
export function speakerLabel(raw: unknown): string | undefined {
  if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 0) return `speaker_${raw}`
  if (typeof raw === 'string' && raw.trim() !== '') {
    const match = /^(?:speaker[_\s-]?)?(\d+)$/i.exec(raw.trim())
    return match ? `speaker_${Number(match[1])}` : raw.trim()
  }
  return undefined
}

/**
 * Groups consecutive same-speaker words into segments ("who said what").
 *
 * @param words - Words carrying `speaker` labels.
 * @returns One segment per speaker run, or `undefined` when no word has a speaker.
 */
export function segmentsFromWords(words: TranscriptionWord[]): TranscriptionSegment[] | undefined {
  if (!words.some((word) => word.speaker !== undefined)) return undefined
  const segments: TranscriptionSegment[] = []
  for (const word of words) {
    const last = segments[segments.length - 1]
    if (last && last.speaker === word.speaker) {
      last.end = word.end
      last.text = `${last.text} ${word.word.trim()}`
    } else {
      segments.push({
        id: segments.length,
        start: word.start,
        end: word.end,
        text: word.word.trim(),
        ...(word.speaker !== undefined ? { speaker: word.speaker } : {}),
      })
    }
  }
  return segments
}
