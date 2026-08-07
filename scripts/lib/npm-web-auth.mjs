/**
 * Satisfy npm's 2FA challenge through the browser instead of a typed code.
 *
 * npm gates trust config and first-publish behind 2FA. It offers TWO ways to
 * answer: a typed TOTP, or a browser flow — it prints
 * `https://www.npmjs.com/auth/cli/<id>` and, with `auth-type=web`, WAITS while
 * the already-logged-in browser approves. The second needs no authenticator and
 * no human typing, which is the only reason this file exists.
 *
 * It drives the approval over the Chrome DevTools Protocol against the browser
 * the user is already signed into, so nothing here handles a password, a TOTP
 * secret, or any long-lived credential — npm's own session does the
 * authenticating, exactly as it would if a person clicked the link.
 *
 * WHY NOT AN AUTOMATION TOKEN INSTEAD: npm is actively removing that option —
 * it prints "npm tokens that bypass 2FA are being restricted for account changes
 * and direct publishing" on every call, and minting one is itself 2FA-gated. A
 * hand-rolled POST to the trust endpoint DID work for unpublished packages on
 * 2026-08-05 (a 910-package sweep reported `not-yet-published: 0`) and returned
 * 404 for the same shape on 2026-08-06. Depending on that gap staying open is
 * not a plan; answering the challenge npm actually asks is.
 *
 * @module
 */
import { spawn } from 'node:child_process'
import process from 'node:process'

/** Where the CDP endpoint listens. Chrome/Brave started with --remote-debugging-port. */
export const CDP_URL = process.env.MOL_CDP_URL || 'http://127.0.0.1:9222'

/**
 * Reports whether a CDP-controllable browser is reachable.
 *
 * @returns True when the endpoint answers.
 */
export const hasBrowser = async () => {
  try {
    const res = await fetch(`${CDP_URL}/json/version`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch (_error) {
    // Intentionally ignored: an unreachable endpoint is the normal case on a
    // machine with no debuggable browser, and the caller falls back to a prompt.
    return false
  }
}

/**
 * Opens a URL in the debuggable browser and waits for npm to accept it.
 *
 * @param url - npm's `auth/cli/<id>` approval URL.
 * @returns The id of the tab it opened, for cleanup.
 */
const approveInBrowser = async (url) => {
  const res = await fetch(`${CDP_URL}/json/new?${url}`, {
    method: 'PUT',
    signal: AbortSignal.timeout(15_000),
  })
  const tab = await res.json()

  // npm's page auto-submits when the session is already authenticated, but a
  // confirmation button appears in some flows. Poll briefly and click it if so,
  // rather than assuming either shape.
  const { default: WebSocket } = await import('ws')
  const list = await (await fetch(`${CDP_URL}/json/list`)).json()
  const target = list.find((t) => t.id === tab.id)
  if (!target?.webSocketDebuggerUrl) return tab.id

  const ws = new WebSocket(target.webSocketDebuggerUrl)
  let id = 0
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const mid = ++id
      const onMessage = (data) => {
        const msg = JSON.parse(data)
        if (msg.id === mid) {
          ws.off('message', onMessage)
          resolve(msg.result)
        }
      }
      ws.on('message', onMessage)
      ws.send(JSON.stringify({ id: mid, method, params }))
    })

  await new Promise((resolve) => ws.on('open', resolve))
  for (let attempt = 0; attempt < 10; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    const result = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const btn = [...document.querySelectorAll('button,input[type=submit]')]
          .find((b) => /confirm|approve|authorize|continue|sign in/i.test(b.innerText || b.value || ''))
        if (btn) { btn.click(); return 'clicked' }
        return document.body.innerText.slice(0, 120)
      })()`,
    })
    const value = String(result?.result?.value ?? '')
    if (/success|authenticated|you may close|configured/i.test(value)) break
  }
  ws.close()
  return tab.id
}

/**
 * Runs an npm command, answering its 2FA challenge in the browser.
 *
 * `auth-type=web` is what makes npm print the approval URL and then WAIT on it;
 * without it npm exits immediately with EOTP and the URL is already dead.
 *
 * @param args - Arguments for npm (without the `npm` itself).
 * @param options - `cwd` for the command.
 * @returns `{ ok, output }` once npm exits.
 */
export const runNpmWithWebAuth = (args, options = {}) =>
  new Promise((resolve) => {
    const child = spawn('npx', ['--yes', 'npm@12', ...args], {
      cwd: options.cwd,
      env: { ...process.env, npm_config_auth_type: 'web' },
    })

    let output = ''
    let opened = false
    const onData = async (chunk) => {
      const text = chunk.toString()
      output += text
      const match = output.match(/https:\/\/www\.npmjs\.com\/auth\/cli\/[A-Za-z0-9-]+/)
      if (match && !opened) {
        opened = true
        try {
          await approveInBrowser(match[0])
        } catch (error) {
          // Surfaced rather than swallowed: if the approval could not be driven,
          // npm will time out on a challenge nobody answered and the real cause
          // would otherwise be invisible in that timeout.
          process.stderr.write(`  browser approval failed: ${error.message}\n`)
        }
      }
    }

    child.stdout.on('data', onData)
    child.stderr.on('data', onData)
    child.on('close', (code) => resolve({ ok: code === 0, output }))
  })
