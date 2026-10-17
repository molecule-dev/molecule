import { describe, expect, it } from 'vitest'

import { classifyRunFailure } from '../failure-kind.js'

/**
 * X0 xr-molecule-flash-m110's own Hurl block, verbatim: the 20 s connection timeout on a
 * freshly-deployed URL that every note read as an assertion (the run's other 12 files passed).
 */
const M110_CONNECTION = `error: HTTP connection
   --> /workspace/fixtures/realworld/specs/api/hurl/errors_auth.hurl:54:6
    |
 54 | POST {{host}}/api/users
    |      ^^^^^^^^^^^^^^^^^^ (28) Operation timed out after 20002 milliseconds with 0 bytes received
    |`

/** A Hurl status assertion from the same suite: the app answered, with the wrong code. */
const HURL_STATUS = `error: Assert status code
   --> hurl/errors_auth.hurl:62:6
    |
 62 | HTTP 409
    |      ^^^ actual value is <422>`

/** A Hurl body assertion: the app answered, and the response's content failed the assertion. */
const HURL_ASSERT = `error: Assert failure
   --> hurl/errors_auth.hurl:113:0
    |
113 | jsonpath "$.errors.credentials[0]" == "invalid"
    |   actual:   none
    |   expected: string <invalid>`

describe('classifyRunFailure', () => {
  it('reads a Hurl connection timeout as the transport, not an assertion (xr-molecule-flash-m110)', () => {
    expect(classifyRunFailure(M110_CONNECTION)).toEqual({
      kind: 'connection',
      connection: 'timeout',
      seconds: 20,
      at: '/workspace/fixtures/realworld/specs/api/hurl/errors_auth.hurl:54',
    })
  })

  it('reads the response layers: a status assertion and a body assertion are the app’s', () => {
    expect(classifyRunFailure(HURL_STATUS)).toEqual({
      kind: 'status',
      at: 'hurl/errors_auth.hurl:62',
    })
    expect(classifyRunFailure(HURL_ASSERT)).toEqual({
      kind: 'assertion',
      at: 'hurl/errors_auth.hurl:113',
    })
  })

  it('reads the browser’s own connection failures, and their spec location', () => {
    expect(
      classifyRunFailure(
        '  1) [chromium] › e2e/articles.spec.ts:12:3 › Articles › lists them\n' +
          '    Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:4000/api\n' +
          '    Call log:\n      - navigating to "http://localhost:4000/api", waiting until "load"',
      ),
    ).toEqual({ kind: 'connection', connection: 'refused', at: 'e2e/articles.spec.ts:12' })
    expect(classifyRunFailure('Error: getaddrinfo ENOTFOUND api.invalid')).toMatchObject({
      kind: 'connection',
      connection: 'dns',
    })
    expect(classifyRunFailure('net::ERR_CERT_AUTHORITY_INVALID at https://x.test')).toMatchObject({
      kind: 'connection',
      connection: 'tls',
    })
  })

  it('never reads an app assertion as a connection error', () => {
    // The negative that keeps a real failure from being answered with "just re-run it": a
    // timeout over the page’s own locator is the suite’s budget, not the transport.
    expect(
      classifyRunFailure(
        '    Timeout 5000ms exceeded.\n    Call log:\n' +
          '      - waiting for locator(\'input[name="title"]\')',
      ),
    ).toBeNull()
    expect(
      classifyRunFailure(
        '    Error: expect(received).toBeVisible()\n\n    Expected: visible\n    Received: hidden',
      ),
    ).toEqual({ kind: 'assertion' })
  })

  it('answers null for text with no failure in it', () => {
    expect(classifyRunFailure('')).toBeNull()
    expect(classifyRunFailure('Success hurl/tags.hurl (4 request(s) in 98 ms)')).toBeNull()
  })
})
