/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { DiffViewer } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered config diff.
 */
function ConfigChange(): React.JSX.Element {
  const before = ['const retries = 1', 'const timeoutMs = 5000', 'export { retries }'].join('\n')
  const after = [
    'const retries = 3',
    'const timeoutMs = 5000',
    'export { retries, timeoutMs }',
  ].join('\n')
  return (
    <DiffViewer
      before={before}
      after={after}
      filename="src/config.ts"
      mode="unified"
      showLineNumbers
    />
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })

  it('renders the filename and a -/+ row pair for each changed line', () => {
    const html = renderToStaticMarkup(<ConfigChange />)
    expect(html).toMatch(/<header[^>]*>src\/config.ts<\/header>/)
    const rows = [
      ...html.matchAll(
        /background:([^;]+);[^>]*>.*?<span[^>]*>(\d+)<\/span><span[^>]*>(.)<\/span><span[^>]*>([^<]*)<\/span>/g,
      ),
    ].map((m) => [m[1], m[2], m[3], m[4]])
    expect(rows).toEqual([
      ['rgba(239,68,68,0.15)', '1', '-', 'const retries = 1'],
      ['rgba(34,197,94,0.15)', '2', '+', 'const retries = 3'],
      ['transparent', '3', ' ', 'const timeoutMs = 5000'],
      ['rgba(239,68,68,0.15)', '4', '-', 'export { retries }'],
      ['rgba(34,197,94,0.15)', '5', '+', 'export { retries, timeoutMs }'],
    ])
  })
})
