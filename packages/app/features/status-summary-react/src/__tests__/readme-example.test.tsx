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

import { type StatusGroup, StatusSummary } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered status page.
 */
function StatusPage(): React.JSX.Element {
  const groups: StatusGroup[] = [
    {
      id: 'api',
      name: 'API',
      components: [
        { id: 'rest', name: 'REST API', status: 'operational', subtitle: '99.98% uptime' },
        { id: 'ws', name: 'WebSockets', status: 'degraded' },
      ],
    },
    {
      id: 'web',
      name: 'Website',
      components: [{ id: 'dashboard', name: 'Dashboard', status: 'operational' }],
    },
  ]
  return (
    <StatusSummary
      groups={groups}
      header={<span>Last updated: 2 min ago</span>}
      footer={<p>No incidents reported in the last 7 days.</p>}
    />
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })

  it('derives the banner from the worst component status and lists every group', () => {
    const html = renderToStaticMarkup(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <StatusPage />
      </I18nProvider>,
    )
    const banner = html.slice(0, html.indexOf('<section'))
    expect(banner).toContain('Degraded performance')
    expect(banner).toContain('Last updated: 2 min ago')
    expect(html).toContain('>API</h3>')
    expect(html).toContain('>Website</h3>')
    expect(html).toContain('REST API')
    expect(html).toContain('99.98% uptime')
    expect(html.match(/>Operational</g)).toHaveLength(2)
    expect(html.match(/>Degraded performance</g)).toHaveLength(2)
    expect(html.indexOf('No incidents reported')).toBeGreaterThan(html.lastIndexOf('<section'))
  })
})
