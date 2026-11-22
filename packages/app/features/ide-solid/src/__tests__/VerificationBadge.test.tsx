// @vitest-environment jsdom
/**
 * `VerificationBadge` rendered for real: the passing check (with the stored
 * render-check advisory), the expandable failure card, its per-category label
 * counts, and the lint-only / type-and-runtime severity tints.
 *
 * Solid port of `@molecule/app-ide-react`'s `VerificationBadge` behaviour (unit
 * U2 of the ChatPanel port): the same DOM for the same input, the same
 * behaviour.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import type { VerificationBadgeProps } from '../parts/VerificationBadge.jsx'
import { VerificationBadge } from '../parts/VerificationBadge.jsx'

/** The root this file last mounted, disposed before the next render. */
const mounted: { dispose?: () => void } = {}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Mounts the badge with the given props.
 *
 * @param props - The VerificationBadge props to render with (status is required).
 * @returns The host element the badge mounted into.
 */
function renderBadge(
  props: Partial<VerificationBadgeProps> & Pick<VerificationBadgeProps, 'status'>,
): HTMLElement {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const badgeProps: VerificationBadgeProps = { workspaces: ['app'], ...props }
  mounted.dispose = render(() => <VerificationBadge {...badgeProps} />, container)
  return container
}

/**
 * The failure card's disclosure button.
 *
 * @param container - The mounted host.
 * @returns The button.
 */
function disclosure(container: HTMLElement): HTMLElement {
  return container.querySelector('button') as HTMLElement
}

describe('VerificationBadge — passing', () => {
  it('shows the passed check with a green glyph', () => {
    const container = renderBadge({ status: 'ok' })
    expect(container.textContent).toContain('Checks passed')
    expect(container.querySelector('path')?.getAttribute('stroke')).toBe('#3fb950')
    expect(container.querySelector('button')).toBeNull()
  })

  it('appends the stored render-check advisory in the warning token', () => {
    const container = renderBadge({ status: 'ok', renderCheckUnavailable: true })
    const advisory = container.querySelector(
      '[data-mol-id="render-check-unavailable"]',
    ) as HTMLElement
    expect(advisory).not.toBeNull()
    expect(advisory.textContent).toContain('Render check unavailable')
    const cm = getClassMap()
    expect(new Set(advisory.className.split(/\s+/))).toEqual(
      new Set(cm.textWarning.split(/\s+/).filter(Boolean)),
    )
  })
})

describe('VerificationBadge — failing', () => {
  it('counts type errors from the compiler output', () => {
    const container = renderBadge({
      status: 'error',
      categories: ['type'],
      output: 'app/src/a.ts(1,2): error TS1000: boom\napp/src/b.ts(3,4): error TS1001: bang',
    })
    expect(container.textContent).toContain('2 type errors')
    expect(disclosure(container).style.color).toBe('rgb(248, 81, 73)')
  })

  it('splits lint errors and warnings, and tints lint-only amber', () => {
    const container = renderBadge({
      status: 'error',
      categories: ['lint'],
      output: 'app/src/a.ts\n  1:2  error  no-unused-vars  x\n\n✖ 1 warning',
    })
    expect(container.textContent).toContain('1 lint error, 1 warning')
    expect(disclosure(container).style.color).toBe('rgb(212, 160, 23)')
  })

  it('names runtime failures and falls back to the generic label', () => {
    expect(
      renderBadge({ status: 'error', categories: ['runtime'], output: '' }).textContent,
    ).toContain('Runtime errors')
    expect(renderBadge({ status: 'error' }).textContent).toContain('Errors found')
  })

  it('reveals the runner output behind the disclosure', () => {
    const container = renderBadge({
      status: 'error',
      categories: ['type'],
      output: 'app/src/a.ts(1,2): error TS1000: boom',
    })
    expect(container.querySelector('pre')).toBeNull()
    disclosure(container).click()
    expect(container.querySelector('pre')?.textContent).toContain('error TS1000: boom')
  })

  it('turns the disclosure chevron over when the output is open', () => {
    const container = renderBadge({
      status: 'error',
      categories: ['lint'],
      output: '1:1 error x',
    })
    const chevron = container.querySelector('polyline')?.parentElement as HTMLElement
    expect(chevron.style.transform).toBe('rotate(0deg)')
    disclosure(container).click()
    expect(
      (container.querySelector('polyline')?.parentElement as HTMLElement).style.transform,
    ).toBe('rotate(180deg)')
  })
})
