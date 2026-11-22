/**
 * Framework-neutral formatting helpers for the IDE chat panel: relative
 * timestamps, the AI-allowance reset countdown, file-attachment encoding, byte
 * sizes, thinking-block durations, the closeable panel-overlay headings, and
 * the live streaming-activity label. Shared verbatim by every framework's chat
 * panel (React's `ChatPanel` re-exports them through `@molecule/app-ide-react`).
 *
 * @module
 */

import type { ChatMessage } from '@molecule/app-ai-chat'
import type { TranslateFunction } from '@molecule/app-i18n'

import { readFilePaths, str } from './tool-call-utilities.js'

/**
 * Formats an ISO timestamp as a relative time string (e.g. "5m ago", "2h ago").
 * @param iso - The ISO 8601 timestamp string.
 * @returns A human-readable relative time string.
 */
export function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

/**
 * Format an AI-allowance window reset (epoch ms) as a short countdown phrase for
 * the /cost used-up line ("refreshes in about 3 hours"). Under an hour reads "in
 * under an hour"; ≥ 6h out on a later local calendar day reads "tomorrow"; a day
 * or more out reads "in about N days".
 *
 * The day scale is what makes this usable on a BILLING-PERIOD allowance, which
 * can be weeks out — an hours-only formatter capped at "tomorrow", so a window
 * ending in 18 days told the user it came back in the morning.
 *
 * @param t - The translation function from `useTranslation()`.
 * @param resetAt - Epoch ms of the window end (always in the future from the API).
 * @returns A localized human countdown phrase.
 */
export function allowanceResetCountdown(t: TranslateFunction, resetAt: number): string {
  const diffMs = resetAt - Date.now()
  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return t('ide.chat.resetSoon', undefined, { defaultValue: 'soon' })
  }
  const hours = diffMs / 3_600_000
  if (hours < 1) {
    return t('ide.chat.resetUnderHour', undefined, { defaultValue: 'in under an hour' })
  }
  if (hours >= 24) {
    const days = Math.round(hours / 24)
    if (days <= 1) {
      return t('ide.chat.resetTomorrow', undefined, { defaultValue: 'tomorrow' })
    }
    return t('ide.chat.resetInDays', { days }, { defaultValue: 'in about {{days}} days' })
  }
  const rounded = Math.round(hours)
  const laterLocalDay = new Date(resetAt).toDateString() !== new Date().toDateString()
  if (laterLocalDay && rounded >= 6) {
    return t('ide.chat.resetTomorrow', undefined, { defaultValue: 'tomorrow' })
  }
  return t(
    'ide.chat.resetInHours',
    { hours: rounded },
    { defaultValue: 'in about {{hours}} hours' },
  )
}

/**
 * Reads a File as base64 (without data-URL prefix).
 * @param file - The file to encode.
 * @returns Base64-encoded string.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Formats a byte count as a human-readable size string.
 * @param bytes - The size in bytes.
 * @returns Formatted string (e.g., "1.2MB").
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1048576) return `${Math.round(bytes / 1024)}KB`
  return `${(bytes / 1048576).toFixed(1)}MB`
}

/**
 * Format a duration in milliseconds as a human-readable string.
 * @param t - The translation function from `useTranslation()`.
 * @param ms - Duration in milliseconds.
 * @returns Formatted string like "Thought for 5 seconds" or "Thought for 2 minutes".
 */
export function formatThinkingDuration(t: TranslateFunction, ms: number): string {
  if (ms < 1000) return t('ide.chat.thoughtBriefly', undefined, { defaultValue: 'Thought briefly' })
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) {
    // Singular/plural split (the codebase's pluralization convention, e.g.
    // typeErrorCount/typeErrorsCount): each key is a clean i18n template so the
    // bond value matches the inline default verbatim and interpolates {{count}}
    // — never a JS `${}` literal, which a bond value would silently override.
    return seconds === 1
      ? t('ide.chat.thoughtForSecond', { count: seconds }, { defaultValue: 'Thought for 1 second' })
      : t(
          'ide.chat.thoughtForSeconds',
          { count: seconds },
          {
            defaultValue: 'Thought for {{count}} seconds',
          },
        )
  }
  const minutes = Math.round(seconds / 60)
  return minutes === 1
    ? t('ide.chat.thoughtForMinute', { count: minutes }, { defaultValue: 'Thought for 1 minute' })
    : t(
        'ide.chat.thoughtForMinutes',
        { count: minutes },
        {
          defaultValue: 'Thought for {{count}} minutes',
        },
      )
}

