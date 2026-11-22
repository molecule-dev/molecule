// @vitest-environment jsdom
/**
 * Auto-commit button — labeled green commit action + late countdown morph: a
 * port of `@molecule/app-ide-react`'s `__tests__/AutoCommitBadge.test.tsx`
 * with the same test names and the same assertions, mounted as a real Solid
 * root (a fresh render with new props is this port's `rerender`; the shared
 * spy keeps the click count across renders).
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { AutoCommitState } from '@molecule/app-ide-panel-logic'
import { AUTO_COMMIT_COUNTDOWN_VISIBLE_SECONDS } from '@molecule/app-ide-panel-logic'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { AutoCommitBadge, type AutoCommitBadgeProps } from '../parts/AutoCommitBadge.jsx'

/** The root this file last mounted, disposed before the next render. */
let dispose: (() => void) | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  dispose?.()
  dispose = null
  document.body.innerHTML = ''
})

const badgeOf = (container: HTMLElement): HTMLElement | null =>
  container.querySelector('[data-mol-id="chat-autocommit-badge"]')

/** The badge's props plus this port's optional clickable parent. */
type RenderProps = AutoCommitBadgeProps & { parentClick?: () => void }

/**
 * Renders the badge, replacing whatever the previous test (or an earlier
 * render in the same test) mounted.
 *
 * @param props - The badge's props (`parentClick` is consumed by
 *   `wrapInBar`, never passed to the badge).
 * @param options.wrapInBar - Wrap the badge in a clickable parent div, like
 *   the commit-bar header whose toggle the click must not fire.
 * @returns The mount container.
 */
function renderBadge(
  props: RenderProps,
  { wrapInBar = false }: { wrapInBar?: boolean } = {},
): HTMLElement {
  dispose?.()
  document.body.innerHTML = ''
  const { parentClick = () => {}, ...badgeProps } = props
  const host = document.createElement('div')
  document.body.appendChild(host)
  const badge = (): JSX.Element => <AutoCommitBadge {...badgeProps} />
  const tree = (): JSX.Element => (wrapInBar ? <div onClick={parentClick}>{badge()}</div> : badge())
  dispose = render(tree, host)
  return host
}

/**
 * Clicks the badge the way a browser delivers it.
 *
 * @param container - The mount container.
 */
function clickBadge(container: HTMLElement): void {
  const badge = badgeOf(container)
  if (!badge) throw new Error('missing badge element to click')
  badge.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
}

