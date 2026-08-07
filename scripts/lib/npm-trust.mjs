/**
 * Configure npm trusted publishing (OIDC) for a package.
 *
 * POSTs `/-/package/<name>/trust` directly instead of shelling out to
 * `npm trust`. Two reasons, both learned the hard way:
 *
 *   1. PERMISSIONS. The CLI's `--allow-publish` sends `["createPackage"]`, and
 *      the registry answers `404 Package not found` for a name it does not have.
 *      Sending `["createPackage","createStagedPackage"]` is what the 2026-08-05
 *      sweep did, and it trusted 910 packages with `not-yet-published: 0` while
 *      seven of them did not exist on npm until hours later.
 *      `createStagedPackage` is what makes a name trustable BEFORE it exists,
 *      which is the entire point of trusted publishing for new packages. That
 *      404 was misread twice as "npm cannot trust an unpublished package".
 *   2. ONE CODE, MANY PACKAGES. The CLI takes a single package per invocation
 *      and has no `--otp` flag, so it must prompt interactively — six new
 *      packages meant six prompts, and a code collected by the caller was
 *      silently discarded. This endpoint accepts an `npm-otp` HEADER, so one
 *      code covers every call inside its window.
 *
 * AUTH: an `npm login` session token plus a current 2FA code. The account is
 * `tfa: auth-and-writes` and automation tokens are refused for trust config, so
 * this cannot run unattended in CI. Once a package IS trusted, CI publishes it
 * over OIDC forever after, with no code at all — including its very first
 * version, which is the behaviour this whole file exists to enable.
 */
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/**
 * The permission pair that makes a name trustable BEFORE it exists.
 *
 * `createPackage` alone — what `npm trust github --allow-publish` sends — gets
 * `404 Package not found` for a name the registry does not have. Adding
 * `createStagedPackage` is what the 2026-08-05 sweep sent, and it trusted 910
 * packages with `not-yet-published: 0` while seven of them did not exist on npm
 * until hours later.
 */
export const TRUST_PERMISSIONS = ['createPackage', 'createStagedPackage']

/** Repository whose workflow is allowed to publish. */
export const TRUST_REPO = 'molecule-dev/molecule'

/** Workflow file within that repository. */
export const TRUST_WORKFLOW = 'release.yml'

/**
 * Reads the registry auth token from `~/.npmrc`.
 *
 * @returns The token, or null when not logged in.
 */
export function readNpmToken() {
  const rcPath = join(homedir(), '.npmrc')
  if (!existsSync(rcPath)) return null
  const match = readFileSync(rcPath, 'utf8').match(
    /\/\/registry\.npmjs\.org\/:_authToken\s*=\s*(.+)/,
  )
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : null
}

/**
 * Configures GitHub Actions as a trusted publisher for one package.
 *
 * Works whether or not the package exists on the registry.
 *
 * @param name - Package name.
 * @param options - otp (a current 2FA code) and repo/workflow overrides.
 * @returns Outcome: `trusted`, `already`, `needs-otp`, or `error`, with npm's output.
 */
export async function trustPackage(name, options) {
  const { otp, repo = TRUST_REPO, workflow = TRUST_WORKFLOW } = options

  // POST the endpoint directly rather than shelling out to `npm trust`.
  //
  // The CLI takes ONE package per invocation and has no --otp flag, so it must
  // prompt interactively — six new packages meant six separate 2FA prompts, and
  // a code we collected ourselves was silently discarded. The endpoint accepts an
  // `npm-otp` HEADER, which is how the 2026-08-05 sweep trusted 592 packages on
  // a handful of codes: one code covers every call inside its ~30s window.
  const res = await fetch(
    `https://registry.npmjs.org/-/package/${name.replace('/', '%2f')}/trust`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${readNpmToken()}`,
        'content-type': 'application/json',
        accept: 'application/json',
        ...(otp ? { 'npm-otp': otp } : {}),
      },
      body: JSON.stringify([
        {
          type: 'github',
          claims: { repository: repo, workflow_ref: { file: workflow } },
          permissions: TRUST_PERMISSIONS,
        },
      ]),
      signal: AbortSignal.timeout(20_000),
    },
  )
  const text = (await res.text()).slice(0, 400)
  if (res.ok) return { outcome: 'trusted', status: res.status, text }
  if (/already|duplicate/i.test(text)) return { outcome: 'already', status: res.status, text }
  // A spent or missing code, reported so the caller can ask for a fresh one
  // rather than treating it as a permanent failure.
  if (res.status === 401 || /otp|one-time|EOTP/i.test(text))
    return { outcome: 'needs-otp', status: res.status, text }
  return { outcome: 'error', status: res.status, text }
}
