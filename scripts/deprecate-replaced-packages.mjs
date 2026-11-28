#!/usr/bin/env node
/**
 * Deprecate on npm, once, every package the mlcl registry marks `replacedBy`.
 *
 * A renamed package keeps its old name on npm, and mlcl offers only the new one (`replacedBy`
 * in mlcl/registry.json). An install of the old name still works without a word unless npm says
 * it is deprecated, so a project that pinned it never learns of the rename. This deprecates each
 * version of the old name with a message naming the new one. A name whose every version npm
 * already marks deprecated, or one npm has never had, needs nothing.
 *
 * `npm deprecate` needs a signed-in session and a 2FA code. The saved login in ~/.npmrc is used
 * when npm accepts it; otherwise, and for each code, the owner's phone is asked through the local
 * approval service (lib/npm-2fa-approval.mjs), so an agent can run this itself. A login from the
 * phone lives only in a temporary npm config for this run.
 *
 *   node scripts/deprecate-replaced-packages.mjs           # deprecate what is due
 *   node scripts/deprecate-replaced-packages.mjs --list    # report only (exit 1 when some are due)
 *
 * MLCL_REGISTRY_PATH names another registry file (default: mlcl/registry.json in the aggregate).
 */
import { spawnSync } from 'node:child_process'
import console from 'node:console'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { aggregateRoot } from './lib/aggregate-root.mjs'
import { isMainModule } from './lib/is-main.mjs'
import {
  approvalServiceAvailable,
  npmApprovalLink,
  requestOwnerNpmLogin,
  requestOwnerOtp,
} from './lib/npm-2fa-approval.mjs'
import { npmUserconfigWithToken, readNpmToken } from './lib/npm-trust.mjs'

/**
 * The message npm shows on install of a renamed package.
 *
 * @param name - The old name.
 * @param replacement - The name it was renamed to.
 * @returns The deprecation message.
 */
export function deprecationMessage(name, replacement) {
  return `${name} was renamed to ${replacement}; install ${replacement} instead.`
}

/**
 * The packages a registry marks as replaced, in name order.
 *
 * @param registry - The parsed mlcl registry.
 * @returns `{ name, replacement }` for each entry with `replacedBy`.
 */
export function replacedPackages(registry) {
  return Object.entries(registry.packages ?? {})
    .filter(([, entry]) => typeof entry?.replacedBy === 'string' && entry.replacedBy !== '')
    .map(([name, entry]) => ({ name, replacement: entry.replacedBy }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * The replaced packages npm has a version of that it does not mark deprecated.
 *
 * @param replaced - What {@link replacedPackages} returned.
 * @param packument - Returns npm's document for a name (`{ versions }`), or null when npm has
 *   never had it.
 * @returns The ones to deprecate, each with the versions npm does not mark yet.
 */
export async function deprecationsDue(replaced, packument) {
  const due = []
  for (const pkg of replaced) {
    const doc = await packument(pkg.name)
    if (!doc) continue
    const open = Object.entries(doc.versions ?? {})
      .filter(([, version]) => !version.deprecated)
      .map(([version]) => version)
    if (open.length) due.push({ ...pkg, versions: open })
  }
  return due
}

/**
 * npm's document for a package name, or null when npm has never had it.
 *
 * @param name - The package name.
 * @returns The packument.
 */
async function registryPackument(name) {
  const response = await fetch(`https://registry.npmjs.org/${name.replace('/', '%2F')}`, {
    signal: AbortSignal.timeout(30_000),
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`npm answered ${response.status} for ${name}`)
  return response.json()
}

/**
 * npm's answer to `whoami` for a session token.
 *
 * @param bearer - The token.
 * @returns The HTTP status.
 */
async function whoamiStatus(bearer) {
  const response = await fetch('https://registry.npmjs.org/-/whoami', {
    headers: { authorization: `Bearer ${bearer}` },
    signal: AbortSignal.timeout(20_000),
  })
  return response.status
}

/**
 * Run the post-approval deprecation and capture npm's diagnostic.
 *
 * @param pkg - The replaced package and its replacement.
 * @param otp - The owner's npm code.
 * @param userconfig - npm configuration for the approved session.
 * @returns npm's status and captured output.
 */
export function runNpmDeprecation(pkg, otp, userconfig) {
  return spawnSync(
    'npm',
    [
      'deprecate',
      pkg.name,
      deprecationMessage(pkg.name, pkg.replacement),
      '--loglevel=notice',
      '--otp',
      otp,
      '--userconfig',
      userconfig,
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  )
}

/**
 * Deprecates what is due, asking the owner's phone for the sign-in and codes it needs.
 *
 * @returns The exit status: 0 when nothing is left due.
 */
async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..')
  const registryPath =
    process.env.MLCL_REGISTRY_PATH || join(aggregateRoot(root), 'mlcl', 'registry.json')
  const due = await deprecationsDue(
    replacedPackages(JSON.parse(readFileSync(registryPath, 'utf8'))),
    registryPackument,
  )
  if (!due.length) {
    console.log('Every replaced package is deprecated on npm.')
    return 0
  }
  for (const pkg of due)
    console.log(
      `${pkg.name}: ${pkg.versions.length} version(s) not deprecated (renamed to ${pkg.replacement})`,
    )
  if (process.argv.includes('--list')) return 1

  const phone = await approvalServiceAvailable()
  let token = readNpmToken()
  if (!token || (await whoamiStatus(token)) !== 200) {
    if (!phone) {
      console.error('Not signed in to npm, and no phone approval service runs: run `npm login`.')
      return 1
    }
    console.error("No valid npm login; asked the owner's phone to sign in to npm…")
    token = await requestOwnerNpmLogin({
      purpose: `deprecate ${due.length} renamed package(s) on npm: ${due.map((p) => p.name).join(', ')}`,
    })
  }
  if (!phone) {
    console.error('No phone approval service runs to ask for an npm code.')
    return 1
  }
  const login = npmUserconfigWithToken(token)
  let failed = 0
  try {
    for (const pkg of due) {
      console.error(`  asked the owner's phone for an npm code (deprecate ${pkg.name})…`)
      const { otp } = await requestOwnerOtp({
        purpose: `deprecate ${pkg.name} on npm: it was renamed to ${pkg.replacement}`,
        link: () => npmApprovalLink(pkg.name, { bearer: token }),
        bearer: token,
      })
      const run = runNpmDeprecation(pkg, otp, login.path)
      if (run.status !== 0) {
        failed += 1
        console.error(`✗ ${pkg.name}: npm deprecate exited ${run.status}\n${run.stderr}`)
        continue
      }
      const after = await deprecationsDue([pkg], registryPackument)
      if (after.length) {
        failed += 1
        console.error(`✗ ${pkg.name}: npm still lists ${after[0].versions.length} open version(s)`)
      } else
        console.log(`✓ ${pkg.name} deprecated: ${deprecationMessage(pkg.name, pkg.replacement)}`)
    }
  } finally {
    login.dispose()
  }
  return failed ? 1 : 0
}

if (isMainModule(import.meta.url)) process.exit(await main())
