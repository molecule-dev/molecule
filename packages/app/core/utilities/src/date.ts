/**
 * Date and time utilities for molecule.dev frontend applications.
 *
 * @module
 */

/** One minute in milliseconds. */
const MINUTE = 60000
/** One hour in milliseconds. */
const HOUR = 3600000
/** One day in milliseconds. */
const DAY = 86400000
/** One week in milliseconds. */
const WEEK = 604800000
/** One year in milliseconds (365.25 days). */
const YEAR = 31557600000

/**
 * Formats the elapsed time since a given timestamp as a human-readable
 * relative string (e.g. `"3 hours ago"` or `"3h ago"` when abbreviated).
 *
 * @param time - The timestamp as a Unix ms number, ISO date string, or `Date` object.
 * @param abbreviate - When `true`, uses short suffixes (`m`, `h`, `d`, `w`, `y`) instead of full words.
 * @returns A relative time string like `"just now"`, `"5 minutes ago"`, or `"2d ago"`.
 */
export const timeAgo = (time: number | string | Date, abbreviate = false): string => {
  let timestamp: number

  if (typeof time === 'number') {
    timestamp = time
  } else if (time instanceof Date) {
    timestamp = time.getTime()
  } else {
    try {
      timestamp = new Date(time).getTime()
    } catch {
      return 'unknown'
    }
  }

  const diff = Math.max(0, Date.now() - timestamp)

  if (diff < MINUTE) {
    return 'just now'
  } else if (diff < HOUR) {
    const count = Math.round(diff / MINUTE)
    return `${count}${abbreviate ? 'm' : ` minute${count === 1 ? '' : 's'}`} ago`
  } else if (diff < DAY) {
    const count = Math.round(diff / HOUR)
    return `${count}${abbreviate ? 'h' : ` hour${count === 1 ? '' : 's'}`} ago`
  } else if (diff < WEEK) {
    const count = Math.round(diff / DAY)
    return `${count}${abbreviate ? 'd' : ` day${count === 1 ? '' : 's'}`} ago`
  } else if (diff < YEAR) {
    const count = Math.round(diff / WEEK)
    return `${count}${abbreviate ? 'w' : ` week${count === 1 ? '' : 's'}`} ago`
  } else {
    const count = Math.round(diff / YEAR)
    return `${count}${abbreviate ? 'y' : ` year${count === 1 ? '' : 's'}`} ago`
  }
}
