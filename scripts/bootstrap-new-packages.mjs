#!/usr/bin/env node
/**
 * Bootstrap packages that have NEVER been published: publish once, then hand them
 * to trusted publishing so every future release goes through CI with no secret.
 *
 * WHY THIS IS NEEDED AT ALL: npm's trusted publishing is configured PER PACKAGE
 * and only on a package that already exists — there is no scope- or org-level
 * setting (verified against npm's docs, 2026-08-05). So a brand-new package can
 * never be published by OIDC first:
 *
 *   new package -> no trusted publisher can exist yet
 *               -> OIDC has nothing to authenticate against
 *               -> the FIRST publish must use a normal login
 *               -> after which `npm trust` makes CI self-sufficient forever
 *
 * That one-time bootstrap is what this script automates.
 *
 * AUTH — both operations must work in ONE session, which is the fiddly part:
 *   - `npm publish` works with a granular token, including a bypass-2FA one.
 *   - `npm trust` REFUSES bypass-2FA tokens (403), because it is an account
 *     change rather than a publish.
 *
 * So a bypass-2FA token cannot do both. Use an interactive login instead:
 *
 *   1. mv ~/.npmrc ~/.npmrc.token-backup     # set any bypass token aside
 *   2. npm login                             # browser flow
 *   3. On the first 2FA challenge, take npm's "skip 2FA for the next 5 minutes"
 *      option — publish AND trust then both work unattended inside that window.
 *   4. node scripts/bootstrap-new-packages.mjs --write
 *
 * Idempotent: a package already on the registry is skipped, and a package that
 * already has a trusted publisher reports as such rather than failing.
 *
 *   node scripts/bootstrap-new-packages.mjs            # dry run
 *   node scripts/bootstrap-new-packages.mjs --write
 */
import { execFileSync } from 'node:child_process'
import console from 'node:console'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const WRITE = process.argv.includes('--write')
const REPO = 'molecule-dev/molecule'
const WORKFLOW = 'release.yml'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Every publishable `@molecule` package on disk, at any depth.
 *
 * @returns Array of {name, dir, version}.
 */
function discover() {
  const found = []
  const walk = (dir) => {
    const manifest = join(dir, 'package.json')
    if (existsSync(manifest)) {
      try {
        const pkg = JSON.parse(readFileSync(manifest, 'utf8'))
        if (pkg.name?.startsWith('@molecule/') && !pkg.private) {
          found.push({ name: pkg.name, dir, version: pkg.version })
          return
        }
      } catch (_error) {
        // Unreadable manifest — keep descending.
      }
    }
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue
      const child = join(dir, entry)
      try {
        if (statSync(child).isDirectory()) walk(child)
      } catch (_error) {
        // Vanished mid-walk.
      }
    }
  }
  walk(join(ROOT, 'packages'))
  return found
}

/**
 * Whether the package exists on the registry in ANY version.
 *
 * @param name - Package name.
 * @returns True if present, false if 404, null if unknown.
 */
async function existsOnRegistry(name) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`https://registry.npmjs.org/${name.replace('/', '%2f')}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(15_000),
      })
      if (res.status === 404) return false
      if (res.ok) return true
      return null
    } catch (_error) {
      // Timeout — retry once, then report unknown rather than guessing.
    }
  }
  return null
}

const all = discover().sort((a, b) => a.name.localeCompare(b.name))
// Concurrent: 910 sequential HEADs took minutes and timed out. Reads are not the
// rate-limited path, so 8 at a time is safe and roughly 8x faster.
const brandNew = []
{
  let cursor = 0
  const worker = async () => {
    while (cursor < all.length) {
      const pkg = all[cursor++]
      if ((await existsOnRegistry(pkg.name)) === false) brandNew.push(pkg)
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker))
  brandNew.sort((a, b) => a.name.localeCompare(b.name))
}

console.log(`${all.length} packages on disk | never published: ${brandNew.length}`)
brandNew.forEach((p) => console.log(`  ${p.name}@${p.version}`))

if (brandNew.length === 0) {
  console.log('\nNothing to bootstrap.')
  process.exit(0)
}
if (!WRITE) {
  console.log('\nDry run. See the AUTH steps at the top of this file, then re-run with --write.')
  process.exit(0)
}

let published = 0
let trusted = 0
const problems = []

for (const pkg of brandNew) {
  // --- 1. First publish (needs an interactive login; OIDC cannot do this) ---
  try {
    execFileSync('npm', ['publish', '--access', 'public', '--fetch-retries=0'], {
      cwd: pkg.dir,
      stdio: 'pipe',
      encoding: 'utf8',
    })
    published++
    console.log(`✓ published  ${pkg.name}@${pkg.version}`)
  } catch (error) {
    const out = `${error.stdout ?? ''}${error.stderr ?? ''}`
    if (/cannot publish over|EPUBLISHCONFLICT|previously published/i.test(out)) {
      console.log(`· already on registry  ${pkg.name}`)
    } else if (/E429|429 Too Many/i.test(out)) {
      console.error(`\n✗ RATE LIMITED on ${pkg.name} — stopping (retries keep the window shut).`)
      problems.push({ name: pkg.name, step: 'publish', error: 'E429' })
      break
    } else {
      problems.push({
        name: pkg.name,
        step: 'publish',
        error: out.split('\n').slice(0, 3).join(' ').slice(0, 200),
      })
      console.error(`✗ publish failed  ${pkg.name}`)
      continue // no point trusting a package that is not there
    }
  }

  // --- 2. Hand it to trusted publishing so CI never needs a token again ---
  try {
    execFileSync(
      'npm',
      ['trust', 'github', pkg.name, '--file', WORKFLOW, '--repo', REPO, '--yes'],
      { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' },
    )
    trusted++
    console.log(`✓ trusted    ${pkg.name} -> ${REPO} / ${WORKFLOW}`)
  } catch (error) {
    const out = `${error.stdout ?? ''}${error.stderr ?? ''}`
    if (/already (exists|trusted)|duplicate/i.test(out)) {
      trusted++
      console.log(`· already trusted  ${pkg.name}`)
    } else {
      problems.push({
        name: pkg.name,
        step: 'trust',
        error: out.split('\n').filter(Boolean).slice(-2).join(' ').slice(0, 200),
      })
      console.error(`✗ trust failed  ${pkg.name}`)
      if (/bypass two-factor|E403|403 Forbidden/i.test(out)) {
        console.error('\nAuth rejected for `npm trust` — a bypass-2FA token cannot do this.')
        console.error('See the AUTH steps at the top of this file.')
        break
      }
    }
  }

  await sleep(2000)
}

console.log(`\nDONE. published: ${published} | trusted: ${trusted} | problems: ${problems.length}`)
problems.forEach((p) => console.log(`  ${p.step}: ${p.name} — ${p.error}`))
if (problems.length > 0) process.exit(1)
