// @vitest-environment jsdom

/**
 * SYN3 — auto-commit status badge: three states + theme-token / reduced-motion
 * quality bar.
 *
 * Before SYN3 the badge rendered ONLY while actively counting down and returned
 * `null` the rest of the time — so once a commit fired (or after a reload, with
 * the cadence restored to the paused state) the user had no signal that
 * auto-commit was still on. This is a real jsdom render of the actual
 * {@link AutoCommitBadge} asserting:
 *   - disabled → nothing;
 *   - enabled-but-paused → a persistent, MUTED "Auto-commit on" pill (the gap);
 *   - armed → the live countdown with the pulse turned on;
 *   - colors come from the theme success token (no hardcoded `rgba(34,197,94,…)`);
 *   - the pulse is gated behind `prefers-reduced-motion` via an attribute
 *     selector in the injected `<style>` (an inline `animation` can't be
 *     media-queried), so reduced-motion users get a static pill.
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

describe('AutoCommitBadge — three states (SYN3)', () => {
  it('renders nothing when auto-commit is disabled', () => {
    const { container } = render(
      <AutoCommitBadge state={{ intervalSeconds: 0, remaining: null }} onCancel={() => {}} />,
    )
    expect(badgeOf(container)).toBeNull()
  })

  it('renders a persistent muted "Auto-commit on" pill when enabled but paused (between commits / after reload)', () => {
    // enabled-but-paused: intervalSeconds > 0, remaining === null. The pre-SYN3
    // badge returned null here, so the user lost all signal auto-commit was on.
    const state: AutoCommitState = { intervalSeconds: 30, remaining: null }
    const { container } = render(<AutoCommitBadge state={state} onCancel={() => {}} />)
    const badge = badgeOf(container)
    expect(badge, 'the paused "on" pill must render, not null').not.toBeNull()
    expect(badge?.textContent).toContain('Auto-commit on')
    // Muted, not the pulsing countdown.
    expect(badge?.getAttribute('data-mol-pulse')).toBe('false')
    // No inline color set, so the ClassMap muted color governs (no override).
    expect((badge as HTMLElement).style.color).toBe('')
    // The status dot uses the theme success token (an SVG attribute jsdom keeps
    // verbatim), proving the "on" indicator is themed, never a literal color.
    expect(badge?.querySelector('svg')?.getAttribute('fill')).toContain('var(--mol-color-success')
  })

  it('renders the live countdown with the pulse armed when counting down', () => {
    const state: AutoCommitState = { intervalSeconds: 30, remaining: 12 }
    const { container } = render(<AutoCommitBadge state={state} onCancel={() => {}} />)
    const badge = badgeOf(container)
    expect(badge?.textContent).toContain('12s')
    expect(badge?.getAttribute('data-mol-pulse')).toBe('true')
  })

  it('derives the armed pill colors from theme tokens, not hardcoded rgba green', () => {
    const { container } = render(
      <AutoCommitBadge state={{ intervalSeconds: 30, remaining: 12 }} onCancel={() => {}} />,
    )
    const styleAttr = badgeOf(container)?.getAttribute('style') ?? ''
    // The old badge hardcoded rgba(34,197,94,…) for background + border; the fix
    // derives both from the theme success token, so the literal green is gone.
    // (Whatever jsdom keeps of the color-mix value, it can never be that rgba.)
    expect(styleAttr).not.toContain('34, 197, 94')
    expect(styleAttr).not.toContain('34,197,94')
  })

  it('guards the pulse behind prefers-reduced-motion (an attribute selector, not an inline animation)', () => {
    const { container } = render(
      <AutoCommitBadge state={{ intervalSeconds: 30, remaining: 12 }} onCancel={() => {}} />,
    )
    const badge = badgeOf(container)
    // The animation is NOT inline (an inline animation cannot be media-queried).
    expect((badge as HTMLElement).style.animation).toBe('')
    // The injected <style> carries both the keyframes and the reduced-motion off-switch.
    const style = badge?.querySelector('style')?.textContent ?? ''
    expect(style).toContain('@keyframes molAutoCommitPulse')
    expect(style).toContain('prefers-reduced-motion: reduce')
    expect(style).toContain('animation: none')
  })

  it('cancels auto-commit when the pill is clicked, in the paused state too', () => {
    const onCancel = vi.fn()
    const { container } = render(
      <AutoCommitBadge state={{ intervalSeconds: 30, remaining: null }} onCancel={onCancel} />,
    )
    fireEvent.click(badgeOf(container) as HTMLElement)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
