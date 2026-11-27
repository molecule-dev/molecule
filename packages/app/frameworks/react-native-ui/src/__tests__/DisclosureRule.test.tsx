// @vitest-environment jsdom
import { act, createElement, type ReactElement, type ReactNode, StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { Disclosure } from '../elements/Disclosure.js'
import { Rule } from '../elements/Rule.js'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => ({
    cn: (...values: (string | undefined)[]) => values.filter(Boolean).join(' '),
    borderT: 'theme-top-border',
    sp: () => 'theme-block-margins',
  }),
}))

vi.mock('react-native', () => {
  interface Props {
    testID?: string
    role?: string
    accessible?: boolean
    accessibilityElementsHidden?: boolean
    importantForAccessibility?: string
    accessibilityState?: { expanded?: boolean }
    className?: string
    pointerEvents?: string
    style?: { display?: string } | readonly ({ display?: string } | undefined | false)[]
    onPress?: () => void
    children?: ReactNode
  }
  const host = (tag: string) => (props: Props) =>
    createElement(
      tag,
      {
        'data-testid': props.testID,
        role: props.role,
        'aria-expanded': props.accessibilityState?.expanded,
        'data-accessible': props.accessible,
        'data-a11y-hidden': props.accessibilityElementsHidden,
        'data-a11y-importance': props.importantForAccessibility,
        'data-pointer-events': props.pointerEvents,
        'data-display': Object.assign({}, ...[props.style].flat())?.display,
        className: props.className,
        onClick: props.onPress,
      },
      props.children,
    )
  return {
    Platform: { select: ({ default: value }: { default: string }) => value },
    Pressable: host('div'),
    Text: host('span'),
    View: host('div'),
    useWindowDimensions: () => ({ width: 640 }),
  }
})

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.useFakeTimers()
  container = document.createElement('div')
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function render(node: ReactNode): void {
  act(() => root.render(node))
}

function host(id: string): HTMLElement {
  const node = container.querySelector<HTMLElement>(`[data-testid="${id}"]`)
  if (!node) throw new Error(`Missing native host for ${id}`)
  return node
}

function flush(): void {
  act(() => {
    vi.runOnlyPendingTimers()
  })
}

it('uses a pressable summary and excludes the mounted body from closed layout, hits and accessibility', () => {
  const change = vi.fn()
  function Counter(): ReactElement {
    const [count, setCount] = useState(0)
    return (
      <button onClick={() => setCount(count + 1)} data-testid="counter">
        {count}
      </button>
    )
  }
  render(
    <Disclosure
      as="details"
      data-testid="details"
      summary="Show payload"
      summaryProps={{ 'data-testid': 'summary', className: 'summary-class' }}
      onToggle={change}
    >
      <Counter />
    </Disclosure>,
  )
  const summary = host('summary')
  const counter = host('counter')
  const body = counter.parentElement
  expect(host('details').firstElementChild).toBe(summary)
  expect(summary.getAttribute('role')).toBe('button')
  expect(summary.className).toBe('summary-class')
  expect(summary.getAttribute('aria-expanded')).toBe('false')
  expect(body?.getAttribute('data-display')).toBe('none')
  expect(body?.getAttribute('data-pointer-events')).toBe('none')
  expect(body?.getAttribute('data-a11y-hidden')).toBe('true')
  expect(body?.getAttribute('data-a11y-importance')).toBe('no-hide-descendants')
  flush()
  expect(change).not.toHaveBeenCalled()

  act(() => summary.click())
  expect(summary.getAttribute('aria-expanded')).toBe('true')
  expect(body?.getAttribute('data-display')).toBeNull()
  expect(body?.getAttribute('data-pointer-events')).toBeNull()
  expect(body?.getAttribute('data-a11y-hidden')).toBeNull()
  expect(change).not.toHaveBeenCalled()
  flush()
  expect(change.mock.calls).toEqual([[true]])
  act(() => counter.click())

  act(() => summary.click())
  flush()
  expect(change.mock.calls).toEqual([[true], [false]])
  expect(host('counter')).toBe(counter)
  expect(counter.textContent).toBe('1')
  expect(body?.getAttribute('data-display')).toBe('none')
})

it('queues initial and prop transitions and does not reopen an unchanged selected row', () => {
  const change = vi.fn()
  const panel = (open?: boolean): ReactElement => (
    <StrictMode>
      <Disclosure
        as="details"
        open={open}
        summary="Summary"
        summaryProps={{ 'data-testid': 'summary' }}
        onToggle={change}
      />
    </StrictMode>
  )
  render(panel(true))
  const summary = host('summary')
  expect(summary.getAttribute('aria-expanded')).toBe('true')
  expect(change).not.toHaveBeenCalled()
  flush()
  expect(change.mock.calls).toEqual([[true]])
  act(() => summary.click())
  render(panel(true))
  expect(summary.getAttribute('aria-expanded')).toBe('false')
  flush()
  expect(change.mock.calls).toEqual([[true], [false]])

  render(panel(false))
  flush()
  expect(change).toHaveBeenCalledTimes(2)
  render(panel(true))
  flush()
  expect(change.mock.calls).toEqual([[true], [false], [true]])
  render(panel())
  flush()
  expect(change.mock.calls).toEqual([[true], [false], [true], [false]])
})

it('coalesces two unresolved transitions and cancels the queued notification on unmount', () => {
  const change = vi.fn()
  render(
    <Disclosure
      as="details"
      summary="Summary"
      summaryProps={{ 'data-testid': 'summary' }}
      onToggle={change}
    />,
  )
  const summary = host('summary')
  act(() => {
    summary.click()
    summary.click()
  })
  expect(change).not.toHaveBeenCalled()
  flush()
  expect(change.mock.calls).toEqual([[false]])
  act(() => summary.click())
  render(null)
  flush()
  expect(change.mock.calls).toEqual([[false]])
})

it('draws the themed rule and exposes separator semantics only for a meaningful rule', () => {
  render(
    <>
      <Rule as="hr" data-testid="rule" className="custom-border" />
      <Rule as="hr" data-testid="decorative" role="presentation" />
    </>,
  )
  const rule = host('rule')
  expect(rule.className).toBe('theme-top-border theme-block-margins custom-border')
  expect(rule.getAttribute('role')).toBe('separator')
  expect(rule.getAttribute('data-accessible')).toBe('true')
  expect(rule.children).toHaveLength(0)
  const decorative = host('decorative')
  expect(decorative.getAttribute('role')).toBeNull()
  expect(decorative.getAttribute('data-accessible')).toBe('false')
  expect(decorative.getAttribute('data-a11y-hidden')).toBe('true')
})
