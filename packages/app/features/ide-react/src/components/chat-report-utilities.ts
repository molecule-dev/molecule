/**
 * Pure helpers backing the `/report` (and `/bug` alias) command and the header
 * bug-report button.
 *
 * The report modal collects a title, description, optional reproduction steps,
 * and an "include recent chat" toggle, then POSTs to
 * `POST /projects/:id/report { title, description, steps?, includeChat }`. The
 * backend files a GitHub issue when a report repo + token are configured (else
 * records a DB row) and always persists a DB row tagged with projectId+userId,
 * returning `{ ok, url?, id }`.
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
 * Builds the `POST /projects/:id/report` body from the form state, trimming all
 * text fields and omitting `steps` entirely when it is blank.
 *
 * @param form - The report form state.
 * @returns The normalized report payload.
 */
export function buildReportPayload(form: ReportFormState): ReportPayload {
  const steps = form.steps.trim()
  const payload: ReportPayload = {
    title: form.title.trim(),
    description: form.description.trim(),
    includeChat: form.includeChat,
  }
  if (steps) payload.steps = steps
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
