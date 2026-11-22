// @vitest-environment jsdom
/**
 * P3-22 — preview device-frame selector (dropdown) quality + behavior guard: a
 * port of `@molecule/app-ide-react/src/__tests__/DeviceFrameSelector.test.tsx`
 * with the same test names and the same assertions, mounted through Angular's
 * own `createApplication` (the selector is PRESENTATIONAL: inputs in, callbacks
 * out).
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

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
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

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { DEVICE_FRAMES, deviceIconName } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { DeviceFrameSelector } from '../components/device-frame-selector.component.js'

/** One mounted selector and its teardown. */
interface Mounted {
  /** The Angular application the host was created in. */
  appRef: ApplicationRef
  /** The host's component ref. */
  ref: ComponentRef<InstanceType<typeof DeviceFrameSelectorHost>>
  /** The host element the selector rendered into. */
  container: HTMLElement
}

/**
 * The JIT host the way the conformance kit mounts the component: its template
 * binds every input, so the fields are set through real bindings.
 */
const DeviceFrameSelectorHost = Component({
  selector: 'mol-device-frame-selector-host',
  standalone: true,
  imports: [DeviceFrameSelector],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `<div mol-device-frame-selector [current]="p['current']" [onChange]="p['onChange']" [className]="p['className']" [canRotate]="p['canRotate']" [rotated]="p['rotated']" [onRotate]="p['onRotate']" [onOpenExternal]="p['onOpenExternal']"></div>`,
})(
  class DeviceFrameSelectorHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** The mount alive right now, if any. */
let current: Mounted | null = null

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

afterEach(() => {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/** Lets Angular's zoneless change detection settle what an event queued. */
async function flush(): Promise<void> {
  if (!current) return
  current.appRef.tick()
  for (let i = 0; i < 3; i++) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
  current.appRef.tick()
}

/**
 * Render the selector with the given inputs.
 * @param overrides - Inputs to override.
 * @returns The host element the selector rendered into.
 */
async function renderSelector(overrides: Record<string, unknown> = {}): Promise<HTMLElement> {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<InstanceType<typeof DeviceFrameSelectorHost>> = createComponent(
    DeviceFrameSelectorHost,
    {
      environmentInjector: appRef.injector,
    },
  )
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = {
    current: 'none',
    onChange: () => {},
    className: undefined,
    canRotate: undefined,
    rotated: undefined,
    onRotate: undefined,
    onOpenExternal: undefined,
    ...overrides,
  }
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref, container }
  await flush()
  return container
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
 * `mouseover` the Tooltip wrapper derives its enter from).
 * @param el - The element entered.
 */
async function hover(el: HTMLElement): Promise<void> {
  el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  await flush()
}

/**
 * Unhovers an element the way a user's pointer leaving it does.
 * @param el - The element left.
 */
async function unhover(el: HTMLElement): Promise<void> {
  el.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
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
      const container = await renderSelector({ current: frame })
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
      current?.appRef.destroy()
      if (current) current.container.remove()
      current = null
    }
    // A distinct device glyph per frame — proves it is not one fixed icon reused.
    expect(seen.size).toBe(DEVICE_FRAMES.length)
  })

  it('uses the framework styled Tooltip (never a native title attribute)', async () => {
    const container = await renderSelector()
    const trigger = getTrigger(container)
    expect(trigger.hasAttribute('title')).toBe(false)
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
    await hover(trigger.parentElement as HTMLElement)
    const tooltip = document.body.querySelector('[role="tooltip"]')
    expect(tooltip, 'styled Tooltip must mount on hover').not.toBeNull()
    expect(tooltip?.textContent?.trim()).toBe('Device frame')
    await unhover(trigger.parentElement as HTMLElement)
  })

  it('themes the trigger via ClassMap tokens (no hex) + opts into the touch target', async () => {
    const container = await renderSelector({ current: 'tablet' })
    const trigger = getTrigger(container)
    expect(trigger.className).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(trigger.className, 'shares the BarButton touch-target token').toContain(
      'pointer-coarse:min-h-[44px]',
    )
  })

  it('opens a themed menu listing every frame, with the current one checked', async () => {
    const container = await renderSelector({ current: 'tablet' })
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
    const container = await renderSelector({ onChange })
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
    const container = await renderSelector()
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
    const container = await renderSelector()
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
    const container = await renderSelector({ onOpenExternal })
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
    expect(open.textContent?.trim()).toBe('Open in new tab')
    // Clicking it fires the callback and closes the menu.
    open.click()
    await flush()
    expect(onOpenExternal).toHaveBeenCalledTimes(1)
    expect(getMenu(container), 'menu closes after an action').toBeNull()
  })

  it('hosts a "Rotate" action only when the current frame is rotatable (when/where relevant)', async () => {
    const onRotate = vi.fn()
    const container = await renderSelector({
      current: 'tablet',
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
    expect(rotate.textContent?.trim()).toBe('Rotate')
    rotate.click()
    await flush()
    expect(onRotate).toHaveBeenCalledTimes(1)
    expect(getMenu(container)).toBeNull()
  })

  it('renders Rotate as a CHECKED toggle (aria-checked + a check glyph) when rotated', async () => {
    const container = await renderSelector({
      current: 'tablet',
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
    const container = await renderSelector({
      current: 'none',
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
    const container = await renderSelector({ onOpenExternal: () => {} })
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
    const container = await renderSelector()
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
    const container = await renderSelector({
      current: 'mobile',
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
