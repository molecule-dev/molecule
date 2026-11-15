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
 * Signing in uses the same shape (measured 2026-11-15): `POST /-/v1/login` answers
 * `{ loginUrl, doneUrl }`, a www.npmjs.com sign-in page and a done-check that answers
 * 202 (retry-after 3) until the owner signs in, then 200 `{ token }`. That is npm's
 * own `npm login` web flow (npm-profile's loginWeb). An `npm login` session lasts at
 * most 12 hours, so a run the next day finds the saved login dead and needs one.
 *
 * Service protocol (HTTP over the socket):
 *   GET    /health                 -> { ok, subscriptions }
 *   POST   /requests               { purpose, pid, kind?: 'code'|'login', authUrl? } -> 201 { id }
 *   GET    /requests/:id           -> { status: pending|code|approved|denied|cancelled|used|abandoned (|expired), code? }
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
 * Request states after which the owner has still not answered, so the request is put in
 * front of them again: `expired` (a service that expires requests), `abandoned` (the
 * service took this program for stopped, e.g. after the machine froze), and a request
 * the service no longer knows (it restarted).
 */
const ASK_AGAIN = new Set(['expired', 'abandoned'])

/**
 * Puts one request in front of the owner and waits for its answer, from the phone
 * (`fromPhone`, given the service's view) or from npm (`fromNpm`, an approval seen
 * through npm's done-check). By default it waits until the owner answers: a request
 * that ends unanswered, or that a restarted service forgot, is asked again (a fresh
 * notification), and a service or npm that stops answering is retried. Only the
 * owner's denial, a cancellation, or `timeoutMs` ends the wait. Withdraws the request
 * when it gives up.
 *
 * @param options - Request options.
 * @param options.request - Returns the POST /requests body, without pid (called again
 *   for each new request, so it carries the current link).
 * @param options.fromPhone - Returns the answer the phone sent, or null.
 * @param options.fromNpm - Returns the answer npm holds, or null; given the request id
 *   so it can put a fresh link in front of the owner.
 * @param options.socketPath - The approval service socket.
 * @param options.timeoutMs - Give up after this long (Infinity: never).
 * @param options.pollMs - How often to check both sides.
 * @param options.sleep - Waits between checks.
 * @returns The answer.
 */
async function askOwner({ request, fromPhone, fromNpm, socketPath, timeoutMs, pollMs, sleep }) {
  let id = null
  let answered = false
  // Each outage is reported once, when it starts.
  const down = { service: false, npm: false }
  const deadline = Date.now() + timeoutMs
  try {
    while (Date.now() < deadline) {
      let view
      try {
        if (!id) {
          const created = await socketJson(socketPath, 'POST', '/requests', {
            ...request(),
            pid: process.pid,
          })
          if (created.status !== 201 || !created.body?.id)
            throw new Error(
              `approval service refused the request (${created.status} ${created.body?.error ?? ''})`,
            )
          id = created.body.id
        }
        view = await socketJson(socketPath, 'GET', `/requests/${id}`)
        down.service = false
      } catch (error) {
        if (/refused the request/.test(error.message)) throw error
        // Not answering (restarting, or gone): keep waiting and try again.
        if (!down.service)
          console.error(`  the approval service is not answering (${error.message}); retrying`)
        down.service = true
        await sleep(pollMs)
        continue
      }
      const status = view.body?.status
      if (view.status === 404 || ASK_AGAIN.has(status)) {
        console.error(
          view.status === 404
            ? '  the approval service no longer knows the request (restarted?); asking again'
            : `  the request ended unanswered (${status}); asking again`,
        )
        id = null
        continue
      }
      const phoneAnswer = fromPhone(view.body)
      if (phoneAnswer) {
        answered = true
        return phoneAnswer
      }
      if (status === 'denied') throw new Error('the owner denied the request')
      if (['cancelled', 'used'].includes(status))
        throw new Error(`the request ended without an answer (${status})`)

      let npmAnswer = null
      try {
        npmAnswer = await fromNpm(id)
        down.npm = false
      } catch (error) {
        // A network blip on npm's side must not end a wait that can last hours.
        if (!down.npm) console.error(`  npm did not answer (${error.message}); retrying`)
        down.npm = true
      }
      if (npmAnswer) {
        answered = true
        await socketJson(socketPath, 'POST', `/requests/${id}/resolve`, {
          status: 'approved',
        }).catch((error) => {
          // The answer is in hand; only the phone's "Approved" label is lost.
          console.error(`  could not mark the phone request approved: ${error.message}`)
        })
        return npmAnswer
      }
      await sleep(pollMs)
    }
    throw new Error(`no answer within ${Math.round(timeoutMs / 60_000)} minutes`)
  } finally {
    if (!answered && id)
      await socketJson(socketPath, 'DELETE', `/requests/${id}`).catch((error) => {
        // The service withdraws it once this program stops checking it.
        console.error(`  could not withdraw the phone request: ${error.message}`)
      })
  }
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
 * @param [options.timeoutMs] - Give up after this long. Default: never; the owner is
 *   asked again until they answer.
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
  timeoutMs = Infinity,
  pollMs = 2_000,
  sleep = (ms) => delay(ms),
}) {
  let pair = await link()
  return askOwner({
    request: () => ({ purpose, kind: 'code', ...(pair ? { authUrl: pair.authUrl } : {}) }),
    fromPhone: (view) =>
      view?.status === 'code' && /^\d{6}$/.test(view.code ?? '')
        ? { otp: view.code, kind: 'code' }
        : null,
    fromNpm: async (id) => {
      if (!pair) return null
      const done = await fetchImpl(pair.doneUrl, {
        headers: { authorization: `Bearer ${bearer}` },
        signal: AbortSignal.timeout(20_000),
      })
      if (done.status === 200) {
        const token = await doneToken(done)
        return token ? { otp: token, kind: 'npm' } : null
      }
      if (done.status !== 202) {
        // npm let the pair expire: put a fresh link in front of the owner.
        pair = await link()
        if (pair)
          await socketJson(socketPath, 'POST', `/requests/${id}/link`, { authUrl: pair.authUrl })
      }
      return null
    },
    socketPath,
    timeoutMs,
    pollMs,
    sleep,
  })
}

