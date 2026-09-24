/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { StageTimeline, type StageTimelineStage } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered stage timeline.
 */
function ApplicationProgress(): React.JSX.Element {
  const application = { stage: 'onsite', onsiteDate: 'Mar 14' }
  const stages: StageTimelineStage[] = [
    { id: 'applied', label: 'Applied' },
    { id: 'screen', label: 'Phone Screen' },
    { id: 'onsite', label: 'On-site', subtitle: application.onsiteDate },
    { id: 'offer', label: 'Offer' },
  ]
  const currentIndex = stages.findIndex((s) => s.id === application.stage)
  return <StageTimeline stages={stages} currentIndex={currentIndex} />
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })

  it('marks earlier stages completed, the matched stage current and later ones upcoming', () => {
    const html = renderToStaticMarkup(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <ApplicationProgress />
      </I18nProvider>,
    )
    expect(html).toContain('data-stage-id="applied" data-stage-status="completed"')
    expect(html).toContain('data-stage-id="screen" data-stage-status="completed"')
    expect(html).toContain('data-stage-id="onsite" data-stage-status="current"')
    expect(html).toContain('data-stage-id="offer" data-stage-status="upcoming"')
    expect(html).toContain('aria-current="step"')
    expect(html).toContain('Stage 3 of 4: On-site (current)')
    expect(html).toContain('Mar 14')
    expect(html.match(/✓/g)).toHaveLength(2)
    expect(html).toContain('width:66.66666666666666%')
  })
})
