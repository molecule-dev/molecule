#!/usr/bin/env node
/**
 * Create the packages npm has never seen, then trust them.
 *
 * This exists because npm's trust endpoint is per-package and 404s for a name
 * that does not exist, so a brand-new package cannot be trusted and therefore
 * cannot be published by OIDC. Something has to create it once. That is the
 * whole job: bootstrap publish, then trust config, then every later version
 * goes through `release.yml` with no credential at rest.
 *
 * AUTH: reads `NPM_TOKEN`, falling back to the `~/.npmrc` token. A granular
 * token does NOT need an OTP to publish — 2FA bypass covers publishing. Whether
 * it also covers TRUST CONFIG is the open question this script answers rather
 * than assumes: it attempts the trust POST with the same token and prints npm's
 * verbatim response. If that succeeds, the entire bootstrap is automatable from
 * CI and no human OTP is ever needed again; if npm demands 2FA, pass `--otp`.
 *
 *   NPM_TOKEN=npm_… node scripts/bootstrap-new-packages.mjs            # dry run
 *   NPM_TOKEN=npm_… node scripts/bootstrap-new-packages.mjs --write
 *   NPM_TOKEN=npm_… node scripts/bootstrap-new-packages.mjs --write --otp=123456
 */
import { execFileSync } from 'node:child_process'
import console from 'node:console'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { readNpmToken, trustPackage } from './lib/npm-trust.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const WRITE = args.includes('--write')
const OTP = (args.find((a) => a.startsWith('--otp=')) || '').split('=')[1]

const token = process.env.NPM_TOKEN || readNpmToken()
if (!token) {
  console.error('No credential. Set NPM_TOKEN or run `npm login`.')
  process.exit(1)
}

/**
 * Collects every publishable package with its directory.
 *
 * @param dir - Directory to walk.
 * @param found - Accumulator.
 * @returns Records of `{ name, version, dir }`.
 */
const collect = (dir, found = []) => {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    if (!statSync(full).isDirectory()) continue
    const manifest = join(full, 'package.json')
    if (existsSync(manifest)) {
      try {
        const json = JSON.parse(readFileSync(manifest, 'utf8'))
        if (json.name?.startsWith('@molecule/') && !json.private) {
          found.push({ name: json.name, version: json.version, dir: full })
          continue
        }
      } catch (error) {
        console.warn(`  ! skipped unreadable ${manifest}: ${error.message}`)
      }
    }
    collect(full, found)
  }
  return found
}

const all = collect(join(ROOT, 'packages'))

const missing = []
for (let i = 0; i < all.length; i += 40) {
  await Promise.all(
    all.slice(i, i + 40).map(async (pkg) => {
      const res = await fetch(`https://registry.npmjs.org/${pkg.name.replace('/', '%2f')}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(15_000),
      })
      if (res.status === 404) missing.push(pkg)
    }),
  )
}

if (!missing.length) {
  console.log('Nothing to bootstrap — every package is on the registry.')
  process.exit(0)
}

console.log(`${missing.length} package(s) npm has never seen:`)
for (const pkg of missing) console.log(`  ${pkg.name}@${pkg.version}`)

if (!WRITE) {
  console.log('\nDry run. Re-run with --write to publish and trust these.')
  process.exit(0)
}

const failures = []
for (const pkg of missing) {
  console.log(`\n=== ${pkg.name} ===`)
  try {
    // `npm publish` reads the token from the environment-scoped npmrc npm sets
    // up from NPM_CONFIG_//registry..., which is why this passes it that way
    // rather than writing a file — nothing lands on disk to clean up or leak.
    execFileSync('npm', ['publish', '--access', 'public', '--provenance'], {
      cwd: pkg.dir,
      stdio: 'inherit',
      env: { ...process.env, 'NPM_CONFIG_//registry.npmjs.org/:_authToken': token },
    })
    console.log(`  published ${pkg.name}@${pkg.version}`)
  } catch (error) {
    console.error(`  PUBLISH FAILED: ${error.message}`)
    failures.push(pkg.name)
    continue
  }

  const result = await trustPackage(pkg.name, { token, otp: OTP })
  console.log(`  trust: ${result.outcome} (${result.status})`)
  if (result.outcome !== 'trusted' && result.outcome !== 'already') {
    // Printed verbatim on purpose: this response is the ONLY evidence for
    // whether trust config accepts a plain token, and every prior note in this
    // repo that summarised it instead of quoting it turned out to be wrong.
    console.error(`  npm said: ${result.text}`)
    failures.push(`${pkg.name} (trust)`)
  }
}

if (failures.length) {
  console.error(`\nFAILED (${failures.length}): ${failures.join(', ')}`)
  process.exit(1)
}
console.log('\nAll bootstrapped. Re-run `npm run check:publishable` to confirm.')
