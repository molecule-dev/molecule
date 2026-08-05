#!/usr/bin/env node
/**
 * Paced, resumable publisher for the `@molecule/*` fleet.
 *
 * WHY THIS EXISTS: `changeset publish` fires every unpublished package at the
 * registry as fast as it can. At 903 packages that earns a sustained E429 — on
 * 2026-08-04 it got 501 through and then failed the remaining 402.
 *
 * DO NOT REINTRODUCE BACKOFF-AND-RETRY. The first version of this script waited
 * and retried on 429, which seemed obviously right and was exactly wrong. npm
 * support, 2026-08-04:
 *
 *   "Continued retries, even with backoff, can keep re-triggering the limiter."
 *   "We are not able to manually raise, reset, or lift npm publish rate limits;
 *    the limiter clears automatically after a cooldown window."
 *
 * Retrying does not ride the throttle out, it sustains it: with 10-minute backoff
 * the fleet managed ~80 packages in 8 hours and the troughs kept lengthening. The
 * only thing that clears it is a genuine pause with ZERO publish attempts.
 *
 * Properties that matter:
 *  - RESUMABLE. It asks the REGISTRY what already exists rather than trusting a
 *    local list, so re-running after any failure is safe and never republishes.
 *    An "already exists" response counts as success, not an error.
 *  - ABORTS ON 429. One rate-limit response stops the whole run immediately. The
 *    limiter is account-wide, so continuing to the next package only fails again
 *    and extends the cooldown.
 *  - NO HIDDEN RETRIES. `--fetch-retries=0` disables npm's internal retry loop,
 *    which otherwise burns ~70s per failure and re-triggers the limiter unseen.
 *  - BATCHABLE. `--limit` publishes N and stops, which is what npm support asks
 *    for after a cooldown: small batches, single-threaded, generous spacing.
 *
 * Usage:
 *   node scripts/publish-paced.mjs --limit 1              # first probe after a cooldown
 *   node scripts/publish-paced.mjs --limit 25 --delay 20  # a batch
 *   node scripts/publish-paced.mjs --dry-run              # list what WOULD publish
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
// Env fallbacks exist because changesets does NOT run the publish command through
// a shell: it treats the first token as the command and passes the rest as args to
// it, so `node script.mjs --limit 1` becomes npm's flags and fails EUNKNOWNCONFIG.
// Env vars survive that intact.
const DELAY_S = flag('delay', Number(process.env.MOL_PUBLISH_DELAY) || 20)
const LIMIT = flag('limit', Number(process.env.MOL_PUBLISH_LIMIT) || Infinity)
const DRY = args.includes('--dry-run')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Every publishable `@molecule` package on disk.
 *
 * @returns Array of {name, dir}.
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
        // Not a readable manifest — keep descending.
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
 * Whether this exact name@version is already on the registry.
 *
 * @param name - Package name.
 * @param version - Version to check.
 * @returns True when already published.
 */
async function isPublished(name, version) {
  // A TIMEOUT IS MANDATORY HERE. Without one, `fetch` can hang a socket
  // indefinitely — and it did: a run spent 45 minutes wedged in the registry
  // sweep, printing nothing, until it was killed. The registry throttles reads
  // too, so hung connections are the normal case under load, not an edge case.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`https://registry.npmjs.org/${name.replace('/', '%2f')}`, {
        signal: AbortSignal.timeout(15_000),
      })
      if (res.status === 404) return false
      if (!res.ok) return null // unknown — caller decides, never assume "missing"
      const body = await res.json()
      return Boolean(body.versions?.[version])
    } catch (_error) {
      // Timeout or network blip: one quick retry, then give up as UNKNOWN.
      // Returning false here would be worse than useless — it would claim a
      // published package is missing and trigger a needless publish.
    }
  }
  return null
}

const all = discover()
process.stderr.write(`discovered ${all.length} publishable packages\n`)

all.sort((a, b) => a.name.localeCompare(b.name))

if (DRY) {
  const missing = []
  let cursor = 0
  const worker = async () => {
    while (cursor < all.length) {
      const pkg = all[cursor++]
      if ((await isPublished(pkg.name, pkg.version)) === false) missing.push(pkg)
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker))
  missing.sort((a, b) => a.name.localeCompare(b.name))
  process.stderr.write(
    `already published: ${all.length - missing.length} | to publish: ${missing.length}\n`,
  )
  missing.forEach((p) => console.log(`${p.name}@${p.version}`))
  process.exit(0)
}

