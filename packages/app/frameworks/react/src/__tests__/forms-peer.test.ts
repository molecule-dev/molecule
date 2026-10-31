// @vitest-environment node
import { readFileSync } from 'node:fs'

import { expect, it } from 'vitest'

it('requires the forms release that exports the hook value utilities', () => {
  const manifest = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
  ) as { peerDependencies: Record<string, string> }

  expect(manifest.peerDependencies['@molecule/app-forms']).toBe('^2.2.0')
})
