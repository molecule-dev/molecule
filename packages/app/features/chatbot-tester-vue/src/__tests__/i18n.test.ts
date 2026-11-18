// @vitest-environment jsdom
/**
 * The sandbox's own text goes through i18n — the Vue port of
 * `@molecule/app-chatbot-tester-react/src/__tests__/i18n.test.ts`: the same
 * test names and the same assertions. The composer placeholder, the send
 * label and the bot picker's label each render the bonded provider's value
 * for their `chatbotTester.*` key by default, and an explicit prop still
 * overrides the translation.
 *
 * @module
 */

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

import { createApp, defineComponent, h } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { ChatbotTester, ChatbotTesterInput } from '../index.js'

/** The marker translations the bonded provider carries for the three keys. */
const MARKERS = {
  'chatbotTester.placeholder.message': 'Nachricht eingeben',
  'chatbotTester.label.send': 'Abschicken',
  'chatbotTester.label.testBot': 'Bot auswählen',
} as const

afterEach(() => {
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a bonded
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/**
 * Renders a component and returns the markup it produced.
 *
 * @param component - The component under test.
 * @param props - Its props.
 * @returns The rendered markup.
 */
const render = (component: unknown, props: Record<string, unknown>): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(component as never, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

/** Bonds the provider with the marker translations. */
const bondMarkers = (): void => {
  setProvider(
    createSimpleI18nProvider('en', [{ code: 'en', name: 'English', translations: { ...MARKERS } }]),
  )
}

describe('ChatbotTesterInput text', () => {
  it('takes the composer placeholder through i18n by default', () => {
    bondMarkers()
    const markup = render(ChatbotTesterInput, { value: '' })
    expect(markup).toContain(`placeholder="${MARKERS['chatbotTester.placeholder.message']}"`)
    expect(markup).not.toContain('Type a message…')
  })

  it('takes the send label through i18n by default', () => {
    bondMarkers()
    const markup = render(ChatbotTesterInput, { value: '' })
    expect(markup).toContain(`>${MARKERS['chatbotTester.label.send']}</button>`)
    expect(markup).not.toContain('>Send</button>')
  })

  it('keeps the caller’s placeholder and send label', () => {
    bondMarkers()
    const markup = render(ChatbotTesterInput, {
      value: '',
      placeholder: 'Ask away',
      sendLabel: 'Go',
    })
    expect(markup).toContain('placeholder="Ask away"')
    expect(markup).toContain('>Go</button>')
    expect(markup).not.toContain('Nachricht eingeben')
    expect(markup).not.toContain('Abschicken')
  })
})

describe('ChatbotTester text', () => {
  it('takes the bot picker label through i18n by default', () => {
    bondMarkers()
    const markup = render(ChatbotTester, { messages: [], bots: [{ id: 'b1' }, { id: 'b2' }] })
    expect(markup).toContain(`>${MARKERS['chatbotTester.label.testBot']}</label>`)
    expect(markup).not.toContain('Test bot')
  })

  it('keeps the caller’s bot picker label', () => {
    bondMarkers()
    const markup = render(ChatbotTester, {
      messages: [],
      bots: [{ id: 'b1' }, { id: 'b2' }],
      botPickerLabel: 'Pick a bot',
    })
    expect(markup).toContain('>Pick a bot</label>')
    expect(markup).not.toContain('Bot auswählen')
  })
})
