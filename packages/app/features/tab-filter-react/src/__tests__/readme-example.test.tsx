// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { TabFilter, type TabFilterTab } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The filtered ticket list.
 */
function TicketList(): React.JSX.Element {
  const tickets = [
    { id: 'T-1', title: 'Login fails on Safari', status: 'open' },
    { id: 'T-2', title: 'Invoice PDF is blank', status: 'closed' },
    { id: 'T-3', title: 'Refund not issued', status: 'open' },
  ]
  const [activeTab, setActiveTab] = useState('all')
  const tabs: TabFilterTab[] = [
    { id: 'all', label: 'All', count: tickets.length },
    { id: 'open', label: 'Open', count: tickets.filter((t) => t.status === 'open').length },
    { id: 'closed', label: 'Closed', count: tickets.filter((t) => t.status === 'closed').length },
  ]
  const visible = activeTab === 'all' ? tickets : tickets.filter((t) => t.status === activeTab)
  return (
    <section>
      <TabFilter tabs={tabs} activeId={activeTab} onChange={setActiveTab} />
      <ul>
        {visible.map((ticket) => (
          <li key={ticket.id}>{ticket.title}</li>
        ))}
      </ul>
    </section>
  )
}

let root: Root | undefined
let container: HTMLElement

/**
 * Lists the visible ticket titles.
 *
 * @returns The rendered `<li>` texts.
 */
function titles(): Array<string | null> {
  return Array.from(container.querySelectorAll('li')).map((li) => li.textContent)
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  })
  afterEach(() => {
    act(() => root?.unmount())
    container.remove()
  })

  it('shows count badges and filters the list when a tab is clicked', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => root?.render(<TicketList />))

    const tabs = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
    expect(tabs.map((t) => t.textContent)).toEqual(['All(3)', 'Open(2)', 'Closed(1)'])
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true')
    expect(titles()).toHaveLength(3)

    act(() => tabs[2]?.click())
    expect(titles()).toEqual(['Invoice PDF is blank'])
    const after = container.querySelectorAll('[role="tab"]')
    expect(after[2]?.getAttribute('aria-selected')).toBe('true')
    expect(after[0]?.getAttribute('aria-selected')).toBe('false')

    act(() => tabs[1]?.click())
    expect(titles()).toEqual(['Login fails on Safari', 'Refund not issued'])
  })
})
