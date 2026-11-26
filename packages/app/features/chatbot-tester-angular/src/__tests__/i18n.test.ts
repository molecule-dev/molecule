// @vitest-environment jsdom
/**
 * The sandbox's own text goes through i18n — the Angular port of
 * `@molecule/app-chatbot-tester-react/src/__tests__/i18n.test.ts`: the same
 * test names and the same assertions. The composer placeholder, the send
 * label and the bot picker's label each render the bonded provider's value
 * for their `chatbotTester.*` key by default, and an explicit prop still
 * overrides the translation. The Angular binding's `useTranslation` reads the
 * bonded `@molecule/app-i18n` provider, so the provider is swapped for one
 * carrying marker translations instead of mocked.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_t, p) =>
          typeof p === 'string' && p === 'cn'
            ? (...args: unknown[]) => args.filter(Boolean).join(' ')
            : (...args: unknown[]) => `mock-${String(p)}-${args.join('-')}`,
      },
    ),
}))

import { provideDomPlacement } from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { ChatbotTester, ChatbotTesterInput, ChatbotTesterMessages } from '../index.js'

/** The marker translations the bonded provider carries for the three keys. */
const MARKERS = {
  'chatbotTester.placeholder.message': 'Nachricht eingeben',
  'chatbotTester.label.send': 'Abschicken',
  'chatbotTester.label.testBot': 'Bot auswählen',
} as const

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template (the component element + projected content).
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(template: string, props: Record<string, unknown> = {}): Promise<Mounted> {
  const SpecHost = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [ChatbotTester, ChatbotTesterInput, ChatbotTesterMessages],
    changeDetection: ChangeDetectionStrategy.Eager,
    template,
  })(
    class DefaultHost {
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(SpecHost, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  appRef.tick()
  return {
    host,
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/** Bonds the provider with the marker translations. */
const bondMarkers = (): void => {
  setProvider(
    createSimpleI18nProvider('en', [{ code: 'en', name: 'English', translations: { ...MARKERS } }]),
  )
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a bonded
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('ChatbotTesterInput text', () => {
  it('takes the composer placeholder through i18n by default', async () => {
    bondMarkers()
    const m = await mount(`<div mol-chatbot-tester-input [value]="p['value']"></div>`, {
      value: '',
    })
    mounted.push(m)
    expect(m.host.querySelector('textarea')?.getAttribute('placeholder')).toBe(
      MARKERS['chatbotTester.placeholder.message'],
    )
    expect(m.host.innerHTML).not.toContain('Type a message…')
  })

  it('takes the send label through i18n by default', async () => {
    bondMarkers()
    const m = await mount(`<div mol-chatbot-tester-input [value]="p['value']"></div>`, {
      value: '',
    })
    mounted.push(m)
    expect(m.host.querySelector('button')?.textContent?.trim()).toBe(
      MARKERS['chatbotTester.label.send'],
    )
    expect(m.host.innerHTML).not.toContain('>Send</button>')
  })

  it('keeps the caller’s placeholder and send label', async () => {
    bondMarkers()
    const m = await mount(
      `<div mol-chatbot-tester-input [value]="p['value']" [placeholder]="p['placeholder']" [sendLabel]="p['sendLabel']"></div>`,
      { value: '', placeholder: 'Ask away', sendLabel: 'Go' },
    )
    mounted.push(m)
    expect(m.host.querySelector('textarea')?.getAttribute('placeholder')).toBe('Ask away')
    expect(m.host.querySelector('button')?.textContent?.trim()).toBe('Go')
    expect(m.host.innerHTML).not.toContain('Nachricht eingeben')
    expect(m.host.innerHTML).not.toContain('Abschicken')
  })
})

describe('ChatbotTester text', () => {
  it('takes the bot picker label through i18n by default', async () => {
    bondMarkers()
    const m = await mount(
      `<div mol-chatbot-tester [messages]="p['messages']" [bots]="p['bots']"></div>`,
      { messages: [], bots: [{ id: 'b1' }, { id: 'b2' }] },
    )
    mounted.push(m)
    expect(m.host.querySelector('label')?.textContent?.trim()).toBe(
      MARKERS['chatbotTester.label.testBot'],
    )
    expect(m.host.innerHTML).not.toContain('Test bot')
  })

  it('keeps the caller’s bot picker label', async () => {
    bondMarkers()
    const m = await mount(
      `<div mol-chatbot-tester [messages]="p['messages']" [bots]="p['bots']" [botPickerLabel]="p['botPickerLabel']"></div>`,
      { messages: [], bots: [{ id: 'b1' }, { id: 'b2' }], botPickerLabel: 'Pick a bot' },
    )
    mounted.push(m)
    expect(m.host.querySelector('label')?.textContent?.trim()).toBe('Pick a bot')
    expect(m.host.innerHTML).not.toContain('Bot auswählen')
  })
})

describe('ChatbotTester projected slots', () => {
  it('keeps a consumer list in order when an item is inserted in the middle of error', async () => {
    const m = await mount(
      `<div mol-chatbot-tester [messages]="p['messages']" [bots]="p['bots']">@for (x of p['xs']; track x) {<b slot="error">{{ x }}</b>}</div>`,
      { messages: [], bots: [], xs: [1, 3] },
    )
    mounted.push(m)
    const items = (): string[] =>
      Array.from(m.host.querySelectorAll('b')).map((el) => el.textContent ?? '')
    expect(items()).toEqual(['1', '3'])
    await m.setProps({ xs: [0, 1, 2, 3] })
    expect(items()).toEqual(['0', '1', '2', '3'])
    await m.setProps({ xs: [0, 2, 3] })
    expect(items()).toEqual(['0', '2', '3'])
  })

  it('keeps a consumer list in order when an item is inserted in the middle of emptyState', async () => {
    const m = await mount(
      `<mol-chatbot-tester-messages [messages]="p['messages']">@for (x of p['xs']; track x) {<b slot="emptyState">{{ x }}</b>}</mol-chatbot-tester-messages>`,
      { messages: [], xs: [1, 3] },
    )
    mounted.push(m)
    const items = (): string[] =>
      Array.from(m.host.querySelectorAll('b')).map((el) => el.textContent ?? '')
    expect(items()).toEqual(['1', '3'])
    await m.setProps({ xs: [0, 1, 2, 3] })
    expect(items()).toEqual(['0', '1', '2', '3'])
    await m.setProps({ xs: [0, 2, 3] })
    expect(items()).toEqual(['0', '2', '3'])
  })

  it('shows and removes the error wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await mount(
      `<div mol-chatbot-tester [messages]="p['messages']" [bots]="p['bots']">@if (p['on']) {<b slot="error" data-error>boom</b>}</div>`,
      { messages: [], bots: [], on: false },
    )
    mounted.push(m)
    // React: `{error && <p role="alert">…</p>}` — no paragraph for an empty slot.
    expect(m.host.querySelector('[role="alert"]')).toBeNull()
    await m.setProps({ on: true })
    expect(m.host.querySelector('[role="alert"]')!.querySelector('[data-error]')).not.toBeNull()
    expect(m.host.querySelector('[role="alert"]')!.textContent).toBe('boom')
    await m.setProps({ on: false })
    expect(m.host.querySelector('[role="alert"]')).toBeNull()
  })

  it('shows and removes the empty-state wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await mount(
      `<mol-chatbot-tester-messages [messages]="p['messages']">@if (p['on']) {<b slot="emptyState" data-empty>No messages</b>}</mol-chatbot-tester-messages>`,
      { messages: [], on: false },
    )
    mounted.push(m)
    // React: the empty wrapper replaces the transcript pane while it renders.
    expect(m.host.querySelector('[data-empty]')).toBeNull()
    await m.setProps({ on: true })
    expect(m.host.querySelector('[data-empty]')!.textContent).toBe('No messages')
    await m.setProps({ on: false })
    expect(m.host.querySelector('[data-empty]')).toBeNull()
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const messages = await mount(
      `<i>a</i><mol-chatbot-tester-messages [messages]="p['messages']"><b slot="emptyState" data-empty>No messages</b></mol-chatbot-tester-messages><i>b</i>`,
      { messages: [] },
    )
    mounted.push(messages)
    const tags = (): string[] =>
      Array.from(messages.host.children).map((child) => child.tagName.toLowerCase())
    // React's root is one `<div>`: the empty-state wrapper first.
    expect(tags()).toEqual(['i', 'div', 'i'])
    expect(messages.host.querySelector('div > [data-empty]')).not.toBeNull()
    expect(messages.host.querySelector('div > span')).toBeNull()
    await messages.setProps({ messages: [{ id: '1', role: 'user', content: 'hi' }] })
    // Then the bare transcript pane.
    expect(tags()).toEqual(['i', 'div', 'i'])

    const tester = await mount(
      `<i>a</i><div mol-chatbot-tester [messages]="p['messages']" [bots]="p['bots']" [error]="p['error']"></div><i>b</i>`,
      {
        messages: [],
        bots: [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
        ],
        error: 'boom',
      },
    )
    mounted.push(tester)
    // React's root IS this `<div>`; the label text and the error node render bare.
    expect(Array.from(tester.host.children).map((c) => c.tagName.toLowerCase())).toEqual([
      'i',
      'div',
      'i',
    ])
    const label = tester.host.querySelector('label')!
    expect(label.querySelector('span')).toBeNull()
    expect(label.textContent?.trim()).toBe('Test bot')
    const alert = tester.host.querySelector('[role="alert"]')!
    expect(alert.querySelector('span')).toBeNull()
    expect(alert.textContent?.trim()).toBe('boom')
  })
})
