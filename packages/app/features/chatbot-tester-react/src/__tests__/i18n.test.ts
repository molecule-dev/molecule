/**
 * The sandbox's own text goes through i18n: the composer placeholder, the
 * send label and the bot picker's label each render the bonded provider's
 * value for their `chatbotTester.*` key by default, and an explicit prop
 * still overrides the translation.
 *
 * @module
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

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

const { ChatbotTester, ChatbotTesterInput } = await import('../index.js')

/** The marker translations the bonded provider carries for the three keys. */
const MARKERS = {
  'chatbotTester.placeholder.message': 'Nachricht eingeben',
  'chatbotTester.label.send': 'Abschicken',
  'chatbotTester.label.testBot': 'Bot auswählen',
} as const

afterEach(() => {
  // Reset the global i18n singleton to a clean English provider so a bonded
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('ChatbotTesterInput text', () => {
  it('takes the composer placeholder through i18n by default', () => {
    setProvider(
      createSimpleI18nProvider('en', [
        { code: 'en', name: 'English', translations: { ...MARKERS } },
      ]),
    )
    const html = renderToStaticMarkup(
      createElement(ChatbotTesterInput, { value: '', onChange: () => {}, onSend: () => {} }),
    )
    expect(html).toContain(`placeholder="${MARKERS['chatbotTester.placeholder.message']}"`)
    expect(html).not.toContain('Type a message…')
  })

  it('takes the send label through i18n by default', () => {
    setProvider(
      createSimpleI18nProvider('en', [
        { code: 'en', name: 'English', translations: { ...MARKERS } },
      ]),
    )
    const html = renderToStaticMarkup(
      createElement(ChatbotTesterInput, { value: '', onChange: () => {}, onSend: () => {} }),
    )
    expect(html).toContain(`>${MARKERS['chatbotTester.label.send']}</button>`)
    expect(html).not.toContain('>Send</button>')
  })

  it('keeps the caller’s placeholder and send label', () => {
    setProvider(
      createSimpleI18nProvider('en', [
        { code: 'en', name: 'English', translations: { ...MARKERS } },
      ]),
    )
    const html = renderToStaticMarkup(
      createElement(ChatbotTesterInput, {
        value: '',
        onChange: () => {},
        onSend: () => {},
        placeholder: 'Ask away',
        sendLabel: 'Go',
      }),
    )
    expect(html).toContain('placeholder="Ask away"')
    expect(html).toContain('>Go</button>')
    expect(html).not.toContain('Nachricht eingeben')
    expect(html).not.toContain('Abschicken')
  })
})

describe('ChatbotTester text', () => {
  it('takes the bot picker label through i18n by default', () => {
    setProvider(
      createSimpleI18nProvider('en', [
        { code: 'en', name: 'English', translations: { ...MARKERS } },
      ]),
    )
    const html = renderToStaticMarkup(
      createElement(ChatbotTester, {
        messages: [],
        onSend: () => {},
        bots: [{ id: 'b1' }, { id: 'b2' }],
      }),
    )
    expect(html).toContain(`>${MARKERS['chatbotTester.label.testBot']}</label>`)
    expect(html).not.toContain('Test bot')
  })

  it('keeps the caller’s bot picker label', () => {
    setProvider(
      createSimpleI18nProvider('en', [
        { code: 'en', name: 'English', translations: { ...MARKERS } },
      ]),
    )
    const html = renderToStaticMarkup(
      createElement(ChatbotTester, {
        messages: [],
        onSend: () => {},
        bots: [{ id: 'b1' }, { id: 'b2' }],
        botPickerLabel: 'Pick a bot',
      }),
    )
    expect(html).toContain('>Pick a bot</label>')
    expect(html).not.toContain('Bot auswählen')
  })
})
