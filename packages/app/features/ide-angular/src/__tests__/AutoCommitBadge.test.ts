// @vitest-environment jsdom
/**
 * Auto-commit button — labeled green commit action + late countdown morph: a
 * port of `@molecule/app-ide-react`'s `__tests__/AutoCommitBadge.test.tsx`
 * with the same test names and the same assertions, mounted through Angular's
 * own `createApplication` with zoneless change detection (a fresh host-props
 * record + tick is this port's `rerender`).
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { AutoCommitState } from '@molecule/app-ide-panel-logic'
import { AUTO_COMMIT_COUNTDOWN_VISIBLE_SECONDS } from '@molecule/app-ide-panel-logic'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { AutoCommitBadge } from '../parts/auto-commit-badge.component.js'

/**
 * The JIT host the way the conformance kit mounts the component: its template
 * binds every input the badge takes, and holds the clickable parent div the
 * bubbling test needs.
 */
const AutoCommitBadgeHost = Component({
  selector: 'mol-auto-commit-badge-host',
  standalone: true,
  imports: [AutoCommitBadge],
  changeDetection: ChangeDetectionStrategy.Eager,
  // prettier-ignore
  template: `<div (click)="parentClick()"><div mol-auto-commit-badge
      [state]="p['state']"
      [onCommitNow]="p['onCommitNow']"
      [disabled]="p['disabled']"
      [inline]="p['inline']"
      [label]="p['label']"></div></div>`,
})(
  class AutoCommitBadgeHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}

    /** The commit-bar header's toggle (the bubbling test's listener). */
    parentClick = (): void => {}
  },
)

/** The mount alive right now, if any. */
let current: {
  appRef: ApplicationRef
  ref: ComponentRef<InstanceType<typeof AutoCommitBadgeHost>>
  container: HTMLElement
} | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Lets Angular's zoneless change detection settle what a mount or a host-props
 * change queued.
 */
async function flush(): Promise<void> {
  if (!current) return
  for (let i = 0; i < 3; i++) await Promise.resolve()
  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
  current.appRef.tick()
}

/**
 * Renders the badge.
 *
 * @param props - The badge's props (`parentClick` is consumed by the host's
 *   clickable parent, never passed to the badge).
 * @returns The mount container.
 */
async function renderBadge(props: Record<string, unknown>): Promise<HTMLElement> {
  const { parentClick, ...badgeProps } = props
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref: ComponentRef<InstanceType<typeof AutoCommitBadgeHost>> = createComponent(
    AutoCommitBadgeHost,
    { environmentInjector: appRef.injector },
  )
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = {
    state: { intervalSeconds: 0, remaining: null },
    onCommitNow: () => {},
    disabled: false,
    inline: false,
    ...badgeProps,
  }
  if (parentClick) ref.instance.parentClick = parentClick as () => void
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref, container }
  current.appRef.tick()
  await flush()
  return container
}

/**
 * Updates the mounted badge's props (this port's `rerender`).
 *
 * @param props - The new props.
 */
async function rerenderBadge(props: Record<string, unknown>): Promise<void> {
  if (!current) throw new Error('no badge mount to rerender')
  const { parentClick, ...badgeProps } = props
  current.ref.instance.p = { ...current.ref.instance.p, ...badgeProps }
  if (parentClick) current.ref.instance.parentClick = parentClick as () => void
  current.ref.changeDetectorRef.markForCheck()
  await flush()
}

const badgeOf = (container: HTMLElement): HTMLElement | null =>
  container.querySelector('[data-mol-id="chat-autocommit-badge"]')

/**
 * Clicks the badge the way a browser delivers it.
 *
 * @param container - The mount container.
 */
async function clickBadge(container: HTMLElement): Promise<void> {
  const badge = badgeOf(container)
  if (!badge) throw new Error('missing badge element to click')
  badge.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  await flush()
}

