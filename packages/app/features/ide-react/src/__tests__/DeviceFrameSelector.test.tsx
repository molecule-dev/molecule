// @vitest-environment jsdom

/**
 * P3-22 — preview device-frame selector (dropdown) quality + behavior guard.
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
 * dropped the styled Tooltip, wired one fixed glyph for every frame, hardcoded a
 * hex color, or broke selecting a frame from the menu.
 *
 * @module
 */

import { cleanup, fireEvent, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { DEVICE_FRAMES, deviceIconName } from '../components/device-cycle.js'
import { DeviceFrameSelector } from '../components/DeviceFrameSelector.js'

/**
 * Wrap children with the i18n context the selector's `t()` calls need.
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @returns The wrapped tree.
 */
function Wrap({ children }: { children: ReactNode }): ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
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
})

afterEach(() => {
  // Unmount the proper way so the Tooltip's portal nodes are removed by React.
  cleanup()
})

describe('DeviceFrameSelector (P3-22 — themed device-frame dropdown)', () => {
  it("the trigger shows the CURRENT frame's device glyph + a chevron-down affordance", () => {
    const seen = new Set<string>()
    for (const frame of DEVICE_FRAMES) {
      const { container, unmount } = render(
        <Wrap>
          <DeviceFrameSelector current={frame} onChange={() => {}} />
        </Wrap>,
      )
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
      unmount()
    }
    // A distinct device glyph per frame — proves it is not one fixed icon reused.
    expect(seen.size).toBe(DEVICE_FRAMES.length)
  })

  it('uses the framework styled Tooltip (never a native title attribute)', () => {
    const { container } = render(
      <Wrap>
        <DeviceFrameSelector current="none" onChange={() => {}} />
      </Wrap>,
    )
    const trigger = getTrigger(container)
    expect(trigger.hasAttribute('title')).toBe(false)
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
    fireEvent.mouseEnter(trigger.parentElement as HTMLElement)
    const tooltip = document.body.querySelector('[role="tooltip"]')
    expect(tooltip, 'styled Tooltip must mount on hover').not.toBeNull()
    expect(tooltip?.textContent).toBe('Device frame')
    fireEvent.mouseLeave(trigger.parentElement as HTMLElement)
  })

  it('themes the trigger via ClassMap tokens (no hex) + opts into the touch target', () => {
    const { container } = render(
      <Wrap>
        <DeviceFrameSelector current="tablet" onChange={() => {}} />
      </Wrap>,
    )
    const trigger = getTrigger(container)
    expect(trigger.className).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(trigger.className, 'shares the BarButton touch-target token').toContain(
      'pointer-coarse:min-h-[44px]',
    )
  })

  it('opens a themed menu listing every frame, with the current one checked', () => {
    const { container } = render(
      <Wrap>
        <DeviceFrameSelector current="tablet" onChange={() => {}} />
      </Wrap>,
    )
    expect(getMenu(container), 'menu is closed until opened').toBeNull()
    fireEvent.click(getTrigger(container))

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

  it('selecting a frame from the menu fires onChange and closes the menu', () => {
    const onChange = vi.fn()
    const { container } = render(
      <Wrap>
        <DeviceFrameSelector current="none" onChange={onChange} />
      </Wrap>,
    )
    fireEvent.click(getTrigger(container))
    fireEvent.click(
      container.querySelector('[data-mol-id="preview-device-option-mobile"]') as HTMLElement,
    )
    expect(onChange).toHaveBeenCalledWith('mobile')
    expect(getMenu(container), 'menu closes after selecting').toBeNull()
  })

  it('closes on Escape and on an outside click', () => {
    const { container } = render(
      <Wrap>
        <DeviceFrameSelector current="none" onChange={() => {}} />
      </Wrap>,
    )
    fireEvent.click(getTrigger(container))
    expect(getMenu(container)).not.toBeNull()
    fireEvent.keyDown(getMenu(container) as HTMLElement, { key: 'Escape' })
    expect(getMenu(container), 'Escape closes the menu').toBeNull()

    fireEvent.click(getTrigger(container))
    expect(getMenu(container)).not.toBeNull()
    fireEvent.mouseDown(document.body)
    expect(getMenu(container), 'an outside click closes the menu').toBeNull()
  })

  it('opens + roves focus with the keyboard (ArrowDown)', () => {
    const { container } = render(
      <Wrap>
        <DeviceFrameSelector current="none" onChange={() => {}} />
      </Wrap>,
    )
    fireEvent.keyDown(getTrigger(container), { key: 'ArrowDown' })
    const menu = getMenu(container) as HTMLElement
    expect(menu, 'ArrowDown opens the menu').not.toBeNull()
    // Focus starts on the current frame (responsive / 'none' = first item).
    expect(document.activeElement?.getAttribute('data-mol-id')).toBe('preview-device-option-none')
    fireEvent.keyDown(menu, { key: 'ArrowDown' })
    expect(document.activeElement?.getAttribute('data-mol-id')).toBe(
      'preview-device-option-desktop',
    )
  })
})
