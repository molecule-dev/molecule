/**
 * Tests for the streaming-error guard.
 *
 * `/images/create` and `/images/{name}/push` answer `200 OK` and then stream
 * newline-delimited progress. A denied credential or an unknown manifest arrives
 * as an `error` object in that stream, long after the status line — so a caller
 * that trusts the status believes a template is everywhere when it is nowhere.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { assertNoStreamError } from '../request.js'

describe('assertNoStreamError', () => {
  it('throws on an error reported inside a successful response', () => {
    expect(() =>
      assertNoStreamError(
        '{"status":"Preparing"}\n{"errorDetail":{"message":"denied: access forbidden"},"error":"denied"}\n',
        'push of example:1',
      ),
    ).toThrow(/denied: access forbidden/)
  })

  it('prefers the detailed message over the summary', () => {
    expect(() =>
      assertNoStreamError('{"error":"x","errorDetail":{"message":"manifest unknown"}}', 'pull'),
    ).toThrow(/manifest unknown/)
  })

  it('accepts a stream of ordinary progress lines', () => {
    expect(() =>
      assertNoStreamError(
        '{"status":"Preparing"}\n{"status":"Pushing","progressDetail":{"current":1}}\n{"status":"Pushed"}\n',
        'push',
      ),
    ).not.toThrow()
  })

  it('ignores a truncated line rather than failing on it', () => {
    // A chunked stream can end mid-object; the error object, if any, is a
    // complete line of its own.
    expect(() => assertNoStreamError('{"status":"Pushing"}\n{"stat', 'push')).not.toThrow()
  })

  it('leaves single-document responses alone', () => {
    // Those endpoints already reported failure through the status code.
    expect(() => assertNoStreamError({ Id: 'sha256:abc' }, 'commit')).not.toThrow()
  })

  it('does not treat an empty error field as a failure', () => {
    expect(() => assertNoStreamError('{"status":"Pushed","error":""}', 'push')).not.toThrow()
  })
})
