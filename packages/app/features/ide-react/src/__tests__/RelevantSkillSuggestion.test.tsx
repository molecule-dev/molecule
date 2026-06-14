// @vitest-environment jsdom

/**
 * SYN4 — the proactive "Relevant skill" suggestion (the auto-suggest half of
 * `/skills`) renders to the rule-11 bar.
 *
 * The MVP audit found the auto-suggest-from-recent-messages half entirely
 * unbuilt. This is a real jsdom render of {@link RelevantSkillSuggestion} (not a
 * source grep), using the REAL `@molecule/app-ui-tailwind` ClassMap so the
 * resolved classes are actual theme tokens. It pins the affordance:
 *
 * - a one-click **Load** that fires `onLoad`, and a dismiss that fires `onDismiss`
 * - the skill description surfaces through the framework's REAL styled `Tooltip`
 *   (a `role="tooltip"` popover on hover), NEVER the delayed native `title`
 * - the leading glyph is a real `<svg>` from the icon set, never an emoji
 * - the tooltip is themed via ClassMap tokens, never a hardcoded hex
 *
 * Every assertion fails if the affordance is reverted (no component renders) or
 * regressed to a native `title` / emoji glyph / hardcoded color.
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

import type { SkillInfo } from '../components/chat-skills-utilities.js'
import { RelevantSkillSuggestion } from '../components/RelevantSkillSuggestion.js'

const SKILL: SkillInfo = {
  path: '.agents/skills/auth/SKILL.md',
  name: 'auth',
  description: 'Authentication, login, OAuth and sessions.',
}

/**
 * Wrap children with the i18n provider the module-level `t()` resolves against.
 * @param root0 - Wrapper props.
 * @param root0.children - The component(s) under test.
 * @returns The wrapped tree.
 */
function Wrap({ children }: { children: ReactNode }): ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

beforeEach(() => {
  // The REAL themed ClassMap — so the tooltip's resolved classes are the actual
  // theme tokens (not a stub), which is what the "no hardcoded hex" check needs.
  setClassMap(classMap)
  // Any glyph resolves to an empty path set — Icon still renders a real <svg>
  // (never an emoji string).
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
})

afterEach(() => {
  // Unmount the React tree the proper way so the Tooltip's portal nodes are
  // removed by React itself (nuking innerHTML races React's portal unmount).
  cleanup()
})

describe('RelevantSkillSuggestion (SYN4 — proactive one-click skill load)', () => {
  it('renders the suggestion with the skill name and a real SVG glyph (never an emoji)', () => {
    const { container } = render(
      <Wrap>
        <RelevantSkillSuggestion skill={SKILL} onLoad={() => {}} onDismiss={() => {}} />
      </Wrap>,
    )
    const card = container.querySelector('[data-mol-id="relevant-skill-suggestion"]')
    expect(card, 'the suggestion affordance must render').not.toBeNull()
    expect(card?.textContent).toContain('Relevant skill')
    expect(card?.textContent).toContain('auth')

    const icon = container.querySelector('[data-mol-id="relevant-skill-icon"]')
    expect(icon?.tagName.toLowerCase(), 'the leading glyph must be a real <svg> icon').toBe('svg')
  })

  it('uses the framework styled Tooltip (NOT the native title) for the skill description', () => {
    const { container } = render(
      <Wrap>
        <RelevantSkillSuggestion skill={SKILL} onLoad={() => {}} onDismiss={() => {}} />
      </Wrap>,
    )
    // No control in the affordance may use the delayed, touch-blind native title.
    for (const el of Array.from(container.querySelectorAll('[data-mol-id^="relevant-skill"]'))) {
      expect(el.hasAttribute('title'), `${el.getAttribute('data-mol-id')} must NOT use title`).toBe(
        false,
      )
    }

    // Hovering the glyph's Tooltip trigger mounts a role="tooltip" popover whose
    // text is the skill description — a native title would produce no such node.
    const icon = container.querySelector('[data-mol-id="relevant-skill-icon"]') as HTMLElement
    fireEvent.mouseEnter(icon.parentElement as HTMLElement)
    const tooltip = document.body.querySelector('[role="tooltip"]')
    expect(tooltip, 'the styled Tooltip must mount on hover').not.toBeNull()
    expect(tooltip?.textContent).toBe(SKILL.description)

    // Themed via ClassMap tokens, never a hardcoded hex color.
    const className = (tooltip as HTMLElement).className
    expect(className, 'tooltip surface must be a theme token').toContain('bg-surface')
    expect(className).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    fireEvent.mouseLeave(icon.parentElement as HTMLElement)
  })

  it('fires onLoad with the skill when Load is clicked (one-click load)', () => {
    const onLoad = vi.fn()
    const { container } = render(
      <Wrap>
        <RelevantSkillSuggestion skill={SKILL} onLoad={onLoad} onDismiss={() => {}} />
      </Wrap>,
    )
    const load = container.querySelector('[data-mol-id="relevant-skill-load"]') as HTMLElement
    expect(load.textContent).toBe('Load')
    fireEvent.click(load)
    expect(onLoad).toHaveBeenCalledTimes(1)
    expect(onLoad).toHaveBeenCalledWith(SKILL)
  })

  it('fires onDismiss with the skill when the suggestion is dismissed', () => {
    const onDismiss = vi.fn()
    const { container } = render(
      <Wrap>
        <RelevantSkillSuggestion skill={SKILL} onLoad={() => {}} onDismiss={onDismiss} />
      </Wrap>,
    )
    const dismiss = container.querySelector('[data-mol-id="relevant-skill-dismiss"]') as HTMLElement
    // The dismiss control is labelled for accessibility (aria-label, not title).
    expect(dismiss.getAttribute('aria-label')).toBe('Dismiss suggestion')
    fireEvent.click(dismiss)
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(onDismiss).toHaveBeenCalledWith(SKILL)
  })
})