let done = 0
let failed = []
let rateLimited = false

// Find what needs publishing with CONCURRENT reads, stopping as soon as we have
// enough for this run. Two earlier designs each failed on one half of this:
//
//   - an upfront sweep of all 910 was fast at skipping but cost minutes of
//     silence before a --limit 1 run could publish anything;
//   - a lazy sequential check started instantly but crawled, because it walks the
//     ~333 already-published packages one at a time and each read can cost up to
//     30s under a slow registry. A real run sat at "checked 50/910" for 30 min.
//
// Reads are not the rate-limited path (a full 910 sweep hit zero read-429s), so
// concurrency is safe here — only PUBLISHES must stay single-threaded and paced.
const todo = []
{
  const want = LIMIT === Infinity ? all.length : LIMIT
  let cursor = 0
  let scanned = 0
  const worker = async () => {
    while (cursor < all.length && todo.length < want) {
      const pkg = all[cursor++]
      const state = await isPublished(pkg.name, pkg.version)
      scanned++
      if (scanned % 100 === 0) {
        process.stderr.write(
          `  …scanned ${scanned}/${all.length}, found ${todo.length} to publish\n`,
        )
      }
      if (state === false) todo.push(pkg)
      // state === true  -> already there, skip
      // state === null  -> registry inconclusive; skip rather than publish blind
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker))
  todo.sort((a, b) => a.name.localeCompare(b.name))
  process.stderr.write(`scanned ${scanned}/${all.length} | queued to publish: ${todo.length}\n`)
}

for (const pkg of todo) {
  if (rateLimited) break
  if (done >= LIMIT) break
  let published = false

  // A 429 ABORTS THE WHOLE RUN. This reverses the original design, on npm
  // support's explicit guidance (2026-08-04):
  //
  //   "Continued retries, even with backoff, can keep re-triggering the limiter."
  //   "npm publish rate limits cannot be manually raised, reset, or lifted; the
  //    limiter clears automatically after a cooldown window."
  //
  // So waiting-and-retrying does not ride out the throttle — it sustains it.
  // Backing off for 10 minutes and trying again is what kept the window shut all
  // night, publishing 80 packages in 8 hours. The correct response is to stop,
  // let the window cool for a full 24h, and resume in small batches (--limit).
  let realAttempts = 0

  while (!published && realAttempts < 3) {
    try {
      execFileSync(
        'npm',
        [
          'publish',
          '--access',
          'public',
          // npm's OWN retry loop burns ~70s per failure and, per npm support,
          // keeps re-triggering the limiter. We want one attempt and a clean
          // answer, not three hidden ones.
          '--fetch-retries=0',
        ],
        { cwd: pkg.dir, stdio: 'pipe', encoding: 'utf8' },
      )
      published = true
    } catch (error) {
      const out = `${error.stdout ?? ''}${error.stderr ?? ''}`
      if (/cannot publish over|EPUBLISHCONFLICT|previously published/i.test(out)) {
        published = true // Already there; done, not an error.
      } else if (/E429|429 Too Many/i.test(out)) {
        // STOP THE ENTIRE RUN. Do not retry, do not continue to the next package
        // — the limiter is account-wide, so every subsequent attempt both fails
        // and extends the cooldown.
        process.stderr.write(
          `\n✗ RATE LIMITED on ${pkg.name}\n` +
            `  Published ${done} package(s) this run before hitting the limiter.\n` +
            `  Stopping immediately — per npm support, continued attempts keep the\n` +
            `  window shut. Wait a FULL 24h with zero publish attempts (including\n` +
            `  CI), then resume in small batches:  --limit 25 --delay 20\n`,
        )
        rateLimited = true
        break
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
      process.stderr.write(`  published ${done}\n`)
    }
    await sleep(DELAY_S * 1000)
  } else if (!failed.some((f) => f.name === pkg.name)) {
    failed.push({ name: pkg.name, error: 'stopped: rate limited' })
  }
}

process.stderr.write(
  `\nDONE. published this run: ${done}/${todo.length} queued | fleet: ${all.length} | failures: ${failed.length}\n`,
)
if (failed.length) {
  writeFileSync(join(ROOT, '.publish-failures.json'), JSON.stringify(failed, null, 2))
  failed.slice(0, 10).forEach((f) => process.stderr.write(`  ${f.name}: ${f.error}\n`))
  process.stderr.write(`full list: molecule/.publish-failures.json\n`)
}
