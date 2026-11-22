// @vitest-environment jsdom
/**
 * TabBar close-control focus reveal (WCAG 2.4.7 Focus Visible) — the Vue port
 * of `@molecule/app-ide-react/src/__tests__/TabBar.test.tsx` with the same
 * test names and the same behavioral assertions, mounted through Vue's own
 * `createApp`.
 *
 * The tab's close control reveals on hover OR while focus is anywhere inside
 * the tab — a keyboard user who tabs to the tab (or on to the close control)
 * sees the control a mouse user sees on hover, and the control's tint lights
 * on its own focus too. The events are dispatched the way the conformance
 * kit's `focus`/`blur` steps are: the native `focus()`/`blur()` plus the
 * bubbling `focusin`/`focusout` pair the tab binds.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, provide, type VNodeChild } from 'vue'

import type { ServiceCallSink } from '@molecule/app-framework-conformance/ui'
import { createFakeThemeProvider } from '@molecule/app-framework-conformance/ui'
import type { I18nProvider as I18nProviderType } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { ThemeKey, type ThemeProvider } from '@molecule/app-vue'

import { TabBar } from '../components/TabBar.js'

/** A TypeScript file the bar opens first. */
const APP = '/workspace/src/app.ts'
/** A Markdown file opened next to it (its close control must stay hidden). */
const README = '/workspace/README.md'

/** The tint the close control lights with on hover — and on focus (the CSSOM's serialization). */
const FOCUS_TINT = 'rgba(128, 128, 128, 0.25)'

/** The bonded provider from {@link beforeEach}. */
let provider: I18nProviderType

/** A no-op service-call sink for the fake theme provider. */
const sink: ServiceCallSink = () => {}

/** The mount alive right now, if any. */
const mounted: { app?: ReturnType<typeof createApp>; host?: HTMLElement } = {}

/**
 * Focuses an element the way the conformance kit's `focus` step does.
 * @param el - The element to focus.
 */
function focusEl(el: HTMLElement): void {
  el.focus()
  el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
}

/**
 * Blurs an element the way the conformance kit's `blur` step does.
 * @param el - The element to blur.
 */
function blurEl(el: HTMLElement): void {
  el.blur()
  el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
}

/**
 * Mounts a two-tab bar and hands back its elements.
 * @returns The first tab, its close control and the second tab's close control.
 */
async function renderBar(): Promise<{
  firstTab: HTMLElement
  firstClose: HTMLElement
  secondClose: HTMLElement
  onSelect: ReturnType<typeof vi.fn>
  onClose: ReturnType<typeof vi.fn>
}> {
  mounted.app?.unmount()
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.host = host
  const themeProvider: ThemeProvider = createFakeThemeProvider('light', sink)
  const onSelect = vi.fn()
  const onClose = vi.fn()
  const app = createApp(
    defineComponent({
      setup() {
        provide(ThemeKey, themeProvider)
        return (): VNodeChild =>
          h(TabBar, {
            tabs: [
              { path: APP, label: 'app.ts', isDirty: false, isActive: false },
              { path: README, label: 'README.md', isDirty: false, isActive: false },
            ],
            activeFile: null,
            onSelect,
            onClose,
          })
      },
    }),
  )
  mounted.app = app
  app.mount(host)
  await nextTick()
  const firstTab = host.querySelector('div[role="tab"]') as HTMLElement
  const closes = host.querySelectorAll('[data-mol-id="tab-close"]')
  return {
    firstTab,
    firstClose: closes[0] as HTMLElement,
    secondClose: closes[1] as HTMLElement,
    onSelect,
    onClose,
  }
}

beforeEach(() => {
  setClassMap(classMap)
  // jsdom has no scrollIntoView; the bar scrolls the active tab into view.
  Element.prototype.scrollIntoView = (): void => {}
  // TabBar's `t` reads the bonded provider, so bond one before rendering.
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'ide.tabs.close': 'Close {{fileName}}' } },
  ])
  setProvider(provider)
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

describe('TabBar close-control focus reveal (WCAG 2.4.7)', () => {
  it('focusing a tab reveals its close button', async () => {
    const { firstTab, firstClose, secondClose } = await renderBar()

    // Pointer devices start with the close control hidden on every tab.
    expect(firstClose.style.opacity).toBe('0')
    expect(secondClose.style.opacity).toBe('0')

    focusEl(firstTab)
    await nextTick()
    expect(firstClose.style.opacity).toBe('1')
    // Only the focused tab's control reveals — the sibling stays hidden.
    expect(secondClose.style.opacity).toBe('0')
  })

  it('focus moving from the tab to its close button keeps it revealed', async () => {
    const { firstTab, firstClose } = await renderBar()

    focusEl(firstTab)
    await nextTick()
    expect(firstClose.style.opacity).toBe('1')

    // The move is one focused region: the control stays revealed…
    focusEl(firstClose)
    await nextTick()
    expect(firstClose.style.opacity).toBe('1')
    // …and lights its tint, the keyboard twin of its hover tint.
    expect(firstClose.style.background).toBe(FOCUS_TINT)
    expect(firstClose.style.color).toBe('var(--color-foreground, #e0e0e0)')
  })

  it('blur hides it again', async () => {
    const { firstTab, firstClose } = await renderBar()

    focusEl(firstTab)
    await nextTick()
    expect(firstClose.style.opacity).toBe('1')

    blurEl(firstTab)
    await nextTick()
    expect(firstClose.style.opacity).toBe('0')
  })
})

describe('TabBar tab semantics (axe nested-interactive)', () => {
  it('keeps the close button outside the role="tab" element', async () => {
    const { firstTab, firstClose } = await renderBar()

    // A tab's children are presentational, so a close button inside it would
    // vanish from the accessibility tree (axe nested-interactive).
    expect(firstTab.querySelector('[data-mol-id="tab-close"]')).toBeNull()
    // The close control is the tab's sibling, under the presentation wrapper.
    expect(firstClose.parentElement).toBe(firstTab.parentElement)
    expect(firstClose.parentElement?.getAttribute('role')).toBe('presentation')
    // The keyboard path is Delete on the tab, so the button is out of the order.
    expect(firstClose.tabIndex).toBe(-1)
    // A tablist may own only tabs, so the ✕ is the pointer-user duplicate of
    // the tab's Delete action and is hidden from the accessibility tree.
    expect(firstClose.getAttribute('aria-hidden')).toBe('true')
    expect(firstTab.getAttribute('aria-keyshortcuts')).toBe('Delete')
  })

  it('closes the focused tab on Delete', async () => {
    const { firstTab, onClose, onSelect } = await renderBar()

    firstTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    await nextTick()

    expect(onClose).toHaveBeenCalledWith(APP)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('selects the focused tab on Enter and Space', async () => {
    const { firstTab, onSelect } = await renderBar()

    firstTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    firstTab.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    await nextTick()

    expect(onSelect).toHaveBeenCalledTimes(2)
    expect(onSelect).toHaveBeenCalledWith(APP)
  })
})
