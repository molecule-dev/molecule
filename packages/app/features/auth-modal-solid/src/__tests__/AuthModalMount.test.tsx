// @vitest-environment jsdom
/**
 * The mounted click-interceptor's upgrade-CTA behavior: the default new-tab
 * flow vs. a host taking over via `onUpgradeIntercept` (e.g. an in-app modal).
 *
 * Port of `@molecule/app-auth-modal-react/src/__tests__/AuthModalMount.test.tsx`.
 *
 * @module
 */

import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthModalMountProps } from '../AuthModalMount.jsx'
import { AuthModalMount } from '../AuthModalMount.jsx'

vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({ refresh: vi.fn() }),
}))

const OAUTH_CONFIG = {}

/** Apps still mounted when the current test started, torn down in afterEach. */
const mounted: (() => void)[] = []

/**
 * Mounts the mount + a same-origin CTA anchor, returns a handle: whether the
 * last plain left-click on the anchor was prevented.
 */
function renderWithCta(
  href: string,
  props: Partial<AuthModalMountProps> = {},
): { prevented(): boolean } {
  const host = document.body.appendChild(document.createElement('div'))
  const dispose = render(
    () => (
      <>
        <AuthModalMount oauthConfig={OAUTH_CONFIG} {...props} />
        <a href={href} data-testid="cta">
          CTA
        </a>
      </>
    ),
    host,
  )
  mounted.push(dispose)
  return {
    prevented(): boolean {
      const anchor = host.querySelector('[data-testid="cta"]') as HTMLAnchorElement
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
    // A left-mounted interceptor's document click listener would consume the
    // next test's click (preventDefault included), so each disposes first.
    for (const dispose of mounted.splice(0)) dispose()
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
