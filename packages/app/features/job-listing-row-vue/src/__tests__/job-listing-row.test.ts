// @vitest-environment jsdom
/**
 * Unit tests for the Vue `JobListingRow` — a port of
 * `@molecule/app-job-listing-row-react/src/__tests__/job-listing-row.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without
// a real bond — the same mock the React tests use.
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

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { JobListingRow } from '../JobListingRow.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link JobListingRow} and returns the markup it produced. */
const render = (
  props: Record<string, unknown>,
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(JobListingRow, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

/** Mounts a {@link JobListingRow} and returns its host element (for events). */
const mountHost = (
  props: Record<string, unknown>,
  slots?: Record<string, () => VNodeChild[]>,
): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(JobListingRow, props, slots) }))
  app.mount(host)
  return host
}

/** The row's open button: the transparent native button over the whole row. */
const openButton = (host: HTMLElement): HTMLButtonElement =>
  host.querySelector('button[data-mol-id="job-listing-row-open"]')!

describe('JobListingRow', () => {
  it('renders the title inside an <h3>', () => {
    const markup = render({ title: 'Senior Engineer' })
    expect(markup).toContain('<h3')
    expect(markup).toContain('Senior Engineer')
  })

  it('renders company, location, type, salary, and postedAt when present', () => {
    const markup = render({
      title: 'T',
      company: 'Acme',
      location: 'Remote',
      type: 'Full-time',
      salary: '$120k',
      postedAt: '2d ago',
    })
    expect(markup).toContain('Acme')
    expect(markup).toContain('Remote')
    expect(markup).toContain('Full-time')
    expect(markup).toContain('$120k')
    expect(markup).toContain('2d ago')
  })

  it('renders the leading and actions slots', () => {
    const markup = render(
      { title: 'T' },
      {
        leading: () => [h('span', { 'data-leading': '' })],
        actions: () => [h('span', { 'data-actions': '' })],
      },
    )
    expect(markup).toContain('data-leading=""')
    expect(markup).toContain('data-actions=""')
  })

  it('renders the tags slot', () => {
    const markup = render({ title: 'T' }, { tags: () => [h('span', { 'data-tags': '' })] })
    expect(markup).toContain('data-tags=""')
  })

  it('marks the row clickable only when onClick is supplied', () => {
    const clickable = render({ title: 'T', onClick: () => {} })
    expect(clickable).toContain('cursorPointer')
    const plain = render({ title: 'T' })
    expect(plain).not.toContain('cursorPointer')
  })

  it('without onClick there is no open button', () => {
    const clickable = render({ title: 'T', onClick: () => {} })
    expect(clickable).toContain('<button type="button"')
    expect(clickable).toContain('data-mol-id="job-listing-row-open"')
    const plain = render({ title: 'T' })
    expect(plain).not.toContain('<button')
  })

  it('clicking the open button calls onClick', () => {
    const onClick = vi.fn()
    const host = mountHost({ title: 'Senior Engineer', onClick })
    openButton(host).click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('clicking an inner control does not call onClick', () => {
    const onClick = vi.fn()
    const host = mountHost(
      { title: 'T', onClick },
      {
        tags: () => [h('span', { 'data-tag': '' }, 'Remote')],
        actions: () => [h('button', { type: 'button', 'data-actions': '' }, 'Apply')],
      },
    )
    host.querySelector<HTMLElement>('[data-actions]')!.click()
    host.querySelector<HTMLElement>('[data-tag]')!.click()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('the open button is named by the label', () => {
    const host = mountHost({ title: 'Senior Frontend Engineer', onClick: () => {} })
    const labelId = openButton(host).getAttribute('aria-labelledby') ?? ''
    expect(labelId).not.toBe('')
    const heading = document.getElementById(labelId)
    expect(heading?.tagName.toLowerCase()).toBe('h3')
    expect(heading?.textContent).toBe('Senior Frontend Engineer')
  })

  it('forwards className', () => {
    const markup = render({ title: 'T', className: 'jlr-cls' })
    expect(markup).toContain('jlr-cls')
  })
})
