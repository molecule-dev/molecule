import { createElement } from 'react'
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

const { StatusTimeline } = await import('../StatusTimeline.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

const steps = [
  { key: 'created', label: 'Created' },
  { key: 'review', label: 'In review' },
  { key: 'done', label: 'Done' },
]

describe('StatusTimeline', () => {
  it('renders an <ol> with one <li> per step', () => {
    const markup = html(createElement(StatusTimeline, { steps, currentKey: 'review' }))
    expect(markup.startsWith('<ol')).toBe(true)
    expect(markup.match(/<li/g) ?? []).toHaveLength(3)
    expect(markup).toContain('Created')
    expect(markup).toContain('In review')
    expect(markup).toContain('Done')
  })

  it('marks steps at or before the current one as reached (filled dot)', () => {
    const markup = html(createElement(StatusTimeline, { steps, currentKey: 'review' }))
    // created + review reached => 2 bg-primary dots, done => 1 bg-outline-variant
    expect(markup.split('bg-primary').length - 1).toBe(2)
    expect(markup.split('bg-outline-variant').length - 1).toBe(1)
  })

  it('bolds the current step label', () => {
    const markup = html(createElement(StatusTimeline, { steps, currentKey: 'review' }))
    expect(markup.split('fontWeight').length - 1).toBe(1)
  })

  it('sets the aria-label and data-mol-id', () => {
    const markup = html(
      createElement(StatusTimeline, {
        steps,
        currentKey: 'created',
        ariaLabel: 'Order progress',
        dataMolId: 'st-x',
      }),
    )
    expect(markup).toContain('aria-label="Order progress"')
    expect(markup).toContain('data-mol-id="st-x"')
  })

  it('forwards className', () => {
    const markup = html(
      createElement(StatusTimeline, { steps, currentKey: 'done', className: 'stl-cls' }),
    )
    expect(markup).toContain('stl-cls')
  })
})
