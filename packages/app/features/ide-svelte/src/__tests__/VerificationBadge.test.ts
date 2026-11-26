// @vitest-environment jsdom

/**
 * `VerificationBadge` rendered for real: the green pass with its optional
 * render-check advisory, the failure card's label counted per category, its
 * theme tint, and the output behind its disclosure.
 *
 * Svelte port of `@molecule/app-ide-react`'s `VerificationBadge` behaviour
 * (the React component has no test of its own; its contract is the source
 * file), mounted on the part itself since the Svelte ChatPanel's timeline
 * dispatch (unit U4) is not there yet.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import VerificationBadge from '../parts/VerificationBadge.svelte'
import type { VerificationBadgeProps } from '../types.js'

/** The mount this file last created, torn down after each test. */
let mounted: Record<string, unknown> | undefined

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  if (mounted) await unmount(mounted)
  mounted = undefined
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

/**
 * Mounts the badge with the given props.
 *
 * @param props - The badge's props.
 * @returns The host element the badge mounted into.
 */
function render(props: VerificationBadgeProps): HTMLElement {
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted = mount(VerificationBadge, { target: host, props })
  flushSync()
  return host
}

describe('VerificationBadge — the pass', () => {
  it('renders a green check and the passed label', () => {
    const host = render({ status: 'ok', workspaces: ['api'] })
    expect(host.textContent?.trim()).toBe('Checks passed')
    expect(host.querySelector('path')?.getAttribute('stroke')).toBe('#3fb950')
    expect(host.querySelector('button')).toBeNull()
  })

  it('adds the render-check advisory when the stored check could not run', () => {
    const host = render({ status: 'ok', workspaces: ['api'], renderCheckUnavailable: true })
    const advisory = host.querySelector('[data-mol-id="render-check-unavailable"]')
    expect(advisory, 'the advisory should render').not.toBeNull()
    expect(advisory?.textContent).toBe(' · Render check unavailable')
  })
})

describe('VerificationBadge — the failure label', () => {
  it('counts the type errors in the output', () => {
    const host = render({
      status: 'error',
      workspaces: ['api'],
      categories: ['type'],
      output: 'a.ts(1,2): error TS2345: nope\nb.ts(3,4): error TS2322: nope',
    })
    expect(host.textContent).toContain('2 type errors')
  })

  it('falls back to one error when the output names none', () => {
    const host = render({ status: 'error', workspaces: ['api'], categories: ['type'] })
    expect(host.textContent).toContain('1 type error')
  })

  it('counts lint errors and warnings', () => {
    const host = render({
      status: 'error',
      workspaces: ['api'],
      categories: ['lint'],
      output: '3:1 error nope\n4:1 warning careful\n5:1 warning careful',
    })
    expect(host.textContent).toContain('1 lint error, 2 warnings')
  })

  it('names runtime errors', () => {
    const host = render({ status: 'error', workspaces: ['api'], categories: ['runtime'] })
    expect(host.textContent).toContain('Runtime errors')
  })

  it('says errors were found when no category reported', () => {
    const host = render({ status: 'error', workspaces: ['api'] })
    expect(host.textContent).toContain('Errors found')
  })

  it('tints a lint-only failure amber and a type failure red', () => {
    const lint = render({ status: 'error', workspaces: ['api'], categories: ['lint'] })
    expect((lint.querySelector('button') as HTMLElement).style.color).toBe('rgb(212, 160, 23)')
    const type = render({ status: 'error', workspaces: ['api'], categories: ['type'] })
    expect((type.querySelector('button') as HTMLElement).style.color).toBe('rgb(248, 81, 73)')
  })
})

describe('VerificationBadge — the output disclosure', () => {
  it('reveals the output on click and hides it on the second', () => {
    const host = render({
      status: 'error',
      workspaces: ['api'],
      categories: ['type'],
      output: 'a.ts(1,2): error TS2345: nope',
    })
    const button = host.querySelector('button') as HTMLButtonElement
    expect(host.querySelector('pre')).toBeNull()
    button.click()
    flushSync()
    expect(host.querySelector('pre')?.textContent).toBe('a.ts(1,2): error TS2345: nope')
    button.click()
    flushSync()
    expect(host.querySelector('pre')).toBeNull()
  })

  it('has nothing to reveal when the output is absent', () => {
    const host = render({ status: 'error', workspaces: ['api'], categories: ['type'] })
    const button = host.querySelector('button') as HTMLButtonElement
    button.click()
    flushSync()
    expect(host.querySelector('pre')).toBeNull()
  })
})
