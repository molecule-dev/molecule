/**
 * `@molecule/app-embeddable-chat-widget` cases: the floating launcher, the
 * expanded panel (header + transcript + composer with streaming), and the
 * widget that pairs them, plus the framework-neutral stream/send helpers and
 * the provider-optional translation hook.
 *
 * The panel streams through `window.fetch` (the widget never reads the app's
 * HTTP service), so its streaming cases seed `context.window.fetch`: a
 * deferred answer shows the in-flight state (user + empty assistant bubble,
 * typing indicator, disabled send) before a `fetch` step delivers the reply;
 * a `500` status surfaces the error paragraph. The plain-value checks call
 * `readChatStream`/`sendChatRequest` with a live `ReadableStream`/fetch stub —
 * both return a Promise, which records as `{}` on every framework.
 *
 * @module
 */

import type { EmbeddableChatStreamEvent } from '@molecule/app-embeddable-chat-widget'

import type { FeatureCases } from '../spec.js'

/** The widget config every case starts from. */
const baseConfig = { apiBaseUrl: 'https://api.example.com', brandName: 'Acme' }

/** The widget config with a trailing slash on the base URL (the send strips it). */
const slashedConfig = { apiBaseUrl: 'https://api.example.com/', brandName: 'Acme' }

/** The widget config with both theme colours overridden. */
const themedConfig = {
  ...baseConfig,
  theme: { primaryColor: '#7c3aed', primaryForegroundColor: '#fde68a' },
}

/** The widget config overriding only the primary colour (foreground falls back). */
const primaryOnlyConfig = { ...baseConfig, theme: { primaryColor: '#7c3aed' } }

/** A fake fetch stub the value checks can pass as `config.fetchImpl`. */
const streamingFetch = (): typeof fetch =>
  (async () =>
    new Response(sseBody(['Hello from the stream']), {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    })) as typeof fetch

