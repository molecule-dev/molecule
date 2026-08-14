#!/usr/bin/env node
/**
 * audit-gate.mjs — `npm audit` with narrow, documented, EXPIRING exceptions.
 *
 * WHY THIS REPLACED A BARE `npm audit --audit-level=moderate`
 * ----------------------------------------------------------
 * On 2026-08-14 CI was found red on EVERY commit for at least two days, on a
 * single advisory with no upstream fix (`image-size`, reached only through the
 * opt-in `@molecule/api-export-pptx` → `pptxgenjs`). A gate that cannot go green
 * is not protecting anything — it trains everyone to ignore the one signal that
 * matters, and in this case the whole fleet was published past it three times
 * because the Release workflow did not consult CI yet.
 *
 * The fix is precision, NOT a lower bar: every advisory still fails the build
 * except ones explicitly accepted here, each with a reason and an expiry. When
 * an exception lapses the gate goes red again on purpose, which forces a
 * re-decision instead of letting an accepted risk become permanent and silent.
 *
 * This is deliberately NOT `--audit-level=high` or `--omit=dev`: both would hide
 * whole classes of finding to make one go away.
 *
 * Usage:
 *   node scripts/audit-gate.mjs            # fail on any non-accepted advisory
 *   node scripts/audit-gate.mjs --list     # print current advisories and exit 0
 *
 * @module
 */
import { execFileSync } from 'node:child_process'
import console from 'node:console'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const LIST_ONLY = process.argv.includes('--list')
/** Advisories at or above this severity fail the build. */
const FAIL_AT = ['moderate', 'high', 'critical']

const allowlist = JSON.parse(readFileSync(join(ROOT, '.audit-allowlist.json'), 'utf8'))
const today = new Date().toISOString().slice(0, 10)

let report
try {
  // `npm audit` exits non-zero when it finds anything — that is the signal we
  // are parsing, not an error.
  report = JSON.parse(execFileSync('npm', ['audit', '--json'], { cwd: ROOT, encoding: 'utf8' }))
} catch (error) {
  if (!error.stdout) {
    console.error('audit-gate: `npm audit --json` produced no output')
    console.error(String(error.stderr ?? error).slice(0, 400))
    process.exit(2)
  }
  report = JSON.parse(error.stdout)
}

const vulns = report.vulnerabilities ?? {}

/**
 * Advisory ids a package is vulnerable through, following transitive causes.
 *
 * npm reports a direct advisory as an object in `via` (carrying the GHSA url),
 * but a package that is vulnerable only BECAUSE a dependency is lists that
 * dependency's NAME as a bare string. Resolving those to the underlying
 * advisories is what lets one justified entry cover the whole chain — otherwise
 * `pptxgenjs` reads as an unidentifiable finding with no advisory to accept,
 * and the only way to green the build would be a blanket package mute.
 */
const advisoryIdsFor = (name, seen = new Set()) => {
  if (seen.has(name)) return []
  seen.add(name)
  const ids = []
  for (const via of vulns[name]?.via ?? []) {
    if (typeof via === 'object' && via.url) ids.push(via.url.split('/').pop())
    else if (typeof via === 'string') ids.push(...advisoryIdsFor(via, seen))
  }
  return [...new Set(ids)]
}

const findings = []
for (const [name, v] of Object.entries(vulns)) {
  if (!FAIL_AT.includes(v.severity)) continue
  findings.push({
    name,
    severity: v.severity,
    ids: advisoryIdsFor(name),
    fixAvailable: v.fixAvailable,
  })
}

if (LIST_ONLY) {
  console.log(JSON.stringify(findings, null, 2))
  process.exit(0)
}

const accepted = []
const blocking = []
const lapsed = []
for (const f of findings) {
  // An entry covers a finding only if it names one of its advisory ids AND has
  // not expired. A package-level wildcard is deliberately not supported: a new
  // advisory in an already-accepted package must be re-decided.
  const entry = allowlist.accepted?.find((a) => f.ids.some((id) => a.advisories.includes(id)))
  if (!entry) blocking.push(f)
  else if (entry.expires < today) lapsed.push({ ...f, entry })
  else accepted.push({ ...f, entry })
}

for (const a of accepted) {
  console.log(
    `· accepted ${a.severity} in ${a.name} (${a.ids.join(', ')}) — expires ${a.entry.expires}`,
  )
  console.log(`  ${a.entry.reason}`)
}
for (const l of lapsed) {
  console.error(
    `\n✗ EXPIRED exception for ${l.name} (${l.ids.join(', ')}) — lapsed ${l.entry.expires}.`,
  )
  console.error(
    `  Re-check upstream for a fix, then either bump it or renew the entry with a new decision.`,
  )
}
for (const b of blocking) {
  console.error(`\n✗ ${b.severity} advisory in ${b.name} (${b.ids.join(', ')})`)
  console.error(`  fixAvailable: ${JSON.stringify(b.fixAvailable)}`)
}

if (lapsed.length || blocking.length) {
  console.error(
    `\naudit-gate FAILED: ${blocking.length} unaccepted, ${lapsed.length} expired. ` +
      `Fix the dependency, or add a justified, dated entry to .audit-allowlist.json.`,
  )
  process.exit(1)
}
console.log(
  `\n✓ audit-gate: no unaccepted moderate+ advisories (${accepted.length} documented exception(s))`,
)