/**
 * The token in a done-check's 200 answer.
 *
 * @param res - The done-check response.
 * @returns The token, or null when the body carries none.
 */
async function doneToken(res) {
  const body = await res.json().catch((_error) => {
    // An unreadable 200 is no token; the caller keeps waiting for one.
    return null
  })
  return typeof body?.token === 'string' && body.token ? body.token : null
}

/**
 * Whether a sign-in pair points at npm: its sign-in page on www.npmjs.com (which
 * continues to `/login/cli/<id>`) and its done-check on registry.npmjs.org.
 *
 * @param pair - `{ loginUrl, doneUrl }` from `POST /-/v1/login`.
 * @returns True for a genuine npm pair.
 */
export function isNpmLoginPair(pair) {
  try {
    const login = new URL(pair?.loginUrl)
    const done = new URL(pair?.doneUrl)
    return (
      login.origin === 'https://www.npmjs.com' &&
      login.pathname === '/login' &&
      [...login.searchParams.keys()].join() === 'next' &&
      /^\/login\/cli\/[A-Za-z0-9-]{8,80}$/.test(login.searchParams.get('next') ?? '') &&
      !login.hash &&
      done.origin === 'https://registry.npmjs.org' &&
      done.pathname === '/-/v1/done'
    )
  } catch (_error) {
    // Missing or unparseable URLs are not a pair.
    return false
  }
}

/**
 * Starts npm's web sign-in, the one `npm login` uses.
 *
 * @param [options] - `fetchImpl`.
 * @returns `{ loginUrl, doneUrl }`.
 */
export async function npmLoginPair({ fetchImpl = fetch } = {}) {
  // Without `npm-auth-type: web` npm answers 401 instead of a pair (measured 2026-11-15).
  const res = await fetchImpl('https://registry.npmjs.org/-/v1/login', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      'npm-auth-type': 'web',
    },
    body: '{}',
    signal: AbortSignal.timeout(20_000),
  })
  const body = await res.json().catch((_error) => {
    // Reported below as "npm did not start a sign-in".
    return null
  })
  if (!res.ok || !isNpmLoginPair(body))
    throw new Error(`npm did not start a web sign-in (${res.status})`)
  return { loginUrl: body.loginUrl, doneUrl: body.doneUrl }
}

/**
 * Asks the owner to sign in to npm from the phone and waits for the session token
 * npm hands this machine. The owner signs in on npm's own page; the password and
 * code never pass through here. The caller keeps the token in memory: it is never
 * written to ~/.npmrc.
 *
 * @param options - Request options.
 * @param options.purpose - Why a sign-in is needed, in plain words (shown on the phone).
 * @param [options.socketPath] - The approval service socket.
 * @param [options.fetchImpl] - fetch, for npm.
 * @param [options.timeoutMs] - Give up after this long. Default: never; the owner is
 *   asked again until they answer.
 * @param [options.pollMs] - How often to check both sides (npm asks for 3 s).
 * @param [options.sleep] - Waits between checks (tests pass a fake).
 * @returns The npm session token.
 */
export async function requestOwnerNpmLogin({
  purpose,
  socketPath = APPROVAL_SOCKET,
  fetchImpl = fetch,
  timeoutMs = Infinity,
  pollMs = 3_000,
  sleep = (ms) => delay(ms),
}) {
  let pair = await npmLoginPair({ fetchImpl })
  return askOwner({
    request: () => ({ purpose, kind: 'login', authUrl: pair.loginUrl }),
    fromPhone: () => null,
    fromNpm: async (id) => {
      const done = await fetchImpl(pair.doneUrl, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(20_000),
      })
      if (done.status === 200) return doneToken(done)
      if (done.status !== 202) {
        // npm let the sign-in expire: put a fresh one in front of the owner.
        pair = await npmLoginPair({ fetchImpl })
        await socketJson(socketPath, 'POST', `/requests/${id}/link`, { authUrl: pair.loginUrl })
      }
      return null
    },
    socketPath,
    timeoutMs,
    pollMs,
    sleep,
  })
}
