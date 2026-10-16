import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

/**
 * The module JSDoc in `src/index.ts` is what a coding agent reads (via
 * `read_molecule_doc`, which serves the generated "Quick Start") and copies
 * verbatim — README.md is generated from this JSDoc. So it must be app-safe: a
 * `createStore()` at module scope runs at import time, before
 * `setupProviders()` bonds the state provider, throws "No provider set", and
 * renders every page blank while tsc passes (X1 flash-m65 — the old example
 * showed exactly that shape and the run copied it). Keep the example's store
 * creation lazy, and keep this guard in step with molecule-dev's
 * `MODULE_SCOPE_STORE_RE`.
 */
describe('module JSDoc', () => {
  const source = readFileSync(new URL('../index.ts', import.meta.url), 'utf8')
  const doc = /^\/\*\*[\s\S]*?\*\//.exec(source)?.[0] ?? ''
  const raw = /@example[\s\S]*?```(?:ts|tsx)\n([\s\S]*?)```/.exec(doc)?.[1] ?? ''
  // Strip the JSDoc ` * ` gutter so the assertions see real source lines.
  const example = raw
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, ''))
    .join('\n')

  it('shows how a store is created', () => {
    expect(example).toContain('createStore(')
  })

  it('never creates the store at module scope', () => {
    expect(example).not.toMatch(
      /^(?:export )?(?:const|let|var) +[A-Za-z0-9_]+ *= *(?:createStore|createSimpleStore|createAsyncState)\(/m,
    )
  })

  it('tells the reader why, and what the error looks like', () => {
    expect(example).toMatch(/module scope/i)
    expect(doc).toContain('No provider set')
    expect(doc).toContain('setupProviders()')
  })
})
