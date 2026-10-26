/**
 * The in-process uptime provider.
 *
 * A probe is a plain Node http/https request with a WHOLE-probe deadline,
 * manual redirects (every hop re-resolved and re-verified), a 1 MB body-read
 * cap and the SHARED verdict rules (`deriveProbeStatus`). The dial goes to
 * the address DNS VERIFIED as public unicast — never to the hostname a
 * second time — so DNS rebinding has nothing to switch to (the render
 * machine's egress guard, ported into the core this bond builds on).
 *
 * @module
 */

import type { IncomingMessage } from 'node:http'
import http from 'node:http'
import https from 'node:https'
import type { PeerCertificate, TLSSocket } from 'node:tls'

import type {
  UptimeMethod,
  UptimeProbeResult,
  UptimeProbeSpec,
  UptimeProvider,
  UptimeTlsInfo,
} from '@molecule/api-uptime'
import {
  deriveProbeStatus,
  resolvePublicAddress,
  UPTIME_LIMITS,
  validateProbeSpec,
} from '@molecule/api-uptime'

import type { UptimeFetchConfig } from './types.js'

/** Headers of the final hop the result echoes back, when present. */
const ECHOED_HEADERS = new Set(['content-type', 'server', 'content-length', 'location'])

/** Redirect statuses followed (up to {@link UPTIME_LIMITS.maxRedirects}). */
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])

/** Host header with the port, unless it is the scheme's default. */
function hostHeaderFor(u: URL): string {
  if (!u.port) return u.hostname
  if (
    (u.protocol === 'https:' && u.port === '443') ||
    (u.protocol === 'http:' && u.port === '80')
  ) {
    return u.hostname
  }
  return `${u.hostname}:${u.port}`
}

/** Collects the TLS facts of an https final hop. */
function tlsInfo(res: IncomingMessage, now: number): UptimeTlsInfo | undefined {
  const socket = res.socket as TLSSocket | null
  if (!socket || typeof socket.getPeerCertificate !== 'function') return undefined
  let cert: PeerCertificate
  try {
    cert = socket.getPeerCertificate()
  } catch (_error) {
    // Intentional: a socket past teardown answers no certificate — the probe
    // simply carries no tls info.
    return undefined
  }
  if (!cert || !cert.valid_to) return undefined
  const validTo = new Date(cert.valid_to)
  if (Number.isNaN(validTo.getTime())) return undefined
  // A multi-value RDN arrives as an array — take the first name.
  const oneName = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? (v[0] !== undefined ? String(v[0]) : undefined) : v
  const subject = oneName(cert.subject?.CN)
  const issuer = oneName(cert.issuer?.O)
  return {
    ...(subject !== undefined ? { subject } : {}),
    ...(issuer !== undefined ? { issuer } : {}),
    validTo: validTo.toISOString(),
    daysRemaining: Math.floor((validTo.getTime() - now) / 86_400_000),
  }
}

/**
 * Reads the response body up to {@link UPTIME_LIMITS.maxBodyBytes}, then
 * settles. Never executes or parses anything — the body exists to size the
 * response and to match `expectText`.
 *
 * @param res - The response to read.
 * @returns The bytes read, and the body as text (utf8, lossy past the cap).
 */
function readBody(res: IncomingMessage): Promise<{ bytes: number; text: string }> {
  return new Promise((resolve, reject) => {
    /** Chunks as Buffers — the byte count is the response's real size. */
    const chunks: Buffer[] = []
    let total = 0
    let done = false
    const finish = (): void => {
      if (done) return
      done = true
      const buf = Buffer.concat(chunks)
      resolve({ bytes: buf.length, text: buf.toString('utf8') })
    }
    res.on('data', (chunk: Buffer) => {
      if (done) return
      chunks.push(chunk)
      total += chunk.length
      if (total >= UPTIME_LIMITS.maxBodyBytes) {
        done = true
        // Past the cap the body is DONE for this probe's purposes: stop the
        // socket so a huge or infinite response cannot hold the deadline.
        // The cap is exact — the last chunk is trimmed to it.
        res.destroy()
        const buf = Buffer.concat(chunks).subarray(0, UPTIME_LIMITS.maxBodyBytes)
        resolve({ bytes: buf.length, text: buf.toString('utf8') })
      }
    })
    res.on('end', finish)
    res.on('error', (error) => {
      if (done) return
      done = true
      reject(error)
    })
  })
}

/** The failure text an error becomes (the code names the cause best). */
function failureText(error: unknown): string {
  const e = error as { code?: string; message?: string }
  return e?.code ?? e?.message ?? 'request failed'
}

/**
 * Creates an in-process uptime provider.
 *
 * @param config - Options; see {@link UptimeFetchConfig}.
 * @returns A `UptimeProvider` probing from this process.
 */
