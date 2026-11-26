// @vitest-environment jsdom
/**
 * Unit tests for the Solid `ProgressBar` / `ProgressCard` — a port of
 * `@molecule/app-progress-bar-react/src/__tests__/progress-bar.test.tsx`: the
 * same behavioral assertions, rendered with Solid in jsdom.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

// The Card marker the React tests mock `@molecule/app-ui-react` with.
vi.mock('@molecule/app-ui-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Card: (props: { children?: JSX.Element; className?: string }) => (
    <div data-card="" class={props.className}>
      {props.children}
    </div>
  ),
}))

const { ProgressBar } = await import('../ProgressBar.jsx')
const { ProgressCard } = await import('../ProgressCard.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/** Render with Solid's browser renderer and dispose after the test. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('ProgressBar', () => {
  it('renders the label and valueLabel header row when given', () => {
    const markup = mount(() => (
      <ProgressBar value={50} label="Storage" valueLabel="50%" />
    )).innerHTML
    expect(markup).toContain('Storage')
    expect(markup).toContain('50%')
  })

  it('omits the header row when neither label nor valueLabel is given', () => {
    const markup = mount(() => <ProgressBar value={50} />).innerHTML
    expect(markup).not.toContain('<span')
  })

  it('exposes progressbar a11y attributes', () => {
    const markup = mount(() => <ProgressBar value={30} max={60} />).innerHTML
    expect(markup).toContain('role="progressbar"')
    expect(markup).toContain('aria-valuenow="30"')
    expect(markup).toContain('aria-valuemin="0"')
    expect(markup).toContain('aria-valuemax="60"')
  })

  it('names the track with the default t() label when no label prop is given', () => {
    const markup = mount(() => <ProgressBar value={50} />).innerHTML
    expect(markup).toContain('aria-label="Progress"')
  })

  it('names the track with the rendered label via aria-labelledby', () => {
    const markup = mount(() => <ProgressBar value={50} label="Storage" />).innerHTML
    const id = /<span id="([^"]+)"/.exec(markup)?.[1]
    expect(id).toBeTruthy()
    expect(markup).toContain(`aria-labelledby="${id}"`)
    expect(markup).not.toContain('aria-label="Progress"')
  })

  it('lets the labelledBy prop win over the rendered label and the default name', () => {
    const labelled = mount(() => (
      <ProgressBar value={50} label="Storage" labelledBy="ext-title" />
    )).innerHTML
    expect(labelled).toContain('aria-labelledby="ext-title"')
    expect(labelled).not.toContain('aria-label="Progress"')
    expect(labelled).not.toContain('<span id=')

    const bare = mount(() => <ProgressBar value={50} labelledBy="ext-title" />).innerHTML
    expect(bare).toContain('aria-labelledby="ext-title"')
    expect(bare).not.toContain('aria-label="Progress"')
  })

  it('forwards describedBy as aria-describedby', () => {
    const markup = mount(() => <ProgressBar value={50} describedBy="ext-desc" />).innerHTML
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
    const markup = mount(() => <ProgressBar value={50} />).innerHTML
    expect(markup).toContain('aria-label="Avance"')
  })

  it('sets the fill width to value/max as a percentage', () => {
    expect(mount(() => <ProgressBar value={25} max={100} />).innerHTML).toContain('width: 25%')
    expect(mount(() => <ProgressBar value={50} max={200} />).innerHTML).toContain('width: 25%')
  })

  it('clamps the fill width to the 0–100 range', () => {
    expect(mount(() => <ProgressBar value={500} max={100} />).innerHTML).toContain('width: 100%')
    expect(mount(() => <ProgressBar value={-10} max={100} />).innerHTML).toContain('width: 0%')
  })

  it('renders 0% width when max is 0', () => {
    expect(mount(() => <ProgressBar value={10} max={0} />).innerHTML).toContain('width: 0%')
  })

  it('forwards className', () => {
    const markup = mount(() => <ProgressBar value={10} className="pb-cls" />).innerHTML
    expect(markup).toContain('pb-cls')
  })
})

describe('ProgressCard', () => {
  it('renders the title inside an <h3>', () => {
    const markup = mount(() => <ProgressCard title="Budget" value={40} />).innerHTML
    expect(markup).toContain('<h3')
    expect(markup).toContain('Budget')
  })

  it('renders the description and icon when present', () => {
    const markup = mount(() => (
      <ProgressCard title="T" value={40} description="desc-x" icon={<i data-icon="" />} />
    )).innerHTML
    expect(markup).toContain('desc-x')
    expect(markup).toContain('data-icon=""')
  })

  it('renders the valueLabel', () => {
    const markup = mount(() => <ProgressCard title="T" value={40} valueLabel="40%" />).innerHTML
    expect(markup).toContain('40%')
  })

  it('renders the inner ProgressBar', () => {
    const markup = mount(() => <ProgressCard title="T" value={40} />).innerHTML
    expect(markup).toContain('role="progressbar"')
  })

  it('names the bar by the title and describes it by the description', () => {
    const plain = mount(() => <ProgressCard title="Budget" value={40} />).innerHTML
    const titleId = /<h3 id="([^"]+)"/.exec(plain)?.[1]
    expect(titleId).toBeTruthy()
    expect(plain).toContain(`aria-labelledby="${titleId}"`)
    expect(plain).not.toContain('aria-describedby')

    const described = mount(() => (
      <ProgressCard title="T" value={40} description="8.5 GB of 10 GB" />
    )).innerHTML
    const descId = /<p id="([^"]+)"/.exec(described)?.[1]
    expect(descId).toBeTruthy()
    expect(described).toContain(`aria-describedby="${descId}"`)
  })

  it('renders the children slot below the bar', () => {
    const markup = mount(() => (
      <ProgressCard title="T" value={40}>
        <div data-extra="" />
      </ProgressCard>
    )).innerHTML
    expect(markup).toContain('data-extra=""')
  })

  it('forwards className onto the Card', () => {
    const markup = mount(() => <ProgressCard title="T" value={40} className="pc-cls" />).innerHTML
    expect(markup).toContain('pc-cls')
  })
})
