/**
 * Direct client for npm's trusted-publishing (OIDC) config endpoint.
 *
 * WHY THIS EXISTS INSTEAD OF `npm trust github`: npm CLI 11.12.1 omits the
 * `permissions` field the registry requires, so the CLI cannot succeed for ANY
 * package. It surfaces a bare 400 and swallows the response body, which says:
 *
 *   permissions is required and must contain at least one valid route
 *
 * and the API's own validation names the only accepted values:
 *
 *   "[0].permissions[0]" must be one of [createPackage, createStagedPackage]
 *
 * Sending those directly returns 201 Created. Verified 2026-08-05 against
 * `@molecule/api-activity`. If a later npm CLI starts sending `permissions`,
 * both callers can go back to shelling out and this module can be deleted.
 *
 * AUTH: the ENTIRE endpoint is 2FA-protected — reads included — and a granular
 * token with "bypass 2FA" is REFUSED, because trust config counts as an account
 * change rather than a publish. So this needs a `npm login` session token plus a
 * current OTP.
 */
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/** Repository whose workflow is allowed to publish. */
export const TRUST_REPO = 'molecule-dev/molecule'

/** Workflow file within that repository. */
export const TRUST_WORKFLOW = 'release.yml'

/**
 * The only routes the registry accepts. `publish` looks like the obvious value
 * and is rejected.
 */
export const TRUST_PERMISSIONS = ['createPackage', 'createStagedPackage']

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
 * @param name - Package name.
 * @param options - Token, optional OTP, and repo/workflow overrides.
 * @returns Outcome: `trusted`, `already`, `not-published`, or `error`.
 */
export async function trustPackage(name, options) {
  const { token, otp, repo = TRUST_REPO, workflow = TRUST_WORKFLOW } = options
  const res = await fetch(
    `https://registry.npmjs.org/-/package/${name.replace('/', '%2f')}/trust`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
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
  const text = (await res.text()).slice(0, 300)
  if (res.ok) return { outcome: 'trusted', status: res.status, text }
  if (/already|duplicate/i.test(text)) return { outcome: 'already', status: res.status, text }
  // 404 here does NOT mean a local first publish is required. A package that
  // npm has never seen can still be trusted — `createPackage` is precisely the
  // permission to publish a name that does not exist yet — and CI then creates
  // it over OIDC with no credential at rest.
  //
  // Proof, because this has now been argued in both directions: the seven
  // `@molecule/app-*-react-native` bonds were trusted while unpublished on
  // 2026-08-05 and their first-ever version (1.0.1) was published by
  // `GitHub Actions`, attested, inside the 02:43-07:07 run window that day.
  // Check them with `npm view <pkg> --json` before believing any claim here.
  //
  // So when this branch fires, the name is one npm genuinely cannot resolve —
  // a typo, or a scope the account cannot create under — not a bootstrap gap.
  if (res.status === 404) return { outcome: 'not-published', status: res.status, text }
  return { outcome: 'error', status: res.status, text }
}
