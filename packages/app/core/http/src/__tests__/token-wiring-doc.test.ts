/**
 * Waiting for the session restore does NOT attach the token.
 *
 * X1 xr-molecule-flash-m152 (+11:36 → +13:34): the app's `http-default.ts` created a
 * `createFetchClient({ … })` and only called `setClient`, so `POST /api/articles` went out
 * with no `Authorization` header (`GET /api/user`, which the auth client made itself, carried
 * it) and answered 401 `{"errors":{"token":["is missing"]}}`. The run spent ~2 minutes reading
 * `setAuthGate`/`awaitAuthGate`, changed the SERVER to disable cookie sessions (wrong edit),
 * and only then added a request interceptor + the gate. The two bonds are configured
 * separately; the guide has to say so where the gate is documented and where the executor
 * reads it (README.md is generated from `src/index.ts` and served by `read_molecule_doc`).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const PACKAGE = join(__dirname, '../..')

/** A file of the package, read as text. */
const read = (file: string): string => readFileSync(join(PACKAGE, file), 'utf8')

/** The module JSDoc — everything between the file's first opening block and its close. */
function moduleDoc(source: string): string {
  return source.slice(source.indexOf('/**'), source.indexOf('*/'))
}

describe('the token wiring beside the gate (xr-molecule-flash-m152)', () => {
  it('says in auth-gate.ts that waiting does not attach the token, and names the wiring', () => {
    const doc = moduleDoc(read('src/auth-gate.ts'))
    expect(doc).toContain('Waiting for the restore does NOT attach its token')
    expect(doc).toContain('createDefaultHttpClientWithAuthBearer')
    expect(doc).toContain('getToken: () => authClient.getAccessToken()')
    expect(doc).toContain('setAuthGate(() => authClient.whenRestored())')
    expect(doc).toContain('createDefaultAuthClientWithHttpSync')
  })

  it('carries the same warning in the module description the README is built from', () => {
    const doc = moduleDoc(read('src/index.ts'))
    expect(doc).toContain('Waiting for the restore does NOT attach the token')
    expect(doc).toContain('createDefaultHttpClientWithAuthBearer')
    expect(doc).toContain('setAuthGate` alone sends no `Authorization` header')
  })

  it('serves that warning in the generated README, the doc read_molecule_doc returns', () => {
    const readme = read('README.md')
    expect(readme).toContain('Waiting for the restore does NOT attach the token')
    expect(readme).toContain('createDefaultHttpClientWithAuthBearer')
    expect(readme).toContain('setAuthGate` alone sends no `Authorization` header')
  })
})
