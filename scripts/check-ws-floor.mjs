#!/usr/bin/env node
/* global console, process */

/**
 * Dependency-health gate: fail the build if any installed copy of `ws`
 * resolves below the patched floor.
 *
 * ws 8.0.0–8.20.1 is vulnerable to GHSA-96hv-2xvq-fx4p (CWE-400/770,
 * CVSS 7.5): unauthenticated memory-exhaustion DoS from a flood of tiny
 * WebSocket fragments / data chunks. Fixed in 8.21.0.
 *
 * The socket.io realtime bond pins `socket.io@4.8.3`, which historically
 * nested the vulnerable `ws@8.20.1` twice (via `engine.io@6.6.8` and
 * `socket.io-adapter@2.5.7`). The bond now forwards the patched
 * `engine.io@6.6.9` + `socket.io-adapter@2.5.8` (both depend on `ws@~8.21.0`)
 * and the monorepo root pins an `overrides.ws` — this gate guards against a
 * stale lockfile or a future dependency bump silently re-introducing a
 * vulnerable `ws`. Run it after `npm install` (locally and in CI).
 *
 * Walks every `node_modules/**\/ws/package.json` reachable from the repo
 * root and asserts each version meets the floor — a structural check over
 * the real resolved tree, not a name denylist.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** First non-vulnerable `ws` release (GHSA-96hv-2xvq-fx4p fixed here). */
const WS_FLOOR = '8.21.0'

/**
 * Compare two dotted numeric semver cores (`a` vs `b`), ignoring any
 * pre-release/build suffix.
 *
 * @param a - Left version string.
 * @param b - Right version string.
 * @returns Negative if a<b, 0 if equal, positive if a>b.
 */
function compareVersions(a, b) {
  const pa = a.split('-')[0].split('.').map(Number)
  const pb = b.split('-')[0].split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0)
    if (diff !== 0) return diff
  }
  return 0
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Accumulated `ws` package.json locations + versions found on disk. */
const found = []

/**
 * Recursively scan a directory for `ws/package.json` files under any
 * `node_modules`, recording each version.
 *
 * @param dir - Directory to scan.
 * @param depth - Recursion guard depth.
 * @returns Nothing; mutates the module-level `found` array.
 */
function scan(dir, depth = 0) {
  if (depth > 12) return
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch (_error) {
    // Unreadable directory (permissions / race) — nothing resolvable here.
    return
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const full = join(dir, entry.name)
    if (entry.name === 'ws') {
      try {
        const pkg = JSON.parse(readFileSync(join(full, 'package.json'), 'utf-8'))
        if (pkg.name === 'ws' && typeof pkg.version === 'string') {
          found.push({ path: full, version: pkg.version })
        }
      } catch (_error) {
        // Not a readable `ws` package manifest — skip.
      }
      continue
    }
    // Descend only through node_modules trees to keep the walk bounded.
    if (entry.name === 'node_modules' || dir.includes('node_modules')) {
      scan(full, depth + 1)
    }
  }
}

const rootNodeModules = join(repoRoot, 'node_modules')
try {
  statSync(rootNodeModules)
} catch (_error) {
  console.error('check:ws-floor — node_modules not found. Run `npm install` before this gate.')
  process.exit(1)
}

scan(rootNodeModules)

const vulnerable = found.filter((f) => compareVersions(f.version, WS_FLOOR) < 0)

if (vulnerable.length > 0) {
  console.error(`Vulnerable ws (<${WS_FLOOR}, GHSA-96hv-2xvq-fx4p) resolved:`)
  for (const v of vulnerable) {
    console.error(`  ws@${v.version}  ${v.path}`)
  }
  console.error(
    `\nForce ws>=${WS_FLOOR}. The socket.io bond forwards engine.io@6.6.9 +`,
    'socket.io-adapter@2.5.8; the install root pins overrides.ws. A leftover',
    'here usually means a stale lockfile — delete node_modules + lockfile and',
    'reinstall, or add an `overrides.ws` at the install ROOT package.json.',
  )
  process.exit(1)
}

console.log(`ws floor OK — ${found.length} resolved copy/copies, all >= ${WS_FLOOR}.`)
