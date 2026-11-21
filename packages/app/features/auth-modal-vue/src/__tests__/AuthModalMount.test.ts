// @vitest-environment jsdom
/**
 * The mounted click-interceptor's upgrade-CTA behavior: the default new-tab
 * flow vs. a host taking over via `onUpgradeIntercept` (e.g. an in-app modal).
 *
 * Port of `@molecule/app-auth-modal-react/src/__tests__/AuthModalMount.test.tsx`.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type App, createApp, defineComponent, h } from 'vue'

import type { AuthModalMountProps } from '../AuthModalMount.js'
import { AuthModalMount } from '../AuthModalMount.js'

vi.mock('@molecule/app-vue', () => ({
  useAuth: () => ({ refresh: vi.fn() }),
}))

const OAUTH_CONFIG = {}

/** Apps still mounted when the current test started, torn down in afterEach. */
const mounted: App[] = []

/**
 * Mounts the mount + a same-origin CTA anchor, returns a handle: the anchor,
 * and whether the last plain left-click on it was prevented.
 */
function renderWithCta(
  href: string,
  props: Partial<AuthModalMountProps> = {},
): { prevented(): boolean } {
  const host = document.body.appendChild(document.createElement('div'))
  const anchorProps = { href, 'data-testid': 'cta' }
  const app = createApp(
    defineComponent({
      setup() {
        return () => [
          h(AuthModalMount, { oauthConfig: OAUTH_CONFIG, ...props }),
          h('a', anchorProps, 'CTA'),
        ]
      },
    }),
  )
  app.mount(host)
  mounted.push(app)
  const anchor = host.querySelector('[data-testid="cta"]') as HTMLAnchorElement
  return {
    prevented(): boolean {
      const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
      anchor.dispatchEvent(event)
      return event.defaultPrevented
    },
  }
}

describe('AuthModalMount upgrade-CTA interception', () => {
  beforeEach(() => {
    vi.spyOn(window, 'open').mockReturnValue(null)
  })

  afterEach(() => {
    // A left-mounted app's document click listener would consume the next
    // test's click (preventDefault included), so every app unmounts first.
    for (const app of mounted.splice(0)) app.unmount()
    document.body.replaceChildren()
    vi.restoreAllMocks()
  })

  it('opens the upgrade path in a new tab by default', () => {
    const { prevented } = renderWithCta('/pricing')
    expect(prevented()).toBe(true)
    expect(window.open).toHaveBeenCalledWith('/pricing', '_blank', 'noopener,noreferrer')
  })

  it('hands the click to onUpgradeIntercept instead of opening a tab', () => {
    const onUpgradeIntercept = vi.fn()
    const { prevented } = renderWithCta('/pricing', { onUpgradeIntercept })
    expect(prevented()).toBe(true)
    expect(onUpgradeIntercept).toHaveBeenCalledWith('/pricing')
    expect(window.open).not.toHaveBeenCalled()
  })

  it('passes the matched path (e.g. /billing) to the host', () => {
    const onUpgradeIntercept = vi.fn()
    const { prevented } = renderWithCta('/billing', { onUpgradeIntercept })
    prevented()
    expect(onUpgradeIntercept).toHaveBeenCalledWith('/billing')
  })

  it('leaves unrelated links alone either way', () => {
    const onUpgradeIntercept = vi.fn()
    const { prevented } = renderWithCta('/dashboard', { onUpgradeIntercept })
    expect(prevented()).toBe(false)
    expect(onUpgradeIntercept).not.toHaveBeenCalled()
    expect(window.open).not.toHaveBeenCalled()
  })
})
