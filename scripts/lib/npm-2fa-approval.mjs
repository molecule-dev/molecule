/**
 * Asks the npm account owner for a 2FA answer through a local approval service,
 * so a 2FA step can finish from a shell with no terminal (an AI agent, a script).
 *
 * The service is optional and local to the machine: it listens on a Unix socket
 * (APPROVAL_SOCKET) and notifies the owner's phone. The owner answers with a
 * 6-digit authenticator code, or approves the one operation on npm's own page.
 * Without the service, callers fall back to their terminal prompt.
 *
 * npm's side, measured 2026-11-14: a 2FA-gated request sent with
 * `npm-auth-type: web` and no code answers 401 with `authUrl` (a www.npmjs.com
 * approval page) and `doneUrl` (202 until approved, then 200 `{ token }`; 404 once
 * the pair expires, after about 5 minutes). The token goes in `npm-otp` like a code
 * but covers exactly ONE call, while a 6-digit code keeps working for every call
 * inside its ~30 s window. npm's CLI uses the same pair (npm-profile's
 * webAuthOpener). npm checks 2FA before the package exists, so any package name
 * yields a pair.
 *
 * Service protocol (HTTP over the socket):
 *   GET    /health                 -> { ok, subscriptions }
 *   POST   /requests               { purpose, pid, authUrl? } -> 201 { id, expiresAt }
 *   GET    /requests/:id           -> { status: pending|code|approved|denied|expired|cancelled|used, code? }
 *   POST   /requests/:id/link      { authUrl }
 *   POST   /requests/:id/resolve   { status: 'approved' }
 *   DELETE /requests/:id
 *
 * @module
 */

import console from 'node:console'
import http from 'node:http'
import { join } from 'node:path'
import process from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'
import { URL } from 'node:url'

/** Where the approval service listens. */
export const APPROVAL_SOCKET =
  process.env.MOL_APPROVAL_SOCKET ??
  join(
    process.env.XDG_RUNTIME_DIR ?? `/run/user/${process.getuid?.() ?? 0}`,
    'molecule-approvals.sock',
  )

/**
 * One JSON request over a Unix socket.
 *
 * @param socketPath - The socket.
 * @param method - HTTP method.
 * @param path - Request path.
 * @param [body] - JSON body.
 * @returns Status and parsed body.
 */
export function socketJson(socketPath, method, path, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        socketPath,
        method,
        path,
        headers: { 'content-type': 'application/json' },
        timeout: 15_000,
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          let parsed
          try {
            parsed = data ? JSON.parse(data) : null
          } catch (_error) {
            // A non-JSON answer is reported by status alone.
            parsed = null
          }
          resolve({ status: res.statusCode ?? 0, body: parsed })
        })
      },
    )
    req.on('timeout', () => req.destroy(new Error('approval service timed out')))
    req.on('error', reject)
    req.end(body === undefined ? undefined : JSON.stringify(body))
  })
}

/**
 * Whether an approval service is listening.
 *
 * @param [socketPath] - The socket.
 * @returns True when /health answers ok.
 */
export async function approvalServiceAvailable(socketPath = APPROVAL_SOCKET) {
  try {
    const res = await socketJson(socketPath, 'GET', '/health')
    return res.status === 200 && res.body?.ok === true
  } catch (_error) {
    // No socket, or nothing listening on it: there is no service.
    return false
  }
}

/**
 * Whether a pair npm returned points at npm: an approval page on www.npmjs.com and
 * a done-check on registry.npmjs.org. Anything else is never shown to the owner.
 *
 * @param pair - `{ authUrl, doneUrl }` from a 401 body.
 * @returns True for a genuine npm pair.
 */
export function isNpmApprovalPair(pair) {
  try {
    const auth = new URL(pair?.authUrl)
    const done = new URL(pair?.doneUrl)
    return (
      auth.origin === 'https://www.npmjs.com' &&
      auth.pathname.startsWith('/auth/cli/') &&
      done.origin === 'https://registry.npmjs.org'
    )
  } catch (_error) {
    // Missing or unparseable URLs are not a pair.
    return false
  }
}

/**
 * A fresh npm approval pair, from a 2FA-gated read of a package's trust config.
 *
 * @param name - Any package name (npm asks for 2FA before checking it exists).
 * @param options - `bearer` (the npm session token) and `fetchImpl`.
 * @returns The pair, or null when npm did not offer one.
 */
