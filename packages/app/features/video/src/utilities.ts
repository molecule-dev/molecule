/**
 * Video player utilities for molecule.dev.
 *
 * @module
 */

/**
 * Format a duration in seconds as a human-readable time string.
 * Returns 'H:MM:SS' for durations over an hour, or 'M:SS' otherwise.
 * @param seconds - The duration in seconds.
 * @returns A formatted time string (e.g., '1:23:45' or '3:07').
 */
export const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || seconds < 0) {
    return '0:00'
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

/**
 * Parse a time string (H:MM:SS or M:SS or S) into total seconds.
 * @param time - The time string to parse.
 * @returns The total duration in seconds.
 */
export const parseTime = (time: string): number => {
  const parts = time.split(':').map(Number)

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }

  return parts[0] || 0
}

/**
 * Infer the MIME type of a video from its URL based on the file extension.
 * Supports MP4, WebM, Ogg, HLS (.m3u8), and DASH (.mpd).
 * @param url - The video URL.
 * @returns The MIME type string, or undefined if the format is unrecognized.
 */
export const getVideoType = (url: string): string | undefined => {
  const extension = url.split('?')[0].split('.').pop()?.toLowerCase()

  const typeMap: Record<string, string> = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogg: 'video/ogg',
    ogv: 'video/ogg',
    m3u8: 'application/x-mpegURL',
    mpd: 'application/dash+xml',
  }

  return extension ? typeMap[extension] : undefined
}
