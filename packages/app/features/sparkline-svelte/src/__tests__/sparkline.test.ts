// @vitest-environment jsdom
/**
 * Unit tests for `Sparkline`, ported from
 * `@molecule/app-sparkline-react`'s own suite: the same behavioral
 * assertions, rendered with a real mount (jsdom) and the bonded ClassMap.
 */
import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import { setMoleculeContext } from '@molecule/app-svelte'

import Sparkline from '../Sparkline.svelte'

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Mounts `Sparkline` with the given props and returns the host markup.
 *
 * @param props - The sparkline props.
 * @returns The markup of the mounted sparkline.
 */
function render(props: Record<string, unknown> = {}): string {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const instance = mount(Host, {
    target: host,
    props: {
      config: {},
      setMoleculeContext,
      component: Sparkline,
      props,
    },
  })
  flushSync()
  const markup = host.innerHTML
  unmount(instance)
  host.remove()
  return markup
}

describe('Sparkline', () => {
  it('renders nothing when values is empty', () => {
    expect(render({ values: [] })).not.toContain('<svg')
  })

  it('renders an <svg> with role="img" and a default aria-label', () => {
    const markup = render({ values: [1, 2, 3] })
    expect(markup).toContain('<svg')
    expect(markup).toContain('role="img"')
    expect(markup).toContain('aria-label="Trend sparkline"')
  })

  it('honours a custom ariaLabel and dimensions', () => {
    const markup = render({
      values: [1, 2],
      ariaLabel: 'Sales trend',
      width: 120,
      height: 40,
    })
    expect(markup).toContain('aria-label="Sales trend"')
    expect(markup).toContain('width="120"')
    expect(markup).toContain('height="40"')
  })

  it('renders a polyline for the line variant', () => {
    const markup = render({ values: [1, 5, 2], variant: 'line' })
    expect(markup).toContain('<polyline')
  })

  it('renders rects for the bar variant', () => {
    const markup = render({ values: [1, 5, 2], variant: 'bar' })
    expect(markup).toContain('<rect')
  })

  it('renders circles for the dot variant', () => {
    const markup = render({ values: [1, 5, 2], variant: 'dot' })
    expect(markup).toContain('<circle')
  })

  it('applies a custom color and forwards className', () => {
    const markup = render({ values: [1, 2], color: '#ff0000', className: 'spk-cls' })
    expect(markup).toContain('#ff0000')
    expect(markup).toContain('spk-cls')
  })
})
