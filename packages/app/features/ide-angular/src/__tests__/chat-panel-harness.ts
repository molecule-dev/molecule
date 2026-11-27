/**
 * Shared mounting harness for the ChatPanel ports' tests.
 *
 * The Angular panel reads its services (chat, HTTP, i18n, theme) from the
 * providers `provideMolecule` registers, the way the framework bindings do, so
 * every test mounts it through `createApplication` + a JIT host template rather
 * than handing the component providers as React does. This helper keeps that
 * wiring, the panel's inputs and the browser stubs in ONE place so each test
 * file states only what it is about.
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

import type { ChatConfig, ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
import { provideDomPlacement, provideHttp, provideI18n, provideTheme } from '@molecule/app-angular'
import { provideChat } from '@molecule/app-angular/chat'
import type { HttpClient, HttpResponse } from '@molecule/app-http'
import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { ChatPanel } from '../components/chat-panel.component.js'
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

/**
 * The timeout every panel-mount test declares.
 *
 * {@link mountPanel} builds a whole Angular application per mount (a JIT host
 * template plus the `provide*` services), which costs far more than React's
 * `render`; the package's 10 s default aborted a healthy mount while the
 * machine was loaded (the abort timer itself fired 6 s late). The timeout only
 * bounds how long a test may take — its assertions are unchanged.
 */
export const PANEL_TEST_TIMEOUT_MS = 60_000

/** The panel props the host template binds (React's prop names). */
export type PanelProps = Record<string, unknown>

/** What {@link mountPanel} hands back: the host, the live props and teardown. */
export interface PanelMount {
  /** The element the app mounted into. */
  container: HTMLElement
  /** The panel's live props — mutate, then `tick()` to re-render with them. */
  props: PanelProps
  /** Runs one change-detection pass. */
  tick: () => void
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
  props?: Partial<PanelProps>
  /** The i18n provider, when a test needs a non-English locale. */
  i18n?: I18nProvider
  /** The project the conversation belongs to. */
  projectId?: string
}

/**
 * The JIT host: its template binds every input the panel takes, from one live
 * props object, so mutating a prop and ticking is this port's `rerender`.
 */
const ChatPanelHost = Component({
  selector: 'mol-chat-panel-host',
  standalone: true,
  imports: [ChatPanel],
  changeDetection: ChangeDetectionStrategy.Eager,
  // prettier-ignore
  template: `<div mol-chat-panel
    [projectId]="p['projectId']"
    [endpoint]="p['endpoint']"
    [conversationId]="p['conversationId']"
    [renderConversationHeader]="p['renderConversationHeader']"
    [hideConversationMenu]="p['hideConversationMenu']"
    [agentName]="p['agentName']"
    [userAvatar]="p['userAvatar']"
    [initialInputValue]="p['initialInputValue']"
    [initialMessage]="p['initialMessage']"
    [pendingMessageKey]="p['pendingMessageKey']"
    [pendingMessage]="p['pendingMessage']"
    [pendingMessageSuppressUser]="p['pendingMessageSuppressUser']"
    [pendingMessageUserInitiated]="p['pendingMessageUserInitiated']"
    [buildUpgradeCta]="p['buildUpgradeCta']"
    [isAnonymous]="p['isAnonymous']"
    [isPro]="p['isPro']"
    [gitStatusTick]="p['gitStatusTick']"
    [canEdit]="p['canEdit']"
    [awaitingSandboxBoot]="p['awaitingSandboxBoot']"
    [discovery]="p['discovery']"
    [modelSelectionSignal]="p['modelSelectionSignal']"
    [onManageCustomModels]="p['onManageCustomModels']"
    [onRegisterPushHandler]="p['onRegisterPushHandler']"
    [onRegisterHistoryReconcile]="p['onRegisterHistoryReconcile']"
    [onCommit]="p['onCommit']"
    [onFileDiff]="p['onFileDiff']"
    [listTests]="p['listTests']"
    [runTests]="p['runTests']"
    [watchTestRuns]="p['watchTestRuns']"
    [nativeTests]="p['nativeTests']"
    [canRunTests]="p['canRunTests']"
    [testsAvailable]="p['testsAvailable']"
    [canSendTeamMessages]="p['canSendTeamMessages']"
    [extraCommands]="p['extraCommands']"
    [currentUserId]="p['currentUserId']"
    [onProfileClick]="p['onProfileClick']"></div>`,
})(
  class ChatPanelHostComponent {
    /** The props the current render binds. */
    p: PanelProps = {}
  },
)

/**
 * Mounts the real `ChatPanel` with the providers its services need.
 *
 * @param options - See {@link MountPanelOptions}.
 * @returns The mount, its live props and the teardown.
 */
export async function mountPanel(options: MountPanelOptions): Promise<PanelMount> {
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const i18n = options.i18n ?? createSimpleI18nProvider('en')
  setProvider(i18n)
  const props: PanelProps = {
    projectId: options.projectId ?? 'proj-test',
    ...options.props,
  }
  const appRef: ApplicationRef = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideDomPlacement(),
      provideI18n(i18n),
      provideTheme(buildThemeProvider()),
      provideHttp(options.http),
      provideChat(options.chat),
    ],
  })
  const ref: ComponentRef<InstanceType<typeof ChatPanelHost>> = createComponent(ChatPanelHost, {
    environmentInjector: appRef.injector,
  })
  ref.instance.p = props
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    container,
    props,
    tick: () => ref.changeDetectorRef.detectChanges(),
    unmount: () => {
      appRef.destroy()
      container.remove()
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
 * Lets the panel settle: pending promises resolve, the zoneless scheduler's
 * change detection runs, and the host is ticked once more — this port's
 * `act()` for the assertions React makes synchronously after an event.
 *
 * @param mount - The live mount, when one exists.
 */
export async function settle(mount: PanelMount | null): Promise<void> {
  for (let index = 0; index < 4; index++) await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
  mount?.tick()
  for (let index = 0; index < 2; index++) await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
  mount?.tick()
}
