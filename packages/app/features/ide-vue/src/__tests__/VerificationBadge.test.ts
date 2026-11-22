// @vitest-environment jsdom
/**
 * `VerificationBadge` rendered for real: the passing check (with the stored
 * render-check advisory), the expandable failure card, its per-category label
 * counts, and the lint-only / type-and-runtime severity tints.
 *
 * Vue port of `@molecule/app-ide-react`'s `VerificationBadge` behaviour (unit U2
 * of the ChatPanel port): the same DOM for the same input, the same behaviour.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createApp, h, nextTick, type VNodeChild } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { VerificationBadge, type VerificationBadgeProps } from '../parts/VerificationBadge.js'

/** The app this file last mounted, unmounted before the next render. */
const mounted: { app?: ReturnType<typeof createApp> } = {}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
})

/**
 * Mounts the badge with the given props.
 *
 * @param props - The VerificationBadge props to render with.
 * @returns The host element the badge mounted into.
 */
function renderBadge(
  props: Partial<VerificationBadgeProps> & { status: 'ok' | 'error' },
): HTMLElement {
  mounted.app?.unmount()
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({
    render: (): VNodeChild =>
      h(VerificationBadge, { workspaces: ['app'], ...props } as VerificationBadgeProps),
  })
  mounted.app = app
  app.mount(host)
  return host
}

/**
 * The failure card's disclosure button.
 *
 * @param host - The mounted host.
 * @returns The button.
 */
function disclosure(host: HTMLElement): HTMLElement {
  return host.querySelector('button') as HTMLElement
}

describe('VerificationBadge — passing', () => {
  it('shows the passed check with a green glyph', () => {
    const host = renderBadge({ status: 'ok' })
    expect(host.textContent).toContain('Checks passed')
    expect(host.querySelector('path')?.getAttribute('stroke')).toBe('#3fb950')
    expect(host.querySelector('button')).toBeNull()
  })

  it('appends the stored render-check advisory in the warning token', () => {
    const host = renderBadge({ status: 'ok', renderCheckUnavailable: true })
    const advisory = host.querySelector('[data-mol-id="render-check-unavailable"]') as HTMLElement
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
    const host = renderBadge({
      status: 'error',
      categories: ['type'],
      output: 'app/src/a.ts(1,2): error TS1000: boom\napp/src/b.ts(3,4): error TS1001: bang',
    })
    expect(host.textContent).toContain('2 type errors')
    expect(disclosure(host).style.color).toBe('rgb(248, 81, 73)')
  })

  it('splits lint errors and warnings, and tints lint-only amber', () => {
    const host = renderBadge({
      status: 'error',
      categories: ['lint'],
      output: 'app/src/a.ts\n  1:2  error  no-unused-vars  x\n\n✖ 1 warning',
    })
    expect(host.textContent).toContain('1 lint error, 1 warning')
    expect(disclosure(host).style.color).toBe('rgb(212, 160, 23)')
  })

  it('names runtime failures and falls back to the generic label', () => {
    expect(
      renderBadge({ status: 'error', categories: ['runtime'], output: '' }).textContent,
    ).toContain('Runtime errors')
    expect(renderBadge({ status: 'error' }).textContent).toContain('Errors found')
  })

  it('reveals the runner output behind the disclosure', async () => {
    const host = renderBadge({
      status: 'error',
      categories: ['type'],
      output: 'app/src/a.ts(1,2): error TS1000: boom',
    })
    expect(host.querySelector('pre')).toBeNull()
    disclosure(host).click()
    await nextTick()
    expect(host.querySelector('pre')?.textContent).toContain('error TS1000: boom')
  })

  it('turns the disclosure chevron over when the output is open', async () => {
    const host = renderBadge({ status: 'error', categories: ['lint'], output: '1:1 error x' })
    const chevron = host.querySelector('polyline')?.parentElement as HTMLElement
    expect(chevron.style.transform).toBe('rotate(0deg)')
    disclosure(host).click()
    await nextTick()
    expect((host.querySelector('polyline')?.parentElement as HTMLElement).style.transform).toBe(
      'rotate(180deg)',
    )
  })
})
