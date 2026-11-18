// @vitest-environment jsdom
/**
 * Unit tests for `RatingDisplay`, ported from
 * `@molecule/app-rating-display-react`'s own suite: the same behavioral
 * assertions, rendered with a real mount (jsdom) and the bonded ClassMap.
 */
import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import { setMoleculeContext } from '@molecule/app-svelte'

import RatingDisplay from '../RatingDisplay.svelte'

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Mounts `RatingDisplay` with the given props and returns the host markup.
 *
 * @param props - The rating-display props.
 * @returns The markup of the mounted display.
 */
function render(props: Record<string, unknown>): string {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const instance = mount(Host, {
    target: host,
    props: {
      config: {},
      setMoleculeContext,
      component: RatingDisplay,
      props,
    },
  })
  flushSync()
  const markup = host.innerHTML
  unmount(instance)
  host.remove()
  return markup
}

describe('RatingDisplay', () => {
  it('renders one star svg per max with role="img" and a default aria-label', () => {
    const markup = render({ value: 3.5, max: 5 })
    expect(markup.match(/<svg/g) ?? []).toHaveLength(5)
    expect(markup).toContain('role="img"')
    expect(markup).toContain('aria-label="Rating: 3.5 of 5"')
  })

  it('honours a custom ariaLabel', () => {
    const markup = render({ value: 4, ariaLabel: 'Four stars' })
    expect(markup).toContain('aria-label="Four stars"')
  })

  it('renders the review count as plain text by default', () => {
    const markup = render({ value: 4, reviewCount: 128 })
    expect(markup).toContain('(128)')
    expect(markup).not.toContain('<button')
  })

  it('renders the review count as a button when onReviewsClick is supplied', () => {
    const markup = render({ value: 4, reviewCount: 128, onReviewsClick: () => {} })
    expect(markup).toContain('<button')
    expect(markup).toContain('(128)')
  })

  it('renders interactive star buttons when onChange is supplied', () => {
    const markup = render({ value: 2, max: 5, onChange: () => {} })
    expect(markup.match(/<button/g) ?? []).toHaveLength(5)
    expect(markup).toContain('aria-label="Rate 1 of 5"')
    expect(markup).toContain('aria-label="Rate 5 of 5"')
  })

  it('forwards className', () => {
    const markup = render({ value: 3, className: 'rd-cls' })
    expect(markup).toContain('rd-cls')
  })

  it('keeps the rating label and role on the inner stars span, not the root', () => {
    const markup = render({ value: 3.5, max: 5 })
    expect(markup.match(/role="img"/g) ?? []).toHaveLength(1)
    expect(markup).toContain('aria-label="Rating: 3.5 of 5"')
  })

  it('groups the interactive stars under the rating label with pressed states', () => {
    const markup = render({ value: 2.4, max: 5, onChange: () => {} })
    expect(markup.match(/role="group"/g) ?? []).toHaveLength(1)
    expect(markup.match(/role="img"/g) ?? []).toHaveLength(0)
    expect(markup).toContain('aria-label="Rating: 2.4 of 5"')
    // Math.round(2.4) = 2: the first two stars pressed, the other three not.
    expect(markup.match(/aria-pressed="true"/g) ?? []).toHaveLength(2)
    expect(markup.match(/aria-pressed="false"/g) ?? []).toHaveLength(3)
  })
})
