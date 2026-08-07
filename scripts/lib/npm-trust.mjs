/**
 * Configure npm trusted publishing (OIDC) for a package.
 *
 * WHY THIS SHELLS OUT TO `npx npm@12` RATHER THAN POSTING THE ENDPOINT: it used
 * to POST `/-/package/<name>/trust` directly, because npm CLI 11.12.1 omits the
 * `permissions` field the registry requires and cannot succeed for any package.
 * That workaround sent `permissions: ['createPackage', 'createStagedPackage']`,
 * which the registry accepted for a package that already existed and answered
 * with a bare 404 `{"message":"Package not found"}` for one that did not.
 *
 * The 404 was read as "npm cannot trust a package that does not exist", and a
 * whole bootstrap-publish path was built on it. It is wrong. npm 12's own CLI
 * reaches "Two-factor authentication is required for this operation" on exactly
 * the same unpublished name, and reports `permissions: publish` — a value the
 * hand-rolled POST never sent. The package not existing was never the problem;
 * the permission values were.
 *
 * So a brand-new package IS trustable before it has ever been published, and CI
 * then creates it over OIDC with no local publish and no credential at rest.
 * That is the whole point of trusted publishing, and it works.
 *
 * npm 12 is invoked through `npx` rather than installed globally so this does
 * not disturb whatever npm the machine runs on. It warns on Node 25 (it wants
 * ^22.22 || ^24.15 || >=26) and works regardless.
 *
 * AUTH: an interactive 2FA code. npm refuses automation tokens for trust config
 * — granular tokens with "bypass 2FA" are explicitly unsupported by `npm trust`
 * — so this cannot run unattended in CI, only from a machine with a person at
 * it. See scripts/trust-new-packages.mjs, which does that at push time.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/** Repository whose workflow is allowed to publish. */
export const TRUST_REPO = 'molecule-dev/molecule'

/** Workflow file within that repository. */
export const TRUST_WORKFLOW = 'release.yml'

/**
 * npm version used for the trust command.
 *
 * Pinned because this is the version whose `npm trust github` interface is
 * known-good here; the machine's own npm (11.x) sends a request the registry
 * rejects for every package.
 */
export const TRUST_NPM = 'npm@12'

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
 * @param options - OTP and repo/workflow overrides.
 * @returns Outcome: `trusted`, `already`, `needs-otp`, or `error`, with npm's output.
 */
export async function trustPackage(name, options) {
  const { otp, repo = TRUST_REPO, workflow = TRUST_WORKFLOW } = options
  const trustArgs = [
    'trust',
    'github',
    name,
    '--repo',
    repo,
    '--file',
    workflow,
    '--allow-publish',
    '--yes',
  ]
  if (otp) trustArgs.push(`--otp=${otp}`)

  // Prefer the npm already on PATH when it is new enough. CI installs npm@latest
  // (12.x) globally, so going through npx there re-downloads npm for every
  // package AND puts a process between us and the timeout: execFileSync's
  // SIGTERM kills `npx`, the `npm` grandchild survives holding the pipe open,
  // and the call never returns. That hung a CI run past 20 minutes on a 120s
  // timeout. Locally npm is 11.x, whose trust command cannot succeed, so npx is
  // still the right answer there.
  const localMajor = Number(
    (() => {
      try {
        return execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim().split('.')[0]
      } catch (_error) {
        // Intentionally ignored: no npm on PATH is indistinguishable from an
        // unusable one for this decision, and both mean "go through npx".
        return '0'
      }
    })(),
  )
  const useLocal = localMajor >= 12
  const command = useLocal ? 'npm' : 'npx'
  const args = useLocal ? trustArgs : ['--yes', TRUST_NPM, ...trustArgs]

  try {
    const stdout = execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120_000,
      killSignal: 'SIGKILL',
    })
    return { outcome: 'trusted', status: 0, text: stdout.slice(0, 400) }
  } catch (error) {
    const text = `${error.stdout ?? ''}${error.stderr ?? ''}`.slice(0, 600)
    if (/already|duplicate/i.test(text)) return { outcome: 'already', status: 1, text }
    // Surfaced separately so the caller can re-prompt with a fresh code rather
    // than reporting a spent one-time password as a permanent failure.
    if (/EOTP|one-time pass|Two-factor/i.test(text))
      return { outcome: 'needs-otp', status: 1, text }
    return { outcome: 'error', status: 1, text }
  }
}
