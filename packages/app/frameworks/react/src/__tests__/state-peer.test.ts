// @vitest-environment node
import { readFileSync } from 'node:fs'

import { expect, it } from 'vitest'

it('requires the state release that supplies optimistic commit progress', () => {
  const manifest = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
  ) as { peerDependencies: Record<string, string> }

  expect(manifest.peerDependencies['@molecule/app-state']).toBe('^1.2.0')
})
