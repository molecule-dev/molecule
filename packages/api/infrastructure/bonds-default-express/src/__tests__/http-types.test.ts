/**
 * A type-level gate for `MoleculeRequest` / `MoleculeResponse`
 * (`@molecule/api-resource`): the fixture next to this file assigns an Express
 * 5 `Request`/`Response` to them and calls `authorization.set` with the handler's
 * own objects, and this test compiles it with the package's own TypeScript.
 *
 * Why compile instead of asserting at runtime: the failure it guards is TS2345 at
 * a call site (flash-m106, +05:34) and the note that followed told the executor
 * to "change that declaration" — which lives in `node_modules`, so the only thing
 * it could do was cast. The declaration is right; the type had to be.
 */

import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)

/** The package's own `tsc` — the same compiler its `build` script runs. */
const TSC = join(dirname(require.resolve('typescript')), 'tsc.js')

/** The fixture project, resolved from this file so the repo's types are the ones checked. */
const CONFIG = join(import.meta.dirname, 'fixtures', 'tsconfig.http-types.json')

describe('MoleculeRequest accepts an Express 5 request without a cast', () => {
  it('compiles the assignability fixture', () => {
    let status = 0
    let output = ''
    try {
      execFileSync(process.execPath, [TSC, '-p', CONFIG], { encoding: 'utf8', stdio: 'pipe' })
    } catch (error) {
      const failed = error as { status?: number; stdout?: string; stderr?: string }
      status = failed.status ?? 1
      output = `${failed.stdout ?? ''}${failed.stderr ?? ''}`
    }
    expect(status, output).toBe(0)
  })
})
