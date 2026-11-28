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
 * Two byte-identical copies: `molecule/scripts/audit-gate.mjs` (canonical) and
 * `mlcl/scripts/audit-gate.mjs`. Each repo's CI checks it out alone, so neither
 * can import the other. Edit the canonical one and copy it;
 * `scripts/__tests__/audit-gate-copies.test.mjs` in the workspace fails on drift
 * (mlcl's copy missed this script's error-document and every-advisory fixes for
 * two weeks, so its gate passed an npm error document as a clean scan).
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

// A repo that is not a workspaces root of its own (mlcl) is still a MEMBER of the
// polyrepo workspace when it sits inside molecule-workspace, and a bare
// `npm audit` there audits the workspace root's lockfile: on 2026-11-15 it
// reported 22 lapsed exceptions in mlcl, three of them (@vue/test-utils,
// js-beautify, editorconfig) from another member's devDependencies, where mlcl's
// own CI, which checks mlcl out alone, reported 19. `--workspaces=false` makes
// npm audit this repo's own package-lock.json, the tree CI and users install.
// A workspaces root (molecule) keeps the default, which covers its members.
let ownManifest = {}
try {
  ownManifest = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
} catch (error) {
  // No manifest next to the allowlist leaves nothing to scope to; an unreadable
  // or malformed one is a broken checkout, not a reason to audit another tree.
  if (error?.code !== 'ENOENT') throw error
}
// The JSON report is the verdict. Preserve npm's diagnostics when it could not write a report.
const auditArgs = [
  'audit',
  '--json',
  '--loglevel=notice',
  ...(ownManifest.workspaces ? [] : ['--workspaces=false']),
]

let report
try {
  // `npm audit` exits non-zero when it finds anything — that is the signal we
  // are parsing, not an error.
  report = JSON.parse(execFileSync('npm', auditArgs, { cwd: ROOT, encoding: 'utf8' }))
} catch (error) {
  if (!error.stdout) {
    console.error('audit-gate: `npm audit --json` produced no output')
    console.error(String(error.stderr ?? error).slice(0, 400))
    process.exit(2)
  }
  report = JSON.parse(error.stdout)
}

// An npm error document is not a scan with zero findings. Keep an unavailable
// or incomplete report red, including in --list mode.
if (
  report === null ||
  typeof report !== 'object' ||
  report.error ||
  report.vulnerabilities === null ||
  typeof report.vulnerabilities !== 'object' ||
  Array.isArray(report.vulnerabilities) ||
  report.metadata === null ||
  typeof report.metadata !== 'object' ||
  Array.isArray(report.metadata)
) {
  console.error('audit-gate: npm did not return a complete vulnerability report')
  process.exit(2)
}

const vulns = report.vulnerabilities

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
    // An advisory below the failing bar never fails the build on its own, so it
    // needs no entry when it rides along a chain that fails for another reason.
    if (typeof via === 'object' && via.url) {
      if (!FAIL_AT.includes(via.severity ?? 'critical')) continue
      ids.push(via.url.split('/').pop())
    } else if (typeof via === 'string') ids.push(...advisoryIdsFor(via, seen))
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
  // A finding passes only when EVERY advisory it is vulnerable through is named
  // by an unexpired entry: accepting one advisory in a package must not wave
  // through a second one reached the same way. A finding with no identifiable
  // advisory is never accepted. A package-level wildcard is deliberately not
  // supported: a new advisory in an already-accepted package must be re-decided.
  const entries = f.ids.map((id) => allowlist.accepted?.find((a) => a.advisories.includes(id)))
  const entry = entries.find((e) => e && e.expires < today)
  if (!f.ids.length || entries.some((e) => !e))
    blocking.push({ ...f, unaccepted: f.ids.filter((_id, i) => !entries[i]) })
  else if (entry) lapsed.push({ ...f, entry })
  else accepted.push({ ...f, entries: [...new Set(entries)] })
}

for (const a of accepted) {
  const expires = a.entries.map((e) => e.expires).sort()[0]
  console.log(`· accepted ${a.severity} in ${a.name} (${a.ids.join(', ')}) — expires ${expires}`)
  for (const e of a.entries) console.log(`  ${e.reason}`)
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
  if (b.unaccepted.length) console.error(`  unaccepted: ${b.unaccepted.join(', ')}`)
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
