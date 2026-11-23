// @vitest-environment jsdom
/**
 * `NoticeCard` and `ResourceLimitBanner` rendered for real.
 *
 * Angular port of the render contract `@molecule/app-ide-react`'s ChatPanel
 * asserts for its notifications (`ChatPanel.notice-card.test.tsx`), mounted on
 * the part itself because the Angular ChatPanel does not carry the timeline
 * dispatch yet (unit U4). It is React's ONE notice treatment: a single root
 * element carrying `data-mol-id="chat-notice-card"`, the tone, the shared xs
 * text size and the tone-tinted chrome; a matched-weight accent icon; a body
 * that is either a composable segment list or the plain text; and a
 * left-aligned row of the design system's own buttons. Every case below is
 * read from `NoticeCard.tsx`.
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
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { ChatEventCardSegment } from '@molecule/app-ide-panel-logic'
import {
  CHAT_CARD_CODE_STYLE,
  CHAT_CARD_LINK_STYLE,
  NOTICE_TONE,
  TIMELINE_ITEM_GAP,
} from '@molecule/app-ide-panel-logic'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { NoticeCard, ResourceLimitBanner } from '../parts/notice-card.component.js'

/** The host the notice-card cases mount (React's prop names). */
const NoticeCardHost = Component({
  selector: 'mol-notice-card-host',
  standalone: true,
  imports: [NoticeCard],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `<div mol-notice-card [tone]="p['tone']" [text]="p['text']" [content]="p['content']" [action]="p['action']" [icon]="p['icon']"></div>`,
})(
  class NoticeCardHostComponent {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = { tone: 'info' }
  },
)

/** The host the resource-limit banner cases mount. */
const ResourceLimitHost = Component({
  selector: 'mol-resource-limit-host',
  standalone: true,
  imports: [ResourceLimitBanner],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `<div mol-resource-limit-banner [message]="p['message']" [action]="p['action']"></div>`,
})(
  class ResourceLimitHostComponent {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = { message: '' }
  },
)

/** One mounted component, with its teardown. */
interface Mounted {
  appRef: ApplicationRef
  container: HTMLElement
}

/** The mount alive right now, if any. */
let current: Mounted | null = null

beforeEach(() => {
  // The REAL themed ClassMap, so the card resolves actual theme tokens.
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // Every glyph resolves to a path that names it, so a case can tell the
  // tone's icon from an override.
  setIconSet(
    new Proxy(
      {},
      {
        get: (_target, name) => ({ paths: [{ d: `M0 0 ${String(name)}` }], viewBox: '0 0 16 16' }),
      },
    ),
  )
})

afterEach(() => {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
})

/**
 * Mounts one component with the given host props.
 *
 * @param host - The JIT host component to mount.
 * @param props - The host's props (React's prop names).
 * @returns The mount container.
 */
async function mount<H extends { p: Record<string, unknown> }>(
  host: Type<H>,
  props: Record<string, unknown>,
): Promise<HTMLElement> {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<H> = createComponent(host, { environmentInjector: appRef.injector })
  ref.instance.p = props
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  appRef.tick()
  current = { appRef, container }
  return container
}

/**
 * The CSSOM value a browser reads back for a declaration, so a case compares
 * against what React's own style object produces rather than its source text.
 * The DOM's serialization is then read the way `styleOf` reads the port's: jsdom
 * 31 writes `#e0a100` inside `color-mix()` as `rgb(224, 161, 0)` and reads that
 * text back as `rgb(224 161 0)`, where a browser keeps one form.
 *
 * @param property - The kebab-case CSS property.
 * @param value - The value React's style object writes.
 * @returns The declaration's CSSOM-serialized value.
 */
function css(property: string, value: string): string {
  const probe = document.createElement('div')
  probe.style.setProperty(property, value)
  return styleOf(probe, property)
}

/**
 * The declarations of a style attribute, split at the semicolons outside
 * quotes and brackets — the way the conformance normalizer reads them.
 *
 * @param value - The style attribute text.
 * @returns The written declarations.
 */
