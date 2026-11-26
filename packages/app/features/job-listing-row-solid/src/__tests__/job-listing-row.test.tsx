// @vitest-environment jsdom
/**
 * Unit tests for the Solid `JobListingRow` — a port of
 * `@molecule/app-job-listing-row-react/src/__tests__/job-listing-row.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without
// a real bond — the same mock the React tests use.
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

const { JobListingRow } = await import('../JobListingRow.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Render with Solid's browser renderer and return the markup. */
const mount = (view: Parameters<typeof render>[0]): string => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  const markup = container.innerHTML
  return markup
}

/** Renders and returns the container element (for events). */
const mountHost = (view: Parameters<typeof render>[0]): HTMLElement => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

/** The row's open button: the transparent native button over the whole row. */
const openButton = (host: HTMLElement): HTMLButtonElement =>
  host.querySelector('button[data-mol-id="job-listing-row-open"]')!

describe('JobListingRow', () => {
  it('renders the title inside an <h3>', () => {
    const markup = mount(() => <JobListingRow title="Senior Engineer" />)
    expect(markup).toContain('<h3')
    expect(markup).toContain('Senior Engineer')
  })

  it('renders company, location, type, salary, and postedAt when present', () => {
    const markup = mount(() => (
      <JobListingRow
        title="T"
        company="Acme"
        location="Remote"
        type="Full-time"
        salary="$120k"
        postedAt="2d ago"
      />
    ))
    expect(markup).toContain('Acme')
    expect(markup).toContain('Remote')
    expect(markup).toContain('Full-time')
    expect(markup).toContain('$120k')
    expect(markup).toContain('2d ago')
  })

  it('renders the leading and actions slots', () => {
    const markup = mount(() => (
      <JobListingRow
        title="T"
        leading={<span data-leading="" />}
        actions={<span data-actions="" />}
      />
    ))
    expect(markup).toContain('data-leading=""')
    expect(markup).toContain('data-actions=""')
  })

  it('renders the tags slot', () => {
    const markup = mount(() => <JobListingRow title="T" tags={<span data-tags="" />} />)
    expect(markup).toContain('data-tags=""')
  })

  it('marks the row clickable only when onClick is supplied', () => {
    const clickable = mount(() => <JobListingRow title="T" onClick={() => {}} />)
    expect(clickable).toContain('cursorPointer')
    const plain = mount(() => <JobListingRow title="T" />)
    expect(plain).not.toContain('cursorPointer')
  })

  it('without onClick there is no open button', () => {
    const clickable = mount(() => <JobListingRow title="T" onClick={() => {}} />)
    expect(clickable).toContain('<button type="button"')
    expect(clickable).toContain('data-mol-id="job-listing-row-open"')
    const plain = mount(() => <JobListingRow title="T" />)
    expect(plain).not.toContain('<button')
  })

  it('clicking the open button calls onClick', () => {
    const onClick = vi.fn()
    const host = mountHost(() => <JobListingRow title="Senior Engineer" onClick={onClick} />)
    openButton(host).click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('clicking an inner control does not call onClick', () => {
    const onClick = vi.fn()
    const host = mountHost(() => (
      <JobListingRow
        title="T"
        tags={<span data-tag="">Remote</span>}
        actions={
          <button type="button" data-actions="">
            Apply
          </button>
        }
        onClick={onClick}
      />
    ))
    host.querySelector<HTMLElement>('[data-actions]')!.click()
    host.querySelector<HTMLElement>('[data-tag]')!.click()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('the open button is named by the label', () => {
    const host = mountHost(() => (
      <JobListingRow title="Senior Frontend Engineer" onClick={() => {}} />
    ))
    const labelId = openButton(host).getAttribute('aria-labelledby') ?? ''
    expect(labelId).not.toBe('')
    const heading = document.getElementById(labelId)
    expect(heading?.tagName.toLowerCase()).toBe('h3')
    expect(heading?.textContent?.trim()).toBe('Senior Frontend Engineer')
  })

  it('forwards className', () => {
    const markup = mount(() => <JobListingRow title="T" className="jlr-cls" />)
    expect(markup).toContain('jlr-cls')
  })
})
