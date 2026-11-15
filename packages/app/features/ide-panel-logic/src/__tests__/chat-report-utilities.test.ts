/**
 * Tests for the `/report` (and `/bug`) command parsing, payload builder,
 * validation, and confirmation helpers.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

import { COMMANDS } from '../components/chat-commands.js'
import {
  buildReportPayload,
  collectClientInfo,
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

  it('attaches clientInfo when provided and non-empty', () => {
    const payload = buildReportPayload(baseForm, {
      appVersion: '1.0.0',
      theme: 'dark',
      viewport: '1280×720',
    })
    expect(payload.clientInfo).toEqual({
      appVersion: '1.0.0',
      theme: 'dark',
      viewport: '1280×720',
    })
  })

  it('omits clientInfo when not provided', () => {
    const payload = buildReportPayload(baseForm)
    expect('clientInfo' in payload).toBe(false)
  })

  it('omits clientInfo when an empty diagnostics object is passed', () => {
    const payload = buildReportPayload(baseForm, {})
    expect('clientInfo' in payload).toBe(false)
  })
})

describe('collectClientInfo', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('populates every field when navigator/window/screen are present', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
      platform: 'Linux x86_64',
      language: 'en-US',
    })
    vi.stubGlobal('window', {
      innerWidth: 1280,
      innerHeight: 720,
      screen: { width: 1920, height: 1080 },
      location: { href: 'https://app.molecule.dev/ide' },
    })

    expect(collectClientInfo({ appVersion: '1.2.3', theme: 'dark' })).toEqual({
      appVersion: '1.2.3',
      theme: 'dark',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
      platform: 'Linux x86_64',
      language: 'en-US',
      viewport: '1280×720',
      screen: '1920×1080',
      url: 'https://app.molecule.dev/ide',
    })
  })

  it('does not throw and returns only opts when window/navigator are absent', () => {
    vi.stubGlobal('navigator', undefined)
    vi.stubGlobal('window', undefined)

    expect(() => collectClientInfo()).not.toThrow()
    expect(collectClientInfo({ appVersion: '9.9.9' })).toEqual({ appVersion: '9.9.9' })
    expect(collectClientInfo()).toEqual({})
  })

  it('includes only the fields it can read in a partial environment', () => {
    vi.stubGlobal('navigator', { userAgent: 'UA-only' })
    vi.stubGlobal('window', { innerWidth: 800, innerHeight: 600 })

    const info = collectClientInfo({ theme: 'light' })
    expect(info).toEqual({
      theme: 'light',
      userAgent: 'UA-only',
      viewport: '800×600',
    })
    expect('platform' in info).toBe(false)
    expect('screen' in info).toBe(false)
    expect('url' in info).toBe(false)
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
