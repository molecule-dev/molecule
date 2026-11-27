/**
 * Shared mounting harness for the ChatPanel ports' tests.
 *
 * The Vue panel reads its services (chat, HTTP, i18n, theme) from the
 * `moleculePlugin` injection the way the framework bindings do, so every test
 * mounts it through `createApp` + the plugin rather than handing components
 * providers as React does. This helper keeps that wiring, the panel's reactive
 * props and the browser stubs in ONE place so each test file states only what
 * it is about.
 *
 * @module
 */

import { createApp, defineComponent, h, nextTick, shallowReactive, type VNodeChild } from 'vue'

import type { ChatConfig, ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
import type { HttpClient, HttpResponse } from '@molecule/app-http'
import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { moleculePlugin } from '@molecule/app-vue'
import { createChatPlugin } from '@molecule/app-vue/chat'

import { ChatPanel, type ChatPanelProps } from '../components/ChatPanel.js'
import { buildThemeProvider } from './theme-test-provider.js'

/** A full {@link HttpResponse} for a stub to resolve with. */
export function responseOf(data: unknown): HttpResponse<never> {
  return {
    data: data as never,
    status: 200,
    statusText: '200',
    headers: {},
    config: { method: 'GET', url: '' },
  }
}

/** An HTTP client whose every request rejects; mounted callers catch their own. */
export function buildRejectingHttpClient(): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get: reject,
    post: reject,
    put: reject,
    patch: reject,
    delete: reject,
    addRequestInterceptor: () => () => {},
    addResponseInterceptor: () => () => {},
    addErrorInterceptor: () => () => {},
    setAuthToken: () => {},
    getAuthToken: () => null,
    onAuthError: () => () => {},
  }
}

/** A working in-memory Storage (Node's experimental web-storage shadows jsdom's). */
export function makeStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length(): number {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => void store.delete(key),
    setItem: (key: string, value: string) => void store.set(key, String(value)),
  }
}

/** A provider whose `loadHistory` replays a fixed transcript. */
export function buildChatProvider(history: ChatMessage[]): ChatProvider {
  return {
    name: 'stub',
    sendMessage: async (): Promise<void> => {},
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config: ChatConfig): Promise<ChatMessage[]> => history,
  }
}

/** What {@link mountPanel} hands back: the host, the live props and teardown. */
export interface PanelMount {
  /** The element the app mounted into. */
  container: HTMLElement
  /** The panel's reactive props — mutate to re-render with new ones. */
  props: ChatPanelProps
  /** Unmounts the app and clears the document. */
  unmount: () => void
}

/** Options for {@link mountPanel}. */
export interface MountPanelOptions {
  /** The HTTP client the panel (and its parts) use. */
  http: HttpClient
  /** The chat provider the session loads history from. */
  chat: ChatProvider
  /** The panel's own props (`projectId` may be given here or separately). */
  props?: Partial<ChatPanelProps>
  /** The i18n provider, when a test needs a non-English locale. */
  i18n?: I18nProvider
  /** The project the conversation belongs to. */
  projectId?: string
}

/**
 * Mounts the real `ChatPanel` with the injection plugin its services need.
 *
 * @param options - See {@link MountPanelOptions}.
 * @returns The mount, its live props and the teardown.
 */
export function mountPanel(options: MountPanelOptions): PanelMount {
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const props = shallowReactive<ChatPanelProps>({
    projectId: options.projectId ?? 'proj-test',
    ...options.props,
  })
  const app = createApp(
    defineComponent({
      name: 'ChatPanelHarness',
      render: (): VNodeChild => h(ChatPanel, { ...props }),
    }),
  )
  app.use(moleculePlugin, {
    i18n: options.i18n ?? createSimpleI18nProvider('en'),
    theme: buildThemeProvider(),
    http: options.http,
  })
  app.use(createChatPlugin(options.chat))
  app.mount(container)
  return {
    container,
    props,
    unmount: () => {
      app.unmount()
      document.body.innerHTML = ''
    },
  }
}

/**
 * Types a value into the composer and submits it with Enter.
 *
 * @param container - The mount container.
 * @param text - The exact text or command.
 */
export function submit(container: HTMLElement, text: string): void {
  const input = container.querySelector<HTMLTextAreaElement>('[data-mol-chat-input]')
  if (!input) throw new Error('composer input not found')
  input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
}

/**
 * Lets Vue flush the render a DOM event or prop change queued.
 *
 * @returns A promise resolved after the flush.
 */
export function flush(): Promise<void> {
  return nextTick()
}
