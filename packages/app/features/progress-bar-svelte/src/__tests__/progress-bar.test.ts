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

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

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
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
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

  it('names the track with the default t() label when no label prop is given', () => {
    const markup = render(ProgressBar as never, { value: 50 })
    expect(markup).toContain('aria-label="Progress"')
  })

  it('names the track with the rendered label via aria-labelledby', () => {
    const markup = render(ProgressBar as never, { value: 50, label: 'Storage' })
    const id = /<span id="([^"]+)"/.exec(markup)?.[1]
    expect(id).toBeTruthy()
    expect(markup).toContain(`aria-labelledby="${id}"`)
    expect(markup).not.toContain('aria-label="Progress"')
  })

  it('lets the labelledBy prop win over the rendered label and the default name', () => {
    const labelled = render(ProgressBar as never, {
      value: 50,
      label: 'Storage',
      labelledBy: 'ext-title',
    })
    expect(labelled).toContain('aria-labelledby="ext-title"')
    expect(labelled).not.toContain('aria-label="Progress"')
    expect(labelled).not.toContain('<span id=')

    const bare = render(ProgressBar as never, { value: 50, labelledBy: 'ext-title' })
    expect(bare).toContain('aria-labelledby="ext-title"')
    expect(bare).not.toContain('aria-label="Progress"')
  })

  it('forwards describedBy as aria-describedby', () => {
    const markup = render(ProgressBar as never, { value: 50, describedBy: 'ext-desc' })
    expect(markup).toContain('aria-describedby="ext-desc"')
  })

  it('lets a locale bond translate the default accessible name', () => {
    setProvider(
      createSimpleI18nProvider('en', [
        {
          code: 'en',
          name: 'English',
          translations: { 'progressBar.label': 'Avance' },
        },
      ]),
    )
    const markup = render(ProgressBar as never, { value: 50 })
    expect(markup).toContain('aria-label="Avance"')
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

  it('names the bar by the title and describes it by the description', () => {
    const plain = render(ProgressCard as never, { title: 'Budget', value: 40 })
    const titleId = /<h3 id="([^"]+)"/.exec(plain)?.[1]
    expect(titleId).toBeTruthy()
    expect(plain).toContain(`aria-labelledby="${titleId}"`)
    expect(plain).not.toContain('aria-describedby')

    const described = render(ProgressCard as never, {
      title: 'T',
      value: 40,
      description: '8.5 GB of 10 GB',
    })
    const descId = /<p id="([^"]+)"/.exec(described)?.[1]
    expect(descId).toBeTruthy()
    expect(described).toContain(`aria-describedby="${descId}"`)
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
