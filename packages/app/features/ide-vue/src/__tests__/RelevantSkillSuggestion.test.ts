// @vitest-environment jsdom
/**
 * SYN4 — the proactive "Relevant skill" suggestion: a port of
 * `@molecule/app-ide-react/src/__tests__/RelevantSkillSuggestion.test.tsx` with
 * the same test names and the same assertions, mounted through Vue's own
 * `createApp`.
 *
 * A real jsdom render of {@link RelevantSkillSuggestion} (not a source grep),
 * using the REAL `@molecule/app-ui-tailwind` ClassMap so the resolved classes
 * are actual theme tokens. It pins the affordance:
 *
 * - a one-click **Load** that fires `onLoad`, and a dismiss that fires `onDismiss`
 * - the skill description surfaces through the framework's REAL styled `Tooltip`
 *   (a `role="tooltip"` popover on hover), NEVER the delayed native `title`
 * - the leading glyph is a real `<svg>` from the icon set, never an emoji
 * - the tooltip is themed via ClassMap tokens, never a hardcoded hex
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, type VNodeChild } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { SkillInfo } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import type { RelevantSkillSuggestionProps } from '../parts/RelevantSkillSuggestion.js'
import { RelevantSkillSuggestion } from '../parts/RelevantSkillSuggestion.js'

/** A skill the suggestion can offer. */
const SKILL: SkillInfo = {
  path: '.agents/skills/auth/SKILL.md',
  name: 'auth',
  description: 'Authentication, login, OAuth and sessions.',
}

const mounted: { app?: ReturnType<typeof createApp> } = {}

beforeEach(() => {
  // The REAL themed ClassMap — so the tooltip's resolved classes are the actual
  // theme tokens (not a stub), which is what the "no hardcoded hex" check needs.
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // Any glyph resolves to an empty path set — Icon still renders a real <svg>
  // (never an emoji string).
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
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Render the suggestion the way ChatPanel does.
 *
 * @param props - Props to render with.
 * @returns The host element.
 */
function renderSuggestion(
  props: Partial<RelevantSkillSuggestionProps> &
    Pick<RelevantSkillSuggestionProps, 'skill' | 'onLoad' | 'onDismiss'>,
): HTMLElement {
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      render: (): VNodeChild => h(RelevantSkillSuggestion, props),
    }),
  )
  mounted.app = app
  app.mount(host)
  return host
}

/**
 * Hovers an element the way the framework Tooltip's trigger listens for it
 * (the bubbling `mouseover` plus `mouseenter`, as the conformance kit does).
 *
 * @param el - The element to hover.
 */
async function hover(el: Element): Promise<void> {
  el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }))
  await nextTick()
  await nextTick()
}

describe('RelevantSkillSuggestion (SYN4 — proactive one-click skill load)', () => {
  it('renders the suggestion with the skill name and a real SVG glyph (never an emoji)', () => {
    const host = renderSuggestion({ skill: SKILL, onLoad: () => {}, onDismiss: () => {} })
    const card = host.querySelector('[data-mol-id="relevant-skill-suggestion"]')
    expect(card, 'the suggestion affordance must render').not.toBeNull()
    expect(card?.textContent).toContain('Relevant skill')
    expect(card?.textContent).toContain('auth')

    const icon = host.querySelector('[data-mol-id="relevant-skill-icon"]')
    expect(icon?.tagName.toLowerCase(), 'the leading glyph must be a real <svg> icon').toBe('svg')
  })

  it('uses the framework styled Tooltip (NOT the native title) for the skill description', async () => {
    const host = renderSuggestion({ skill: SKILL, onLoad: () => {}, onDismiss: () => {} })
    // No control in the affordance may use the delayed, touch-blind native title.
    for (const el of Array.from(host.querySelectorAll('[data-mol-id^="relevant-skill"]'))) {
      expect(el.hasAttribute('title'), `${el.getAttribute('data-mol-id')} must NOT use title`).toBe(
        false,
      )
    }

    // Hovering the glyph's Tooltip trigger mounts a role="tooltip" popover whose
    // text is the skill description — a native title would produce no such node.
    const icon = host.querySelector('[data-mol-id="relevant-skill-icon"]') as HTMLElement
    await hover(icon.parentElement as HTMLElement)
    const tooltip = document.body.querySelector('[role="tooltip"]')
    expect(tooltip, 'the styled Tooltip must mount on hover').not.toBeNull()
    expect(tooltip?.textContent).toBe(SKILL.description)

    // Themed via ClassMap tokens, never a hardcoded hex color.
    const className = (tooltip as HTMLElement).className
    expect(className, 'tooltip surface must be a theme token').toContain('bg-surface')
    expect(className).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    icon.parentElement?.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
  })

  it('fires onLoad with the skill when Load is clicked (one-click load)', () => {
    const onLoad = vi.fn()
    const host = renderSuggestion({ skill: SKILL, onLoad, onDismiss: () => {} })
    const load = host.querySelector('[data-mol-id="relevant-skill-load"]') as HTMLElement
    expect(load.textContent).toBe('Load')
    load.click()
    expect(onLoad).toHaveBeenCalledTimes(1)
    expect(onLoad).toHaveBeenCalledWith(SKILL)
  })

  it('fires onDismiss with the skill when the suggestion is dismissed', () => {
    const onDismiss = vi.fn()
    const host = renderSuggestion({ skill: SKILL, onLoad: () => {}, onDismiss })
    const dismiss = host.querySelector('[data-mol-id="relevant-skill-dismiss"]') as HTMLElement
    // The dismiss control is labelled for accessibility (aria-label, not title).
    expect(dismiss.getAttribute('aria-label')).toBe('Dismiss suggestion')
    dismiss.click()
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(onDismiss).toHaveBeenCalledWith(SKILL)
  })
})
