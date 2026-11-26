// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { JobListingRowProps } from '../JobListingRow.js'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

/** Mounted roots, unmounted after each test. */
const mounted: Array<() => void> = []

afterEach(() => {
  for (const unmount of mounted.splice(0)) unmount()
})

/**
 * Mounts the component into the document (the string renderer cannot fire
 * events) and returns its host element.
 */
const mount = (props: JobListingRowProps): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  act(() => {
    root.render(createElement(JobListingRow, props))
  })
  mounted.push(() => {
    act(() => {
      root.unmount()
    })
    host.remove()
  })
  return host
}

/** The row's open button: the transparent native button over the whole row. */
const openButton = (host: HTMLElement): HTMLButtonElement =>
  host.querySelector('button[data-mol-id="job-listing-row-open"]')!

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

  it('without onClick there is no open button', () => {
    const clickable = html(createElement(JobListingRow, { title: 'T', onClick: () => {} }))
    expect(clickable).toContain('<button type="button"')
    expect(clickable).toContain('data-mol-id="job-listing-row-open"')
    const plain = html(createElement(JobListingRow, { title: 'T' }))
    expect(plain).not.toContain('<button')
  })

  it('clicking the open button calls onClick', () => {
    const onClick = vi.fn()
    const host = mount({ title: 'Senior Engineer', onClick })
    openButton(host).click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('clicking an inner control does not call onClick', () => {
    const onClick = vi.fn()
    const host = mount({
      title: 'T',
      tags: createElement('span', { 'data-tag': '' }, 'Remote'),
      actions: createElement('button', { type: 'button', 'data-actions': '' }, 'Apply'),
      onClick,
    })
    host.querySelector<HTMLElement>('[data-actions]')!.click()
    host.querySelector<HTMLElement>('[data-tag]')!.click()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('the open button is named by the label', () => {
    const host = mount({ title: 'Senior Frontend Engineer', onClick: () => {} })
    const button = openButton(host)
    const labelId = button.getAttribute('aria-labelledby') ?? ''
    expect(labelId).not.toBe('')
    const heading = document.getElementById(labelId)
    expect(heading?.tagName.toLowerCase()).toBe('h3')
    expect(heading?.textContent).toBe('Senior Frontend Engineer')
  })

  it('forwards className', () => {
    const markup = html(createElement(JobListingRow, { title: 'T', className: 'jlr-cls' }))
    expect(markup).toContain('jlr-cls')
  })
})
