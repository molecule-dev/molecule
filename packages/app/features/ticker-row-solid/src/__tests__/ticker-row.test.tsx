// @vitest-environment jsdom
/**
 * Unit tests for the Solid `TickerRow` — a port of
 * `@molecule/app-ticker-row-react/src/__tests__/ticker-row.test.tsx`: the same
 * behavioral assertions, rendered with Solid in jsdom and asserted on the
 * markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

import type { TickerRowProps } from '../types.js'

const { TickerRow } = await import('../TickerRow.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Render with Solid's browser renderer and return the mounted container. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

/** The markup the given props produced. */
const markupOf = (props: TickerRowProps): string => {
  const container = mount(() => <TickerRow {...props} />)
  return container.innerHTML
}

/** Dispatches a click with the left button on the element. */
const click = (el: Element): void => {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
}

/** The transparent button carrying the row's open action. */
const openButton = (container: HTMLElement): HTMLButtonElement => {
  const el = container.querySelector('button[data-mol-id="ticker-row-open"]')
  if (!el) throw new Error('the open button did not render')
  return el as HTMLButtonElement
}

describe('TickerRow', () => {
  it('renders the symbol, name, and price', () => {
    const markup = markupOf({ symbol: 'BTC', name: 'Bitcoin', price: '$67,000' })
    expect(markup).toContain('BTC')
    expect(markup).toContain('Bitcoin')
    expect(markup).toContain('$67,000')
  })

  it('renders an up arrow with the theme success class for a positive change', () => {
    const markup = markupOf({ symbol: 'X', price: '$1', changePct: 3.21 })
    expect(markup).toContain('▲')
    expect(markup).toContain('3.21%')
    expect(markup).toContain('textSuccess')
    expect(markup).not.toContain('#22c55e')
    expect(markup).not.toContain('textError')
  })

  it('renders a down arrow with the theme error class for a negative change', () => {
    const markup = markupOf({ symbol: 'X', price: '$1', changePct: -1.5 })
    expect(markup).toContain('▼')
    expect(markup).toContain('-1.50%')
    expect(markup).toContain('textError')
    expect(markup).not.toContain('#ef4444')
  })

  it('announces the change direction in words for screen readers', () => {
    const up = markupOf({ symbol: 'X', price: '$1', changePct: 3.21 })
    expect(up).toContain('aria-hidden="true"')
    expect(up).toContain('srOnly')
    expect(up).toContain('Up')
    const flat = markupOf({ symbol: 'X', price: '$1', changePct: 0 })
    expect(flat).toContain('Unchanged')
    expect(flat).toContain('0.00%')
  })

  it('uses changeDisplay over the formatted percentage when supplied', () => {
    const markup = markupOf({ symbol: 'X', price: '$1', changePct: 2, changeDisplay: '+$0.50' })
    expect(markup).toContain('+$0.50')
    expect(markup).not.toContain('2.00%')
  })

  it('renders the icon, sparkline, and meta slots', () => {
    const markup = markupOf({
      symbol: 'X',
      price: '$1',
      icon: <span data-icon="" />,
      sparkline: <svg data-spark="" />,
      meta: <span data-meta="" />,
    })
    expect(markup).toContain('data-icon=""')
    expect(markup).toContain('data-spark=""')
    expect(markup).toContain('data-meta=""')
  })

  it('marks the row clickable only when onClick is supplied and forwards className', () => {
    const clickable = markupOf({ symbol: 'X', price: '$1', onClick: () => {} })
    expect(clickable).toContain('cursorPointer')
    expect(clickable).toContain('position')
    const plain = markupOf({ symbol: 'X', price: '$1', className: 'tr-cls' })
    expect(plain).not.toContain('cursorPointer')
    expect(plain).not.toContain('position')
    expect(plain).toContain('tr-cls')
  })

  it('clicking the open button calls onClick', () => {
    const onClick = vi.fn()
    const container = mount(() => <TickerRow symbol="BTC" price="$1" onClick={onClick} />)
    click(openButton(container))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenCalledWith()
  })

  it('clicking an inner control does not call onClick', () => {
    const onClick = vi.fn()
    const onMetaClick = vi.fn()
    const container = mount(() => (
      <TickerRow
        symbol="BTC"
        price="$1"
        onClick={onClick}
        meta={
          <button type="button" onClick={() => onMetaClick()} data-meta-control="">
            Watch
          </button>
        }
      />
    ))
    const meta = container.querySelector('button[data-meta-control]')
    if (!meta) throw new Error('the meta control did not render')
    click(meta)
    expect(onMetaClick).toHaveBeenCalledTimes(1)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('the open button is named by the label', () => {
    const container = mount(() => (
      <TickerRow symbol="BTC" name="Bitcoin" price="$1" onClick={() => {}} />
    ))
    const labelledBy = openButton(container).getAttribute('aria-labelledby') ?? ''
    const name = labelledBy
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
    expect(name).toBe('BTC')
  })

  it('without onClick there is no open button', () => {
    const container = mount(() => <TickerRow symbol="BTC" price="$1" />)
    expect(container.querySelector('button')).toBeNull()
    expect(container.querySelector('div')?.getAttribute('style') ?? '').not.toContain('relative')
  })
})
