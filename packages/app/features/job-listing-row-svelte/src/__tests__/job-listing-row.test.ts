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

/** Renders a {@link JobListingRow} and returns its target element (for events). */
const renderHost = (props: JobListingRowProps): HTMLElement => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  instances.push(mount(JobListingRow, { target, props }))
  flushSync()
  return target
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

  it('without onClick there is no open button', () => {
    const clickable = render({ title: 'T', onClick: () => {} })
    expect(clickable).toContain('<button type="button"')
    expect(clickable).toContain('data-mol-id="job-listing-row-open"')
    const plain = render({ title: 'T' })
    expect(plain).not.toContain('<button')
  })

  it('clicking the open button calls onClick', () => {
    const onClick = vi.fn()
    const host = renderHost({ title: 'Senior Engineer', onClick })
    openButton(host).click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('clicking an inner control does not call onClick', () => {
    const onClick = vi.fn()
    const host = renderHost({
      title: 'T',
      tags: raw('<span data-tag="">Remote</span>'),
      actions: raw('<button type="button" data-actions="">Apply</button>'),
      onClick,
    })
    host.querySelector<HTMLElement>('[data-actions]')!.click()
    host.querySelector<HTMLElement>('[data-tag]')!.click()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('the open button is named by the label', () => {
    const host = renderHost({ title: 'Senior Frontend Engineer', onClick: () => {} })
    const labelId = openButton(host).getAttribute('aria-labelledby') ?? ''
    expect(labelId).not.toBe('')
    const heading = document.getElementById(labelId)
    expect(heading?.tagName.toLowerCase()).toBe('h3')
    expect(heading?.textContent?.trim()).toBe('Senior Frontend Engineer')
  })

  it('forwards className', () => {
    const markup = render({ title: 'T', className: 'jlr-cls' })
    expect(markup).toContain('jlr-cls')
  })
})
