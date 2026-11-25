/**
 * Serving a stored file back to the browser without letting it run as part of the app.
 *
 * @module
 */

import { pipeline } from 'node:stream/promises'

import { baseUploadType } from './errors.js'

/**
 * The response {@link sendUpload} writes: an Express response, or Node's own `ServerResponse`.
 */
export interface UploadResponse extends NodeJS.WritableStream {
  /** Sets a response header. */
  setHeader(name: string, value: string | number): unknown
}

/** How {@link sendUpload} serves a file. */
export interface SendUploadOptions {
  /**
   * The name the browser saves the file under: the stored `filename`. Only its first 200
   * characters are sent, and a character that cannot be encoded is replaced.
   */
  filename?: string
  /**
   * Show the file in the browser (an image in an `<img>`, a video, plain text) rather than
   * download it. Honoured only for a type in {@link INLINE_UPLOAD_TYPES} or an `audio/*` or
   * `video/*` type; any other file is still a download.
   */
  inline?: boolean
  /** The stored type (`file.mimetype`). Sent only for an inline file; a download is always `application/octet-stream`. */
  type?: string
  /** The file's size in bytes, sent as `Content-Length`. */
  size?: number
}

/** The types {@link sendUpload} shows in the browser when asked to: none of them can run code there. */
export const INLINE_UPLOAD_TYPES: ReadonlySet<string> = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
  'text/plain',
])

/**
 * Whether {@link sendUpload} shows a file of this type in the browser when asked to.
 *
 * @param type - The stored type.
 * @returns True for {@link INLINE_UPLOAD_TYPES} and `audio/*` or `video/*` types.
 */
export const isInlineUploadType = (type: string): boolean => {
  const base = baseUploadType(type)
  return INLINE_UPLOAD_TYPES.has(base) || /^(audio|video)\/[\w.+-]+$/.test(base)
}

/**
 * The most characters of a file's name that go into `Content-Disposition`. The bonds keep up to
 * 1023, and each one can take 12 characters once encoded: a 10 KB header is past what a reverse
 * proxy passes on, and the download then fails with a 502.
 */
const MAX_FILENAME_CHARS = 200

/**
 * The file's name for `Content-Disposition`: at most {@link MAX_FILENAME_CHARS} characters, and
 * well-formed. A lone UTF-16 surrogate (a client can send one, and the cut itself can leave one)
 * cannot be percent-encoded, so it becomes U+FFFD.
 *
 * @param filename - The stored name.
 * @returns The name to send.
 */
const headerFilename = (filename: string): string =>
  filename.slice(0, MAX_FILENAME_CHARS).toWellFormed()

/** `Content-Disposition`, with the name in ASCII and in UTF-8 (RFC 6266). */
const disposition = (kind: 'attachment' | 'inline', filename: string | undefined): string => {
  if (!filename) return kind
  const name = headerFilename(filename)
  const ascii = name.replace(/[^\x20-\x7e]|["\\%]/g, '_')
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`
}

/**
 * Sends a stored file (the stream `getProvider().getFile(id)` resolves) as the response. By default
 * it is a download the browser never opens: `application/octet-stream`, `Content-Disposition:
 * attachment`, `X-Content-Type-Options: nosniff` and a sandboxing `Content-Security-Policy`, so an
 * HTML or SVG file, or one whose declared type lied, cannot run on the app's origin. A route that
 * pipes the stream itself (`stream.pipe(res)`) sends no type, and the browser guesses one.
 *
 * It never fails on a file's name, whatever the client once sent: a name of any length or encoding
 * is sent in the header cut to 200 characters.
 *
 * Pass `{ inline: true, type: file.mimetype }` to show an image, audio, video or plain text file in
 * the page instead.
 *
 * @param res - The response.
 * @param stream - The stored file.
 * @param options - The file's name, and whether to show it inline.
 * @returns Resolves when the file is sent; rejects when reading it fails, after closing the response.
 */
export const sendUpload = async (
  res: UploadResponse,
  stream: NodeJS.ReadableStream,
  options: SendUploadOptions = {},
): Promise<void> => {
  const inline = options.inline === true && !!options.type && isInlineUploadType(options.type)
  res.setHeader(
    'Content-Type',
    inline ? baseUploadType(options.type ?? '') : 'application/octet-stream',
  )
  res.setHeader(
    'Content-Disposition',
    disposition(inline ? 'inline' : 'attachment', options.filename),
  )
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'")
  if (options.size !== undefined) res.setHeader('Content-Length', options.size)
  await pipeline(stream, res)
}
