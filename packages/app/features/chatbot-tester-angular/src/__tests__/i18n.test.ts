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

vi.mock('@molecule/app-ui', () => ({
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

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { ChatbotTester, ChatbotTesterInput } from '../index.js'

/** The marker translations the bonded provider carries for the three keys. */
const MARKERS = {
  'chatbotTester.placeholder.message': 'Nachricht eingeben',
  'chatbotTester.label.send': 'Abschicken',
  'chatbotTester.label.testBot': 'Bot auswählen',
} as const

/** A mounted spec host: its DOM, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
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
    imports: [ChatbotTester, ChatbotTesterInput],
    changeDetection: ChangeDetectionStrategy.Default,
    template,
  })(
    class DefaultHost {
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<unknown> = createComponent(SpecHost, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  appRef.tick()
  return {
    host,
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
