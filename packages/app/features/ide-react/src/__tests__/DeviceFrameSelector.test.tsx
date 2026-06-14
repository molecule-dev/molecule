// @vitest-environment jsdom

/**
 * PV1 — device-frame cycle button visual-quality guard.
 *
 * The MVP intent audit (`docs/mvp-intent-findings.md`, PV1) required the preview
 * device-frame cycler to read as a first-class, OBVIOUS-on-hover control: the
 * REAL framework styled `Tooltip` (never the delayed, unstyled, touch-blind
 * native `title` attribute), a consistent high-quality SVG glyph from the bonded
 * icon set (never an emoji or a generic / wrong glyph), and ClassMap THEME TOKENS
 * for color + spacing (never a hardcoded hex). It must match its BarButton
 * siblings exactly (same ghost/xs size + touch target + bottom-placed tooltip).
 *
 * This is a real jsdom render of {@link DeviceFrameSelector} with the REAL themed
 * `@molecule/app-ui-tailwind` ClassMap and a NAME-KEYED icon set, so the test can
 * assert the CORRECT device-specific glyph renders for EACH frame in the cycle —
 * coverage the panel-level tooltip guard can't give: it stubs every glyph to the
 * same empty path, so a regression to one fixed / generic icon for all frames
 * would slip straight through it.
 *
 * It would fail if anyone reverted the control to a native `title` attribute,
 * swapped the SVG for an emoji string, wired one fixed glyph for every frame, or
 * hardcoded a hex color instead of a ClassMap token.
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

import { DEVICE_CYCLE, deviceIconName } from '../components/device-cycle.js'
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
 * Find the device-cycle button inside a rendered tree.
 * @param container - The render container.
 * @returns The cycle button element.
 */
function getButton(container: HTMLElement): HTMLElement {
  return container.querySelector('[data-mol-id="preview-device-cycle"]') as HTMLElement
}

beforeEach(() => {
  // The REAL themed ClassMap, so the button + tooltip resolve to actual theme
  // tokens — that is what the "no hardcoded hex" assertions need to bite.
  setClassMap(classMap)
  // A name-keyed icon set: every glyph resolves to a real <svg><path> whose `d`
  // uniquely encodes the looked-up name, so we can assert the button renders the
  // CORRECT device-specific glyph per frame (never one fixed/generic glyph, never
  // an emoji string).
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

describe('DeviceFrameSelector (PV1 — first-class device-frame cycler)', () => {
  it("renders the CURRENT frame's device-specific SVG glyph (never one generic glyph, never an emoji)", () => {
    const seen = new Set<string>()
    for (const frame of DEVICE_CYCLE) {
      const { container, unmount } = render(
        <Wrap>
          <DeviceFrameSelector current={frame} onChange={() => {}} />
        </Wrap>,
      )
      const button = getButton(container)
      const svg = button.querySelector('svg')
      expect(svg, `${frame} must render an <svg> icon, not an emoji`).not.toBeNull()
      const d = svg?.querySelector('path')?.getAttribute('d')
      // The glyph wired must be the one device-cycle maps this frame to.
      expect(d, `${frame} renders its own device glyph`).toBe(`glyph:${deviceIconName(frame)}`)
      seen.add(d as string)
      unmount()
    }
    // A distinct glyph per frame — proves it is not one fixed/generic icon reused.
    expect(seen.size).toBe(DEVICE_CYCLE.length)
  })

  it('uses the framework styled Tooltip on hover, never the native title attr', () => {
    const { container } = render(
      <Wrap>
        <DeviceFrameSelector current="none" onChange={() => {}} />
      </Wrap>,
    )
    const button = getButton(container)
    // The delayed, unstyled, touch-blind native tooltip the audit rejected.
    expect(button.hasAttribute('title')).toBe(false)
    // Hovering the Tooltip trigger portals a role="tooltip" popover — a native
    // title produces no such element, so this passes only with the real component.
    fireEvent.mouseEnter(button.parentElement as HTMLElement)
    const tooltip = document.body.querySelector('[role="tooltip"]')
    expect(tooltip, 'styled Tooltip must mount on hover').not.toBeNull()
    // Text routes through i18n t() and names the current + next frame.
    expect(tooltip?.textContent).toBe('Responsive — click for Desktop')
    fireEvent.mouseLeave(button.parentElement as HTMLElement)
  })

  it('themes via ClassMap tokens — no hardcoded hex on the button or the tooltip', () => {
    const { container } = render(
      <Wrap>
        <DeviceFrameSelector current="tablet" onChange={() => {}} />
      </Wrap>,
    )
    const button = getButton(container)
    const hexRe = /#[0-9a-fA-F]{3,8}\b/
    // Button styling is ClassMap-resolved (ghost/xs + touch target), never hex.
    expect(button.className).not.toMatch(hexRe)
    expect(button.className, 'shares the BarButton touch-target token').toContain(
      'pointer-coarse:min-h-[44px]',
    )
    fireEvent.mouseEnter(button.parentElement as HTMLElement)
    const tooltip = document.body.querySelector('[role="tooltip"]') as HTMLElement
    // Tooltip surface + text come from theme tokens (light/dark aware), not hex.
    expect(tooltip.className).toContain('bg-surface')
    expect(tooltip.className).toContain('text-foreground')
    expect(tooltip.className).not.toMatch(hexRe)
    expect(tooltip.textContent).toBe('Tablet — click for Mobile')
    fireEvent.mouseLeave(button.parentElement as HTMLElement)
  })

  it('advances to the next frame on click', () => {
    const onChange = vi.fn()
    const { container } = render(
      <Wrap>
        <DeviceFrameSelector current="desktop" onChange={onChange} />
      </Wrap>,
    )
    fireEvent.click(getButton(container))
    expect(onChange).toHaveBeenCalledWith('tablet')
  })
})
