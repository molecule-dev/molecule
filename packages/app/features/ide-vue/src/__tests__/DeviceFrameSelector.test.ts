// @vitest-environment jsdom
/**
 * P3-22 — preview device-frame selector (dropdown) quality + behavior guard: a
 * port of `@molecule/app-ide-react/src/__tests__/DeviceFrameSelector.test.tsx`
 * with the same test names and the same assertions, mounted through Vue's own
 * `createApp`.
 *
 * The device control was turned from a blind click-to-cycle button into a
 * proper dropdown menu: a trigger showing the CURRENT frame's icon + a
 * chevron-down affordance, and a themed popover listing every frame so the user
 * picks one directly. This guards that contract end-to-end on a real jsdom
 * render with the REAL `@molecule/app-ui-tailwind` ClassMap and a NAME-KEYED
 * icon set, so it asserts the CORRECT device-specific glyph per frame, the
 * styled `Tooltip` (never a native `title`), ClassMap theme tokens (never a
 * hardcoded hex), keyboard navigation, and outside-click / Escape close.
 *
 * It would fail if anyone reverted the control to a single cycling button,
 * dropped the styled Tooltip, wired one fixed glyph for every frame, hardcoded
 * a hex color, or broke selecting a frame from the menu.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, type VNodeChild } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { DEVICE_FRAMES, deviceIconName } from '@molecule/app-ide-panel-logic'
import type { DeviceFrame } from '@molecule/app-live-preview'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import type { DeviceFrameSelectorWithActionsProps } from '../components/DeviceFrameSelector.js'
import { DeviceFrameSelector } from '../components/DeviceFrameSelector.js'

/** The mounts alive right now, unmounted before the next render. */
const mounted: { app?: ReturnType<typeof createApp>; host?: HTMLElement } = {}

beforeEach(() => {
  // The REAL themed ClassMap, so the trigger + menu resolve to actual theme
  // tokens — that is what the "no hardcoded hex" assertions need to bite.
  setClassMap(classMap)
  // A name-keyed icon set: every glyph resolves to a real <svg><path> whose `d`
  // uniquely encodes the looked-up name, so we can assert the CORRECT
  // device-specific glyph per frame (never one fixed/generic glyph, never emoji).
  setIconSet(
    new Proxy(
      {},
      {
        get: (_target, name) => ({
          paths: [{ d: `glyph:${String(name)}` }],
          viewBox: '0 0 16 16',
        }),
      },
    ),
  )
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  // Unmount the proper way so the Tooltip's portal nodes are removed by Vue.
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Render the selector with the given props.
 * @param props - Props to render with (React names).
 * @returns The container the component rendered into.
 */
function render(
  props: Partial<DeviceFrameSelectorWithActionsProps> &
    Pick<DeviceFrameSelectorWithActionsProps, 'current' | 'onChange'>,
): HTMLElement {
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.host = host
  const app = createApp(
    defineComponent({
      render: (): VNodeChild => h(DeviceFrameSelector, props),
    }),
  )
  mounted.app = app
  app.mount(host)
  return host
}

/** Lets Vue flush the re-render a DOM event queued. */
async function flush(): Promise<void> {
  await nextTick()
}

/**
 * Find the device-selector trigger button inside a rendered tree.
 * @param container - The render container.
 * @returns The trigger button element.
 */
function getTrigger(container: HTMLElement): HTMLElement {
  return container.querySelector('[data-mol-id="preview-device-cycle"]') as HTMLElement
}

/**
 * Find the open dropdown menu inside a rendered tree.
 * @param container - The render container.
 * @returns The menu element or null when closed.
 */
function getMenu(container: HTMLElement): HTMLElement | null {
  return container.querySelector('[role="menu"]')
}

/**
 * Hovers an element the way a user's pointer entering it does (the bubbling
 * `mouseover` the Tooltip wrapper derives its enter from, plus `mouseenter`).
 * @param el - The element entered.
 */
async function hover(el: HTMLElement): Promise<void> {
  el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }))
  await flush()
}

/**
 * Unhovers an element the way a user's pointer leaving it does.
 * @param el - The element left.
 */
