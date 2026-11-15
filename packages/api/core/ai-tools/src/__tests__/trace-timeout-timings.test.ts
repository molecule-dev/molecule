import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { failureTraceNote, parseTraceArtifacts, traceArtifactsScript } from '../trace-artifacts.js'

/** HAR clocks from a storefront setup. Each request has its own browser page and context. */
function request(start: number, wait: number, path = '/api/orders', context = '1') {
  return {
    context,
    snapshot: {
      _monotonicTime: start,
      _resourceType: 'fetch',
      pageref: `page@${context}`,
      time: wait + 10,
      timings: { send: 0, wait, receive: 10 },
      request: { method: 'POST', url: `https://shop.example${path}`, headers: [] },
      response: { status: 201 },
    },
  }
}

/** Exercise the emitted ZIP/HAR reader and public parser, not a handwritten summary. */
function read(
  options: {
    requests?: ReturnType<typeof request>[]
    timedOut?: boolean
    lastWaitStart?: number
    pageError?: boolean
  } = {},
) {
  const root = mkdtempSync(join(tmpdir(), 'trace-timeout-'))
  try {
    const dir = join(root, 'orders-chromium-retry1')
    mkdirSync(dir)
    const rows = options.requests ?? [request(2000, 8000)]
    const contexts = [...new Set(['1', ...rows.map((row) => row.context)])]
    const before = (id: string, start: number) => ({
      type: 'before',
      callId: id,
      class: 'Frame',
      method: 'waitForSelector',
      startTime: start,
      pageId: 'page@1',
      params: { selector: '#ready' },
      stack: [{ file: '/workspace/tests/orders.spec.ts', line: 20, column: 3 }],
    })
    const runner = [
      { type: 'context-options', origin: 'testRunner', monotonicTime: 1000, testTimeout: 15000 },
      {
        type: 'before',
        callId: 'test',
        startTime: 1000,
        class: 'Test',
        method: 'hook',
        params: {},
      },
      ...(options.timedOut === false
        ? []
        : [{ type: 'error', message: 'Test timeout of 15000ms exceeded.' }]),
    ]
    writeFileSync(join(dir, 'test.trace'), runner.map((row) => JSON.stringify(row)).join('\n'))
    for (const context of contexts) {
      const trace = [
        { type: 'context-options', origin: 'library', browserName: 'chromium' },
        ...(context === '1'
          ? [
              before('setup', 1200),
              { type: 'after', callId: 'setup', endTime: 15800 },
              before('last', options.lastWaitStart ?? 15900),
              ...(options.pageError
                ? [{ type: 'event', method: 'pageError', params: { message: 'render crashed' } }]
                : []),
            ]
          : []),
      ]
      writeFileSync(
        join(dir, `${context}-trace.trace`),
        trace.map((row) => JSON.stringify(row)).join('\n'),
      )
      writeFileSync(
        join(dir, `${context}-trace.network`),
        rows
          .filter((row) => row.context === context)
          .map((row) => JSON.stringify({ type: 'resource-snapshot', snapshot: row.snapshot }))
          .join('\n'),
      )
    }
    execFileSync(
      'zip',
      [
        '-q',
        'trace.zip',
        'test.trace',
        ...contexts.flatMap((context) => [`${context}-trace.trace`, `${context}-trace.network`]),
      ],
      { cwd: dir },
    )
    const script = join(root, 'read.cjs')
    writeFileSync(script, traceArtifactsScript())
    const stdout = execFileSync(process.execPath, [script, root], {
      encoding: 'utf8',
      timeout: 20000,
    })
    const items = parseTraceArtifacts(stdout)
    expect(items).toHaveLength(1)
    return { item: items[0]!, note: failureTraceNote(items, 'shop.example') }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

describe('a timed-out attempt’s own server response clocks', () => {
  it('reads a real storefront trace with slow POST setup and no app changes', () => {
    // Native Playwright 1.64.1: one button POSTs /api/orders to a local HTTP server which
    // answers after 1.5 s. Serial setup exhausts a 10 s test clock. No routes/selectors
    // from the benchmark are in this fixture. Its trace includes HAR, without screenshots.
    const root = mkdtempSync(join(tmpdir(), 'trace-storefront-'))
    try {
      copyFileSync(
        new URL('./fixtures/trace-storefront-setup-timeout.zip', import.meta.url),
        join(root, 'trace.zip'),
      )
      const script = join(root, 'read.cjs')
      writeFileSync(script, traceArtifactsScript())
      const items = parseTraceArtifacts(
        execFileSync(process.execPath, [script, root], { encoding: 'utf8', timeout: 20000 }),
      )
      expect(items).toHaveLength(1)
      expect(items[0]!.timeoutTiming?.responseWaitMs).toBeGreaterThan(5000)
      expect(items[0]!.timeoutTiming?.slowest[0]).toMatchObject({
        method: 'POST',
        path: '/api/orders',
        status: 201,
      })
      expect(failureTraceNote(items, 'the storefront')).toContain('waiting for server responses')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('explains slow storefront setup and tells the model to rerun without weakening the app', () => {
    const { item, note } = read()
    expect(item.timeoutTiming).toMatchObject({ budgetMs: 15000, responseWaitMs: 8000 })
    expect(note).toContain('8.00 s of its 15.00 s budget')
    expect(note).toContain('POST /api/orders')
    expect(note).toContain('8.00 s waiting for the response')
    expect(note).toContain('Re-run only the timed-out tests')
    expect(note).toContain('Do not remove a session hold or service worker')
    expect(note).not.toContain('the cause is in the page')
  })

  it('keeps slow setup requests that the ordinary six-request display would discard', () => {
    const requests = [
      request(2000, 8000, '/api/orders?token=private-value'),
      ...Array.from({ length: 30 }, (_, n) => request(10100 + n * 100, 50, `/api/orders/${n}`)),
    ]
    const { item, note } = read({ requests })
    expect(item.requests.some((row) => row.path.startsWith('/api/orders?'))).toBe(false)
    expect(item.timeoutTiming?.slowest[0]).toMatchObject({ path: '/api/orders', waitMs: 8000 })
    expect(note).toContain('POST /api/orders')
    expect(note).not.toContain('private-value')
  })

  it('unions overlapping response waits instead of summing parallel requests', () => {
    const { item, note } = read({
      requests: [request(2000, 5000), request(2000, 5000, '/api/invoices')],
    })
    expect(item.timeoutTiming).toBeUndefined()
    expect(note).not.toContain('Do not remove a session hold')
  })

  it('includes a separate setup context without borrowing another test’s requests', () => {
    const { item } = read({
      requests: [request(2000, 4000, '/api/customers', '2'), request(7000, 4000)],
    })
    expect(item.timeoutTiming).toMatchObject({ responseWaitMs: 8000 })
  })

  it('does not blame the server when a locator never appears and requests returned fast', () => {
    const { item, note } = read({ requests: [request(2000, 50)], lastWaitStart: 3000 })
    expect(item.timeoutTiming).toBeUndefined()
    expect(note).not.toContain('waiting for server responses')
    expect(note).not.toContain('Do not remove a session hold')
  })

  it('does not excuse a long final locator wait even beside earlier slow traffic', () => {
    const { item } = read({ lastWaitStart: 4000 })
    expect(item.timeoutTiming).toBeUndefined()
  })

  it('does not diagnose a passing retry from its slow responses', () => {
    const { item } = read({ timedOut: false })
    expect(item.timeoutTiming).toBeUndefined()
  })

  it('does not turn missing HAR timings into zero or a server explanation', () => {
    const slow = request(2000, 8000)
    slow.snapshot.timings.wait = -1
    expect(read({ requests: [slow] }).item.timeoutTiming).toBeUndefined()
  })

  it('does not excuse a request storm with its accumulated response waits', () => {
    const { item } = read({ requests: Array.from({ length: 25 }, () => request(2000, 8000)) })
    expect(item.repeated?.[0]?.count).toBe(25)
    expect(item.timeoutTiming).toBeUndefined()
  })

  it.each([
    null,
    {},
    { budgetMs: 15000, responseWaitMs: 8000, slowest: [] },
    {
      budgetMs: 15000,
      responseWaitMs: 20000,
      slowest: [{ method: 'POST', path: '/api/orders', status: 201, waitMs: 1000, totalMs: 1001 }],
    },
    {
      budgetMs: 15000,
      responseWaitMs: 8000,
      slowest: [{ method: 'POST', path: '/api/orders', status: 201, waitMs: 8000, totalMs: 40000 }],
    },
  ])('rejects damaged timeout timing evidence (%j)', (timeoutTiming) => {
    const parsed = parseTraceArtifacts(
      'TRACE ' + JSON.stringify({ spec: 'orders.spec.ts', line: 20, requests: [], timeoutTiming }),
    )
    expect(parsed[0]?.timeoutTiming).toBeUndefined()
  })

  it('keeps real browser errors and HTTP errors on the ordinary failure path', () => {
    expect(read({ pageError: true }).item.timeoutTiming).toBeUndefined()
    const bad = request(2000, 8000)
    bad.snapshot.response.status = 500
    expect(read({ requests: [bad] }).item.timeoutTiming).toBeUndefined()
  })
})