describe('AutoCommitBadge — green commit button while enabled', () => {
  it('keeps file count and automatic countdown in the same clickable button', () => {
    const onCommitNow = vi.fn()
    const first = renderBadge({
      state: { intervalSeconds: 30, remaining: 12 },
      label: 'Commit 2 files',
      onCommitNow,
    })
    expect(first.textContent).toBe('Commit 2 files')
    const second = renderBadge({
      state: { intervalSeconds: 30, remaining: 2 },
      label: 'Commit 2 files',
      onCommitNow,
    })
    expect(second.textContent).toBe('Commit 2 files in 2s')
    expect(badgeOf(second)?.getAttribute('aria-label')).toBe('Commit 2 files in 2s')
    expect(badgeOf(second)?.getAttribute('title')).toBeNull()
    expect(second.querySelectorAll('button')).toHaveLength(1)
    clickBadge(second)
    expect(onCommitNow).toHaveBeenCalledTimes(1)
    const third = renderBadge({
      state: { intervalSeconds: 30, remaining: 2 },
      label: 'Commit 2 files',
      onCommitNow,
      disabled: true,
    })
    expect(third.textContent).toBe('Commit 2 files')
    clickBadge(third)
    expect(onCommitNow).toHaveBeenCalledTimes(1)
  })

  it('renders nothing when auto-commit is disabled', () => {
    const container = renderBadge({
      state: { intervalSeconds: 0, remaining: null },
      onCommitNow: () => {},
    })
    expect(badgeOf(container)).toBeNull()
  })

  it('renders the green "Commit" button when enabled but paused — never the old "on" pill', () => {
    // enabled-but-paused: intervalSeconds > 0, remaining === null (hydrated on
    // load, or between commits). Users get a recognizable commit action, not a
    // status pill (P4-11 keeps "Auto-commit on" gone).
    const state: AutoCommitState = { intervalSeconds: 5, remaining: null }
    const container = renderBadge({ state, onCommitNow: () => {} })
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
    const container = renderBadge({ state, onCommitNow: () => {} })
    const badge = badgeOf(container)
    expect(badge?.textContent).toBe('Commit')
    expect(badge?.textContent).not.toContain('s')
  })

  it('morphs into the labeled live countdown for the final seconds', () => {
    const state: AutoCommitState = { intervalSeconds: 5, remaining: 2 }
    const container = renderBadge({ state, onCommitNow: () => {} })
    const badge = badgeOf(container)
    // A labeled countdown — never the old bare "2s" pill.
    expect(badge?.textContent).toBe('Auto-commit in 2s')
  })

  it('shows the countdown for the whole run when the cadence fits inside the visible window', () => {
    const state: AutoCommitState = {
      intervalSeconds: AUTO_COMMIT_COUNTDOWN_VISIBLE_SECONDS,
      remaining: AUTO_COMMIT_COUNTDOWN_VISIBLE_SECONDS,
    }
    const container = renderBadge({ state, onCommitNow: () => {} })
    expect(badgeOf(container)?.textContent).toBe(
      `Auto-commit in ${AUTO_COMMIT_COUNTDOWN_VISIBLE_SECONDS}s`,
    )
  })

  it('is the manual commit button in the SUCCESS semantic — one design-system button, nothing hand-rolled (P4-10)', () => {
    const container = renderBadge({
      state: { intervalSeconds: 30, remaining: 12 },
      onCommitNow: () => {},
      inline: true,
    })
    const badge = badgeOf(container) as HTMLElement
    const cm = getClassMap()
    // The EXACT classes the manual /commit button and the tests bar's button carry
    // — same height, radius, padding and type scale — differing only in the
    // semantic colour. The bug this pins: the commit button was a hand-rolled
    // 12px/6px-radius pill while the tests bar's was 13px/3px, one strip apart.
    const expected = cm
      .cn(cm.button({ variant: 'solid', color: 'success', size: 'xs' }), cm.touchTargetCompact)
      .split(/\s+/)
      .filter(Boolean)
    for (const cls of expected) {
      expect(badge.classList.contains(cls), `missing design-system class ${cls}`).toBe(true)
    }
    // Nothing the design system owns is set inline — an inline style outranks a
    // ClassMap class (molecule AGENTS.md anti-pattern 12), so this is the half of
    // the contract that actually keeps the two buttons identical.
    for (const property of [
      'fontSize',
      'padding',
      'borderRadius',
      'border',
      'background',
      'color',
      'transition',
    ] as const) {
      expect(badge.style[property], `${property} must not be set inline`).toBe('')
    }
    const styleAttr = badge.getAttribute('style') ?? ''
    // Not the blue commit button's color literally.
    expect(styleAttr).not.toContain('64, 112, 224')
    expect(styleAttr).not.toContain('64,112,224')
    // Not a hardcoded green either — the colour is the `success` semantic.
    expect(styleAttr).not.toContain('34, 197, 94')
    expect(styleAttr).not.toContain('34,197,94')
    expect(styleAttr).not.toContain('16a34a')
  })

  it('has no pulse — no animation, no data-mol-pulse, no injected keyframes (P4-10)', () => {
    const container = renderBadge({
      state: { intervalSeconds: 30, remaining: 12 },
      onCommitNow: () => {},
    })
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
    const quiet = renderBadge({
      state: { intervalSeconds: 30, remaining: 12 },
      onCommitNow: quietCommit,
    })
    clickBadge(quiet)
    expect(quietCommit).toHaveBeenCalledTimes(1)

    const countdownCommit = vi.fn()
    const counting = renderBadge({
      state: { intervalSeconds: 5, remaining: 1 },
      onCommitNow: countdownCommit,
    })
    clickBadge(counting)
    expect(countdownCommit).toHaveBeenCalledTimes(1)
  })

  it('stops the click from bubbling to the commit-bar toggle (P5-06)', () => {
    // The button lives inside the commit-bar header, whose onClick toggles the
    // uncommitted-files bar. Clicking it must commit WITHOUT toggling that
    // bar — so the click must not propagate to the parent. The parent is a
    // Solid handler on purpose: Solid delegates clicks, so a native listener
    // above the root would hear the click before the badge's handler runs.
    const onCommitNow = vi.fn()
    const parentClick = vi.fn()
    const container = renderBadge(
      {
        state: { intervalSeconds: 5, remaining: 2 },
        onCommitNow,
        inline: true,
        parentClick,
      },
      { wrapInBar: true },
    )
    clickBadge(container)
    expect(onCommitNow).toHaveBeenCalledTimes(1)
    expect(parentClick, 'click must not bubble to the bar-header toggle').not.toHaveBeenCalled()
  })

  describe('disabled while the agent is working — no mid-turn commit', () => {
    it('renders muted + inert and does NOT commit when clicked', () => {
      // Committing mid-turn stages a half-written tree and races the chat
      // stream's conversation writes — so the held button must be a no-op.
      const onCommitNow = vi.fn()
      const container = renderBadge({
        state: { intervalSeconds: 5, remaining: 2 },
        onCommitNow,
        disabled: true,
      })
      const badge = badgeOf(container) as HTMLButtonElement
      expect(badge.disabled).toBe(true)
      // The muted + inert look comes from the CVA's own disabled states, driven by
      // the real `disabled` attribute — not from an inline opacity/cursor pair.
      expect(badge.className).toContain('disabled:opacity-50')
      expect(badge.className).toContain('disabled:pointer-events-none')
      expect(badge.style.opacity).toBe('')
      expect(badge.style.cursor).toBe('')
      clickBadge(container)
      expect(onCommitNow, 'a held click must not commit').not.toHaveBeenCalled()
    })

    it('shows the plain "Commit" label even inside the visible countdown window', () => {
      // A held countdown is paused, not imminent — it must not read "Auto-commit
      // in Ns" (which would imply a commit is about to fire while the agent works).
      const container = renderBadge({
        state: { intervalSeconds: 5, remaining: 1 },
        onCommitNow: () => {},
        disabled: true,
      })
      const badge = badgeOf(container) as HTMLElement
      expect(badge.textContent).toBe('Commit')
      expect(badge.textContent).not.toContain('Auto-commit in')
    })
  })
})
