/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ActivityTimeline } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered deal activity timeline.
 */
function DealActivity(): React.JSX.Element {
  const cm = getClassMap()
  const activities = [
    { id: 'a1', type: 'call', subject: 'Called Jane', notes: 'Left a voicemail', when: '2h ago' },
    {
      id: 'a2',
      type: 'email',
      subject: 'Sent the proposal',
      notes: 'Pricing v2 attached',
      when: 'Mar 5',
    },
  ]
  return (
    <ActivityTimeline
      events={activities.map((a) => ({
        id: a.id,
        kind: a.type,
        title: a.subject,
        description: a.notes,
        meta: a.when,
      }))}
      toneByKind={{
        call: {
          icon: 'call',
          dotClass: cm.bgPrimaryContainer,
          iconClass: cm.textOnPrimaryContainer,
        },
        email: { icon: 'mail' },
      }}
      rowWrapper={(event, children) => <a href={`/activities/${event.id}`}>{children}</a>}
    />
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('renders each event as a linked row with its title, description, meta and icon', () => {
    const view = render(<DealActivity />)
    const headings = view.getAllByRole('heading', { level: 3 })
    expect(headings.map((h) => h.textContent)).toEqual(['Called Jane', 'Sent the proposal'])
    expect(view.getByText('Left a voicemail')).toBeTruthy()
    expect(view.getByText('Mar 5')).toBeTruthy()

    const links = view.getAllByRole('link')
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/activities/a1', '/activities/a2'])
    expect(links[0]?.textContent).toContain('call')
    expect(links[1]?.textContent).toContain('mail')
  })

  it('applies the ClassMap tone for known kinds and the default tone otherwise', () => {
    const view = render(<DealActivity />)
    const callIcon = view.getByText('call').parentElement
    const mailIcon = view.getByText('mail').parentElement
    expect(callIcon?.className).toContain(classMap.bgPrimaryContainer)
    expect(callIcon?.className).not.toContain(classMap.bgPrimarySubtle)
    expect(mailIcon?.className).toContain(classMap.bgPrimarySubtle)
  })
})
