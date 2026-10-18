/**
 * A request-supplied stylesheet keeps its own class names.
 *
 * X1 xr-molecule-flash-m155 (+22:17): the app shipped Conduit's own `styles.css`
 * (`.col-md-9`, `.pull-xs-right`, …), and the executor applied the "never Tailwind
 * utilities in JSX" rule to it — it wrote a runtime resolver that copied class rules
 * into new `mol-*` classes. The resolver only saw plain `CSSStyleRule`s, so Conduit's
 * `@media (min-width: 768px)` grid rules were skipped and the home page stacked
 * full-width. The module JSDoc (the source README.md is generated from, served by
 * `read_molecule_doc`) has to say a supplied stylesheet's class names are used as written.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const PACKAGE = join(__dirname, '../..')

/** A file of the package, read as text. */
const read = (file: string): string => readFileSync(join(PACKAGE, file), 'utf8')

/** The module JSDoc — the first block, with its ` * ` line prefixes stripped. */
function moduleDoc(source: string): string {
  const block = source.slice(source.indexOf('/**'), source.indexOf('*/'))
  return block.replace(/^[ \t]*\*[ \t]?/gm, '')
}

describe('a supplied stylesheet keeps its own class names (xr-molecule-flash-m155)', () => {
  it('says in the module JSDoc that those class names are written directly in className', () => {
    const doc = moduleDoc(read('src/index.ts'))
    expect(doc).toContain('A stylesheet the request supplies')
    expect(doc).toContain('written directly in `className`')
    // The JSDoc wraps, so allow a line break inside the phrase.
    expect(doc).toMatch(/ClassMap\s+governs molecule's own utilities/)
    expect(doc).toMatch(/never wrap,\s+re-generate or rename its classes/)
  })

  it('serves that sentence in the generated README, the doc read_molecule_doc returns', () => {
    const readme = read('README.md')
    expect(readme).toContain('A stylesheet the request supplies')
    expect(readme).toContain('written directly in `className`')
    expect(readme).toMatch(/ClassMap\s+governs molecule's own utilities/)
  })
})
