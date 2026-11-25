/** Check the published entries and their source assignments with both React type versions. */
import console from 'node:console'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'

import ts from 'typescript'

import { prefetchTarballs, publishedPackageDir } from '../../../../../scripts/check-peer-floors.mjs'

const version = '18.0.38'
const react18Package = publishedPackageDir('@types/react', version)
// Older cache entries kept DefinitelyTyped's original archive directory name.
const legacyCache = join(dirname(react18Package), 'react')
const react18 = existsSync(join(legacyCache, 'index.d.ts')) ? legacyCache : react18Package
if (react18 === react18Package)
  await prefetchTarballs([`@types/react@${version}`], 1, { reexports: false })

const react18Paths = {
  react: [join(react18, 'index.d.ts')],
  'react/*': [join(react18, '*.d.ts')],
}

for (const [react, options] of [
  ['19', {}],
  ['18', { paths: react18Paths }],
]) {
  for (const [renderer, configFile] of [
    ['web', 'tsconfig.tests.json'],
    ['native', 'tsconfig.tests.native.json'],
  ]) {
    const diagnostics = []
    const config = ts.getParsedCommandLineOfConfigFile(configFile, options, {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (error) => diagnostics.push(error),
    })
    if (config) {
      const program = ts.createProgram(config.fileNames, config.options)
      diagnostics.push(...config.errors, ...ts.getPreEmitDiagnostics(program))
    }
    console.log(`React ${react} ${renderer} types: ${diagnostics.length} diagnostics`)
    if (diagnostics.length) {
      console.error(
        ts.formatDiagnostics(diagnostics, {
          getCanonicalFileName: (file) => file,
          getCurrentDirectory: ts.sys.getCurrentDirectory,
          getNewLine: () => ts.sys.newLine,
        }),
      )
      process.exitCode = 1
    }
  }
}