/** The heading of the closeable panel overlay (/skills, /scripts, /settings) above the composer. */
export function panelOverlayHeading(
  t: TranslateFunction,
  overlay: 'skills' | 'scripts' | 'settings' | 'tests',
): string {
  return overlay === 'skills'
    ? t('ide.chat.skills.heading', undefined, { defaultValue: 'Skills' })
    : overlay === 'scripts'
      ? t('ide.chat.scripts.heading', undefined, { defaultValue: 'Scripts' })
      : overlay === 'tests'
        ? t('ide.tests.heading', undefined, { defaultValue: 'Tests' })
        : t('ide.chat.settings.heading', undefined, { defaultValue: 'Settings' })
}

/**
 * Derive a real current-activity label for the streaming indicator from the
 * in-flight assistant message's latest block, so the user sees what's actually
 * happening (e.g. "Reading App.tsx", "Writing the plan") instead of a generic
 * spinner. Returns undefined when there's nothing specific to show (the
 * indicator then falls back to its rotating generic messages).
 *
 * @param t - The translation function from `useTranslation()`.
 * @param msg - The streaming assistant message.
 * @param msg.blocks - The message's ordered blocks (a tool call is a `tool_call` block naming its id).
 * @param msg.toolCalls - The message's tool calls, looked up by block id.
 * @returns A short activity label, or undefined.
 */
export function streamingActivityLabel(
  t: TranslateFunction,
  msg: {
    blocks?: ChatMessage['blocks']
    toolCalls?: Array<Pick<NonNullable<ChatMessage['toolCalls']>[number], 'id' | 'name' | 'input'>>
  },
): string | undefined {
  const blocks = msg.blocks
  if (!blocks || blocks.length === 0) return undefined
  const last = blocks[blocks.length - 1]
  if (last.type === 'thinking')
    return t('ide.chat.activity.thinking', undefined, { defaultValue: 'Synthesizing' })
  if (last.type !== 'tool_call') return undefined
  const tc = msg.toolCalls?.find((c) => c.id === last.id)
  if (!tc) return undefined
  // `tc.input` is model-authored, so each field is read through `str()` rather
  // than trusted from the cast: a field the schema declares `string` can arrive
  // as a number or object (the shape that blanked production on 2026-08-14 —
  // see `str()`'s docs), and `base()` calls `.split` on it, which throws a
  // TypeError from inside this render — taking the whole IDE down, not one row.
  const inp = (tc.input ?? {}) as {
    path?: unknown
    query?: unknown
    command?: unknown
    url?: unknown
  }
  const base = (p?: string): string => (p ? (p.split('/').filter(Boolean).pop() ?? p) : '')
  const clip = (s?: string, n = 48): string => (s && s.length > n ? `${s.slice(0, n)}…` : (s ?? ''))
  switch (tc.name) {
    case 'read_file': {
      const files = readFilePaths(tc.input)
      const more = files.length > 1 ? ` +${files.length - 1}` : ''
      return `${t('ide.chat.activity.reading', undefined, { defaultValue: 'Reading' })} ${base(files[0])}${more}`
    }
    case 'write_file':
      return `${t('ide.chat.activity.writing', undefined, { defaultValue: 'Writing' })} ${base(str(inp.path))}`
    case 'edit_file':
      return `${t('ide.chat.activity.editing', undefined, { defaultValue: 'Editing' })} ${base(str(inp.path))}`
    case 'search_files':
      return `${t('ide.chat.activity.searching', undefined, { defaultValue: 'Searching' })} ${clip(str(inp.query))}`
    case 'list_files':
    case 'find_files':
      return t('ide.chat.activity.exploring', undefined, { defaultValue: 'Exploring files' })
    case 'exec_command':
      return `${t('ide.chat.activity.running', undefined, { defaultValue: 'Running' })} ${clip(str(inp.command))}`
    case 'save_plan':
      return t('ide.chat.activity.writingPlan', undefined, { defaultValue: 'Writing the plan' })
    case 'sandbox_fetch':
      return `${t('ide.chat.activity.fetching', undefined, { defaultValue: 'Fetching' })} ${clip(str(inp.url))}`
    case 'set_mode':
      return t('ide.chat.activity.switching', undefined, { defaultValue: 'Switching mode' })
    default:
      return undefined
  }
}
