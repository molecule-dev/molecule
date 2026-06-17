// @vitest-environment jsdom

/**
 * Auto-commit countdown badge — render-only-when-armed + green-commit-button look.
 *
 * P4-10 + P4-11 reshaped the badge:
 *   - P4-11: the static "Auto-commit on" pill is GONE — the badge renders ONLY
 *     while armed (actively counting down); disabled or paused → nothing.
 *   - P4-10: the armed countdown is styled EXACTLY like the blue `/commit` button
 *     but green — same fontSize / padding / 6px radius / translucent bordered look
 *     / transition, recolored from the theme success token — and the pulse
 *     animation (keyframes + `data-mol-pulse` + injected `<style>`) is removed.
 *
 * This is a real jsdom render of the actual {@link AutoCommitBadge} asserting all
 * of that.
 *
 * @module
 */

import { fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { AutoCommitBadge } from '../components/AutoCommitBadge.js'
import type { AutoCommitState } from '../components/chat-autocommit-utilities.js'

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  document.body.innerHTML = ''
})

const badgeOf = (container: HTMLElement): HTMLElement | null =>
  container.querySelector('[data-mol-id="chat-autocommit-badge"]')

describe('AutoCommitBadge — armed-only green commit button (P4-10/P4-11)', () => {
  it('renders nothing when auto-commit is disabled', () => {
    const { container } = render(
      <AutoCommitBadge state={{ intervalSeconds: 0, remaining: null }} onCancel={() => {}} />,
    )
    expect(badgeOf(container)).toBeNull()
  })

  it('renders nothing when enabled but paused — the static "Auto-commit on" pill is gone (P4-11)', () => {
    // enabled-but-paused: intervalSeconds > 0, remaining === null. The pre-P4-11
    // badge showed a muted "Auto-commit on" pill here; the user removed it.
    const state: AutoCommitState = { intervalSeconds: 30, remaining: null }
    const { container } = render(<AutoCommitBadge state={state} onCancel={() => {}} />)
    expect(badgeOf(container), 'the paused "Auto-commit on" pill must NOT render').toBeNull()
    // The label that backed that pill must be gone entirely.
    expect(container.textContent).not.toContain('Auto-commit on')
  })

  it('renders the live countdown when armed (counting down)', () => {
    const state: AutoCommitState = { intervalSeconds: 30, remaining: 12 }
    const { container } = render(<AutoCommitBadge state={state} onCancel={() => {}} />)
    const badge = badgeOf(container)
    expect(badge, 'the armed countdown must render').not.toBeNull()
    expect(badge?.textContent).toContain('12s')
  })

  it('looks exactly like the blue commit button, but green (P4-10)', () => {
    const { container } = render(
      <AutoCommitBadge state={{ intervalSeconds: 30, remaining: 12 }} onCancel={() => {}} inline />,
    )
    const badge = badgeOf(container) as HTMLElement
    // Same box model as the blue /commit button.
    expect(badge.style.fontSize).toBe('12px')
    expect(badge.style.padding).toBe('4px 10px')
    // The pill shape became the 6px rounded-rectangle of the commit button.
    expect(badge.style.borderRadius).toBe('6px')
    // Same transition as the commit button.
    expect(badge.style.transition).toContain('background 100ms')
    expect(badge.style.transition).toContain('border-color 100ms')
    expect(badge.style.transition).toContain('color 100ms')
    // Recolored GREEN from the theme success token — not the blue commit button's
    // color, and not a hardcoded literal green.
    expect(badge.style.color).toBe('var(--mol-color-success, #16a34a)')
    expect(badge.style.background).toContain('var(--mol-color-success')
    expect(badge.style.border).toContain('var(--mol-color-success')
    expect(badge.style.border).toContain('1px solid')
    const styleAttr = badge.getAttribute('style') ?? ''
    // Not the blue commit button's color literally.
    expect(styleAttr).not.toContain('64, 112, 224')
    expect(styleAttr).not.toContain('64,112,224')
    // Not the old hardcoded rgba green either.
    expect(styleAttr).not.toContain('34, 197, 94')
    expect(styleAttr).not.toContain('34,197,94')
  })

  it('has no pulse — no animation, no data-mol-pulse, no injected keyframes (P4-10)', () => {
    const { container } = render(
      <AutoCommitBadge state={{ intervalSeconds: 30, remaining: 12 }} onCancel={() => {}} />,
    )
    const badge = badgeOf(container) as HTMLElement
    // The pulse animation is gone entirely.
    expect(badge.getAttribute('data-mol-pulse')).toBeNull()
    expect(badge.style.animation).toBe('')
    expect(badge.querySelector('style')).toBeNull()
    expect(container.innerHTML).not.toContain('@keyframes')
    expect(container.innerHTML).not.toContain('molAutoCommitPulse')
  })

  it('cancels auto-commit when the armed countdown button is clicked', () => {
    const onCancel = vi.fn()
    const { container } = render(
      <AutoCommitBadge state={{ intervalSeconds: 30, remaining: 12 }} onCancel={onCancel} />,
    )
    fireEvent.click(badgeOf(container) as HTMLElement)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
