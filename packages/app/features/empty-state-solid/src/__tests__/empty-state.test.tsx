// @vitest-environment jsdom
/**
 * Unit tests for the Solid `EmptyState` and `CtaCard` — a port of
 * `@molecule/app-empty-state-react/src/__tests__/empty-state.test.tsx`: the
 * same behavioral assertions, rendered with Solid in jsdom.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `textCenter`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React package's own tests use.
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

const { CtaCard } = await import('../CtaCard.jsx')
const { EmptyState } = await import('../EmptyState.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Render with Solid's browser renderer and dispose after the test.
 *
 * @param view - The view to mount.
 * @returns The container element.
 */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('EmptyState', () => {
  it('renders the title inside an <h3>', () => {
    const markup = mount(() => <EmptyState title="No comments yet" />).innerHTML
    expect(markup).toContain('<h3')
    expect(markup).toContain('No comments yet')
  })

  it('renders the icon badge when an icon is given and omits it otherwise', () => {
    const withIcon = mount(() => <EmptyState title="T" icon={<i data-icon="" />} />).innerHTML
    expect(withIcon).toContain('data-icon=""')
    const without = mount(() => <EmptyState title="T" />).innerHTML
    expect(without).not.toContain('data-icon')
  })

  it('renders the description when present and omits it otherwise', () => {
    expect(mount(() => <EmptyState title="T" description="desc-x" />).innerHTML).toContain('desc-x')
    expect(mount(() => <EmptyState title="T" />).innerHTML).not.toContain('<p')
  })

  it('renders the action node', () => {
    const markup = mount(() => <EmptyState title="T" action={<button data-act="" />} />).innerHTML
    expect(markup).toContain('data-act=""')
  })

  it('sets data-mol-id and forwards className + iconWrapperClassName', () => {
    const markup = mount(() => (
      <EmptyState
        title="T"
        icon={<i />}
        dataMolId="empty-x"
        className="es-cls"
        iconWrapperClassName="icon-cls"
      />
    )).innerHTML
    expect(markup).toContain('data-mol-id="empty-x"')
    expect(markup).toContain('es-cls')
    expect(markup).toContain('icon-cls')
  })
})

describe('CtaCard', () => {
  it('renders the title inside an <h3>', () => {
    const markup = mount(() => <CtaCard title="Connect your bank" />).innerHTML
    expect(markup).toContain('<h3')
    expect(markup).toContain('Connect your bank')
  })

  it('renders the eyebrow when present and omits it otherwise', () => {
    expect(mount(() => <CtaCard title="T" eyebrow="NEW" />).innerHTML).toContain('NEW')
    expect(mount(() => <CtaCard title="T" />).innerHTML).not.toContain('NEW')
  })

  it('renders the description when present and omits it otherwise', () => {
    expect(mount(() => <CtaCard title="T" description="desc-x" />).innerHTML).toContain('desc-x')
    expect(mount(() => <CtaCard title="T" />).innerHTML).not.toContain('<p')
  })

  it('renders the action node when present and omits it otherwise', () => {
    const withAction = mount(() => <CtaCard title="T" action={<button data-act="" />} />).innerHTML
    expect(withAction).toContain('data-act=""')
    expect(mount(() => <CtaCard title="T" />).innerHTML).not.toContain('data-act')
  })

  it('renders the media slot when present and omits it otherwise', () => {
    const withMedia = mount(() => <CtaCard title="T" media={<img data-media="" />} />).innerHTML
    expect(withMedia).toContain('data-media=""')
    expect(mount(() => <CtaCard title="T" />).innerHTML).not.toContain('data-media')
  })

  it('sets data-mol-id and forwards className', () => {
    const markup = mount(() => (
      <CtaCard title="T" dataMolId="cta-x" className="cta-cls" />
    )).innerHTML
    expect(markup).toContain('data-mol-id="cta-x"')
    expect(markup).toContain('cta-cls')
  })
})
