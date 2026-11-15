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

  it('forwards className', () => {
    const markup = render({ title: 'T', className: 'jlr-cls' })
    expect(markup).toContain('jlr-cls')
  })
})
