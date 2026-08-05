/**
 * The Docker Engine API transports every capability module is given.
 *
 * Each capability lives in its own module and receives its transport as a
 * parameter rather than reaching for `http` itself. That is not decoration: a
 * module that opens its own socket can only be tested by intercepting HTTP, and
 * the things worth testing here — a push that reports failure inside a 200
 * response body, an eviction that must refuse when it cannot see what is in use —
 * are decisions about response CONTENT, not about wire mechanics. Injecting the
 * request function makes each of those a plain function call in a test.
 *
 * Three transports rather than one, because the Engine API genuinely has three
 * shapes: JSON in/JSON out, a tar stream out, and a tar stream in. Forcing the
 * streaming pair through the JSON transport would mean buffering a whole project
 * tree in memory, which is the thing bulk transfer exists to avoid.
 *
 * @module
 */

/**
 * Issues a Docker Engine API request and returns the parsed JSON response (or
 * the raw text when the body is not JSON — several endpoints stream JSON lines).
 *
 * Implementations MUST reject on a 4xx/5xx status. Several Engine endpoints also
 * report failure INSIDE a 200 body; see {@link assertNoStreamError}.
 *
 * @param path - API path below the version prefix, e.g. `/containers/create`.
 * @param method - HTTP method; defaults to `GET`.
 * @param body - Optional JSON request body.
 * @param timeoutMs - Request timeout.
 * @param headers - Extra request headers (e.g. `X-Registry-Auth`).
 * @returns The parsed JSON response, or raw text for non-JSON bodies.
 */
export type DockerRequest = (
  path: string,
  method?: string,
  body?: unknown,
  timeoutMs?: number,
  headers?: Record<string, string>,
) => Promise<unknown>

/**
 * Issues a Docker Engine API GET and hands back the response body as a byte
 * stream, unbuffered.
 *
 * @param path - API path below the version prefix.
 * @param timeoutMs - Request timeout.
 * @returns The response body as an async byte stream.
 */
export type DockerDownload = (
  path: string,
  timeoutMs?: number,
) => Promise<AsyncIterable<Uint8Array>>

/**
 * Issues a Docker Engine API PUT whose request body is a byte stream,
 * unbuffered and with backpressure.
 *
 * @param path - API path below the version prefix.
 * @param body - The request body as an async byte stream.
 * @param timeoutMs - Request timeout.
 */
export type DockerUpload = (
  path: string,
  body: AsyncIterable<Uint8Array>,
  timeoutMs?: number,
) => Promise<void>

/**
 * Fail on an error reported inside an otherwise-successful streaming response.
 *
 * `/images/create` (pull), `/images/{name}/push` and friends answer `200 OK` and
 * then stream newline-delimited JSON progress objects. A failure — no such
 * manifest, denied credentials, a broken layer — arrives as an `error` field in
 * that stream, LONG after the status line. Treating the 200 as success is how a
 * fleet ends up believing every host has a template that only one host has.
 *
 * @param response - The value returned by a {@link DockerRequest} for a streaming endpoint.
 * @param operation - Short description used in the thrown message.
 * @throws {Error} When the stream carried an error object.
 */
export function assertNoStreamError(response: unknown, operation: string): void {
  if (typeof response !== 'string') {
    // A parsed object comes from a single-JSON-document endpoint; those already
    // surfaced failure through the status code.
    return
  }
  for (const line of response.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('{')) continue
    let parsed: { error?: unknown; errorDetail?: { message?: unknown } }
    try {
      parsed = JSON.parse(trimmed) as typeof parsed
    } catch (_error) {
      // A partial line from a chunked stream is not an error report; the error
      // object, if there is one, is a complete line of its own.
      continue
    }
    const message = parsed.errorDetail?.message ?? parsed.error
    if (message !== undefined && message !== null && message !== '') {
      throw new Error(`Docker ${operation} failed: ${String(message)}`)
    }
  }
}
