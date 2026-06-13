/**
 * Tests for the `/report` (and `/bug`) command parsing, payload builder,
 * validation, and confirmation helpers.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { COMMANDS } from '../components/chat-commands.js'
import {
  buildReportPayload,
  EMPTY_REPORT_FORM,
  formatReportConfirmation,
  isReportFormValid,
  parseReportCommand,
  type ReportFormState,
} from '../components/chat-report-utilities.js'

const baseForm: ReportFormState = {
  title: 'Build fails',
  description: 'The sandbox boot times out',
  steps: '1. open project\n2. wait',
  includeChat: true,
}

describe('parseReportCommand', () => {
  it('parses /report and /bug with an empty title', () => {
    expect(parseReportCommand('/report')).toEqual({ title: '' })
    expect(parseReportCommand('  /bug  ')).toEqual({ title: '' })
  })

  it('captures the trimmed seed title', () => {
    expect(parseReportCommand('/report Build fails on boot')).toEqual({
      title: 'Build fails on boot',
    })
    expect(parseReportCommand('/BUG  white screen ')).toEqual({ title: 'white screen' })
  })

  it('returns null for non-report/bug input', () => {
    expect(parseReportCommand('/reports')).toBeNull()
    expect(parseReportCommand('/buggy')).toBeNull()
    expect(parseReportCommand('report it')).toBeNull()
  })
})

describe('buildReportPayload', () => {
  it('trims fields and includes steps when present', () => {
    expect(
      buildReportPayload({
        title: '  Build fails  ',
        description: '  times out  ',
        steps: '  1. open  ',
        includeChat: true,
      }),
    ).toEqual({
      title: 'Build fails',
      description: 'times out',
      steps: '1. open',
      includeChat: true,
    })
  })

  it('omits steps entirely when blank', () => {
    const payload = buildReportPayload({
      title: 'X',
      description: 'Y',
      steps: '   ',
      includeChat: false,
    })
    expect(payload).toEqual({ title: 'X', description: 'Y', includeChat: false })
    expect('steps' in payload).toBe(false)
  })

  it('passes the includeChat flag through verbatim', () => {
    expect(buildReportPayload({ ...baseForm, includeChat: false }).includeChat).toBe(false)
    expect(buildReportPayload({ ...baseForm, includeChat: true }).includeChat).toBe(true)
  })
})

describe('isReportFormValid', () => {
  it('requires a non-empty title and description', () => {
    expect(isReportFormValid(baseForm)).toBe(true)
    expect(isReportFormValid({ ...baseForm, title: '   ' })).toBe(false)
    expect(isReportFormValid({ ...baseForm, description: '' })).toBe(false)
  })

  it('treats the empty form as invalid', () => {
    expect(isReportFormValid(EMPTY_REPORT_FORM)).toBe(false)
  })
})

describe('formatReportConfirmation', () => {
  it('returns the link variant when a url is present', () => {
    expect(formatReportConfirmation({ ok: true, url: 'https://gh/issues/1', id: 'r1' })).toEqual({
      key: 'ide.chat.report.submittedWithLink',
      defaultValue: 'Thanks! Your report was submitted — track it on the linked issue.',
    })
  })

  it('returns the plain submitted variant when only an id is present', () => {
    expect(formatReportConfirmation({ ok: true, id: 'r1' }).key).toBe('ide.chat.report.submitted')
  })

  it('returns the failure variant when not ok', () => {
    expect(formatReportConfirmation({ ok: false }).key).toBe('ide.chat.report.failed')
  })
})

describe('command registry wiring', () => {
  it('registers /report and /bug under the support category', () => {
    const report = COMMANDS.find((c) => c.id === 'report')
    const bug = COMMANDS.find((c) => c.id === 'bug')
    expect(report).toMatchObject({ label: '/report', category: 'support' })
    expect(bug).toMatchObject({ label: '/bug', category: 'support' })
  })
})
