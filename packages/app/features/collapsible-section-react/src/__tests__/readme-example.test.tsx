// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { CollapsibleSection, ShowMore } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered lesson sidebar.
 */
function LessonSidebar(): React.JSX.Element {
  const concepts = [
    { id: 'props', label: 'Props' },
    { id: 'state', label: 'State' },
    { id: 'effects', label: 'Effects' },
    { id: 'context', label: 'Context' },
    { id: 'refs', label: 'Refs' },
  ]
  return (
    <CollapsibleSection title="Key concepts" badge={<span>{concepts.length}</span>} defaultExpanded>
      <ShowMore initialCount={3}>
        {concepts.map((c) => (
          <div key={c.id}>{c.label}</div>
        ))}
      </ShowMore>
    </CollapsibleSection>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('renders expanded with the first three items, then reveals the rest and collapses', () => {
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <LessonSidebar />
      </I18nProvider>,
    )
    const header = view.getByRole('button', { name: /Key concepts/ })
    expect(header.getAttribute('aria-expanded')).toBe('true')
    expect(header.textContent).toContain('5')
    expect(view.getByText('Effects')).toBeTruthy()
    expect(view.queryByText('Context')).toBeNull()

    fireEvent.click(view.getByRole('button', { name: 'Show 2 more' }))
    expect(view.getByText('Refs')).toBeTruthy()
    expect(view.getByRole('button', { name: 'Show less' })).toBeTruthy()

    fireEvent.click(header)
    expect(header.getAttribute('aria-expanded')).toBe('false')
    expect(view.queryByText('Props')).toBeNull()
  })
})
