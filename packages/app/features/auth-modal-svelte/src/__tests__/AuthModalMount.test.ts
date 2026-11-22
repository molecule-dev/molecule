// @vitest-environment jsdom
/**
 * The mounted click-interceptor's upgrade-CTA behavior: the default new-tab
 * flow vs. a host taking over via `onUpgradeIntercept` (e.g. an in-app modal).
 *
 * Port of `@molecule/app-auth-modal-react/src/__tests__/AuthModalMount.test.tsx`.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import AuthModalMount from '../AuthModalMount.svelte'

vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({ refresh: vi.fn() }),
}))

const OAUTH_CONFIG = {}

/** Apps still mounted when the current test started, torn down in afterEach. */
const mounted: ReturnType<typeof mount>[] = []

/**
 * Mounts the mount + a same-origin CTA anchor, returns a handle: whether the
 * last plain left-click on the anchor was prevented.
 */
function renderWithCta(
  href: string,
  props: Record<string, unknown> = {},
): { prevented(): boolean } {
  const target = document.body.appendChild(document.createElement('div'))
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.setAttribute('data-testid', 'cta')
  anchor.textContent = 'CTA'
  const instance = mount(AuthModalMount, { target, props: { oauthConfig: OAUTH_CONFIG, ...props } })
  // The document click listener installs in the mount effect.
  flushSync()
  target.appendChild(anchor)
  mounted.push(instance)
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
    // A left-mounted interceptor's document click listener would consume the
    // next test's click (preventDefault included), so each unmounts first.
    for (const instance of mounted.splice(0)) unmount(instance)
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
