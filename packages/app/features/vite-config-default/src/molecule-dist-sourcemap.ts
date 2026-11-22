import { readFileSync } from 'node:fs'

import type { Plugin } from 'vite'

/** A JavaScript file. */
const SCRIPT = /\.[cm]?js$/

/** The trailing `//# sourceMappingURL=` comment `tsc` writes at the end of each file. */
const SOURCE_MAPPING_URL = /^\/\/# sourceMappingURL=.*$/m

/**
 * Whether a file is a `@molecule` package's own JavaScript: the nearest `node_modules` it sits
 * under holds it as `@molecule/<name>`, so a third-party file nested inside one is not.
 *
 * @param file - An absolute file path, without a query.
 * @returns Whether the file belongs to an installed `@molecule` package.
 */
export function isMoleculePackageScript(file: string): boolean {
  if (!SCRIPT.test(file)) return false
  const path = file.replaceAll('\\', '/')
  const at = path.lastIndexOf('/node_modules/')
  return at >= 0 && path.startsWith('@molecule/', at + '/node_modules/'.length)
}

/**
 * Serves each `@molecule` package's JavaScript without its sourcemap, on the dev server and in
 * test runs. A package publishes only `dist`, and its maps name the `src` files they were
 * compiled from, so Vite warned "points to missing source files" for every package it
 * transformed (once a test run inlines them, each one), and "outside its package" for a
 * workspace link. Stack traces then show the `dist` file, which is the file that ran. A
 * production build reads the files as before.
 *
 * @returns The Vite plugin.
 */
export function moleculeDistWithoutSourcemap(): Plugin {
  return {
    name: 'molecule-dist-without-sourcemap',
    enforce: 'pre',
    apply: 'serve',
    load(id) {
      const file = id.split('?')[0]
      if (!isMoleculePackageScript(file)) return null
      return { code: readFileSync(file, 'utf8').replace(SOURCE_MAPPING_URL, ''), map: null }
    },
  }
}