describe('AutoCommitBadge — green commit button while enabled', () => {
  it('keeps file count and automatic countdown in the same clickable button', async () => {
    const onCommitNow = vi.fn()
    const first = await renderBadge({
      state: { intervalSeconds: 30, remaining: 12 } satisfies AutoCommitState,
      label: 'Commit 2 files',
      onCommitNow,
    })
    expect(first.textContent).toBe('Commit 2 files')
    await rerenderBadge({ state: { intervalSeconds: 30, remaining: 2 } satisfies AutoCommitState })
    expect(first.textContent).toBe('Commit 2 files in 2s')
    expect(badgeOf(first)?.getAttribute('aria-label')).toBe('Commit 2 files in 2s')
    expect(badgeOf(first)?.getAttribute('title')).toBeNull()
    expect(first.querySelectorAll('button')).toHaveLength(1)
    await clickBadge(first)
    expect(onCommitNow).toHaveBeenCalledTimes(1)
    await rerenderBadge({ disabled: true })
    expect(first.textContent).toBe('Commit 2 files')
    await clickBadge(first)
    expect(onCommitNow).toHaveBeenCalledTimes(1)
  })

  it('renders nothing when auto-commit is disabled', async () => {
    const container = await renderBadge({
      state: { intervalSeconds: 0, remaining: null } satisfies AutoCommitState,
      onCommitNow: () => {},
    })
    expect(badgeOf(container)).toBeNull()
  })

  it('renders the green "Commit" button when enabled but paused — never the old "on" pill', async () => {
    // enabled-but-paused: intervalSeconds > 0, remaining === null (hydrated on
    // load, or between commits). Users get a recognizable commit action, not a
    // status pill (P4-11 keeps "Auto-commit on" gone).
    const state: AutoCommitState = { intervalSeconds: 5, remaining: null }
    const container = await renderBadge({ state, onCommitNow: () => {} })
    const badge = badgeOf(container)
    expect(badge, 'the enabled-paused commit button must render').not.toBeNull()
    expect(badge?.textContent).toBe('Commit')
    expect(container.textContent).not.toContain('Auto-commit on')
  })

  it('stays a plain "Commit" during the quiet phase (armed, above the visible window)', async () => {
    const state: AutoCommitState = {
      intervalSeconds: 30,
      remaining: AUTO_COMMIT_COUNTDOWN_VISIBLE_SECONDS + 9,
    }
    const container = await renderBadge({ state, onCommitNow: () => {} })
    const badge = badgeOf(container)
    expect(badge?.textContent).toBe('Commit')
    expect(badge?.textContent).not.toContain('s')
  })

  it('morphs into the labeled live countdown for the final seconds', async () => {
    const state: AutoCommitState = { intervalSeconds: 5, remaining: 2 }
    const container = await renderBadge({ state, onCommitNow: () => {} })
    const badge = badgeOf(container)
    // A labeled countdown — never the old bare "2s" pill.
    expect(badge?.textContent).toBe('Auto-commit in 2s')
  })

  it('shows the countdown for the whole run when the cadence fits inside the visible window', async () => {
    const state: AutoCommitState = {
      intervalSeconds: AUTO_COMMIT_COUNTDOWN_VISIBLE_SECONDS,
      remaining: AUTO_COMMIT_COUNTDOWN_VISIBLE_SECONDS,
    }
    const container = await renderBadge({ state, onCommitNow: () => {} })
    expect(badgeOf(container)?.textContent).toBe(
      `Auto-commit in ${AUTO_COMMIT_COUNTDOWN_VISIBLE_SECONDS}s`,
    )
  })

  it('is the manual commit button in the SUCCESS semantic — one design-system button, nothing hand-rolled (P4-10)', async () => {
    const container = await renderBadge({
      state: { intervalSeconds: 30, remaining: 12 } satisfies AutoCommitState,
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

  it('has no pulse — no animation, no data-mol-pulse, no injected keyframes (P4-10)', async () => {
    const container = await renderBadge({
      state: { intervalSeconds: 30, remaining: 12 } satisfies AutoCommitState,
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

  it('commits now when clicked — in the quiet phase AND during the countdown', async () => {
    const quietCommit = vi.fn()
    const quiet = await renderBadge({
      state: { intervalSeconds: 30, remaining: 12 } satisfies AutoCommitState,
      onCommitNow: quietCommit,
    })
    await clickBadge(quiet)
    expect(quietCommit).toHaveBeenCalledTimes(1)

    const countdownCommit = vi.fn()
    const counting = await renderBadge({
      state: { intervalSeconds: 5, remaining: 1 } satisfies AutoCommitState,
      onCommitNow: countdownCommit,
    })
    await clickBadge(counting)
    expect(countdownCommit).toHaveBeenCalledTimes(1)
  })

  it('stops the click from bubbling to the commit-bar toggle (P5-06)', async () => {
    // The button lives inside the commit-bar header, whose onClick toggles the
    // uncommitted-files bar. Clicking it must commit WITHOUT toggling that
    // bar — so the click must not propagate to the parent.
    const onCommitNow = vi.fn()
    const parentClick = vi.fn()
    const container = await renderBadge({
      state: { intervalSeconds: 5, remaining: 2 } satisfies AutoCommitState,
      onCommitNow,
      inline: true,
      parentClick,
    })
    await clickBadge(container)
    expect(onCommitNow).toHaveBeenCalledTimes(1)
    expect(parentClick, 'click must not bubble to the bar-header toggle').not.toHaveBeenCalled()
  })

  describe('disabled while the agent is working — no mid-turn commit', () => {
    it('renders muted + inert and does NOT commit when clicked', async () => {
      // Committing mid-turn stages a half-written tree and races the chat
      // stream's conversation writes — so the held button must be a no-op.
      const onCommitNow = vi.fn()
      const container = await renderBadge({
        state: { intervalSeconds: 5, remaining: 2 } satisfies AutoCommitState,
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
      await clickBadge(container)
      expect(onCommitNow, 'a held click must not commit').not.toHaveBeenCalled()
    })

    it('shows the plain "Commit" label even inside the visible countdown window', async () => {
      // A held countdown is paused, not imminent — it must not read "Auto-commit
      // in Ns" (which would imply a commit is about to fire while the agent works).
      const container = await renderBadge({
        state: { intervalSeconds: 5, remaining: 1 } satisfies AutoCommitState,
        onCommitNow: () => {},
        disabled: true,
      })
      const badge = badgeOf(container) as HTMLElement
      expect(badge.textContent).toBe('Commit')
      expect(badge.textContent).not.toContain('Auto-commit in')
    })
  })
})
