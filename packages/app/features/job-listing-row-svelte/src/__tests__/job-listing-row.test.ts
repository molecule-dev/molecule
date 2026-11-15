// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `JobListingRow` — a port of
 * `@molecule/app-job-listing-row-react/src/__tests__/job-listing-row.test.tsx`:
 * the same behavioral assertions, rendered with Svelte 5 in jsdom and asserted
 * on the markup the component produces.
 *
 * @module
 */

import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
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

import JobListingRow from '../JobListingRow.svelte'
import type { JobListingRowProps } from '../types.js'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

const instances: ReturnType<typeof mount>[] = []

afterEach(async () => {
  for (const instance of instances.splice(0)) unmount(instance)
  document.body.innerHTML = ''
})

/** Renders a {@link JobListingRow} and returns the markup it produced. */
const render = (props: JobListingRowProps): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  instances.push(mount(JobListingRow, { target, props }))
  flushSync()
  return target.innerHTML
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
    const markup = render({
      title: 'T',
      leading: raw('<span data-leading=""></span>'),
      actions: raw('<span data-actions=""></span>'),
    })
    expect(markup).toContain('data-leading=""')
    expect(markup).toContain('data-actions=""')
  })

  it('renders the tags slot', () => {
    const markup = render({ title: 'T', tags: raw('<span data-tags=""></span>') })
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