async function unhover(el: HTMLElement): Promise<void> {
  el.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
  el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }))
  await flush()
}

/**
 * Presses a key on an element like a user does (bubbling, cancelable).
 * @param el - The element the key lands on.
 * @param key - The key value.
 */
async function keyDown(el: Element, key: string): Promise<void> {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
  await flush()
}

describe('DeviceFrameSelector (P3-22 — themed device-frame dropdown)', () => {
  it("the trigger shows the CURRENT frame's device glyph + a chevron-down affordance", async () => {
    const seen = new Set<string>()
    for (const frame of DEVICE_FRAMES) {
      const container = render({ current: frame, onChange: () => {} })
      const trigger = getTrigger(container)
      // The FIRST glyph is the current frame's device icon.
      const first = trigger.querySelector('svg path')?.getAttribute('d')
      expect(first, `${frame} trigger renders its own device glyph`).toBe(
        `glyph:${deviceIconName(frame)}`,
      )
      seen.add(first as string)
      // A chevron-down affordance signals it is a dropdown, not a static icon.
      const all = [...trigger.querySelectorAll('svg path')].map((p) => p.getAttribute('d'))
      expect(all, `${frame} trigger has a chevron-down affordance`).toContain('glyph:chevron-down')
      mounted.app?.unmount()
      mounted.app = undefined
      await flush()
    }
    // A distinct device glyph per frame — proves it is not one fixed icon reused.
    expect(seen.size).toBe(DEVICE_FRAMES.length)
  })

  it('uses the framework styled Tooltip (never a native title attribute)', async () => {
    const container = render({ current: 'none' as DeviceFrame, onChange: () => {} })
    const trigger = getTrigger(container)
    expect(trigger.hasAttribute('title')).toBe(false)
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
    await hover(trigger.parentElement as HTMLElement)
    const tooltip = document.body.querySelector('[role="tooltip"]')
    expect(tooltip, 'styled Tooltip must mount on hover').not.toBeNull()
    expect(tooltip?.textContent).toBe('Device frame')
    await unhover(trigger.parentElement as HTMLElement)
  })

  it('themes the trigger via ClassMap tokens (no hex) + opts into the touch target', () => {
    const container = render({ current: 'tablet' as DeviceFrame, onChange: () => {} })
    const trigger = getTrigger(container)
    expect(trigger.className).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(trigger.className, 'shares the BarButton touch-target token').toContain(
      'pointer-coarse:min-h-[44px]',
    )
  })

  it('opens a themed menu listing every frame, with the current one checked', async () => {
    const container = render({ current: 'tablet' as DeviceFrame, onChange: () => {} })
    expect(getMenu(container), 'menu is closed until opened').toBeNull()
    getTrigger(container).click()
    await flush()

    const menu = getMenu(container) as HTMLElement
    expect(menu, 'clicking the trigger opens the menu').not.toBeNull()
    // Themed surface — bordered, elevated, theme-token background, no hex.
    expect(menu.className).toContain('bg-surface')
    expect(menu.className).toMatch(/\bborder\b/)
    expect(menu.className).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)

    const items = [...menu.querySelectorAll('[role="menuitemradio"]')]
    expect(items.map((el) => el.getAttribute('data-mol-id'))).toEqual(
      DEVICE_FRAMES.map((f) => `preview-device-option-${f}`),
    )
    // Each item shows its own device glyph + label, and only the current frame
    // is marked checked.
    DEVICE_FRAMES.forEach((frame, i) => {
      const item = items[i] as HTMLElement
      expect(item.querySelector('svg path')?.getAttribute('d')).toBe(
        `glyph:${deviceIconName(frame)}`,
      )
      expect(item.getAttribute('aria-checked')).toBe(String(frame === 'tablet'))
    })
  })

  it('selecting a frame from the menu fires onChange and closes the menu', async () => {
    const onChange = vi.fn()
    const container = render({ current: 'none' as DeviceFrame, onChange })
    getTrigger(container).click()
    await flush()
    ;(
      container.querySelector('[data-mol-id="preview-device-option-mobile"]') as HTMLElement
    ).click()
    await flush()
    expect(onChange).toHaveBeenCalledWith('mobile')
    expect(getMenu(container), 'menu closes after selecting').toBeNull()
  })

  it('closes on Escape and on an outside click', async () => {
    const container = render({ current: 'none' as DeviceFrame, onChange: () => {} })
    getTrigger(container).click()
    await flush()
    expect(getMenu(container)).not.toBeNull()
    await keyDown(getMenu(container) as HTMLElement, 'Escape')
    expect(getMenu(container), 'Escape closes the menu').toBeNull()

    getTrigger(container).click()
    await flush()
    expect(getMenu(container)).not.toBeNull()
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await flush()
    expect(getMenu(container), 'an outside click closes the menu').toBeNull()
  })

  it('opens + roves focus with the keyboard (ArrowDown)', async () => {
    const container = render({ current: 'none' as DeviceFrame, onChange: () => {} })
    await keyDown(getTrigger(container), 'ArrowDown')
    const menu = getMenu(container) as HTMLElement
    expect(menu, 'ArrowDown opens the menu').not.toBeNull()
    // Focus starts on the current frame (responsive / 'none' = first item).
    expect(document.activeElement?.getAttribute('data-mol-id')).toBe('preview-device-option-none')
    await keyDown(menu, 'ArrowDown')
    expect(document.activeElement?.getAttribute('data-mol-id')).toBe(
      'preview-device-option-desktop',
    )
  })
})

