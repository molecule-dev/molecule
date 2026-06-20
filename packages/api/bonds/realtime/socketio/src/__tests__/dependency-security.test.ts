import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/* ------------------------------------------------------------------ */
/*  Regression: ws@8.20.1 memory-exhaustion DoS (GHSA-96hv-2xvq-fx4p) */
/* ------------------------------------------------------------------ */
/*
 * socket.io@4.8.3 historically nested the vulnerable `ws@8.20.1` twice —
 * via engine.io@6.6.8 and socket.io-adapter@2.5.7 — exposing every
 * scaffolded realtime app to an unauthenticated memory-exhaustion DoS at
 * the WebSocket transport layer (CWE-400/770, CVSS 7.5), fixed in ws 8.21.0.
 *
 * npm `overrides` declared inside a dependency's own package.json are
 * ignored by consumers, so the bond instead FORWARDS the patched transitive
 * packages — engine.io@6.6.9 and socket.io-adapter@2.5.8, both of which
 * depend on `ws@~8.21.0` and satisfy socket.io@4.8.3's own ranges
 * (`engine.io: ~6.6.0`, `socket.io-adapter: ~2.5.2`). That dedups the whole
 * socket.io subtree onto a patched `ws` for every consumer (including
 * mlcl-scaffolded apps) regardless of install root or stale lockfile.
 *
 * This test pins that contract: it fails before the fix (no forwarded deps)
 * and passes after, while asserting socket.io itself is still present so
 * realtime functionality is preserved.
 */

const here = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(here, '..', '..', 'package.json'), 'utf-8')) as {
  dependencies?: Record<string, string>
}

/**
 * First releases of each socket.io transitive that depend on `ws@~8.21.0`
 * (i.e. the patched, non-vulnerable line).
 */
const SAFE_FLOORS: Record<string, string> = {
  'engine.io': '6.6.9',
  'socket.io-adapter': '2.5.8',
}

/**
 * Compare two dotted numeric semver cores, ignoring pre-release suffixes.
 *
 * @param a - Left version.
 * @param b - Right version.
 * @returns Negative if a<b, 0 if equal, positive if a>b.
 */
function compareVersions(a: string, b: string): number {
  const pa = a.split('-')[0].split('.').map(Number)
  const pb = b.split('-')[0].split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0)
    if (diff !== 0) return diff
  }
  return 0
}

describe('socketio bond — ws DoS regression (GHSA-96hv-2xvq-fx4p)', () => {
  const deps = pkg.dependencies ?? {}

  it('still depends on socket.io (realtime functionality preserved)', () => {
    expect(deps['socket.io']).toBeDefined()
  })

  for (const [name, floor] of Object.entries(SAFE_FLOORS)) {
    it(`forwards a patched ${name} (>= ${floor}, pulls ws>=8.21.0)`, () => {
      const version = deps[name]
      // Before the fix this transitive was not declared at all, so the
      // nested vulnerable ws@8.20.1 was free to resolve.
      expect(version, `${name} must be forwarded as a direct dependency`).toBeDefined()
      // Exact-pinned per molecule's no-range rule.
      expect(version).toMatch(/^\d+\.\d+\.\d+$/)
      expect(
        compareVersions(version as string, floor),
        `${name}@${version} must be >= ${floor} so its nested ws is >= 8.21.0`,
      ).toBeGreaterThanOrEqual(0)
    })
  }

  it('does not pin any socket.io transitive to a ws-vulnerable version', () => {
    // Guards against a future downgrade re-opening the DoS.
    expect(compareVersions(deps['engine.io'] ?? '0.0.0', '6.6.9')).toBeGreaterThanOrEqual(0)
    expect(compareVersions(deps['socket.io-adapter'] ?? '0.0.0', '2.5.8')).toBeGreaterThanOrEqual(0)
  })
})
