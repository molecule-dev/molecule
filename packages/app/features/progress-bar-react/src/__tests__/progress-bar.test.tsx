import type { ReactNode } from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

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

vi.mock('@molecule/app-ui-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Card: ({ children, className }: { children?: ReactNode; className?: string }) =>
    createElement('div', { 'data-card': '', className }, children),
}))

const { ProgressBar } = await import('../ProgressBar.js')
const { ProgressCard } = await import('../ProgressCard.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

afterEach(() => {
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('ProgressBar', () => {
  it('renders the label and valueLabel header row when given', () => {
    const markup = html(
      createElement(ProgressBar, { value: 50, label: 'Storage', valueLabel: '50%' }),
    )
    expect(markup).toContain('Storage')
    expect(markup).toContain('50%')
  })

  it('omits the header row when neither label nor valueLabel is given', () => {
    const markup = html(createElement(ProgressBar, { value: 50 }))
    expect(markup).not.toContain('<span')
  })

  it('exposes progressbar a11y attributes', () => {
    const markup = html(createElement(ProgressBar, { value: 30, max: 60 }))
    expect(markup).toContain('role="progressbar"')
    expect(markup).toContain('aria-valuenow="30"')
    expect(markup).toContain('aria-valuemin="0"')
    expect(markup).toContain('aria-valuemax="60"')
  })

  it('names the track with the default t() label when no label prop is given', () => {
    const markup = html(createElement(ProgressBar, { value: 50 }))
    expect(markup).toContain('aria-label="Progress"')
  })

  it('names the track with the rendered label via aria-labelledby', () => {
    const markup = html(createElement(ProgressBar, { value: 50, label: 'Storage' }))
    const id = /<span id="([^"]+)"/.exec(markup)?.[1]
    expect(id).toBeTruthy()
    expect(markup).toContain(`aria-labelledby="${id}"`)
    expect(markup).not.toContain('aria-label="Progress"')
  })

  it('lets the labelledBy prop win over the rendered label and the default name', () => {
    const labelled = html(
      createElement(ProgressBar, { value: 50, label: 'Storage', labelledBy: 'ext-title' }),
    )
    expect(labelled).toContain('aria-labelledby="ext-title"')
    expect(labelled).not.toContain('aria-label="Progress"')
    expect(labelled).not.toContain('<span id=')

    const bare = html(createElement(ProgressBar, { value: 50, labelledBy: 'ext-title' }))
    expect(bare).toContain('aria-labelledby="ext-title"')
    expect(bare).not.toContain('aria-label="Progress"')
  })

  it('forwards describedBy as aria-describedby', () => {
    const markup = html(createElement(ProgressBar, { value: 50, describedBy: 'ext-desc' }))
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
    const markup = html(createElement(ProgressBar, { value: 50 }))
    expect(markup).toContain('aria-label="Avance"')
  })

  it('sets the fill width to value/max as a percentage', () => {
    expect(html(createElement(ProgressBar, { value: 25, max: 100 }))).toContain('width:25%')
    expect(html(createElement(ProgressBar, { value: 50, max: 200 }))).toContain('width:25%')
  })

  it('clamps the fill width to the 0–100 range', () => {
    expect(html(createElement(ProgressBar, { value: 500, max: 100 }))).toContain('width:100%')
    expect(html(createElement(ProgressBar, { value: -10, max: 100 }))).toContain('width:0%')
  })

  it('renders 0% width when max is 0', () => {
    expect(html(createElement(ProgressBar, { value: 10, max: 0 }))).toContain('width:0%')
  })

  it('forwards className', () => {
    const markup = html(createElement(ProgressBar, { value: 10, className: 'pb-cls' }))
    expect(markup).toContain('pb-cls')
  })
})

describe('ProgressCard', () => {
  it('renders the title inside an <h3>', () => {
    const markup = html(createElement(ProgressCard, { title: 'Budget', value: 40 }))
    expect(markup).toContain('<h3')
    expect(markup).toContain('Budget')
  })

  it('renders the description and icon when present', () => {
    const markup = html(
      createElement(ProgressCard, {
        title: 'T',
        value: 40,
        description: 'desc-x',
        icon: createElement('i', { 'data-icon': '' }),
      }),
    )
    expect(markup).toContain('desc-x')
    expect(markup).toContain('data-icon=""')
  })

  it('renders the valueLabel', () => {
    const markup = html(createElement(ProgressCard, { title: 'T', value: 40, valueLabel: '40%' }))
    expect(markup).toContain('40%')
  })

  it('renders the inner ProgressBar', () => {
    const markup = html(createElement(ProgressCard, { title: 'T', value: 40 }))
    expect(markup).toContain('role="progressbar"')
  })

  it('names the bar by the title and describes it by the description', () => {
    const plain = html(createElement(ProgressCard, { title: 'Budget', value: 40 }))
    const titleId = /<h3 id="([^"]+)"/.exec(plain)?.[1]
    expect(titleId).toBeTruthy()
    expect(plain).toContain(`aria-labelledby="${titleId}"`)
    expect(plain).not.toContain('aria-describedby')

    const described = html(
      createElement(ProgressCard, { title: 'T', value: 40, description: '8.5 GB of 10 GB' }),
    )
    const descId = /<p id="([^"]+)"/.exec(described)?.[1]
    expect(descId).toBeTruthy()
    expect(described).toContain(`aria-describedby="${descId}"`)
  })

  it('renders the children slot below the bar', () => {
    const markup = html(
      createElement(ProgressCard, {
        title: 'T',
        value: 40,
        children: createElement('div', { 'data-extra': '' }),
      }),
    )
    expect(markup).toContain('data-extra=""')
  })

  it('forwards className onto the Card', () => {
    const markup = html(createElement(ProgressCard, { title: 'T', value: 40, className: 'pc-cls' }))
    expect(markup).toContain('pc-cls')
  })
})
