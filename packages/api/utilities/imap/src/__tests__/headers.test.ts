/**
 * Unit tests for the lightweight RFC 822 header parser.
 */

import { describe, expect, it } from 'vitest'

import { parseHeaders } from '../headers.js'

describe('parseHeaders', () => {
  it('returns {} for undefined', () => {
    expect(parseHeaders(undefined)).toEqual({})
  })

  it('lower-cases header names', () => {
    const headers = parseHeaders('Subject: Hi\r\nFrom: a@b.com')
    expect(headers).toMatchObject({ subject: 'Hi', from: 'a@b.com' })
  })

  it('unfolds continuation lines', () => {
    const raw = 'Subject: This is\r\n a folded\r\n\tsubject\r\n'
    expect(parseHeaders(raw)).toEqual({ subject: 'This is a folded subject' })
  })

  it('aggregates duplicate headers into an array', () => {
    const raw = 'Received: hop1\r\nReceived: hop2\r\nReceived: hop3'
    expect(parseHeaders(raw)).toEqual({ received: ['hop1', 'hop2', 'hop3'] })
  })

  it('decodes a Uint8Array as UTF-8', () => {
    const raw = new TextEncoder().encode('Subject: café\r\n')
    expect(parseHeaders(raw)).toEqual({ subject: 'café' })
  })

  it('ignores lines that are not valid headers', () => {
    const raw = 'Subject: hi\r\nnot-a-real-line\r\nFrom: a@b'
    expect(parseHeaders(raw)).toMatchObject({ subject: 'hi', from: 'a@b' })
  })
})
