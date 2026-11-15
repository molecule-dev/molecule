/**
 * Pure helpers backing the `/report` (and `/bug` alias) command and the header
 * bug-report button.
 *
 * The report modal collects a title, description, optional reproduction steps,
 * and an "include recent chat" toggle, then POSTs to
 * `POST /projects/:id/report { title, description, steps?, includeChat, clientInfo? }`.
 * The backend files a GitHub issue when a report repo + token are configured
 * (else records a DB row) and always persists a DB row tagged with
 * projectId+userId, returning `{ ok, url?, id }`.
 *
 * The payload also carries an optional `clientInfo` block of client-side
 * diagnostics — app version, browser/OS (user agent + platform), language,
 * viewport + screen size, theme, and the current URL — collected by
 * {@link collectClientInfo}. Every field is read defensively (each guarded for
 * SSR / missing globals) so the report attaches whatever it can without ever
 * throwing, giving triage real context without the user having to type it.
 *
 * These helpers parse the command, build the exact POST payload (omitting empty
 * optional fields), validate the form, and produce a confirmation message. They
 * are deterministic and side-effect free so they can be unit tested without
 * rendering or a real backend. The confirmation/link rendering uses these values
 * with `t()` in the component — the only translatable strings here are the
 * confirmation defaults, kept i18n-ready by the caller.
 *
 * @module
 */

/** The report modal's form state. */
export interface ReportFormState {
  /** Short summary / issue title. */
  title: string
  /** Detailed description of the problem or request. */
  description: string
  /** Optional reproduction steps (free text). */
  steps: string
  /** Whether to attach the recent conversation to the report. */
  includeChat: boolean
}

/**
 * Client-side diagnostics attached to a report so triage can see the running
 * environment without asking the user. Every field is optional — only what
 * could be read in the current environment is present (see
 * {@link collectClientInfo}).
 */
export interface ClientInfo {
  /** The running build version. */
  appVersion?: string
  /** `navigator.userAgent` (browser + OS). */
  userAgent?: string
  /** `navigator.platform`. */
  platform?: string
  /** `navigator.language`. */
  language?: string
  /** Inner viewport size, `${innerWidth}×${innerHeight}`. */
  viewport?: string
  /** Physical screen size, `${screen.width}×${screen.height}`. */
  screen?: string
  /** Active theme — `'light'` or `'dark'`. */
  theme?: string
  /** The current page URL (`window.location.href`). */
  url?: string
}

/** The `POST /projects/:id/report` request body. */
export interface ReportPayload {
  /** Short summary / issue title. */
  title: string
  /** Detailed description. */
  description: string
  /** Reproduction steps — omitted entirely when blank. */
  steps?: string
  /** Whether the backend should attach the recent conversation. */
  includeChat: boolean
  /** Client diagnostics — omitted entirely when none could be collected. */
  clientInfo?: ClientInfo
}

/** The `POST /projects/:id/report` response. */
export interface ReportResult {
  /** Whether the report was recorded. */
  ok: boolean
  /** Link to the created issue, when one was filed. */
  url?: string
  /** The persisted DB row id. */
  id?: string
}

/** An empty report form (the modal's initial state). */
export const EMPTY_REPORT_FORM: ReportFormState = {
  title: '',
  description: '',
  steps: '',
  includeChat: true,
}

/**
 * Parses a `/report [title]` or `/bug [title]` command. Returns the (possibly
 * empty) trimmed title used to seed the modal when the input is one of those
 * commands, else `null`.
 *
 * @param input - The raw chat input.
 * @returns `{ title }` when it's a `/report` or `/bug` command, else `null`.
 */
export function parseReportCommand(input: string): { title: string } | null {
  const match = input.trim().match(/^\/(?:report|bug)(?:\s+(.*))?$/i)
  if (!match) return null
  return { title: (match[1] ?? '').trim() }
}

/**
 * Collects client-side diagnostics for a report. Reads `navigator`
 * (userAgent/platform/language), `window` (inner viewport size, screen size,
 * location href), plus the caller-supplied app version and theme. Every access
 * is guarded (`typeof window/navigator !== 'undefined'` and per-property
 * presence) so it is SSR-safe and never throws — it returns only the fields it
 * could actually read, so the result may be partial or (in a headless
 * environment) empty.
 *
 * @param opts - Caller-supplied context.
 * @param opts.appVersion - The running build version, if known.
 * @param opts.theme - The active theme (`'light'` | `'dark'`), if known.
 * @returns The populated subset of {@link ClientInfo}.
 */
export function collectClientInfo(opts: { appVersion?: string; theme?: string } = {}): ClientInfo {
  const info: ClientInfo = {}
  if (opts.appVersion) info.appVersion = opts.appVersion
  if (opts.theme) info.theme = opts.theme

  if (typeof navigator !== 'undefined') {
    if (navigator.userAgent) info.userAgent = navigator.userAgent
    if (navigator.platform) info.platform = navigator.platform
    if (navigator.language) info.language = navigator.language
  }

  if (typeof window !== 'undefined') {
    if (typeof window.innerWidth === 'number' && typeof window.innerHeight === 'number') {
      info.viewport = `${window.innerWidth}×${window.innerHeight}`
    }
    if (window.screen) {
      info.screen = `${window.screen.width}×${window.screen.height}`
    }
    if (window.location?.href) {
      info.url = window.location.href
    }
  }

  return info
}

/**
 * Builds the `POST /projects/:id/report` body from the form state, trimming all
 * text fields and omitting `steps` entirely when it is blank. When `clientInfo`
 * is supplied and non-empty, it is attached; an `undefined` or empty diagnostics
 * object is omitted from the payload.
 *
 * @param form - The report form state.
 * @param clientInfo - Optional client diagnostics from {@link collectClientInfo}.
 * @returns The normalized report payload.
 */
export function buildReportPayload(form: ReportFormState, clientInfo?: ClientInfo): ReportPayload {
  const steps = form.steps.trim()
  const payload: ReportPayload = {
    title: form.title.trim(),
    description: form.description.trim(),
    includeChat: form.includeChat,
  }
  if (steps) payload.steps = steps
  if (clientInfo && Object.keys(clientInfo).length > 0) payload.clientInfo = clientInfo
  return payload
}

/**
 * Whether the report form has the minimum required fields: a non-empty title
 * and a non-empty description.
 *
 * @param form - The report form state.
 * @returns `true` when the form can be submitted.
 */
export function isReportFormValid(form: ReportFormState): boolean {
  return form.title.trim().length > 0 && form.description.trim().length > 0
}

/**
 * Builds the confirmation message shown after a report is submitted. Returns the
 * English defaults; the component passes these through `t()` at render. The
 * success `defaultValue` may contain the `{{productName}}` interpolation token,
 * which the caller fills in from the host's product identity (neutral default:
 * "the IDE"). When the result is not `ok`, returns the failure message.
 *
 * @param result - The `POST /projects/:id/report` response.
 * @returns `{ key, defaultValue }` for the confirmation/failure message.
 */
export function formatReportConfirmation(result: ReportResult): {
  key: string
  defaultValue: string
} {
  if (!result.ok) {
    return {
      key: 'ide.chat.report.failed',
      defaultValue: 'Could not submit your report. Please try again.',
    }
  }
  if (result.url) {
    return {
      key: 'ide.chat.report.submittedWithLink',
      defaultValue: 'Thanks! Your report was submitted — track it on the linked issue.',
    }
  }
  return {
    key: 'ide.chat.report.submitted',
    defaultValue: "Thanks! Your report was submitted to {{productName}}'s team.",
  }
}
