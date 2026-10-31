import { createRequire } from 'node:module'

import { describe, expect, it } from 'vitest'

const packageName = '@molecule/app-routing-react-router'
const entrySpecifiers = [packageName, `${packageName}/dom`]
// These are the JavaScript modules in the published 1.1.3 tarball. With no exports
// map, CommonJS consumers could require both the directory and extensionless paths.
const deepSpecifiers = [
  `${packageName}/dist`,
  ...['hooks', 'index', 'list-types', 'provider', 'types', 'useListRoute', 'utilities'].flatMap(
    (name) => [`${packageName}/dist/${name}`, `${packageName}/dist/${name}.js`],
  ),
]

describe('1.1.3 consumer resolution', () => {
  it.each([...entrySpecifiers, ...deepSpecifiers])('resolves %s through require', (specifier) => {
    const require = createRequire(import.meta.url)

    expect(require.resolve(specifier)).toMatch(/[\\/]dist[\\/].*\.js$/)
  })

  it.each([...entrySpecifiers, ...deepSpecifiers])('loads %s through import', async (specifier) => {
    await expect(import(specifier)).resolves.toBeTypeOf('object')
  })
})
