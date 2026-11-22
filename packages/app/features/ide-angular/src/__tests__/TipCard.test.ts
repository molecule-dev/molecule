// @vitest-environment jsdom
/**
 * SYN12 — auto-tip card render + i18n + theming regression guard: a port of
 * `@molecule/app-ide-react/src/__tests__/TipCard.test.tsx` with the same test
 * names and the same assertions, mounted through Angular's own
 * `createApplication`.
 *
 * The tip text resolves from the locale REGISTRY (a deliberately-wrong inline
 * `defaultValue` is supplied and must be ignored), the card is themed via the
 * `--mol-color-primary` theme token (light/dark + per-app brand aware, never
 * the old hardcoded indigo `rgba(99,102,241,…)`), the tip icon (the bonded
 * `lightbulb` glyph) is a real `<svg>`, not an emoji glyph, and the dismiss
 * control is an accessible button that fires `onDismiss`.
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

import { addTranslations, createSimpleI18nProvider, setProvider, t } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { ENTRY_TIP } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { TipCard } from '../parts/tip-card.component.js'

/** The English source the locale bond ships for the entry tip (verbatim). */
const ENTRY_TIP_EN =
  'Tip: type / to see every command, or @ a filename to give {{agentName}} a file to work from.'

/** One mounted card, with its teardown. */
interface Mounted {
  appRef: ApplicationRef
  ref: ComponentRef<InstanceType<typeof TipCardHost>>
  container: HTMLElement
}

/**
 * The JIT host the way the conformance kit mounts the card: its template
 * binds every input, so the inputs are set through real bindings (a bare
 * `createComponent` + `setInput` writes nothing the card can read).
 */
const TipCardHost = Component({
  selector: 'mol-tip-card-host',
  standalone: true,
  imports: [TipCard],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `<div mol-tip-card [text]="p['text']" [onDismiss]="p['onDismiss']" [accent]="p['accent']" [icon]="p['icon']"></div>`,
})(
  class TipCardHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** The mount alive right now, if any. */
let current: Mounted | null = null

beforeEach(() => {
  // The REAL themed ClassMap, so the card's resolved classes are actual tokens.
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // Stub the bonded icon set so the lightbulb <Icon> resolves to a real <svg>.
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
  // Register the bond's English strings on the live i18n singleton TipCard
  // reads through. A WRONG default is passed at the call site below, so
  // resolving the real text proves it comes from the registry (the bond), not
  // the inline default.
  addTranslations('en', {
    'ide.chat.tip.getStarted': ENTRY_TIP_EN,
    'ide.chat.tip.dismiss': 'Dismiss tip',
  })
})

afterEach(async () => {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Render the tip card the way ChatPanel does.
 *
 * @param props - Props to render with.
 * @returns The mounted host element.
 */
async function renderTipCard(props: Record<string, unknown> = {}): Promise<HTMLElement> {
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
  const ref: ComponentRef<InstanceType<typeof TipCardHost>> = createComponent(TipCardHost, {
    environmentInjector: appRef.injector,
  })
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = props
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref, container }
  current.appRef.tick()
  for (let i = 0; i < 3; i++) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
  current.appRef.tick()
  return container
}

describe('TipCard (SYN12 — themed, accessible, i18n-backed onboarding tip)', () => {
  it('resolves the entry-tip text from the locale bond and interpolates agentName', async () => {
    // The defaultValue is intentionally wrong: if the key were missing from
    // the registry, t() would return it and this assertion would fail.
    const text = t(
      `ide.chat.tip.${ENTRY_TIP.id}`,
      { agentName: 'Synthase' },
      { defaultValue: 'WRONG-DEFAULT-SHOULD-NOT-RENDER' },
    )
    expect(text).toBe(
      'Tip: type / to see every command, or @ a filename to give Synthase a file to work from.',
    )
    expect(text).not.toContain('{{agentName}}')
    expect(text).not.toContain('WRONG-DEFAULT')

    const container = await renderTipCard({ text, onDismiss: () => {} })
    expect(container.textContent ?? '').toContain('give Synthase a file to work from')
  })

  it('themes the card via the --mol-color-primary token, never a hardcoded indigo', async () => {
    const container = await renderTipCard({ text: 'hello', onDismiss: () => {} })
    const card = container.querySelector('[data-mol-id="chat-tip-card"]') as HTMLElement
    expect(card).not.toBeNull()
    // Background + border tint follow the active theme's primary color.
    expect(card.style.background).toContain('--mol-color-primary')
    expect(card.style.border).toContain('--mol-color-primary')
    // The old hardcoded indigo rgba must be gone from every property.
    expect(card.style.cssText).not.toContain('99,102,241')
    expect(card.style.cssText).not.toContain('99, 102, 241')
    // The icon color is the theme token too.
    const icon = card.querySelector('svg') as SVGElement
    expect(icon.style.color).toContain('--mol-color-primary')
  })

  it('renders the tip icon as a real <svg> lightbulb, not an emoji glyph', async () => {
    const container = await renderTipCard({ text: 'hello', onDismiss: () => {} })
    const card = container.querySelector('[data-mol-id="chat-tip-card"]') as HTMLElement
    // First child is the tip-icon SVG (not a "💡" text node).
    const svg = card.querySelector('svg')
    expect(svg).not.toBeNull()
    // It is specifically the bonded `lightbulb` glyph — the stub renders the
    // icon name into the path `d` as `glyph:<name>`, so a regression to a
    // sparkle/other glyph (or an emoji) fails here.
    expect(svg?.querySelector('path')?.getAttribute('d')).toBe('glyph:lightbulb')
    // No emoji anywhere in the card's text content.
    expect(card.textContent ?? '').not.toMatch(/\p{Extended_Pictographic}/u)
  })

  it('fires onDismiss when the accessible dismiss button is clicked', async () => {
    const onDismiss = vi.fn()
    const container = await renderTipCard({ text: 'hello', onDismiss })
    const button = container.querySelector('[data-mol-id="chat-tip-dismiss"]') as HTMLButtonElement
    expect(button).not.toBeNull()
    // Accessible name resolves through i18n (registered above), not a raw key.
    expect(button.getAttribute('aria-label')).toBe('Dismiss tip')
    button.click()
    for (let i = 0; i < 3; i++) await Promise.resolve()
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