describe('DeviceFrameSelector (P4-04 — in-dropdown Rotate + Open in new tab actions)', () => {
  it('hosts an "Open in new tab" action row in the dropdown when wired', async () => {
    const onOpenExternal = vi.fn()
    const container = render({ current: 'none' as DeviceFrame, onChange: () => {}, onOpenExternal })
    getTrigger(container).click()
    await flush()
    const menu = getMenu(container) as HTMLElement
    const open = menu.querySelector('[data-mol-id="preview-open-external"]') as HTMLElement
    expect(open, 'the dropdown lists an Open-in-new-tab action').not.toBeNull()
    // An action (not a radio frame choice): role=menuitem, no aria-checked.
    expect(open.getAttribute('role')).toBe('menuitem')
    expect(open.hasAttribute('aria-checked')).toBe(false)
    // The link-external glyph + i18n label, matching the frame rows' icon+label style.
    expect(open.querySelector('svg path')?.getAttribute('d')).toBe('glyph:link-external')
    expect(open.textContent).toBe('Open in new tab')
    // Clicking it fires the callback and closes the menu.
    open.click()
    await flush()
    expect(onOpenExternal).toHaveBeenCalledTimes(1)
    expect(getMenu(container), 'menu closes after an action').toBeNull()
  })

  it('hosts a "Rotate" action only when the current frame is rotatable (when/where relevant)', async () => {
    const onRotate = vi.fn()
    const container = render({
      current: 'tablet' as DeviceFrame,
      onChange: () => {},
      canRotate: true,
      onRotate,
      onOpenExternal: () => {},
    })
    getTrigger(container).click()
    await flush()
    const menu = getMenu(container) as HTMLElement
    const rotate = menu.querySelector('[data-mol-id="preview-device-rotate"]') as HTMLElement
    expect(rotate, 'a rotatable frame shows the Rotate action').not.toBeNull()
    // Rotate is a TOGGLE — a menuitemcheckbox, unchecked here (no `rotated` passed).
    expect(rotate.getAttribute('role')).toBe('menuitemcheckbox')
    expect(rotate.getAttribute('aria-checked')).toBe('false')
    expect(rotate.querySelector('svg path')?.getAttribute('d')).toBe('glyph:rotate')
    expect(rotate.textContent).toBe('Rotate')
    rotate.click()
    await flush()
    expect(onRotate).toHaveBeenCalledTimes(1)
    expect(getMenu(container)).toBeNull()
  })

  it('renders Rotate as a CHECKED toggle (aria-checked + a check glyph) when rotated', async () => {
    const container = render({
      current: 'tablet' as DeviceFrame,
      onChange: () => {},
      canRotate: true,
      rotated: true,
      onRotate: () => {},
    })
    getTrigger(container).click()
    await flush()
    const rotate = (getMenu(container) as HTMLElement).querySelector(
      '[data-mol-id="preview-device-rotate"]',
    ) as HTMLElement
    expect(rotate.getAttribute('role')).toBe('menuitemcheckbox')
    expect(rotate.getAttribute('aria-checked')).toBe('true')
    // The check glyph (same affordance as the selected device row) marks it "on".
    const glyphs = [...rotate.querySelectorAll('svg path')].map((p) => p.getAttribute('d'))
    expect(glyphs).toContain('glyph:check')
  })

  it('hides the Rotate action for a non-rotatable frame, keeping Open in new tab', async () => {
    const container = render({
      current: 'none' as DeviceFrame,
      onChange: () => {},
      canRotate: false,
      onRotate: () => {},
      onOpenExternal: () => {},
    })
    getTrigger(container).click()
    await flush()
    const menu = getMenu(container) as HTMLElement
    expect(
      menu.querySelector('[data-mol-id="preview-device-rotate"]'),
      'no Rotate on a fluid (non-rotatable) frame',
    ).toBeNull()
    expect(
      menu.querySelector('[data-mol-id="preview-open-external"]'),
      'Open in new tab is still present',
    ).not.toBeNull()
  })

  it('separates the device frames from the action rows with a themed divider', async () => {
    const container = render({
      current: 'none' as DeviceFrame,
      onChange: () => {},
      onOpenExternal: () => {},
    })
    getTrigger(container).click()
    await flush()
    const menu = getMenu(container) as HTMLElement
    const sep = menu.querySelector('[data-mol-id="preview-device-menu-separator"]') as HTMLElement
    expect(sep, 'a divider separates frames from actions').not.toBeNull()
    expect(sep.getAttribute('role')).toBe('separator')
    // Theme-token color, never a hex (only the var()'s own fallback `#` allowed).
    expect(sep.style.background).toContain('var(--mol-color-border')
    expect(sep.style.background.replace(/var\([^)]*\)/g, '')).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })

  it('renders NO separator or action rows when no action handlers are wired', async () => {
    const container = render({ current: 'none' as DeviceFrame, onChange: () => {} })
    getTrigger(container).click()
    await flush()
    const menu = getMenu(container) as HTMLElement
    expect(menu.querySelector('[data-mol-id="preview-device-menu-separator"]')).toBeNull()
    expect(menu.querySelector('[data-mol-id="preview-open-external"]')).toBeNull()
    expect(menu.querySelector('[data-mol-id="preview-device-rotate"]')).toBeNull()
    // The frame radio group is untouched — exactly the device frames, no extra rows.
    expect(menu.querySelectorAll('[role="menuitemradio"]').length).toBe(DEVICE_FRAMES.length)
    expect(menu.querySelectorAll('[role="menuitem"]').length).toBe(0)
  })

  it('extends keyboard roving focus from the last frame into the action rows', async () => {
    const container = render({
      current: 'mobile' as DeviceFrame,
      onChange: () => {},
      canRotate: true,
      onRotate: () => {},
      onOpenExternal: () => {},
    })
    // Open at the current frame (mobile = the last device frame).
    getTrigger(container).click()
    await flush()
    const menu = getMenu(container) as HTMLElement
    expect(document.activeElement?.getAttribute('data-mol-id')).toBe('preview-device-option-mobile')
    // ArrowDown crosses the divider into the first action row (Rotate)…
    await keyDown(menu, 'ArrowDown')
    expect(document.activeElement?.getAttribute('data-mol-id')).toBe('preview-device-rotate')
    // …then to Open in new tab…
    await keyDown(menu, 'ArrowDown')
    expect(document.activeElement?.getAttribute('data-mol-id')).toBe('preview-open-external')
    // …and wrapping past the last action returns to the first frame.
    await keyDown(menu, 'ArrowDown')
    expect(document.activeElement?.getAttribute('data-mol-id')).toBe('preview-device-option-none')
  })
})
