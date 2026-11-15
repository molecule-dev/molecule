// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `ProgressBar` / `ProgressCard` — a port of
 * `@molecule/app-progress-bar-react/src/__tests__/progress-bar.test.tsx`: the
 * same test names and the same behavioral assertions, rendered with a real
 * Svelte mount (jsdom) and the same mocked ClassMap the React suite uses.
 *
 * @module
 */

import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

import ProgressBar from '../ProgressBar.svelte'
import ProgressCard from '../ProgressCard.svelte'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

const instances: unknown[] = []

afterEach(async () => {
  for (const instance of instances.splice(0))
    await unmount(instance as Parameters<typeof unmount>[0])
  document.body.innerHTML = ''
})

/**
 * Mounts a component and returns the markup it produced.
 *
 * @param component - The Svelte component to mount.
 * @param props - The component props.
 * @returns The rendered markup.
 */
function render(component: never, props: Record<string, unknown>): string {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(component, { target, props: props as never })
  instances.push(instance)
  flushSync()
  return target.innerHTML
}

describe('ProgressBar', () => {
  it('renders the label and valueLabel header row when given', () => {
    const markup = render(ProgressBar as never, { value: 50, label: 'Storage', valueLabel: '50%' })
    expect(markup).toContain('Storage')
    expect(markup).toContain('50%')
  })

  it('omits the header row when neither label nor valueLabel is given', () => {
    const markup = render(ProgressBar as never, { value: 50 })
    expect(markup).not.toContain('<span')
  })

  it('exposes progressbar a11y attributes', () => {
    const markup = render(ProgressBar as never, { value: 30, max: 60 })
    expect(markup).toContain('role="progressbar"')
    expect(markup).toContain('aria-valuenow="30"')
    expect(markup).toContain('aria-valuemin="0"')
    expect(markup).toContain('aria-valuemax="60"')
  })

  it('sets the fill width to value/max as a percentage', () => {
    expect(render(ProgressBar as never, { value: 25, max: 100 })).toContain('width: 25%')
    expect(render(ProgressBar as never, { value: 50, max: 200 })).toContain('width: 25%')
  })

  it('clamps the fill width to the 0–100 range', () => {
    expect(render(ProgressBar as never, { value: 500, max: 100 })).toContain('width: 100%')
    expect(render(ProgressBar as never, { value: -10, max: 100 })).toContain('width: 0%')
  })

  it('renders 0% width when max is 0', () => {
    expect(render(ProgressBar as never, { value: 10, max: 0 })).toContain('width: 0%')
  })

  it('forwards className', () => {
    const markup = render(ProgressBar as never, { value: 10, className: 'pb-cls' })
    expect(markup).toContain('pb-cls')
  })
})

describe('ProgressCard', () => {
  it('renders the title inside an <h3>', () => {
    const markup = render(ProgressCard as never, { title: 'Budget', value: 40 })
    expect(markup).toContain('<h3')
    expect(markup).toContain('Budget')
  })

  it('renders the description and icon when present', () => {
    const markup = render(ProgressCard as never, {
      title: 'T',
      value: 40,
      description: 'desc-x',
      icon: raw('<i data-icon=""></i>'),
    })
    expect(markup).toContain('desc-x')
    expect(markup).toContain('data-icon=""')
  })

  it('renders the valueLabel', () => {
    const markup = render(ProgressCard as never, { title: 'T', value: 40, valueLabel: '40%' })
    expect(markup).toContain('40%')
  })

  it('renders the inner ProgressBar', () => {
    const markup = render(ProgressCard as never, { title: 'T', value: 40 })
    expect(markup).toContain('role="progressbar"')
  })

  it('renders the children slot below the bar', () => {
    const markup = render(ProgressCard as never, {
      title: 'T',
      value: 40,
      children: raw('<div data-extra=""></div>'),
    })
    expect(markup).toContain('data-extra=""')
  })

  it('forwards className onto the Card', () => {
    const markup = render(ProgressCard as never, { title: 'T', value: 40, className: 'pc-cls' })
    expect(markup).toContain('pc-cls')
  })
})
