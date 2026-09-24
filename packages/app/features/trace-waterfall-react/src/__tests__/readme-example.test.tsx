// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { type Span, TraceWaterfall } from '../index.js'

const spans: Span[] = [
  {
    id: 'root',
    name: 'GET /checkout',
    service: 'api-gw',
    startTime: 0,
    duration: 320,
    status: 'ok',
  },
  {
    id: 'auth',
    parentId: 'root',
    name: 'verifyToken',
    service: 'auth-svc',
    startTime: 5,
    duration: 40,
    status: 'ok',
  },
  {
    id: 'cache',
    parentId: 'root',
    name: 'cache.get',
    service: 'redis',
    startTime: 45,
    duration: 8,
    status: 'error',
  },
  {
    id: 'db',
    parentId: 'root',
    name: 'db.query',
    service: 'postgres',
    startTime: 50,
    duration: 210,
    attributes: { rows: 42 },
  },
]

/**
 * The README example, verbatim.
 *
 * @returns The rendered trace detail view.
 */
function TraceDetail(): React.JSX.Element {
  const [selected, setSelected] = useState<Span | null>(null)
  return (
    <section>
      <TraceWaterfall spans={spans} onSpanClick={setSelected} emptyState={<p>No trace data.</p>} />
      {selected && (
        <pre>
          {selected.name}: {JSON.stringify(selected.attributes ?? {})}
        </pre>
      )}
    </section>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('lays spans out as a tree in start order and reports the clicked span', () => {
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <TraceDetail />
      </I18nProvider>,
    )
    expect(view.getByRole('region', { name: 'Distributed trace waterfall' })).toBeTruthy()
    expect(view.getByText('Total: 320ms')).toBeTruthy()
    const rows = view.getAllByRole('treeitem')
    expect(rows.map((r) => r.getAttribute('data-span-id'))).toEqual(['root', 'auth', 'cache', 'db'])
    expect(rows.map((r) => r.getAttribute('aria-level'))).toEqual(['1', '2', '2', '2'])
    expect(rows[3]?.getAttribute('aria-label')).toBe('postgres · db.query · 210ms')

    const dbBar = rows[3]?.querySelector<HTMLElement>('[data-mol-id="trace-waterfall-bar"]')
    expect(dbBar?.style.left).toBe('15.625%')
    expect(dbBar?.style.width).toBe('65.625%')

    fireEvent.click(view.getByRole('treeitem', { name: 'postgres · db.query · 210ms' }))
    expect(view.container.querySelector('pre')?.textContent).toBe('db.query: {"rows":42}')
    fireEvent.keyDown(view.getByRole('treeitem', { name: 'redis · cache.get · 8ms' }), {
      key: 'Enter',
    })
    expect(view.container.querySelector('pre')?.textContent).toBe('cache.get: {}')
  })
})
