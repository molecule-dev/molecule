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

// The Card marker the React tests mock `@molecule/app-ui-react` with.
vi.mock('@molecule/app-ui-solid', () => ({
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