/** An SSE `ReadableStream` carrying one content chunk per string, then `done`. */
const sseBody = (chunks: string[]): ReadableStream<Uint8Array> => {
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks)
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'content', delta: chunk })}\n\n`),
        )
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
      controller.close()
    },
  })
}

/** `@molecule/app-embeddable-chat-widget`. */
export const embeddableChatWidgetFeature: FeatureCases = {
  package: '@molecule/app-embeddable-chat-widget',
  families: [
    {
      component: 'EmbeddableChatWidget',
      cases: [
        { name: 'collapsed by default', props: { config: baseConfig } },
        {
          name: 'defaultOpen shows the panel',
          props: { config: baseConfig, defaultOpen: true },
        },
        {
          name: 'the launcher opens the panel and close collapses it',
          props: { config: baseConfig },
          interactions: [
            { type: 'click', selector: '[data-mol-id="embeddable-chat-launcher"]' },
            { type: 'click', selector: '[data-mol-id="embeddable-chat-close"]' },
          ],
        },
        {
          name: 'bottom-left position moves both halves',
          props: { config: { ...baseConfig, position: 'bottom-left' } },
          interactions: [{ type: 'click', selector: '[data-mol-id="embeddable-chat-launcher"]' }],
        },
        {
          name: 'theme passes through to both halves',
          props: { config: themedConfig },
          interactions: [{ type: 'click', selector: '[data-mol-id="embeddable-chat-launcher"]' }],
        },
      ],
    },
    {
      component: 'EmbeddableChatLauncher',
      cases: [
        {
          name: 'visible at bottom-right with defaults',
          props: { visible: true, position: 'bottom-right' },
          callbacks: ['onOpen'],
        },
        { name: 'hidden renders nothing', props: { visible: false, position: 'bottom-right' } },
        { name: 'bottom-left position', props: { visible: true, position: 'bottom-left' } },
        {
          name: 'theme colours',
          props: {
            visible: true,
            position: 'bottom-right',
            theme: { primaryColor: '#7c3aed', primaryForegroundColor: '#fde68a' },
          },
        },
        {
          name: 'theme with only the primary colour',
          props: { visible: true, position: 'bottom-right', theme: { primaryColor: '#7c3aed' } },
        },
        {
          name: 'with a className',
          props: { visible: true, position: 'bottom-right', className: 'parity-token' },
        },
        {
          name: 'a click reports onOpen',
          props: { visible: true, position: 'bottom-right' },
          callbacks: ['onOpen'],
          interactions: [{ type: 'click', selector: '[data-mol-id="embeddable-chat-launcher"]' }],
        },
        {
          name: 'visibility turns off on a props change',
          props: { visible: true, position: 'bottom-right' },
          interactions: [{ type: 'props', props: { visible: false } }],
        },
      ],
    },
    {
      component: 'EmbeddableChatPanel',
      cases: [
        {
          name: 'visible with the default config',
          props: { visible: true, position: 'bottom-right', config: baseConfig },
          callbacks: ['onClose'],
        },
        {
          name: 'hidden renders nothing',
          props: { visible: false, position: 'bottom-right', config: baseConfig },
        },
        {
          name: 'with a brand logo',
          props: {
            visible: true,
            position: 'bottom-right',
            config: { ...baseConfig, brandLogo: 'https://cdn.example.com/logo.png' },
          },
        },
        {
          name: 'theme colours the header and send button',
          props: { visible: true, position: 'bottom-right', config: themedConfig },
        },
        {
          name: 'theme with only the primary colour',
          props: { visible: true, position: 'bottom-right', config: primaryOnlyConfig },
        },
        {
          name: 'bottom-left position',
          props: { visible: true, position: 'bottom-left', config: baseConfig },
        },
        {
          name: 'a click on close reports onClose',
          props: { visible: true, position: 'bottom-right', config: baseConfig },
          callbacks: ['onClose'],
          interactions: [{ type: 'click', selector: '[data-mol-id="embeddable-chat-close"]' }],
        },
        {
          name: 'typing text enables send and clears on submit',
          props: { visible: true, position: 'bottom-right', config: baseConfig },
          // The send starts a request the case never answers, so the
          // streaming state it reaches is deterministic: no real network.
          context: { window: { fetch: { status: 200, defer: true, body: { reply: 'Pending' } } } },
          interactions: [
            {
              type: 'input',
              selector: '[data-mol-id="embeddable-chat-input"]',
              value: 'Hello there',
            },
            { type: 'click', selector: '[data-mol-id="embeddable-chat-send"]' },
          ],
        },
        {
          name: 'an empty input cannot send',
          props: { visible: true, position: 'bottom-right', config: baseConfig },
          interactions: [{ type: 'click', selector: '[data-mol-id="embeddable-chat-send"]' }],
        },
        {
          name: 'a form submit streams the reply',
          props: { visible: true, position: 'bottom-right', config: slashedConfig },
          context: {
            window: {
              fetch: { status: 200, defer: true, body: { reply: 'Hello from the stream' } },
            },
          },
          interactions: [
            { type: 'input', selector: '[data-mol-id="embeddable-chat-input"]', value: 'Hi' },
            { type: 'submit', selector: '[data-mol-id="embeddable-chat-panel"] form' },
            { type: 'fetch' },
          ],
        },
        {
          name: 'enter submits but shift+enter does not',
          props: { visible: true, position: 'bottom-right', config: baseConfig },
          context: { window: { fetch: { status: 200, defer: true, body: { reply: 'Streamed' } } } },
          interactions: [
            { type: 'input', selector: '[data-mol-id="embeddable-chat-input"]', value: 'Hi' },
            {
              type: 'keydown',
              selector: '[data-mol-id="embeddable-chat-input"]',
              key: 'Enter',
              shiftKey: true,
            },
            { type: 'keydown', selector: '[data-mol-id="embeddable-chat-input"]', key: 'Enter' },
            { type: 'fetch' },
          ],
        },
        {
          name: 'a second send is ignored while streaming',
          props: { visible: true, position: 'bottom-right', config: baseConfig },
          context: {
            window: { fetch: { status: 200, defer: true, body: { reply: 'One reply' } } },
          },
          interactions: [
            { type: 'input', selector: '[data-mol-id="embeddable-chat-input"]', value: 'first' },
            { type: 'click', selector: '[data-mol-id="embeddable-chat-send"]' },
            { type: 'input', selector: '[data-mol-id="embeddable-chat-input"]', value: 'second' },
            { type: 'click', selector: '[data-mol-id="embeddable-chat-send"]' },
            { type: 'fetch' },
          ],
        },
        {
          name: 'a non-OK response surfaces an error',
          props: { visible: true, position: 'bottom-right', config: baseConfig },
          context: { window: { fetch: { status: 500, body: 'boom' } } },
          interactions: [
            { type: 'input', selector: '[data-mol-id="embeddable-chat-input"]', value: 'fail' },
            { type: 'click', selector: '[data-mol-id="embeddable-chat-send"]' },
          ],
        },
      ],
    },
  ],
  hooks: [
    {
      hook: 'useSafeTranslation',
      cases: [
        {
          name: 'translates through the host provider with the English default',
          args: [],
          steps: [
            {
              type: 'call',
              method: 't',
              args: ['embeddableChatWidget.launcher.openLabel', {}, { defaultValue: 'Open chat' }],
            },
            {
              type: 'call',
              method: 't',
              args: [
                'embeddableChatWidget.panel.headerLabel',
                { brandName: 'Acme' },
                { defaultValue: 'Chat with {{brandName}}' },
              ],
            },
            {
              type: 'call',
              method: 't',
              args: [
                'embeddableChatWidget.composer.placeholder',
                {},
                { defaultValue: 'Type your message…' },
              ],
            },
          ],
        },
        {
          name: 'follows a locale switch',
          args: [],
          context: {
            translations: {
              fr: { embeddableChatWidget: { launcher: { openLabel: 'Ouvrir la discussion' } } },
            },
          },
          steps: [
            { type: 'locale', locale: 'fr' },
            {
              type: 'call',
              method: 't',
              args: ['embeddableChatWidget.launcher.openLabel', {}, { defaultValue: 'Open chat' }],
            },
          ],
        },
      ],
    },
  ],
  values: [
    {
      export: 'readChatStream',
      calls: [
        // The kit records each call's (Promise) return, so both calls record `{}`:
        // the point is the same call shape on every framework, not the stream.
        [
          sseBody(['Hi', ' there']),
          (event: EmbeddableChatStreamEvent) => {
            void event
          },
        ],
      ],
    },
    {
      export: 'sendChatRequest',
      calls: [
        [
          {
            message: 'Hello',
            config: {
              apiBaseUrl: 'https://api.example.com',
              brandName: 'Acme',
              fetchImpl: streamingFetch(),
            },
            onDelta: (delta: string) => {
              void delta
            },
          },
        ],
      ],
    },
  ],
  frameworkShaped: {
    mountEmbeddableChatWidget:
      'returns the framework mount handle (React `Root`, Vue `App`, Solid disposer, Svelte exports, Angular `ApplicationRef`); the DOM it renders is what the widget cases compare',
  },
}
