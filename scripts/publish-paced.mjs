#!/usr/bin/env node
/**
 * Paced, resumable publisher for the `@molecule/*` fleet.
 *
 * WHY THIS EXISTS: `changeset publish` fires every unpublished package at the
 * registry as fast as it can. At 903 packages that earns a sustained E429 —
 * on 2026-08-04 it got 501 through and then failed the remaining 402, with npm
 * returning no Retry-After and burning 3 internal retries (~70s) per package.
 * npm does not document its publish rate limit, so the only workable strategy is
 * to go slowly and back off hard when told to.
 *
 * Properties that matter:
 *  - RESUMABLE. It asks the REGISTRY what already exists rather than trusting a
 *    local list, so re-running after any failure is always safe and never
 *    republishes. An "already exists" response counts as success, not an error.
 *  - PACED. A fixed delay between publishes, plus exponential backoff on 429
 *    that pauses the whole run (the limit is account-wide, so racing ahead to
 *    the next package just burns the same budget).
 *  - HONEST. Prints a running tally and writes the still-missing list at the end
 *    so a follow-up run has an accurate work list.
 *
 * Usage:
 *   node scripts/publish-paced.mjs                # publish everything missing
 *   node scripts/publish-paced.mjs --delay 10     # seconds between publishes
 *   node scripts/publish-paced.mjs --limit 50     # stop after N successes
 *   node scripts/publish-paced.mjs --dry-run      # list what WOULD publish
 */
import { execFileSync } from 'node:child_process'
import console from 'node:console'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
/**
 * Reads a CLI flag's value.
 *
 * @param name - Flag name.
 * @param fallback - Default when absent.
 * @returns The value.
 */
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? fallback : Number(args[i + 1])
}
const DELAY_S = flag('delay', 6)
const LIMIT = flag('limit', Infinity)
const DRY = args.includes('--dry-run')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Every publishable `@molecule` package on disk.
 *
 * @returns Array of {name, dir}.
 */
function discover() {
  const found = []
  const walk = (dir, depth) => {
    const manifest = join(dir, 'package.json')
    if (existsSync(manifest)) {
      try {
        const pkg = JSON.parse(readFileSync(manifest, 'utf8'))
        if (pkg.name?.startsWith('@molecule/') && !pkg.private) {
          found.push({ name: pkg.name, dir, version: pkg.version })
          return
        }
      } catch (_error) {
        // Not a readable manifest — keep descending.
      }
    }
    if (!depth) return
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue
      const child = join(dir, entry)
      try {
        if (statSync(child).isDirectory()) walk(child, depth - 1)
      } catch (_error) {
        // Vanished mid-walk.
      }
    }
  }
  walk(join(ROOT, 'packages'), 4)
  return found
}

/**
 * Whether this exact name@version is already on the registry.
 *
 * @param name - Package name.
 * @param version - Version to check.
 * @returns True when already published.
 */
async function isPublished(name, version) {
  const res = await fetch(`https://registry.npmjs.org/${name.replace('/', '%2f')}`)
  if (res.status === 404) return false
  if (!res.ok) return false
  const body = await res.json()
  return Boolean(body.versions?.[version])
}

const all = discover()
process.stderr.write(`discovered ${all.length} publishable packages\n`)

// Concurrent: 903 sequential registry reads took minutes. Reads are not the
// rate-limited path here (a full 903-package sweep hit zero read-429s), so
// checking 8 at a time is both safe and ~8x faster.
const todo = []
{
  let cursor = 0
  const worker = async () => {
    while (cursor < all.length) {
      const pkg = all[cursor++]
      if (!(await isPublished(pkg.name, pkg.version))) todo.push(pkg)
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker))
  todo.sort((a, b) => a.name.localeCompare(b.name))
}
process.stderr.write(
  `already published: ${all.length - todo.length} | to publish: ${todo.length}\n`,
)

if (DRY) {
  todo.forEach((p) => console.log(`${p.name}@${p.version}`))
  process.exit(0)
}

let done = 0
let failed = []
let backoff = 30_000

for (const pkg of todo) {
  if (done >= LIMIT) break
  let published = false

  // Rate limiting is NOT a failure of this package — it is the account-wide
  // window being shut, and the same package will publish fine once it reopens.
  // So a 429 must not consume a real-error attempt, or a long outage marks
  // hundreds of perfectly good packages "failed" and each subsequent one starts
  // already at the backoff cap. Real errors get a small retry budget; 429s get a
  // long wall-clock budget instead.
  let realAttempts = 0
  let waited = 0
  const MAX_WAIT_MS = 3 * 60 * 60_000 // give the window up to 3h to reopen

  while (!published && realAttempts < 3 && waited < MAX_WAIT_MS) {
    try {
      execFileSync('npm', ['publish', '--access', 'public'], {
        cwd: pkg.dir,
        stdio: 'pipe',
        encoding: 'utf8',
      })
      published = true
      backoff = 30_000 // The window reopened — reset for the next one.
    } catch (error) {
      const out = `${error.stdout ?? ''}${error.stderr ?? ''}`
      if (/cannot publish over|EPUBLISHCONFLICT|previously published/i.test(out)) {
        published = true // Already there; done, not an error.
      } else if (/E429|429 Too Many/i.test(out)) {
        process.stderr.write(
          `  429 on ${pkg.name} — waiting ${Math.round(backoff / 1000)}s (waited ${Math.round(waited / 60_000)}m total)\n`,
        )
        await sleep(backoff)
        waited += backoff
        backoff = Math.min(backoff * 2, 10 * 60_000)
      } else {
        realAttempts++
        if (realAttempts >= 3) {
          failed.push({
            name: pkg.name,
            error: out.split('\n').slice(0, 3).join(' ').slice(0, 200),
          })
        }
      }
    }
  }

  if (published) {
    done++
    if (done % 10 === 0) {
      process.stderr.write(`  published ${done}/${todo.length}\n`)
    }
    await sleep(DELAY_S * 1000)
  } else if (!failed.some((f) => f.name === pkg.name)) {
    failed.push({ name: pkg.name, error: 'exhausted 429 retries' })
  }
}

process.stderr.write(`\nDONE. published this run: ${done} | failures: ${failed.length}\n`)
if (failed.length) {
  writeFileSync(join(ROOT, '.publish-failures.json'), JSON.stringify(failed, null, 2))
  failed.slice(0, 10).forEach((f) => process.stderr.write(`  ${f.name}: ${f.error}\n`))
  process.stderr.write(`full list: molecule/.publish-failures.json\n`)
}
