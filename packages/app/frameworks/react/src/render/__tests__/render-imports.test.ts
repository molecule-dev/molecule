/**
 * `@molecule/app-react/render` holds only helpers for React's render model,
 * which no other framework binding has. Everything app-facing belongs on the
 * root export, which the conformance kit holds every binding to, so a module
 * here may import only `react` and its own siblings: one that reached for a
 * Molecule service (or anything else) would be an app-facing export hidden
 * from that contract.
 *
 * @module
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const renderDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const modules = readdirSync(renderDir).filter((name) => name.endsWith('.ts'))

/**
 * The module specifiers a source file imports or re-exports.
 *
 * @param source - The file's text.
 * @returns Each specifier, in order.
 */
function specifiers(source: string): string[] {
  return [...source.matchAll(/(?:^|\n)\s*(?:import|export)\b[^'"]*?from\s+['"]([^'"]+)['"]/g)].map(
    (match) => match[1],
  )
}

describe('@molecule/app-react/render imports', () => {
  it('has modules to check', () => {
    expect(modules).toContain('index.ts')
    expect(modules.length).toBeGreaterThan(1)
  })

  it.each(modules)('%s imports only react and its own directory', (name) => {
    const imported = specifiers(readFileSync(join(renderDir, name), 'utf8'))
    expect(imported.filter((s) => s !== 'react' && !/^\.\/[\w-]+\.js$/.test(s))).toEqual([])
  })

  it('reads every import form it judges', () => {
    expect(
      specifiers(
        "import * as React from 'react'\nimport { a } from '../hooks/a.js'\nexport * from './b.js'\nimport type { C } from '@molecule/app-i18n'",
      ),
    ).toEqual(['react', '../hooks/a.js', './b.js', '@molecule/app-i18n'])
  })
})