function declarations(value: string): string[] {
  const out: string[] = []
  let depth = 0
  let quote = ''
  let start = 0
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i]
    if (quote) {
      if (ch === quote) quote = ''
      continue
    }
    if (ch === '"' || ch === "'") quote = ch
    else if (ch === '(') depth += 1
    else if (ch === ')') depth = Math.max(0, depth - 1)
    else if (ch === ';' && depth === 0) {
      out.push(value.slice(start, i))
      start = i + 1
    }
  }
  out.push(value.slice(start))
  return out.map((entry) => entry.trim()).filter(Boolean)
}

/**
 * One element's declaration value, read the way a browser applies an attribute
 * style: declaration by declaration, in order (so a shorthand never swallows a
 * later longhand).
 *
 * @param element - The rendered element.
 * @param property - The kebab-case CSS property.
 * @returns The declaration's CSSOM-serialized value.
 */
function styleOf(element: Element, property: string): string {
  const probe = document.createElement('div')
  for (const declaration of declarations(element.getAttribute('style') ?? '')) {
    const split = declaration.indexOf(':')
    if (split < 0) continue
    probe.style.setProperty(declaration.slice(0, split).trim(), declaration.slice(split + 1).trim())
  }
  return probe.style.getPropertyValue(property)
}

/**
 * An element's class tokens in a stable order, so a case compares the tokens
 * the design system contributes and not their written order.
 *
 * @param source - The rendered element, or a class string.
 * @returns The sorted class tokens.
 */
function classTokens(source: Element | string): string {
  const text = typeof source === 'string' ? source : source.className
  return text.split(/\s+/).filter(Boolean).sort().join(' ')
}

/**
 * The notice card's single root element.
 *
 * @param container - The mount container.
 * @returns The root element.
 */
function card(container: HTMLElement): HTMLElement {
  const root = container.querySelector<HTMLElement>('[data-mol-id="chat-notice-card"]')
  if (!root) throw new Error('the notice card did not render')
  return root
}

/**
 * The card's body element (React's `{flex: 1, minWidth: 0}` div).
 *
 * @param container - The mount container.
 * @returns The body element.
 */
function body(container: HTMLElement): HTMLElement {
  const element = card(container).children[1] as HTMLElement | undefined
  if (!element) throw new Error('the notice card has no body')
  return element
}

/**
 * One composable segment's rendered node: the unwrap host's single child.
 *
 * @param container - The mount container.
 * @param index - The segment's position in the body.
 * @returns The rendered span, code, anchor or button.
 */
function segment(container: HTMLElement, index: number): HTMLElement {
  const host = body(container).children[index] as HTMLElement | undefined
  const node = host?.firstElementChild as HTMLElement | null
  if (!node) throw new Error(`segment ${index} did not render`)
  return node
}

