/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: real ClassMap, real i18n provider and
 * the companion locale bond.
 *
 * @module
 */
import type { JSX } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { getProvider as getI18nProvider, registerLocaleModule } from '@molecule/app-i18n'
import * as biasIndicatorLocales from '@molecule/app-locales-bias-indicator'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { BiasIndicator } from '../index.js'

setClassMap(classMap)
registerLocaleModule(biasIndicatorLocales)

const sources = [
  { name: 'Reuters', bias: -0.1, reliability: 0.9 },
  { name: 'The Daily Take', bias: 0.7, reliability: 0.3 },
]

/**
 * The README example, verbatim.
 *
 * @returns The source ratings list.
 */
function SourceRatings(): JSX.Element {
  return (
    <I18nProvider provider={getI18nProvider()}>
      {sources.map((s) => (
        <BiasIndicator
          key={s.name}
          bias={s.bias}
          reliability={s.reliability}
          sourceLabel={s.name}
        />
      ))}
      <BiasIndicator bias={-0.4} compact sourceLabel="Metro Wire" />
    </I18nProvider>
  )
}

describe('README @example', () => {
  it('renders bucketed bias labels, reliability chips and a compact dot', () => {
    const html = renderToStaticMarkup(<SourceRatings />)

    expect(html).toContain('Reuters')
    expect(html).toContain('data-bias-bucket="center"')
    expect(html).toContain('>Center</span>')
    expect(html).toContain('Reliability: high')
    // bias -0.1 → marker at 45% of the track
    expect(html).toContain('left:45%')

    expect(html).toContain('The Daily Take')
    expect(html).toContain('>Far right</span>')
    expect(html).toContain('Reliability: low')
    expect(html).toContain('left:85%')

    expect(html).toContain('aria-label="Left-leaning"')
    expect(html).toContain('Metro Wire')
    expect(html).not.toContain('>Left-leaning</span>')
  })
})
