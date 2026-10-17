/**
 * Where the `Authorization` scheme is set on the Axios bond: `createAxiosClient`'s config, not the
 * client `setClient()` hands around.
 *
 * X1 flash-m100 (+08:48 → +10:41, 2026-10-16) read the app-http guidance, set
 * `client.authScheme = 'Token'` on `getClient()`'s result, cast the TS2339 away, grepped four
 * `dist` files and only then built the client with the option — the scaffold's own bond
 * (`app/src/bonds/app-http-axios.ts`) being where it belongs. The README is what
 * `read_molecule_doc @molecule/app-http-axios` serves, so the check is on the JSDoc AND on it.
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

describe('the Axios bond names the call that takes authScheme (xr-flash-m100)', () => {
  it("names setClient(createAxiosClient({ baseURL, authScheme: 'Token' })) in the module JSDoc", () => {
    const doc = moduleDoc(read('src/index.ts'))
    expect(doc).toContain("setClient(createAxiosClient({ baseURL, authScheme: 'Token' }))")
    expect(doc).toContain('type error that changes no header')
  })

  it('says the same in createAxiosClient’s own docs and on the config field', () => {
    const provider = read('src/provider.ts')
    const fn = provider.slice(
      provider.indexOf('/**\n * Creates an Axios-based HTTP client'),
      provider.indexOf('export function createAxiosClient'),
    )
    expect(fn).toContain("setClient(createAxiosClient({ baseURL, authScheme: 'Token' }))")
    const types = read('src/types.ts')
    const at = types.indexOf('authScheme?: string')
    expect(types.slice(types.lastIndexOf('/**', at), at)).toContain('createAxiosClient')
  })

  it('carries it into the generated README, the doc read_molecule_doc serves', () => {
    const readme = read('README.md')
    expect(readme).toContain("setClient(createAxiosClient({ baseURL, authScheme: 'Token' }))")
  })
})
