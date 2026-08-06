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
 * Names the registry reported as entirely absent (HTTP 404), filled in by the
 * scan below. A package here has never been published under any version.
 */
const neverPublished = new Set()

/**
 * Whether the registry has ever seen this package under any version.
 *
 * @param pkg - The package being published.
 * @returns False only when the scan positively observed a 404 for it.
 */
function existsOnRegistry(pkg) {
  return !neverPublished.has(pkg.name)
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
      if (res.status === 404) {
        // The package does not exist AT ALL (not merely missing this version).
        // Recorded because a never-published package cannot have a trusted
        // publisher — npm's trust endpoint 404s on it — so its auth failure is
        // local to it and must not abort the fleet. See the ENEEDAUTH branch.
        neverPublished.add(name)
        return false
      }
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

// How many packages must fail auth, with NONE succeeding, before the run calls
// auth systemic and stops.
//
// It used to be one, and one is wrong: the queue is name-sorted, so a single
// untrusted package that happens to sort first aborts the whole release before
// any healthy package is attempted. api-code-sandbox-flyio did exactly that to
// a run with 8 packages queued, twice — it exists on the registry but was never
// trusted, because npm's trust endpoint 404s a package that does not exist yet
// and nobody re-ran the setup after its first publish.
//
// Trying a few costs nothing — rejections are not rate-limited publishes — and
// it distinguishes "this package is not trusted" from "the OIDC exchange is
// broken", which the first failure alone cannot.
const AUTH_FAILURES_BEFORE_SYSTEMIC = 3
let authFailures = 0

let done = 0
let failed = []
// Set to a short reason string when the run must abort mid-way. Both causes —
// the rate limiter and an auth failure — are ACCOUNT-WIDE, so continuing to the
// next package cannot succeed and only makes things worse.
let abortReason = null

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

let attempted = 0

for (const pkg of todo) {
  if (abortReason) break
  // Bound ATTEMPTS, not successes. `done >= LIMIT` only counted publishes that
  // worked, so a `--limit 1` probe whose first package FAILED kept going — on
  // 2026-08-05 it attempted four and failed all four, which is precisely the
  // blast radius a probe exists to avoid.
  if (attempted >= LIMIT) break
  attempted++
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
        {
          cwd: pkg.dir,
          // stdin MUST be closed. With `stdio: 'pipe'` npm gets a live stdin, so
          // the moment it decides it wants a one-time password it prints the
          // prompt and blocks on a read that will never return. On 2026-08-05
          // that hung a single `npm publish` for 7.5 minutes with ZERO output
          // until the run was cancelled — and left to itself it would have
          // consumed the 6h job limit and published nothing. Closing stdin turns
          // an unbounded hang into an instant, readable error.
          stdio: ['ignore', 'pipe', 'pipe'],
          encoding: 'utf8',
          // Belt and braces: no single package may wedge a 577-package loop, for
          // any reason — prompt, stalled socket, or a hang we have not seen yet.
          timeout: 120_000,
          killSignal: 'SIGKILL',
        },
      )
      published = true
    } catch (error) {
      const out = `${error.stdout ?? ''}${error.stderr ?? ''}`
      // npm puts its NOTICES first (the tarball manifest, config warnings) and the
      // actual reason LAST, so the obvious `slice(0, 3)` captures pure noise and
      // discards the error — which is exactly what happened on 2026-08-05: four
      // failures reported nothing but 'npm warn Unknown user config "always-auth"'
      // and a 📦 line, and stdio:'pipe' means none of it reaches the CI log either.
      // Prefer real error lines; fall back to the TAIL, never the head.
      const errLines = out
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !/^npm (notice|warn)/i.test(l))
      const reason = (errLines.length ? errLines.slice(-4) : out.trim().split('\n').slice(-4))
        .join(' | ')
        .slice(0, 400)
      if (error.signal === 'SIGKILL') {
        // Killed by our own timeout. Report it as itself rather than letting it
        // land in the generic bucket, where a hang looks like a publish error.
        failed.push({
          name: pkg.name,
          error: `TIMED OUT after 120s — npm was likely blocked on a prompt. Tail: ${reason || '(no output at all)'}`,
        })
        break
      }
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
        abortReason = 'rate limited'
        break
      } else if (
        /ENEEDAUTH|E401|401 Unauthorized|EOTP/i.test(out) &&
        (!existsOnRegistry(pkg) || done > 0 || authFailures < AUTH_FAILURES_BEFORE_SYSTEMIC)
      ) {
        authFailures++
        // NOT systemic, for either of two reasons.
        //
        // (a) done > 0 — packages ALREADY published in this very run, so the
        //     OIDC exchange plainly works. Whatever is wrong is specific to
        //     this package (typically: it exists but was never trusted, e.g.
        //     one created outside the normal flow). Aborting here threw away
        //     a working run over one package, twice.
        //
        // (b) this package has simply never been published, so npm has
        // no trusted publisher for it — `npm trust` 404s on a package that does
        // not exist ({"message":"Package not found"}, verified 2026-08-06). Its
        // auth failure says nothing about the other 913.
        //
        // Treating it as systemic meant ONE new package halted the entire fleet
        // release, and since the run is name-ordered an `api-*` newcomer aborted
        // before any `app-*` package was reached. That is how a release carrying
        // an urgent fix to app-bonds-default-react published NOTHING, twice,
        // while reporting success.
        //
        // So: record it, keep going, and let the run's exit code carry it (see
        // the failure summary below). The genuinely systemic case is still caught
        // — if auth is broken for everyone, every package lands in `failed` and
        // the run exits non-zero with all of them named.
        failed.push({
          name: pkg.name,
          error: 'never published and not trusted — run scripts/trust-publish-setup.mjs',
        })
        process.stderr.write(
          `  ⚠ ${pkg.name}: not trusted for publishing — skipping, not aborting.\n`,
        )
        // BREAK OUT OF THE RETRY LOOP. Retrying an auth rejection cannot help —
        // the credential does not change between attempts — and without this the
        // same package burned all three tolerated failures by itself and then
        // tripped the systemic check, which is the failure this branch exists to
        // prevent. One package, one auth failure.
        break
      } else if (/ENEEDAUTH|E401|401 Unauthorized|EOTP/i.test(out)) {
        // ALSO STOP THE ENTIRE RUN — an auth failure is systemic, never per-package.
        //
        // This message exists because npm makes the OIDC failure mode genuinely
        // unreadable. Read lib/utils/oidc.js: EVERY failure path is a bare
        // `return undefined` logged at `verbose`/`silly`, which is invisible at
        // the default loglevel. npm then falls back to the `_authToken` in
        // .npmrc — which, once NPM_TOKEN is deleted, setup-node has written as an
        // EMPTY string. So "this package has no trusted publisher configured"
        // surfaces as a plain ENEEDAUTH with nothing pointing at OIDC at all, and
        // would do so 577 times in a row.
        process.stderr.write(
          `\n✗ AUTH FAILED on ${pkg.name} — stopping (auth is systemic, not per-package).\n` +
            `  Published ${done} package(s) this run.\n\n` +
            `  On CI this almost always means the OIDC exchange silently declined and\n` +
            `  npm fell back to an empty token. Check, in order:\n` +
            `    1. Is this package trusted?  scripts/trust-publish-setup.mjs\n` +
            `       (npm cannot trust a package that is not on the registry yet —\n` +
            `        a brand-new package is fine — createPackage creates it via OIDC)\n` +
            `    2. Does the job grant  permissions: id-token: write ?\n` +
            `    3. Is npm >= 11.5.1?  Older npm has no OIDC support and fails the same way.\n` +
            `    4. Does the trusted publisher's workflow file match the one running?\n\n` +
            `  To see npm's own reason, re-run one package with --loglevel verbose and\n` +
            `  grep for "oidc" — those lines are hidden at the default loglevel.\n`,
        )
        abortReason = 'auth failed'
        break
      } else {
        realAttempts++
        if (realAttempts >= 3) {
          failed.push({ name: pkg.name, error: reason || '(no output)' })
          // Print it as it happens. A failure list at the very end is useless when
          // the run is long or gets cancelled — this is the only place the reason
          // reaches the CI log, since stdio is piped.
          process.stderr.write(`  \u2717 ${pkg.name}: ${reason}\n`)
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
    failed.push({ name: pkg.name, error: `stopped: ${abortReason}` })
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
