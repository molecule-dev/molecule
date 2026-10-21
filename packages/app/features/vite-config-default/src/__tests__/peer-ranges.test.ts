/**
 * A peer range is what a CONSUMER's install resolves against, so it must accept
 * the versions this package itself is built and tested with. When it does not,
 * npm reports the metadata as invalid for every app that installs it, even
 * though the plugin APIs in use work fine (`vite` 8 and
 * `@vitejs/plugin-react` 6 are what the fleet and molecule-status build with).
 *
 * Checked with `semver` — the resolver npm itself uses — rather than a
 * hand-rolled comparator over the range strings.
 */
import { readFileSync } from 'node:fs'

import semver from 'semver'
import { describe, expect, it } from 'vitest'

interface Manifest {
  peerDependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

const manifest = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf-8'),
) as Manifest

describe('peerDependency ranges', () => {
  it('accept every exact version this package pins for development', () => {
    const rejected: string[] = []
    for (const [name, range] of Object.entries(manifest.peerDependencies ?? {})) {
      const pin = manifest.devDependencies?.[name]
      // Only peers this package pins itself are testable this way; a peer it
      // does not develop against is the consumer's choice.
      if (!pin) continue
      if (!semver.satisfies(pin, range)) {
        rejected.push(`${name}@${pin} does not satisfy peer range "${range}"`)
      }
    }
    expect(rejected).toEqual([])
  })
})
