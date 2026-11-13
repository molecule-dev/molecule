// @vitest-environment node
import { readFileSync } from 'node:fs'

import { expect, it } from 'vitest'

it('requires the ai-chat release that supplies createChatSession', () => {
  const manifest = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
  ) as { peerDependencies: Record<string, string> }

  expect(manifest.peerDependencies['@molecule/app-ai-chat']).toBe('^1.8.0')
})
