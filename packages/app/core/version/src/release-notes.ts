/**
 * One-line "what's new" summaries for the update banner.
 *
 * Every build writes `release-notes.json` (see `@molecule/app-version/build`)
 * listing its recent user-visible changes with their commit times, and stamps
 * its own commit time into the page as `<meta name="molecule-build-time">`.
 * When an update is waiting, the RUNNING page still carries the old stamp, so
 * the changes newer than it are exactly what the update brings.
 *
 * @module
 */

import { getLocale, t } from '@molecule/app-i18n'

import type { ReleaseNotes, UpdateSummary } from './types.js'
import { BUILD_TIME_META_NAME, RELEASE_NOTES_FILENAME } from './utilities.js'

/** A specific description longer than this falls back to counts. */
const MAX_SPECIFIC_LENGTH = 80

/** The compact line's limit for a specific description (about a phone's width). */
const MAX_COMPACT_SPECIFIC_LENGTH = 40

/**
 * Reads the running build's commit time from its `<meta>` stamp.
 *
 * @returns The ISO time, or `undefined` when the page carries no stamp.
 */
export const getRunningBuildTime = (): string | undefined => {
  if (typeof document === 'undefined') return undefined
  const content = document
    .querySelector(`meta[name="${BUILD_TIME_META_NAME}"]`)
    ?.getAttribute('content')
  return content || undefined
}

/**
 * Summarizes the changes newer than `since` in one short line: the change's own
 * description when there is exactly one (and it has one), otherwise counts —
 * "3 new features, 2 bugs fixed, and performance improvements", or with
 * `compact` "3 features, 2 fixes, faster" for narrow screens.
 *
 * @param notes - The new build's release notes.
 * @param since - Commit time of the running build (ISO 8601).
 * @param options - Formatting options.
 * @param options.compact - Use the short forms (and a shorter limit for a specific description).
 * @returns The summary, or `null` when nothing user-visible changed or `since`
 *   is unknown.
 */
export const summarizeReleaseNotes = (
  notes: ReleaseNotes,
  since?: string,
  options: { compact?: boolean } = {},
): string | null => {
  const sinceMs = since ? Date.parse(since) : NaN
  if (Number.isNaN(sinceMs)) return null
  const compact = options.compact === true

  const changes = notes.entries.filter((entry) => Date.parse(entry.time) > sinceMs)
  const features = changes.filter((entry) => entry.type === 'feat').length
  const fixes = changes.filter((entry) => entry.type === 'fix').length
  const perf = changes.filter((entry) => entry.type === 'perf').length
  const notable = features + fixes + perf

  if (notable === 0) {
    return changes.length > 0
      ? t('version.summary.minor', undefined, { defaultValue: 'Minor improvements' })
      : null
  }

  if (notable === 1) {
    const text = changes.find((entry) => entry.type !== 'other')?.text
    if (text && text.length <= (compact ? MAX_COMPACT_SPECIFIC_LENGTH : MAX_SPECIFIC_LENGTH)) {
      return text
    }
  }

  const parts: string[] = []
  if (features > 0) {
    parts.push(
      compact
        ? t('version.summary.featuresShort', undefined, {
            count: features,
            defaultValue: features === 1 ? '{{count}} feature' : '{{count}} features',
          })
        : t('version.summary.features', undefined, {
            count: features,
            defaultValue: features === 1 ? '{{count}} new feature' : '{{count}} new features',
          }),
    )
  }
  if (fixes > 0) {
    parts.push(
      compact
        ? t('version.summary.fixesShort', undefined, {
            count: fixes,
            defaultValue: fixes === 1 ? '{{count}} fix' : '{{count}} fixes',
          })
        : t('version.summary.fixes', undefined, {
            count: fixes,
            defaultValue: fixes === 1 ? '{{count}} bug fixed' : '{{count}} bugs fixed',
          }),
    )
  }
  if (perf > 0) {
    parts.push(
      compact
        ? t('version.summary.performanceShort', undefined, { defaultValue: 'faster' })
        : t('version.summary.performance', undefined, {
            defaultValue: 'performance improvements',
          }),
    )
  }
  return formatList(parts, compact)
}

/**
 * Joins summary parts the way the current locale lists things ("a, b, and c"
 * in English, "a, b et c" in French; the compact line drops English's "and"),
 * capitalized as a line of its own ("Performance improvements"). Conjunction
 * style, because the unit style joins with a bare space in several locales
 * (Russian, Japanese, Chinese, Turkish).
 *
 * @param parts - The parts to join.
 * @param compact - Use the locale's narrow list style.
 * @returns The joined line.
 */
const formatList = (parts: string[], compact: boolean): string => {
  let line: string
  try {
    line = new Intl.ListFormat(getLocale(), {
      type: 'conjunction',
      style: compact ? 'narrow' : 'long',
    }).format(parts)
  } catch (_error) {
    // No i18n provider, or a locale code Intl rejects — plain commas still read fine.
    line = parts.join(', ')
  }
  return line.charAt(0).toLocaleUpperCase() + line.slice(1)
}

/**
 * Fetches the deployed `release-notes.json`. Bypasses every cache (including a
 * service worker's precache) so it reads the NEW build's file.
 *
 * @param url - Where the file is served (default `/release-notes.json`).
 * @returns The notes, or `null` when the file is missing or malformed.
 */
export const fetchReleaseNotes = async (
  url = `/${RELEASE_NOTES_FILENAME}`,
): Promise<ReleaseNotes | null> => {
  try {
    const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, {
      cache: 'no-store',
    })
    if (!response.ok) return null
    const notes = (await response.json()) as ReleaseNotes
    return Array.isArray(notes?.entries) ? notes : null
  } catch (_error) {
    // Offline, or the host serves something else at that path — no summary.
    return null
  }
}

/**
 * What the waiting update brings, for the update banner: the full line, and a
 * compact one to show when the full line does not fit.
 *
 * @param url - Where `release-notes.json` is served (default `/release-notes.json`).
 * @returns Both lines, or `null` when there is nothing to say.
 */
export const getUpdateSummary = async (url?: string): Promise<UpdateSummary | null> => {
  const since = getRunningBuildTime()
  if (!since) return null
  const notes = await fetchReleaseNotes(url)
  if (!notes) return null
  const text = summarizeReleaseNotes(notes, since)
  const compact = summarizeReleaseNotes(notes, since, { compact: true })
  return text && compact ? { text, compact } : null
}
