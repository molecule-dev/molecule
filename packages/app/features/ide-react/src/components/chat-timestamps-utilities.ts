/**
 * Chat timestamp visibility + formatting — the pure half of the `/timestamps`
 * feature (the hook lives in `hooks/useChatTimestampsVisible.ts`, the rendered
 * label in `ChatTimestamp.tsx`).
 *
 * Visibility is a PER-DEVICE, per-user display preference, stored in
 * localStorage like `/sounds` and `/mic` — never project settings, so a viewer
 * can toggle it and it never changes what a teammate sees. A host's own
 * settings UI toggles the same value through {@link setChatTimestampsVisible},
 * and every mounted chat follows via {@link CHAT_TIMESTAMPS_EVENT} (same tab)
 * and the `storage` event (other tabs).
 *
 * @module
 */

/** localStorage key holding `'true'` / `'false'`. Absent = the default (hidden). */
export const CHAT_TIMESTAMPS_STORAGE_KEY = 'mol_chat_show_timestamps'

/** Window event dispatched (same tab) whenever the preference changes. */
export const CHAT_TIMESTAMPS_EVENT = 'mol:chat-timestamps-changed'

/**
 * Parses the stored preference. Only an explicit `'true'` shows every timestamp,
 * so a missing or unreadable value keeps the default (off — only the user's own
 * message headers and critical events carry a time; see {@link planChatTimestamps}).
 *
 * @param raw - The raw localStorage value.
 * @returns Whether timestamps are visible on every item.
 */
export function parseChatTimestampsVisible(raw: string | null): boolean {
  return raw === 'true'
}

/**
 * Reads this device's preference.
 *
 * @returns Whether chat timestamps are visible on every item (default `false`).
 */
export function getChatTimestampsVisible(): boolean {
  try {
    return parseChatTimestampsVisible(localStorage.getItem(CHAT_TIMESTAMPS_STORAGE_KEY))
  } catch (_error) {
    // localStorage unavailable (private mode, SSR) — fall back to the default.
    return false
  }
}

/**
 * Resolves the active i18n locale, falling back to the browser's when no i18n
 * provider is bonded.
 *
 * @param getLocale - The i18n accessor (throws when no provider is bonded).
 * @returns A BCP 47 locale.
 */
export function resolveChatLocale(getLocale: () => string): string {
  try {
    return getLocale()
  } catch (_error) {
    // No i18n provider bonded — format in the browser's own locale instead.
    return typeof navigator !== 'undefined' ? navigator.language : 'en'
  }
}

/** A timeline item that can carry a timestamp, in render order. */
export interface ChatTimestampSlot {
  /** The timeline item's id. */
  id: string
  /** Epoch milliseconds of the item. */
  timestamp: number
  /**
   * Shown even with timestamps turned off — the user's own message headers (the
   * time already fits in the header row) and critical events (a failure, a
   * blocked connection, a limit that stopped work).
   */
  alwaysShown: boolean
}

/**
 * Decides which timeline items actually render their timestamp. An item is a
 * candidate when timestamps are on, or when its slot is {@link ChatTimestampSlot.alwaysShown}.
 * A candidate renders only when its label differs from the last RENDERED label,
 * so a run of items that would all read "3 minutes ago" shows it once, at the top
 * of the run. Re-run on every minute tick: labels move with the clock, so the
 * grouping does too.
 *
 * @param slots - One entry per rendered timeline item, in order (`null` = no timestamp).
 * @param options - The visibility preference, the current time, and the locale.
 * @param options.visible - Whether timestamps are turned on for every item.
 * @param options.now - Epoch milliseconds to measure from.
 * @param options.locale - BCP 47 locale for the labels.
 * @returns The ids of the items whose timestamp renders.
 */
export function planChatTimestamps(
  slots: readonly (ChatTimestampSlot | null)[],
  options: { visible: boolean; now: number; locale: string },
): Set<string> {
  const shown = new Set<string>()
  let lastLabel: string | undefined
  for (const slot of slots) {
    if (!slot || !(options.visible || slot.alwaysShown)) continue
    const label = formatChatRelativeTime(
      slot.timestamp,
      Math.max(options.now, slot.timestamp),
      options.locale,
    )
    if (label === lastLabel) continue
    shown.add(slot.id)
    lastLabel = label
  }
  return shown
}

/**
 * Persists this device's preference and notifies every mounted chat in this tab.
 *
 * @param visible - Whether chat timestamps should be shown.
 */
export function setChatTimestampsVisible(visible: boolean): void {
  try {
    localStorage.setItem(CHAT_TIMESTAMPS_STORAGE_KEY, String(visible))
  } catch (_error) {
    // localStorage unavailable — the event below still applies it for this session.
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHAT_TIMESTAMPS_EVENT, { detail: visible }))
  }
}

/** Parsed `/timestamps` invocation: toggle, explicit on/off, or an unrecognized argument. */
export type TimestampsCommand = { action: 'toggle' | 'on' | 'off' } | { action: 'invalid' }

/**
 * Parses `/timestamps [on | off]`. `show`/`hide` are accepted as synonyms.
 *
 * @param input - The trimmed composer text.
 * @returns The parsed command, or `null` when the text is not `/timestamps`.
 */
export function parseTimestampsCommand(input: string): TimestampsCommand | null {
  const match = input.trim().match(/^\/timestamps(?:\s+(.*))?$/i)
  if (!match) return null
  const arg = match[1]?.trim().toLowerCase() ?? ''
  if (arg === '') return { action: 'toggle' }
  if (arg === 'on' || arg === 'show') return { action: 'on' }
  if (arg === 'off' || arg === 'hide') return { action: 'off' }
  return { action: 'invalid' }
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * Short, localized relative time for a chat item: "now", "5 minutes ago",
 * "2 hours ago", "3 days ago" — then the calendar date once it is a week old,
 * where a day count stops being useful. Localized by `Intl`, so it needs no
 * translation keys.
 *
 * @param ms - Epoch milliseconds of the item.
 * @param now - Epoch milliseconds to measure from.
 * @param locale - BCP 47 locale (e.g. `'en'`, `'fr'`).
 * @returns The formatted label.
 */
export function formatChatRelativeTime(ms: number, now: number, locale: string): string {
  const elapsed = Math.max(0, now - ms)
  if (elapsed >= 7 * DAY) {
    const sameYear = new Date(ms).getFullYear() === new Date(now).getFullYear()
    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      ...(sameYear ? {} : { year: 'numeric' }),
    }).format(ms)
  }
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  if (elapsed < MINUTE) return rtf.format(0, 'second')
  if (elapsed < HOUR) return rtf.format(-Math.floor(elapsed / MINUTE), 'minute')
  if (elapsed < DAY) return rtf.format(-Math.floor(elapsed / HOUR), 'hour')
  return rtf.format(-Math.floor(elapsed / DAY), 'day')
}

/**
 * Exact, localized date and time for a chat item's tooltip and `<time dateTime>`
 * companion (e.g. "Sep 13, 2026, 2:05 PM").
 *
 * @param ms - Epoch milliseconds of the item.
 * @param locale - BCP 47 locale.
 * @returns The formatted date and time.
 */
export function formatChatFullTime(ms: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(ms)
}
