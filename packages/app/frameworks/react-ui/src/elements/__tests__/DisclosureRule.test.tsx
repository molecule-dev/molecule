// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createRef, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'

import type { ElementHandle } from '@molecule/app-ui'
import { Box, Disclosure, Rule } from '@molecule/app-ui-react/elements'

it('serializes literal details, summary, address and void hr with the supplied attributes', () => {
  const rendered = renderToStaticMarkup(
    <Disclosure
      as="details"
      className="disclosure-class"
      open
      summary={<Box as="span">{527}</Box>}
      summaryProps={{
        className: 'summary-class',
        'data-testid': 'summary',
        style: { opacity: 0.7 },
      }}
    >
      <Rule as="hr" className="divider-class" />
      <Box as="address" webStyle={{ fontStyle: 'normal' }}>
        West Street
      </Box>
    </Disclosure>,
  )
  const original = renderToStaticMarkup(
    <details className="disclosure-class" open>
      <summary className="summary-class" data-testid="summary" style={{ opacity: 0.7 }}>
        <span>{527}</span>
      </summary>
      <hr className="divider-class" />
      <address style={{ fontStyle: 'normal' }}>West Street</address>
    </details>,
  )
  expect(rendered).toBe(original)
})

it('uses browser activation and keeps the summary state and mounted body across prop updates', async () => {
  const toggled = vi.fn()
  const detailsRef = createRef<ElementHandle>()
  function Counter(): React.JSX.Element {
    const [count, setCount] = useState(0)
    return <button onClick={() => setCount(count + 1)}>{count}</button>
  }
  const panel = (open?: boolean): React.JSX.Element => (
    <Disclosure
      as="details"
      ref={detailsRef}
      data-testid="details"
      open={open}
      onToggle={toggled}
      summary="Show details"
    >
      <Counter />
    </Disclosure>
  )
  const { rerender } = render(panel())
  const details = screen.getByTestId('details')
  const summary = screen.getByText('Show details')
  const counter = details.querySelector('button')
  if (!counter) throw new Error('Missing mounted body')
  expect(detailsRef.current).toBe(details)
  expect(details.hasAttribute('open')).toBe(false)
  expect(details.firstElementChild).toBe(summary)

  rerender(panel(true))
  await waitFor(() => expect(toggled.mock.calls).toEqual([[true]]))
  fireEvent.click(counter)
  fireEvent.click(summary)
  expect(toggled).toHaveBeenCalledTimes(1)
  await waitFor(() => expect(toggled.mock.calls).toEqual([[true], [false]]))
  rerender(panel(true))
  expect(details.hasAttribute('open')).toBe(false)

  fireEvent.click(summary)
  await waitFor(() => expect(toggled.mock.calls).toEqual([[true], [false], [true]]))
  expect(details.querySelector('button')).toBe(counter)
  expect(counter.textContent).toBe('1')
})

it('reports an initially open state and coalesces two user transitions without nested notifications', async () => {
  const outer = vi.fn()
  const inner = vi.fn()
  render(
    <Disclosure as="details" open summary="Outer" onToggle={outer}>
      <Disclosure as="details" summary="Inner" onToggle={inner} />
    </Disclosure>,
  )
  await waitFor(() => expect(outer.mock.calls).toEqual([[true]]))
  const summary = screen.getByText('Inner')
  act(() => {
    summary.click()
    summary.click()
  })
  expect(inner).not.toHaveBeenCalled()
  await waitFor(() => expect(inner.mock.calls).toEqual([[false]]))
  expect(outer.mock.calls).toEqual([[true]])
})
