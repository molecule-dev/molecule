// The directories code search skips by default exist twice: `@molecule/api-ai-tools` applies them to
// every search server-side, and `@molecule/app-ide-panel-logic` (re-exported by
// `@molecule/app-ide-react`) shows them in the search panel when the host passes none. App packages
// cannot import API packages, so the list is duplicated; this test fails when the two copies differ,
// so the panel never shows a set the server does not apply.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const PACKAGES = join(dirname(fileURLToPath(import.meta.url)), '../../packages')
const API = join(PACKAGES, 'api/core/ai-tools/src/utilities.ts')
const APP = join(PACKAGES, 'app/features/ide-panel-logic/src/components/search-utilities.ts')

/**
 * The string entries of `export const DEFAULT_SEARCH_EXCLUDED_DIRS = [...] as const` in a source file.
 *
 * @param file - The TypeScript source.
 * @returns The entries, in order.
 */
const excludedDirs = (file) => {
  const match = /export const DEFAULT_SEARCH_EXCLUDED_DIRS = \[([^\]]*)\] as const/.exec(
    readFileSync(file, 'utf8'),
  )
  if (!match) throw new Error(`no DEFAULT_SEARCH_EXCLUDED_DIRS array literal in ${file}`)
  return [...match[1].matchAll(/'([^']*)'/g)].map((m) => m[1])
}

describe('DEFAULT_SEARCH_EXCLUDED_DIRS', () => {
  it('is the same list in the API tools and the IDE search panel', () => {
    const api = excludedDirs(API)
    expect(api.length).toBeGreaterThan(0)
    expect(excludedDirs(APP)).toEqual(api)
  })
})
