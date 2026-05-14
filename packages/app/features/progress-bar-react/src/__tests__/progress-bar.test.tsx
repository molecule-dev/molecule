import { createElement } from 'react'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

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

vi.mock('@molecule/app-ui-react', () => ({
  Card: ({ children, className }: { children?: ReactNode; className?: string }) =>
    createElement('div', { 'data-card': '', className }, children),
}))

const { ProgressBar } = await import('../ProgressBar.js')
const { ProgressCard } = await import('../ProgressCard.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('ProgressBar', () => {
  it('renders the label and valueLabel header row when given', () => {
    const markup = html(
      createElement(ProgressBar, { value: 50, label: 'Storage', valueLabel: '50%' }),
    )
    expect(markup).toContain('Storage')
    expect(markup).toContain('50%')
  })

  it('omits the header row when neither label nor valueLabel is given', () => {
    const markup = html(createElement(ProgressBar, { value: 50 }))
    expect(markup).not.toContain('<span')
  })

  it('exposes progressbar a11y attributes', () => {
    const markup = html(createElement(ProgressBar, { value: 30, max: 60 }))
    expect(markup).toContain('role="progressbar"')
    expect(markup).toContain('aria-valuenow="30"')
    expect(markup).toContain('aria-valuemin="0"')
    expect(markup).toContain('aria-valuemax="60"')
  })

  it('sets the fill width to value/max as a percentage', () => {
    expect(html(createElement(ProgressBar, { value: 25, max: 100 }))).toContain('width:25%')
    expect(html(createElement(ProgressBar, { value: 50, max: 200 }))).toContain('width:25%')
  })

  it('clamps the fill width to the 0–100 range', () => {
    expect(html(createElement(ProgressBar, { value: 500, max: 100 }))).toContain('width:100%')
    expect(html(createElement(ProgressBar, { value: -10, max: 100 }))).toContain('width:0%')
  })

  it('renders 0% width when max is 0', () => {
    expect(html(createElement(ProgressBar, { value: 10, max: 0 }))).toContain('width:0%')
  })

  it('forwards className', () => {
    const markup = html(createElement(ProgressBar, { value: 10, className: 'pb-cls' }))
    expect(markup).toContain('pb-cls')
  })
})

describe('ProgressCard', () => {
  it('renders the title inside an <h3>', () => {
    const markup = html(createElement(ProgressCard, { title: 'Budget', value: 40 }))
    expect(markup).toContain('<h3')
    expect(markup).toContain('Budget')
  })

  it('renders the description and icon when present', () => {
    const markup = html(
      createElement(ProgressCard, {
        title: 'T',
        value: 40,
        description: 'desc-x',
        icon: createElement('i', { 'data-icon': '' }),
      }),
    )
    expect(markup).toContain('desc-x')
    expect(markup).toContain('data-icon=""')
  })

  it('renders the valueLabel', () => {
    const markup = html(createElement(ProgressCard, { title: 'T', value: 40, valueLabel: '40%' }))
    expect(markup).toContain('40%')
  })

  it('renders the inner ProgressBar', () => {
    const markup = html(createElement(ProgressCard, { title: 'T', value: 40 }))
    expect(markup).toContain('role="progressbar"')
  })

  it('renders the children slot below the bar', () => {
    const markup = html(
      createElement(ProgressCard, {
        title: 'T',
        value: 40,
        children: createElement('div', { 'data-extra': '' }),
      }),
    )
    expect(markup).toContain('data-extra=""')
  })

  it('forwards className onto the Card', () => {
    const markup = html(createElement(ProgressCard, { title: 'T', value: 40, className: 'pc-cls' }))
    expect(markup).toContain('pc-cls')
  })
})
