// @vitest-environment jsdom
/**
 * Card-action href scheme allowlist.
 *
 * Angular port of `@molecule/app-ide-react/src/__tests__/link-href-allowlist.test.tsx`
 * with the same test names and the same behavioral assertions, mounted through
 * Angular's own `createApplication`.
 *
 * `ChatEventCardAction.href` renders anchors in the ChatPanel card bodies and
 * the HelpCard's upgrade actions — the sanctioned extension point for
 * host/model-authored actions. Those anchors go through the SAME scheme
 * allowlist as markdown links ({@link isAllowedLinkHref}): an unapproved scheme
 * (`javascript:`, `data:`, tab-broken `java\tscript:`) renders as inert text,
 * never an anchor.
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
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { HelpCard } from '../parts/help-card.component.js'
import { isAllowedLinkHref } from '../parts/markdown-content.component.js'

/** The JIT host: its template binds every HelpCard input. */
const HelpCardHost = Component({
  selector: 'mol-link-href-allowlist-host',
  standalone: true,
  imports: [HelpCard],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div mol-help-card [isLight]="p['isLight']" [upgradeLines]="p['upgradeLines']" [upgradeAction]="p['upgradeAction']"></div>`,
})(
  class HelpCardHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** The mount alive right now, if any. */
let current: {
  appRef: ApplicationRef
  container: HTMLElement
} | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet(new Proxy({}, { get: () => ({ paths: [], viewBox: '0 0 16 16' }) }))
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
 * Renders the help card with the given inputs.
 *
 * @param props - The HelpCard inputs.
 * @returns The rendered container.
 */
async function renderHelpCard(props: Record<string, unknown>): Promise<HTMLElement> {
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
  const ref: ComponentRef<InstanceType<typeof HelpCardHost>> = createComponent(HelpCardHost, {
    environmentInjector: appRef.injector,
  })
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = props
  ref.changeDetectorRef.markForCheck()
  current = { appRef, container }
  appRef.tick()
  for (let i = 0; i < 3; i++) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
  appRef.tick()
  return container
}

describe('isAllowedLinkHref (shared scheme gate)', () => {
  it('allows http(s), mailto and scheme-less hrefs', () => {
    expect(isAllowedLinkHref('https://molecule.dev/pricing')).toBe(true)
    expect(isAllowedLinkHref('http://example.test/page')).toBe(true)
    expect(isAllowedLinkHref('mailto:support@molecule.dev')).toBe(true)
    expect(isAllowedLinkHref('/projects/p1')).toBe(true)
    expect(isAllowedLinkHref('//cdn.example.test/lib.js')).toBe(true)
  })

  it('refuses scriptable schemes', () => {
    expect(isAllowedLinkHref('javascript:alert(1)')).toBe(false)
    expect(isAllowedLinkHref('JAVASCRIPT:alert(1)')).toBe(false)
    expect(isAllowedLinkHref('data:text/html,<script>alert(1)</script>')).toBe(false)
    expect(isAllowedLinkHref('vbscript:msgbox(1)')).toBe(false)
  })

  it('refuses schemes smuggled past the parser with tab/newline (browsers strip them)', () => {
    expect(isAllowedLinkHref('java\tscript:alert(1)')).toBe(false)
    expect(isAllowedLinkHref('java\nscript:alert(1)')).toBe(false)
    expect(isAllowedLinkHref(' \u0000 javascript:alert(1)')).toBe(false)
  })
})

describe('HelpCard upgrade actions', () => {
  it('renders an https action as an anchor', async () => {
    const container = await renderHelpCard({
      isLight: true,
      upgradeLines: ['You have used the free allowance.'],
      upgradeAction: { label: 'Upgrade plan', href: 'https://molecule.dev/pricing' },
    })
    const label = [...container.querySelectorAll('a')].find(
      (el) => (el.textContent ?? '').trim() === 'Upgrade plan',
    )
    expect(label).not.toBeUndefined()
    expect(label?.getAttribute('href')).toBe('https://molecule.dev/pricing')
    expect(label?.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('renders a javascript: action as inert text, never an anchor', async () => {
    const container = await renderHelpCard({
      isLight: true,
      upgradeLines: ['You have used the free allowance.'],
      upgradeAction: { label: 'Upgrade plan', href: 'javascript:alert(1)' },
    })
    const label = [...container.querySelectorAll('span')].find(
      (el) => (el.textContent ?? '').trim() === 'Upgrade plan',
    )
    expect(label).not.toBeUndefined()
    expect(label?.closest('a')).toBeNull()
  })
})