describe('NoticeCard', () => {
  it('renders React’s single root with the tone’s chrome', async () => {
    const container = await mount(NoticeCardHost, { tone: 'gold', text: 'A tip' })
    const root = card(container)
    const accent = NOTICE_TONE.gold.accent

    // ONE root element: the icon and the body, no wrapper between them.
    expect(root.children).toHaveLength(2)
    expect(root.children[0].tagName.toLowerCase()).toBe('svg')
    expect(root.children[1].tagName.toLowerCase()).toBe('div')
    expect(container.querySelectorAll('[data-mol-id="chat-notice-card"]')).toHaveLength(1)

    expect(root.getAttribute('data-tone')).toBe('gold')
    expect(root.className).toBe(getClassMap().textSize('xs'))
    expect(styleOf(root, 'display')).toBe('flex')
    expect(styleOf(root, 'align-items')).toBe('flex-start')
    expect(styleOf(root, 'gap')).toBe(css('gap', '10px'))
    expect(styleOf(root, 'margin-bottom')).toBe(css('margin-bottom', `${TIMELINE_ITEM_GAP}px`))
    expect(styleOf(root, 'padding')).toBe(css('padding', '10px 12px'))
    expect(styleOf(root, 'border-radius')).toBe(css('border-radius', '8px'))
    expect(styleOf(root, 'line-height')).toBe('1.5')
    expect(styleOf(root, 'border')).toBe(
      css('border', `1px solid color-mix(in srgb, ${accent} 40%, transparent)`),
    )
    expect(styleOf(root, 'background')).toBe(
      css('background', `color-mix(in srgb, ${accent} 10%, transparent)`),
    )
  })

  it('renders the tone’s icon at the shared size, tinted by the accent', async () => {
    const container = await mount(NoticeCardHost, { tone: 'upgrade', text: 'Limit' })
    const icon = card(container).children[0] as HTMLElement

    expect(icon.getAttribute('aria-hidden')).toBe('true')
    expect(icon.getAttribute('width')).toBe('18')
    expect(icon.getAttribute('height')).toBe('18')
    expect(icon.querySelector('path')?.getAttribute('d')).toBe(`M0 0 ${NOTICE_TONE.upgrade.icon}`)
    expect(styleOf(icon, 'flex-shrink')).toBe('0')
    expect(styleOf(icon, 'margin-top')).toBe(css('margin-top', '1px'))
    expect(styleOf(icon, 'color')).toBe(css('color', NOTICE_TONE.upgrade.accent))
  })

  it('renders an icon override in place of the tone’s glyph', async () => {
    const container = await mount(NoticeCardHost, { tone: 'gold', text: 'A tip', icon: 'star' })
    expect(card(container).children[0].querySelector('path')?.getAttribute('d')).toBe('M0 0 star')
  })

  it('renders the plain text in one span, pre-wrapped only when multi-line', async () => {
    const single = await mount(NoticeCardHost, { tone: 'info', text: 'One line' })
    const singleBody = body(single)
    expect(singleBody.children).toHaveLength(1)
    const span = singleBody.children[0] as HTMLElement
    expect(span.tagName.toLowerCase()).toBe('span')
    expect(span.textContent).toBe('One line')
    expect(span.hasAttribute('style')).toBe(false)
    current?.appRef.destroy()
    single.remove()
    current = null

    const multi = await mount(NoticeCardHost, { tone: 'info', text: 'Line one\nLine two' })
    expect(styleOf(body(multi).children[0], 'white-space')).toBe('pre-wrap')
    expect(body(multi).children[0].textContent).toBe('Line one\nLine two')
  })

  it('renders one action as the design system’s own link, same-tab for app routes', async () => {
    const container = await mount(NoticeCardHost, {
      tone: 'upgrade',
      text: 'You hit the plan limit.',
      action: { label: 'Upgrade', href: '/pricing' },
    })
    const row = body(container).children[1] as HTMLElement
    expect(styleOf(row, 'display')).toBe('flex')
    expect(styleOf(row, 'flex-wrap')).toBe('wrap')
    expect(styleOf(row, 'gap')).toBe(css('gap', '8px'))
    expect(styleOf(row, 'margin-top')).toBe(css('margin-top', '8px'))

    const link = row.children[0] as HTMLAnchorElement
    expect(link.tagName.toLowerCase()).toBe('a')
    expect(link.getAttribute('href')).toBe('/pricing')
    expect(link.getAttribute('target')).toBeNull()
    expect(link.getAttribute('rel')).toBeNull()
    expect(classTokens(link)).toBe(
      classTokens(
        getClassMap().cn(
          getClassMap().button({ color: 'warning', size: 'sm' }),
          getClassMap().touchTargetCompact,
        ),
      ),
    )
    expect(styleOf(link, 'text-decoration')).toBe('none')
    expect(styleOf(link, 'font-family')).toBe(css('font-family', 'inherit'))
  })

  it('opens http(s) and protocol-relative actions in a new tab, inertly', async () => {
    const container = await mount(NoticeCardHost, {
      tone: 'info',
      text: 'Session expired.',
      action: [
        { label: 'Re-auth', href: '//accounts.example.test/login' },
        { label: 'Docs', href: 'https://status.example.test' },
        { label: 'Bad', href: 'javascript:alert(1)' },
      ],
    })
    const row = body(container).children[1] as HTMLElement
    expect(row.children).toHaveLength(3)

    const protoRelative = row.children[0] as HTMLAnchorElement
    expect(protoRelative.getAttribute('target')).toBe('_blank')
    expect(protoRelative.getAttribute('rel')).toBe('noopener noreferrer')

    const https = row.children[1] as HTMLAnchorElement
    expect(https.getAttribute('target')).toBe('_blank')
    expect(https.getAttribute('rel')).toBe('noopener noreferrer')

    // An unapproved scheme never becomes an anchor: the label is inert text.
    const refused = row.children[2] as HTMLElement
    expect(refused.tagName.toLowerCase()).toBe('span')
    expect(refused.textContent).toBe('Bad')
    expect(classTokens(refused)).toContain(classTokens(getClassMap().touchTargetCompact))
  })

  it('renders an href-less action as a button that runs its handler', async () => {
    const onClick = vi.fn()
    const container = await mount(NoticeCardHost, {
      tone: 'success',
      text: 'Saved script: deploy',
      action: { label: 'Run', onClick },
    })
    const button = (body(container).children[1] as HTMLElement).children[0] as HTMLButtonElement
    expect(button.tagName.toLowerCase()).toBe('button')
    expect(button.getAttribute('type')).toBe('button')
    expect(classTokens(button)).toBe(
      classTokens(
        getClassMap().cn(
          getClassMap().button({ color: 'success', size: 'sm' }),
          getClassMap().touchTargetCompact,
        ),
      ),
    )
    button.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('lets an action name its own semantic colour and sets monospace on a code action', async () => {
    const container = await mount(NoticeCardHost, {
      tone: 'info',
      text: 'Try it',
      action: { label: '/report', onClick: () => undefined, color: 'error', code: true },
    })
    const button = (body(container).children[1] as HTMLElement).children[0] as HTMLButtonElement
    expect(classTokens(button)).toBe(
      classTokens(
        getClassMap().cn(
          getClassMap().button({ color: 'error', size: 'sm' }),
          getClassMap().touchTargetCompact,
        ),
      ),
    )
    expect(styleOf(button, 'font-family')).toBe(
      css('font-family', 'var(--mol-font-mono, monospace)'),
    )
  })

  it('renders a composable body as its segments, in order', async () => {
    const content: ChatEventCardSegment[] = [
      'For free users… see our ',
      { code: 'npm test' },
      ', then ',
      { label: 'upgrade options', href: 'https://example.test/plans' },
    ]
    const container = await mount(NoticeCardHost, { tone: 'gold', content })

    expect(segment(container, 0).tagName.toLowerCase()).toBe('span')
    expect(segment(container, 0).textContent).toBe('For free users… see our ')

    const code = segment(container, 1)
    expect(code.tagName.toLowerCase()).toBe('code')
    expect(code.textContent).toBe('npm test')
    expect(styleOf(code, 'font-family')).toBe(css('font-family', CHAT_CARD_CODE_STYLE.fontFamily))
    expect(styleOf(code, 'font-size')).toBe(css('font-size', CHAT_CARD_CODE_STYLE.fontSize))
    expect(styleOf(code, 'padding')).toBe(css('padding', CHAT_CARD_CODE_STYLE.padding))
    expect(styleOf(code, 'border-radius')).toBe(css('border-radius', '4px'))
    expect(styleOf(code, 'background')).toBe(css('background', CHAT_CARD_CODE_STYLE.background))
    expect(styleOf(code, 'border')).toBe(css('border', CHAT_CARD_CODE_STYLE.border))
    expect(styleOf(code, 'white-space')).toBe('nowrap')

    expect(segment(container, 2).textContent).toBe(', then ')

    const link = segment(container, 3) as HTMLAnchorElement
    expect(link.tagName.toLowerCase()).toBe('a')
    expect(link.getAttribute('href')).toBe('https://example.test/plans')
    // A body segment is ALWAYS a new-tab link (React's segment rule).
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    expect(styleOf(link, 'color')).toBe(css('color', CHAT_CARD_LINK_STYLE.color))
    expect(styleOf(link, 'text-decoration')).toBe(CHAT_CARD_LINK_STYLE.textDecoration)
    expect(styleOf(link, 'cursor')).toBe(CHAT_CARD_LINK_STYLE.cursor)
  })

  it('renders a clickable command segment as the code chip with the link colour', async () => {
    const onClick = vi.fn()
    const container = await mount(NoticeCardHost, {
      tone: 'gold',
      content: [{ label: '/report', onClick, code: true }],
    })
    const button = segment(container, 0) as HTMLButtonElement
    expect(button.tagName.toLowerCase()).toBe('button')
    expect(button.textContent).toBe('/report')
    expect(styleOf(button, 'font-family')).toBe(css('font-family', CHAT_CARD_CODE_STYLE.fontFamily))
    expect(styleOf(button, 'padding')).toBe(css('padding', CHAT_CARD_CODE_STYLE.padding))
    expect(styleOf(button, 'color')).toBe(css('color', CHAT_CARD_LINK_STYLE.color))
    expect(styleOf(button, 'cursor')).toBe('pointer')
    expect(styleOf(button, 'text-decoration')).toBe('')
    button.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders a plain inline action as link-styled text with the button reset', async () => {
    const onClick = vi.fn()
    const container = await mount(NoticeCardHost, {
      tone: 'gold',
      content: ['Open ', { label: 'the report form', onClick }],
    })
    const button = segment(container, 1) as HTMLButtonElement
    expect(button.tagName.toLowerCase()).toBe('button')
    expect(button.getAttribute('type')).toBe('button')
    expect(styleOf(button, 'background')).toBe(css('background', 'none'))
    expect(styleOf(button, 'border')).toBe(css('border', 'none'))
    expect(styleOf(button, 'padding')).toBe(css('padding', '0px'))
    expect(styleOf(button, 'font')).toBe(css('font', 'inherit'))
    expect(styleOf(button, 'color')).toBe(css('color', CHAT_CARD_LINK_STYLE.color))
    expect(styleOf(button, 'text-decoration')).toBe(CHAT_CARD_LINK_STYLE.textDecoration)
    button.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('never anchors a segment whose scheme is unapproved', async () => {
    const container = await mount(NoticeCardHost, {
      tone: 'gold',
      content: ['Do not ', { label: 'click me', href: 'data:text/html,hi' }],
    })
    const inert = segment(container, 1)
    expect(inert.tagName.toLowerCase()).toBe('span')
    expect(inert.textContent).toBe('click me')
    expect(styleOf(inert, 'color')).toBe(css('color', CHAT_CARD_LINK_STYLE.color))
  })

  it('treats an empty composable body as content, so no text and no action row render', async () => {
    const container = await mount(NoticeCardHost, {
      tone: 'info',
      text: 'ignored',
      content: [],
      action: { label: 'Upgrade', href: '/pricing' },
    })
    expect(body(container).children).toHaveLength(0)
    expect(container.textContent).toBe('')
  })

  it('suppresses the action row when a body is present', async () => {
    const container = await mount(NoticeCardHost, {
      tone: 'gold',
      text: 'ignored',
      content: ['inline body'],
      action: { label: 'Upgrade', href: '/pricing' },
    })
    expect(container.querySelector('a[href="/pricing"]')).toBeNull()
  })

  it('renders every tone with its own accent and icon, and nothing else changed', async () => {
    for (const tone of ['info', 'gold', 'upgrade', 'success', 'signup'] as const) {
      const container = await mount(NoticeCardHost, { tone, text: tone })
      const root = card(container)
      expect(root.getAttribute('data-tone')).toBe(tone)
      expect(root.children[0].querySelector('path')?.getAttribute('d')).toBe(
        `M0 0 ${NOTICE_TONE[tone].icon}`,
      )
      expect(styleOf(root.children[0], 'color')).toBe(css('color', NOTICE_TONE[tone].accent))
      current?.appRef.destroy()
      container.remove()
      current = null
    }
  })
})

describe('ResourceLimitBanner', () => {
  it('renders the upgrade notice through the shared card, with the host’s buttons', async () => {
    const container = await mount(ResourceLimitHost, {
      message: 'Your usage balance is empty. Add funds to keep building.',
      action: [{ label: 'Add funds', href: '/billing' }],
    })
    // React's root here is the notice card itself, so the host adds no node of its own.
    const wrapper = container.querySelector<HTMLElement>('[data-parity-unwrap]')
    expect(wrapper?.getAttribute('data-parity-unwrap')).not.toBeNull()
    expect(wrapper?.children).toHaveLength(1)

    const root = card(container)
    expect(root.getAttribute('data-tone')).toBe('upgrade')
    expect(root.textContent).toContain('Your usage balance is empty.')
    expect(root.querySelector('a[href="/billing"]')?.textContent).toBe('Add funds')
  })
})