export function createProvider(config: UptimeFetchConfig = {}): UptimeProvider {
  const allowPrivate = config.allowPrivateTargets === true
  const userAgent = config.userAgent ?? 'molecule-uptime-probe/1.0 (@molecule/api-uptime-fetch)'
  const resolveHost = config.resolve ?? resolvePublicAddress

  return {
    async probe(rawSpec: UptimeProbeSpec): Promise<UptimeProbeResult> {
      const checked = validateProbeSpec(rawSpec)
      if (!checked.ok) {
        throw new Error(checked.message)
      }
      const spec = checked.spec
      const startedAt = Date.now()
      const deadline = startedAt + spec.timeoutMs

      let method: UptimeMethod = spec.method
      let current: URL
      try {
        current = new URL(spec.url)
      } catch (_error) {
        // validateProbeSpec already checked the URL parses; the thrown
        // message is the field error itself.
        throw new Error('"url" must be an absolute http(s) URL.', { cause: _error })
      }
      let redirects = 0

      for (;;) {
        const remaining = deadline - Date.now()
        if (remaining <= 0) {
          return {
            status: 'down',
            checkedAt: new Date().toISOString(),
            url: spec.url,
            method,
            ...(redirects > 0 ? { finalUrl: current.href, redirects } : {}),
            message: `Timed out after ${spec.timeoutMs}ms.`,
          }
        }

        // THE DIAL DECISION. Default: every resolved address must be public
        // unicast, and the request goes to the verified address — the
        // hostname is never resolved again by the transport, so DNS
        // rebinding has nothing to switch to.
        let host: string
        let family: number | undefined
        if (allowPrivate) {
          host = current.hostname.replace(/^\[(.*)\]$/, '$1')
        } else {
          const verified = await resolveHost(current.hostname.replace(/^\[(.*)\]$/, '$1')).catch(
            () => null,
          )
          if (!verified) {
            return {
              status: 'down',
              checkedAt: new Date().toISOString(),
              url: spec.url,
              method,
              ...(redirects > 0 ? { finalUrl: current.href, redirects } : {}),
              message: `"${current.hostname}" does not resolve to a public address — refused.`,
            }
          }
          host = verified.address
          family = verified.family
        }

        const result = await new Promise<
          | { kind: 'final'; res: IncomingMessage }
          | { kind: 'redirect'; location: string; status: number }
          | { kind: 'failure'; message: string }
        >((resolve) => {
          const transport = current.protocol === 'https:' ? https : http
          const req = transport.request({
            host,
            ...(family !== undefined ? { family } : {}),
            ...(current.port ? { port: Number(current.port) } : {}),
            ...(current.protocol === 'https:' ? { servername: current.hostname } : {}),
            method,
            path: `${current.pathname}${current.search}`,
            headers: {
              host: hostHeaderFor(current),
              'user-agent': userAgent,
              accept: '*/*',
              connection: 'close',
            },
          })
          const timer = setTimeout(() => {
            req.destroy(new Error(`Timed out after ${spec.timeoutMs}ms.`))
          }, remaining)
          const settle = (v: Parameters<typeof resolve>[0]): void => {
            clearTimeout(timer)
            resolve(v)
          }
          req.on('error', (error) => settle({ kind: 'failure', message: failureText(error) }))
          req.on('response', (res) => {
            const status = res.statusCode ?? 0
            const location = res.headers.location
            if (
              REDIRECT_STATUSES.has(status) &&
              location &&
              redirects < UPTIME_LIMITS.maxRedirects
            ) {
              res.resume() // drain and drop the redirect body
              res.destroy()
              settle({ kind: 'redirect', location, status })
              return
            }
            settle({ kind: 'final', res })
          })
          req.end()
        })

        if (result.kind === 'failure') {
          return {
            status: 'down',
            checkedAt: new Date().toISOString(),
            url: spec.url,
            method,
            ...(redirects > 0 ? { finalUrl: current.href, redirects } : {}),
            message: result.message,
          }
        }
        if (result.kind === 'redirect') {
          let next: URL
          try {
            next = new URL(result.location, current)
          } catch (_error1) {
            return {
              status: 'down',
              checkedAt: new Date().toISOString(),
              url: spec.url,
              method,
              ...(redirects > 0 ? { finalUrl: current.href, redirects } : {}),
              message: `Redirect to an invalid URL: "${result.location}".`,
            }
          }
          if (next.protocol !== 'http:' && next.protocol !== 'https:') {
            return {
              status: 'down',
              checkedAt: new Date().toISOString(),
              url: spec.url,
              method,
              ...(redirects > 0 ? { finalUrl: current.href, redirects } : {}),
              message: `Redirect to a non-http(s) URL (${next.protocol}) — refused.`,
            }
          }
          // 303 means "fetch the target with GET" — a HEAD probe follows it
          // as GET; every other redirect keeps the method.
          if (result.status === 303 && method === 'HEAD') {
            method = 'GET'
          }
          redirects += 1
          current = next
          continue
        }

        // FINAL response.
        const res = result.res
        const now = Date.now()
        let body: { bytes: number; text: string } | undefined
        try {
          body = await readBody(res)
        } catch (error) {
          return {
            status: 'down',
            checkedAt: new Date().toISOString(),
            url: spec.url,
            method,
            ...(redirects > 0 ? { finalUrl: current.href, redirects } : {}),
            message: `Response body failed to read: ${failureText(error)}`,
          }
        }
        const latencyMs = Date.now() - startedAt
        const headers: Record<string, string> = {}
        for (const [name, value] of Object.entries(res.headers)) {
          if (ECHOED_HEADERS.has(name) && typeof value === 'string') headers[name] = value
        }
        const expectTextMatched =
          spec.expectText !== undefined ? body.text.includes(spec.expectText) : undefined
        const verdict = deriveProbeStatus(
          {
            httpStatus: res.statusCode ?? 0,
            ...(expectTextMatched !== undefined ? { expectTextMatched } : {}),
            latencyMs,
          },
          spec,
        )
        const tls = current.protocol === 'https:' ? tlsInfo(res, now) : undefined
        return {
          status: verdict.status,
          checkedAt: new Date().toISOString(),
          url: spec.url,
          method,
          ...(redirects > 0 ? { finalUrl: current.href, redirects } : {}),
          redirects,
          ...(res.statusCode !== undefined ? { httpStatus: res.statusCode } : {}),
          latencyMs,
          ...(tls !== undefined ? { tls } : {}),
          ...(Object.keys(headers).length > 0 ? { headers } : {}),
          bodyBytesRead: body.bytes,
          ...(expectTextMatched !== undefined ? { expectTextMatched } : {}),
          ...(verdict.message !== undefined ? { message: verdict.message } : {}),
        }
      }
    },
  }
}
