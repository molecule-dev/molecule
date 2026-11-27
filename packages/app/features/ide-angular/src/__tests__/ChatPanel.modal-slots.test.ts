// @vitest-environment jsdom
/**
 * Unit P2 of the ChatPanel port: the report and share modal slots.
 *
 * Port of the two React render sections “── Bug-report modal” and
 * “── Share-link modal”: each renders the real `ReportModal` / `ShareModal`
 * only while the `chat:popups` slice holds a seed, and the slot's close/submit
 * handlers ARE the `chat:render-handlers` slice's — exactly the `onClose` /
 * `onSubmitted` props React passes at ChatPanel.tsx 8817–8862. The sections are
 * mounted between TWO elements: a marker before the slot that renders nothing,
 * so the fragment root lands in React's position.
 *
 * @module
 */

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import {
  ChangeDetectionStrategy,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement, provideHttp, provideI18n, provideTheme } from '@molecule/app-angular'
import { resetChatStoresForTests } from '@molecule/app-angular/chat'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { type ChatEnvValues, ChatInnerState } from '../components/chat-panel/chat-inner-state.js'
import { ChatPopups } from '../components/chat-panel/chat-popups.slice.js'
import { ChatRenderHandlers } from '../components/chat-panel/chat-render-handlers.slice.js'
import { ChatReportModal } from '../components/chat-panel/chat-report-modal.component.js'
import { ChatShareModal } from '../components/chat-panel/chat-share-modal.component.js'
import { ChatSystemCards } from '../components/chat-panel/chat-system-cards.slice.js'
import { buildRejectingHttpClient } from './chat-panel-harness.js'
import { buildThemeProvider } from './theme-test-provider.js'

/** The host that renders both modal slots, in React's order. */
const SlotsHost = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-chat-slots-host',
  standalone: true,
  imports: [ChatReportModal, ChatShareModal],
  template: `<div mol-chat-report-modal></div><div mol-chat-share-modal></div>`,
})(class ChatSlotsHost {})

/** A mounted slots host: its app, shared state, slices and tick. */
interface SlotsMount {
  /** The shared state the sections read. */
  state: ChatInnerState
  /** The `chat:popups` slice the sections read. */
  popups: ChatPopups
  /** The `chat:render-handlers` slice the slots close through. */
  handlers: ChatRenderHandlers
  /** Runs one change-detection pass. */
  tick: () => void
  /** Tears the app down. */
  unmount: () => void
}

/** The mount alive right now, if any. */
let mounted: SlotsMount | null = null

/**
 * Builds the env object `ChatInner` would assign before its sections render.
 * @returns The resolved env values.
 */
function buildEnv(): ChatEnvValues {
  const i18n = createSimpleI18nProvider('en')
  setProvider(i18n)
  return {
    t: i18n.t,
    locale: signal('en'),
    cm: getClassMap(),
    http: buildRejectingHttpClient(),
    themeMode: signal<'light' | 'dark'>('light'),
    isLight: signal(true),
    isNarrow: signal(false),
    isCoarse: signal(false),
    popupMaxHeight: signal('70vh'),
    hasConversation: signal(false),
    conversationId: signal(null),
    conversationIdRef: { current: null },
    transcriptOnly: signal(false),
    shareAllowed: signal(true),
  }
}

/**
 * Mounts the two slot sections with the providers they read.
 * @returns The mount.
 */
async function mountSlots(): Promise<SlotsMount> {
  const i18n = createSimpleI18nProvider('en')
  setProvider(i18n)
  const appRef = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideDomPlacement(),
      provideI18n(i18n),
      provideTheme(buildThemeProvider()),
      provideHttp(buildRejectingHttpClient()),
      ChatInnerState,
      ChatPopups,
      ChatRenderHandlers,
      ChatSystemCards,
    ],
  })
  const state = appRef.injector.get(ChatInnerState)
  state.env = buildEnv()
  state.props.set({
    projectId: 'p1',
    endpoint: '/projects/p1/chat',
    productName: 'the IDE',
    version: '9.9.9',
  })
  const popups = appRef.injector.get(ChatPopups)
  const handlers = appRef.injector.get(ChatRenderHandlers)
  const ref = createComponent(SlotsHost, { environmentInjector: appRef.injector })
  document.body.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    state,
    popups,
    handlers,
    tick: () => {
      ref.changeDetectorRef.detectChanges()
    },
    unmount: () => {
      appRef.destroy()
      document.body.innerHTML = ''
    },
  }
}

/**
 * Queries one element, failing loudly when the slot did not render it.
 * @param selector - The CSS selector.
 * @returns The element.
 */
function required(selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector)
  if (!element) throw new Error(`expected ${selector} to render`)
  return element
}

beforeEach(() => {
  setClassMap(classMap)
  resetChatStoresForTests()
})

afterEach(() => {
  mounted?.unmount()
  mounted = null
  document.body.innerHTML = ''
})

describe('ChatPanel modal slots (P2)', () => {
  it('renders the report modal from the popups seed and closes through the render-handlers slice', async () => {
    mounted = await mountSlots()
    const close = vi.spyOn(mounted.handlers, 'closeReportModal')
    const submit = vi.spyOn(mounted.handlers, 'handleReportSubmitted')
    expect(close).not.toHaveBeenCalled()
    expect(submit).not.toHaveBeenCalled()
    expect(document.querySelector('[data-mol-id="report-modal"]')).toBeNull()

    mounted.popups.setReportModal({ title: 'Seeded bug' })
    mounted.tick()

    const title = required('[data-mol-id="report-title"]') as HTMLInputElement
    expect(title.value).toBe('Seeded bug')
    expect(document.body.textContent).toContain('the IDE')

    required('[data-mol-id="report-cancel"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    )
    mounted.tick()

    // React's `onClose={closeReportModal}`: the slot closes through the slice.
    expect(close).toHaveBeenCalledTimes(1)
    expect(submit).not.toHaveBeenCalled()
  })

  it('renders the share modal from the popups seed and closes through the render-handlers slice', async () => {
    mounted = await mountSlots()
    const close = vi.spyOn(mounted.handlers, 'closeShareModal')
    expect(close).not.toHaveBeenCalled()
    mounted.state.props.set({
      projectId: 'p1',
      endpoint: '/projects/p1/chat',
      productName: 'the IDE',
      version: '9.9.9',
      shareLinksAllowed: false,
    })
    mounted.tick()
    expect(document.querySelector('[data-mol-id="share-modal"]')).toBeNull()

    mounted.popups.setShareModal({ role: 'viewer' })
    mounted.tick()

    required('[data-mol-id="share-modal"]')
    expect(document.body.textContent).toContain('Share project')

    required('[data-mol-id="share-close"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    )
    mounted.tick()

    // React's `onClose={closeShareModal}`: the slot closes through the slice.
    expect(close).toHaveBeenCalledTimes(1)
  })
})
