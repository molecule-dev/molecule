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

const { JobListingRow } = await import('../JobListingRow.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('JobListingRow', () => {
  it('renders the title inside an <h3>', () => {
    const markup = html(createElement(JobListingRow, { title: 'Senior Engineer' }))
    expect(markup).toContain('<h3')
    expect(markup).toContain('Senior Engineer')
  })

  it('renders company, location, type, salary, and postedAt when present', () => {
    const markup = html(
      createElement(JobListingRow, {
        title: 'T',
        company: 'Acme',
        location: 'Remote',
        type: 'Full-time',
        salary: '$120k',
        postedAt: '2d ago',
      }),
    )
    expect(markup).toContain('Acme')
    expect(markup).toContain('Remote')
    expect(markup).toContain('Full-time')
    expect(markup).toContain('$120k')
    expect(markup).toContain('2d ago')
  })

  it('renders the leading and actions slots', () => {
    const markup = html(
      createElement(JobListingRow, {
        title: 'T',
        leading: createElement('span', { 'data-leading': '' }),
        actions: createElement('span', { 'data-actions': '' }),
      }),
    )
    expect(markup).toContain('data-leading=""')
    expect(markup).toContain('data-actions=""')
  })

  it('renders the tags slot', () => {
    const markup = html(
      createElement(JobListingRow, {
        title: 'T',
        tags: createElement('span', { 'data-tags': '' }),
      }),
    )
    expect(markup).toContain('data-tags=""')
  })

  it('marks the row clickable only when onClick is supplied', () => {
    const clickable = html(createElement(JobListingRow, { title: 'T', onClick: () => {} }))
    expect(clickable).toContain('cursorPointer')
    const plain = html(createElement(JobListingRow, { title: 'T' }))
    expect(plain).not.toContain('cursorPointer')
  })

  it('forwards className', () => {
    const markup = html(createElement(JobListingRow, { title: 'T', className: 'jlr-cls' }))
    expect(markup).toContain('jlr-cls')
  })
})
