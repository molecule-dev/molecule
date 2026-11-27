import { useEffect, useState } from 'react'

import { getLogger } from '@molecule/app-logger'

interface Cue {
  start: number
  end: number
  text: string
}

const TIMESTAMP = '(?:(\\d{2,}):)?([0-5]\\d):([0-5]\\d)\\.(\\d{3})'
const TIMING = new RegExp(`^${TIMESTAMP}[ \\t]+-->[ \\t]+${TIMESTAMP}(?:[ \\t].*)?$`)

/** Reads the timed text HTML's hidden track exposes as cue.text. */
function parseCues(file: string): Cue[] {
  const [header, ...blocks] = file
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n+$/, '')
    .split(/\n{2,}/)
  if (!/^WEBVTT(?:[ \t][^\n]*)?(?:\n|$)/.test(header)) return []

  const cues: Cue[] = []
  for (const block of blocks) {
    const lines = block.split('\n')
    if (/^NOTE(?:[ \t]|$)/.test(lines[0])) continue
    const timingLine = lines[0].includes('-->') ? 0 : 1
    const timing = TIMING.exec(lines[timingLine] ?? '')
    if (!timing) continue
    const start =
      (Number(timing[1] ?? 0) * 60 + Number(timing[2])) * 60 +
      Number(timing[3]) +
      Number(timing[4]) / 1000
    const end =
      (Number(timing[5] ?? 0) * 60 + Number(timing[6])) * 60 +
      Number(timing[7]) +
      Number(timing[8]) / 1000
    if (Number.isFinite(end) && start < end) {
      cues.push({ start, end, text: lines.slice(timingLine + 1).join('\n') })
    }
  }
  return cues.sort((a, b) => a.start - b.start || b.end - a.end)
}

/**
 * Loads the captions track on native and returns the cues active at the current time.
 *
 * @param url - URL of a WebVTT track.
 * @param current - Elapsed playback time in seconds.
 * @returns Cue text, or an empty string if no cue is active.
 */
export function useCaption(url: string | undefined, current: number): string {
  const [track, setTrack] = useState<{ url: string; cues: Cue[] } | null>(null)

  useEffect(() => {
    if (!url) return
    const request = new AbortController()
    void fetch(url, { signal: request.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Caption request failed with status ${response.status}.`)
        return response.text()
      })
      .then((text) => {
        if (!request.signal.aborted) setTrack({ url, cues: parseCues(text) })
      })
      .catch((error: unknown) => {
        if (!request.signal.aborted) getLogger().warn('Could not load audio captions.', { error })
      })
    return () => request.abort()
  }, [url])

  return track && track.url === url
    ? track.cues
        .filter(({ start, end }) => start <= current && current < end)
        .map(({ text }) => text)
        .join('\n')
    : ''
}
