/**
 * `sendUpload`: a stored file goes back as a download the browser does not open, unless it is a
 * type that cannot run there and the route asked to show it.
 */
import { PassThrough, Readable } from 'node:stream'

import { describe, expect, it } from 'vitest'

import { sendUpload } from '../send.js'

/** A response that records its headers and the bytes written to it. */
function response(): PassThrough & {
  headers: Record<string, string | number>
  body: () => string
} {
  const chunks: Buffer[] = []
  const res = new PassThrough() as PassThrough & {
    headers: Record<string, string | number>
    body: () => string
    setHeader: (name: string, value: string | number) => void
  }
  res.headers = {}
  res.setHeader = (name, value) => {
    res.headers[name.toLowerCase()] = value
  }
  res.on('data', (chunk: Buffer) => chunks.push(chunk))
  res.body = () => Buffer.concat(chunks).toString()
  return res
}

describe('sendUpload', () => {
  it('sends a download the browser does not open, whatever the stored type', async () => {
    const res = response()
    await sendUpload(res, Readable.from(['<script>alert(1)</script>']), {
      filename: 'page.html',
      type: 'text/html',
    })
    expect(res.headers).toEqual({
      'content-type': 'application/octet-stream',
      'content-disposition': `attachment; filename="page.html"; filename*=UTF-8''page.html`,
      'x-content-type-options': 'nosniff',
      'content-security-policy': "sandbox; default-src 'none'",
    })
    expect(res.body()).toBe('<script>alert(1)</script>')
  })

  it('shows an image, audio, video or plain text file inline when asked to', async () => {
    for (const type of ['image/png', 'text/plain', 'video/mp4', 'audio/mpeg']) {
      const res = response()
      await sendUpload(res, Readable.from(['x']), { inline: true, type, size: 1 })
      expect(res.headers['content-type'], type).toBe(type)
      expect(res.headers['content-disposition'], type).toBe('inline')
      expect(res.headers['x-content-type-options']).toBe('nosniff')
      expect(res.headers['content-length']).toBe(1)
    }
  })

  // Counterexample: asking to show a type that runs, or one with no type, still downloads.
  it('still downloads a type that could run when asked to show it', async () => {
    for (const type of [
      'text/html',
      'image/svg+xml',
      'application/pdf',
      'Text/HTML; charset=utf-8',
      undefined,
    ]) {
      const res = response()
      await sendUpload(res, Readable.from(['x']), { inline: true, type })
      expect(res.headers['content-type'], String(type)).toBe('application/octet-stream')
      expect(res.headers['content-disposition'], String(type)).toBe('attachment')
    }
  })

  it('names a file outside ASCII in both forms, and never breaks the header with a quote', async () => {
    const res = response()
    await sendUpload(res, Readable.from(['x']), { filename: 'résumé "final".pdf' })
    expect(res.headers['content-disposition']).toBe(
      `attachment; filename="r_sum_ _final_.pdf"; filename*=UTF-8''r%C3%A9sum%C3%A9%20%22final%22.pdf`,
    )
  })

  // Upload security review (2026-11-25), finding 7: a name holding a lone UTF-16 surrogate cannot be
  // percent-encoded, so every download of that file answered 500.
  it('sends a file whose name holds a lone surrogate, with the surrogate replaced (OLD MUSTFAIL)', async () => {
    const res = response()
    await sendUpload(res, Readable.from(['x']), { filename: 'bad\uD800name.txt' })
    expect(res.headers['content-disposition']).toBe(
      `attachment; filename="bad_name.txt"; filename*=UTF-8''bad%EF%BF%BDname.txt`,
    )
    expect(res.body()).toBe('x')
  })

  it('sends the name inline too when it holds a lone surrogate', async () => {
    const res = response()
    await sendUpload(res, Readable.from(['x']), {
      inline: true,
      type: 'image/png',
      filename: 'a\uDC00.png',
    })
    expect(res.headers['content-disposition']).toBe(
      `inline; filename="a_.png"; filename*=UTF-8''a%EF%BF%BD.png`,
    )
  })

  // Upload security review (2026-11-25), finding 7: the bonds keep up to 1023 characters of a name,
  // and the longest made a 10 KB header, past a proxy's response-header buffer.
  it('caps the name in the header at 200 characters (OLD MUSTFAIL)', async () => {
    const res = response()
    await sendUpload(res, Readable.from(['x']), { filename: '字'.repeat(1023) })
    expect(res.headers['content-disposition']).toBe(
      `attachment; filename="${'_'.repeat(200)}"; filename*=UTF-8''${'%E5%AD%97'.repeat(200)}`,
    )
  })

  it('caps an ASCII name too, and one the cap cuts inside a surrogate pair', async () => {
    const res = response()
    await sendUpload(res, Readable.from(['x']), { filename: `${'a'.repeat(1022)}.txt` })
    expect(res.headers['content-disposition']).toBe(
      `attachment; filename="${'a'.repeat(200)}"; filename*=UTF-8''${'a'.repeat(200)}`,
    )

    const cut = response()
    // 200 code units: `a`, 99 whole emoji (198), then the high half of the 100th.
    await sendUpload(cut, Readable.from(['x']), { filename: `a${'😀'.repeat(400)}` })
    expect(cut.headers['content-disposition']).toBe(
      `attachment; filename="a${'__'.repeat(99)}_"; filename*=UTF-8''a${'%F0%9F%98%80'.repeat(99)}%EF%BF%BD`,
    )
  })

  it('keeps a name of exactly 200 characters whole', async () => {
    const res = response()
    await sendUpload(res, Readable.from(['x']), { filename: 'b'.repeat(196) + '.txt' })
    expect(res.headers['content-disposition']).toBe(
      `attachment; filename="${'b'.repeat(196)}.txt"; filename*=UTF-8''${'b'.repeat(196)}.txt`,
    )
  })

  it('rejects when reading the file fails', async () => {
    const res = response()
    const failing = new Readable({
      read() {
        this.destroy(new Error('disk gone'))
      },
    })
    await expect(sendUpload(res, failing)).rejects.toThrow('disk gone')
  })
})