export async function npmApprovalLink(name, { bearer, fetchImpl = fetch }) {
  const res = await fetchImpl(
    `https://registry.npmjs.org/-/package/${name.replace('/', '%2f')}/trust`,
    {
      headers: {
        authorization: `Bearer ${bearer}`,
        accept: 'application/json',
        'npm-auth-type': 'web',
      },
      signal: AbortSignal.timeout(20_000),
    },
  )
  if (res.status !== 401) return null
  const body = await res.json().catch((_error) => {
    // A 401 without a JSON body offers no pair; the caller asks for a code alone.
    return null
  })
  return isNpmApprovalPair(body) ? { authUrl: body.authUrl, doneUrl: body.doneUrl } : null
}

/**
 * Asks the owner and waits for whichever answer comes first: a 6-digit code sent
 * from the phone, or an approval on npm's page (seen through npm's done-check).
 *
 * @param options - Request options.
 * @param options.purpose - What the code is for, in plain words (shown on the phone).
 * @param [options.link] - Returns a fresh npm approval pair, or null; called again
 *   when npm lets the current one expire.
 * @param [options.bearer] - The npm session token, for the done-check.
 * @param [options.socketPath] - The approval service socket.
 * @param [options.fetchImpl] - fetch, for npm.
 * @param [options.timeoutMs] - Give up after this long.
 * @param [options.pollMs] - How often to check both sides.
 * @param [options.sleep] - Waits between checks (tests pass a fake).
 * @returns `{ otp, kind }`: kind `code` (reusable inside its window) or `npm`
 *   (an approval token that covers one call).
 */
export async function requestOwnerOtp({
  purpose,
  link = async () => null,
  bearer,
  socketPath = APPROVAL_SOCKET,
  fetchImpl = fetch,
  timeoutMs = 10 * 60_000,
  pollMs = 2_000,
  sleep = (ms) => delay(ms),
}) {
  let pair = await link()
  const created = await socketJson(socketPath, 'POST', '/requests', {
    purpose,
    pid: process.pid,
    ...(pair ? { authUrl: pair.authUrl } : {}),
  })
  if (created.status !== 201 || !created.body?.id)
    throw new Error(
      `approval service refused the request (${created.status} ${created.body?.error ?? ''})`,
    )
  const { id } = created.body
  let answered = false
  const deadline = Date.now() + timeoutMs
  try {
    while (Date.now() < deadline) {
      const view = await socketJson(socketPath, 'GET', `/requests/${id}`)
      if (view.status === 404)
        throw new Error('the approval service lost the request (was it restarted?)')
      const status = view.body?.status
      if (status === 'code' && /^\d{6}$/.test(view.body.code ?? '')) {
        answered = true
        return { otp: view.body.code, kind: 'code' }
      }
      if (status === 'denied') throw new Error('the owner denied the request')
      if (status === 'expired' || status === 'cancelled' || status === 'used')
        throw new Error(`the request ended without an answer (${status})`)

      if (pair) {
        const done = await fetchImpl(pair.doneUrl, {
          headers: { authorization: `Bearer ${bearer}` },
          signal: AbortSignal.timeout(20_000),
        })
        if (done.status === 200) {
          const token = (
            await done.json().catch((_error) => {
              // An unreadable 200 is no token; the loop keeps waiting for one.
              return null
            })
          )?.token
          if (typeof token === 'string' && token) {
            answered = true
            await socketJson(socketPath, 'POST', `/requests/${id}/resolve`, {
              status: 'approved',
            }).catch((error) => {
              // The token is in hand; only the phone's "Approved" label is lost.
              console.error(`  could not mark the phone request approved: ${error.message}`)
            })
            return { otp: token, kind: 'npm' }
          }
        } else if (done.status !== 202) {
          // npm let the pair expire: put a fresh link in front of the owner.
          pair = await link()
          if (pair)
            await socketJson(socketPath, 'POST', `/requests/${id}/link`, { authUrl: pair.authUrl })
        }
      }
      await sleep(pollMs)
    }
    throw new Error(`no answer within ${Math.round(timeoutMs / 60_000)} minutes`)
  } finally {
    if (!answered)
      await socketJson(socketPath, 'DELETE', `/requests/${id}`).catch((error) => {
        // The request expires on its own; the phone just shows it a little longer.
        console.error(`  could not withdraw the phone request: ${error.message}`)
      })
  }
}
