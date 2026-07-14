// @vitest-environment jsdom

/**
 * Auto-commit button — labeled green commit action + late countdown morph.
 *
 * The bare countdown pill ("12s") told users nothing, so the badge became the
 * commit bar's green commit button:
 *   - Renders whenever auto-commit is ENABLED (paused or counting) — a green
 *     "Commit" button, click = commit now. Disabled → nothing, and the old
 *     static "Auto-commit on" pill stays gone (P4-11).
 *   - It morphs into the live "Auto-commit in Ns" label only for the countdown's
 *     final `AUTO_COMMIT_COUNTDOWN_VISIBLE_SECONDS` seconds — right before the
 *     auto-commit fires — and clicking still commits now.
 *   - P4-10 styling holds: the button is the blue `/commit` button recolored
 *     from the theme success token — same box model, no pulse.
 *
 * This is a real jsdom render of the actual {@link AutoCommitBadge} asserting
 * all of that.
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
import { AUTO_COMMIT_COUNTDOWN_VISIBLE_SECONDS } from '../components/chat-autocommit-utilities.js'

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  document.body.innerHTML = ''
})

const badgeOf = (container: HTMLElement): HTMLElement | null =>
  container.querySelector('[data-mol-id="chat-autocommit-badge"]')

describe('AutoCommitBadge — green commit button while enabled', () => {
  it('renders nothing when auto-commit is disabled', () => {
    const { container } = render(
      <AutoCommitBadge state={{ intervalSeconds: 0, remaining: null }} onCommitNow={() => {}} />,
    )
    expect(badgeOf(container)).toBeNull()
  })

  it('renders the green "Commit" button when enabled but paused — never the old "on" pill', () => {
    // enabled-but-paused: intervalSeconds > 0, remaining === null (hydrated on
    // load, or between commits). Users get a recognizable commit action, not a
    // status pill (P4-11 keeps "Auto-commit on" gone).
    const state: AutoCommitState = { intervalSeconds: 5, remaining: null }
    const { container } = render(<AutoCommitBadge state={state} onCommitNow={() => {}} />)
    const badge = badgeOf(container)
    expect(badge, 'the enabled-paused commit button must render').not.toBeNull()
    expect(badge?.textContent).toBe('Commit')
    expect(container.textContent).not.toContain('Auto-commit on')
  })

  it('stays a plain "Commit" during the quiet phase (armed, above the visible window)', () => {
    const state: AutoCommitState = {
      intervalSeconds: 30,
      remaining: AUTO_COMMIT_COUNTDOWN_VISIBLE_SECONDS + 9,
    }
    const { container } = render(<AutoCommitBadge state={state} onCommitNow={() => {}} />)
    const badge = badgeOf(container)
    expect(badge?.textContent).toBe('Commit')
    expect(badge?.textContent).not.toContain('s')
  })

  it('morphs into the labeled live countdown for the final seconds', () => {
    const state: AutoCommitState = { intervalSeconds: 5, remaining: 2 }
    const { container } = render(<AutoCommitBadge state={state} onCommitNow={() => {}} />)
    const badge = badgeOf(container)
    // A labeled countdown — never the old bare "2s" pill.
    expect(badge?.textContent).toBe('Auto-commit in 2s')
  })

  it('shows the countdown for the whole run when the cadence fits inside the visible window', () => {
    const state: AutoCommitState = {
      intervalSeconds: AUTO_COMMIT_COUNTDOWN_VISIBLE_SECONDS,
      remaining: AUTO_COMMIT_COUNTDOWN_VISIBLE_SECONDS,
    }
    const { container } = render(<AutoCommitBadge state={state} onCommitNow={() => {}} />)
    expect(badgeOf(container)?.textContent).toBe(
      `Auto-commit in ${AUTO_COMMIT_COUNTDOWN_VISIBLE_SECONDS}s`,
    )
  })

  it('looks exactly like the blue commit button, but green (P4-10)', () => {
    const { container } = render(
      <AutoCommitBadge
        state={{ intervalSeconds: 30, remaining: 12 }}
        onCommitNow={() => {}}
        inline
      />,
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
      <AutoCommitBadge state={{ intervalSeconds: 30, remaining: 12 }} onCommitNow={() => {}} />,
    )
    const badge = badgeOf(container) as HTMLElement
    // The pulse animation is gone entirely.
    expect(badge.getAttribute('data-mol-pulse')).toBeNull()
    expect(badge.style.animation).toBe('')
    expect(badge.querySelector('style')).toBeNull()
    expect(container.innerHTML).not.toContain('@keyframes')
    expect(container.innerHTML).not.toContain('molAutoCommitPulse')
  })

  it('commits now when clicked — in the quiet phase AND during the countdown', () => {
    const quietCommit = vi.fn()
    const { container: quiet } = render(
      <AutoCommitBadge state={{ intervalSeconds: 30, remaining: 12 }} onCommitNow={quietCommit} />,
    )
    fireEvent.click(badgeOf(quiet) as HTMLElement)
    expect(quietCommit).toHaveBeenCalledTimes(1)

    const countdownCommit = vi.fn()
    const { container: counting } = render(
      <AutoCommitBadge
        state={{ intervalSeconds: 5, remaining: 1 }}
        onCommitNow={countdownCommit}
      />,
    )
    fireEvent.click(badgeOf(counting) as HTMLElement)
    expect(countdownCommit).toHaveBeenCalledTimes(1)
  })

  it('stops the click from bubbling to the commit-bar toggle (P5-06)', () => {
    // The button lives inside the commit-bar header, whose onClick toggles the
    // uncommitted-files bar. Clicking it must commit WITHOUT toggling that
    // bar — so the click must not propagate to the parent.
    const onCommitNow = vi.fn()
    const parentClick = vi.fn()
    const { container } = render(
      <div onClick={parentClick}>
        <AutoCommitBadge
          state={{ intervalSeconds: 5, remaining: 2 }}
          onCommitNow={onCommitNow}
          inline
        />
      </div>,
    )
    fireEvent.click(badgeOf(container) as HTMLElement)
    expect(onCommitNow).toHaveBeenCalledTimes(1)
    expect(parentClick, 'click must not bubble to the bar-header toggle').not.toHaveBeenCalled()
  })
})
