/**
 * The preview console log the molecule.dev IDE reads its agent's browser logs from.
 *
 * Every page the dev server sends carries the e2e client, which forwards the page's console
 * output and uncaught errors to the hub. When `MOL_PREVIEW_BROWSER_LOG` names a file (the platform
 * sets it in its sandboxes), the hub appends those events to it and keeps its newest 512 KB. With
 * the variable unset, as for an app run anywhere else, nothing is written.
 *
 * @module
 */

import { appendFileSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import process from 'node:process'

/** The environment variable that names the log file. */
export const PREVIEW_BROWSER_LOG_ENV = 'MOL_PREVIEW_BROWSER_LOG'

/** The file keeps at most this many bytes, its newest tail. */
const MAX_LOG_BYTES = 512 * 1024

/** One entry's text is cut to this many characters. */
const MAX_ENTRY_CHARS = 2000

/** A page event as the e2e client sends it to the hub. */
export type PreviewPageEvent = Record<string, unknown>

/** Appends one page event to the preview console log. */
export type PreviewLogWriter = (event: PreviewPageEvent) => void

const text = (value: unknown): string => (typeof value === 'string' ? value : '')

/**
 * Format a page event as one log entry.
 *
 * @param event - The event: `{ event: 'console', type, text }` or `{ event: 'pageerror', message,
 *   stack?, url?, lineNumber?, columnNumber? }`.
 * @param now - The entry's time, in epoch milliseconds.
 * @returns The entry, newline-terminated, or `null` for an event the log does not record.
 */
export const formatPreviewLogEntry = (
  event: PreviewPageEvent,
  now: number = Date.now(),
): string | null => {
  const stamp = new Date(now).toISOString()
  if (event.event === 'console') {
    const level = text(event.type) === 'warning' ? 'warn' : text(event.type) || 'log'
    return `[${stamp}] [${level}] ${text(event.text).slice(0, MAX_ENTRY_CHARS)}\n`
  }
  if (event.event === 'pageerror') {
    const url = text(event.url)
    const where = url ? ` (${url}:${String(event.lineNumber ?? 0)})` : ''
    const stack = text(event.stack)
    const body = `Uncaught: ${text(event.message) || 'Error'}${where}${stack ? `\n${stack}` : ''}`
    return `[${stamp}] [error] ${body.slice(0, MAX_ENTRY_CHARS)}\n`
  }
  return null
}

/**
 * The hub's writer for the preview console log.
 *
 * @param logFile - The file to append to; defaults to `process.env.MOL_PREVIEW_BROWSER_LOG`.
 * @returns A writer, or `null` when no file is named.
 */
export const createPreviewLogWriter = (
  logFile: string | undefined = process.env[PREVIEW_BROWSER_LOG_ENV],
): PreviewLogWriter | null => {
  if (!logFile) return null
  let size = 0
  try {
    size = statSync(logFile).size
  } catch (_error) {
    // No file yet: the first append creates it.
  }
  return (event) => {
    const entry = formatPreviewLogEntry(event)
    if (entry === null) return
    try {
      appendFileSync(logFile, entry)
      size += Buffer.byteLength(entry)
      // Keep only the tail once the file outgrows the cap (a render loop can spam).
      if (size > MAX_LOG_BYTES) {
        const tail = readFileSync(logFile).subarray(-MAX_LOG_BYTES)
        writeFileSync(logFile, tail)
        size = tail.length
      }
    } catch (_error) {
      // An unwritable log loses this entry only; the page and the hub carry on.
    }
  }
}
