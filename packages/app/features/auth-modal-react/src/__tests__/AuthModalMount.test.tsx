/**
 * The mounted click-interceptor's upgrade-CTA behavior: the default new-tab
 * flow vs. a host taking over via `onUpgradeIntercept` (e.g. an in-app modal).
 */

import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthModalMount } from '../AuthModalMount.js'

vi.mock('@molecule/app-react', () => ({
  useAuth: () => ({ refresh: vi.fn() }),
}))

// The AuthModal itself (forms, OAuth buttons) is out of scope here — the
// interceptor is what's under test, and the modal only mounts once opened.
vi.mock('../AuthModal.js', () => ({
  AuthModal: () => <div data-testid="auth-modal" />,
}))

const OAUTH_CONFIG = {}

/** Renders the mount + a same-origin CTA anchor, returns the anchor. */
function renderWithCta(
  href: string,
  props: Partial<Parameters<typeof AuthModalMount>[0]> = {},
): HTMLAnchorElement {
  render(
    <>
      <AuthModalMount oauthConfig={OAUTH_CONFIG} {...props} />
      <a href={href} data-testid="cta">
        CTA
      </a>
    </>,
  )
  return document.querySelector('[data-testid="cta"]') as HTMLAnchorElement
}

/** Dispatches a plain left-click and reports whether default was prevented. */
function click(el: HTMLElement): boolean {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
  el.dispatchEvent(event)
  return event.defaultPrevented
}

describe('AuthModalMount upgrade-CTA interception', () => {
  beforeEach(() => {
    vi.spyOn(window, 'open').mockReturnValue(null)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('opens the upgrade path in a new tab by default', () => {
    const anchor = renderWithCta('/pricing')
    const prevented = click(anchor)
    expect(prevented).toBe(true)
    expect(window.open).toHaveBeenCalledWith('/pricing', '_blank', 'noopener,noreferrer')
  })

  it('hands the click to onUpgradeIntercept instead of opening a tab', () => {
    const onUpgradeIntercept = vi.fn()
    const anchor = renderWithCta('/pricing', { onUpgradeIntercept })
    const prevented = click(anchor)
    expect(prevented).toBe(true)
    expect(onUpgradeIntercept).toHaveBeenCalledWith('/pricing')
    expect(window.open).not.toHaveBeenCalled()
  })

  it('passes the matched path (e.g. /billing) to the host', () => {
    const onUpgradeIntercept = vi.fn()
    const anchor = renderWithCta('/billing', { onUpgradeIntercept })
    click(anchor)
    expect(onUpgradeIntercept).toHaveBeenCalledWith('/billing')
  })

  it('leaves unrelated links alone either way', () => {
    const onUpgradeIntercept = vi.fn()
    const anchor = renderWithCta('/dashboard', { onUpgradeIntercept })
    const prevented = click(anchor)
    expect(prevented).toBe(false)
    expect(onUpgradeIntercept).not.toHaveBeenCalled()
    expect(window.open).not.toHaveBeenCalled()
  })
})
