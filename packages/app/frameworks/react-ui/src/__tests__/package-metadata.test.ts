import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('@molecule/app-ui-react package metadata', () => {
  it('declares sideEffects: false so a page importing one component does not bundle all of them', () => {
    // Without this flag a bundler conservatively keeps every module reachable
    // from the barrel: importing `AuthGuard` pulled Accordion, Table, Tabs,
    // Toast and every other component into the app's entry chunk (measured:
    // 22 KB raw / 10 KB gzip of unused components in a fresh scaffold).
    const pkg = JSON.parse(
      readFileSync(join(import.meta.dirname, '..', '..', 'package.json'), 'utf8'),
    ) as { sideEffects?: unknown }
    expect(pkg.sideEffects).toBe(false)
  })
})
