// @vitest-environment jsdom
/**
 * The panel overlay slice dismisses the composer popups, seeds its search query
 * and gives the kit modal the current view. The modal handles Escape.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { resetChatStoresForTests } from '@molecule/app-svelte/chat'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { createChatComposer } from '../components/chat-panel/chat-composer.svelte.js'
import {
  type ChatOverlaySlice,
  createChatOverlay,
} from '../components/chat-panel/chat-overlay.svelte.js'
import { createChatSounds } from '../components/chat-panel/chat-sounds.svelte.js'
import type { ChatContext } from '../components/chat-panel/context.svelte.js'
import { buildChatProvider, buildRejectingHttpClient, makeStorage } from './chat-panel-harness.js'
import SliceHarness from './ChatSliceHarness.svelte'
import { buildThemeProvider } from './theme-test-provider.js'

/** The harness mounts alive right now. */
const harnesses: { unmount: () => void }[] = []

/**
 * Mounts the overlay slice (with the composer and sounds slices it closes) over
 * the shared small context.
 *
 * @param keep - Receives the slice under test and the context it closes through.
 */
function mountOverlay(keep: (slice: ChatOverlaySlice, ctx: ChatContext) => void): void {
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const instance = mount(SliceHarness, {
    target: container,
    props: {
      http: buildRejectingHttpClient(),
      chat: buildChatProvider([]),
      theme: buildThemeProvider(),
      props: { projectId: 'p1', endpoint: '/projects/p1/chat' },
      overlayModal: true,
      build: (ctx: ChatContext) => {
        ctx.composer = createChatComposer(ctx)
        ctx.sounds = createChatSounds(ctx)
        ctx.overlay = createChatOverlay(ctx)
        keep(ctx.overlay, ctx)
      },
    },
  })
  flushSync()
  harnesses.push({
    unmount: () => {
      void unmount(instance)
      document.body.innerHTML = ''
    },
  })
}

/**
 * Dispatches a keydown from the currently focused control after rendering.
 *
 * @param key - The key.
 */
function press(key: string): void {
  flushSync()
  const target = document.activeElement ?? document.body
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  flushSync()
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  resetChatStoresForTests()
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: makeStorage(),
    configurable: true,
    writable: true,
  })
  Object.defineProperty(globalThis, 'localStorage', {
    value: makeStorage(),
    configurable: true,
    writable: true,
  })
})

afterEach(() => {
  for (const handle of harnesses.splice(0)) handle.unmount()
  setProvider(createSimpleI18nProvider())
})

describe('ChatPanel chat:overlay slice', () => {
  it('closes every sibling popup, seeds the query and opens the view', () => {
    let overlay!: ChatOverlaySlice
    let ctx!: ChatContext
    mountOverlay((slice, context) => {
      overlay = slice
      ctx = context
    })
    expect(overlay.panelOverlay).toBeNull()

    ctx.composer.setModelPicker({ selectedIdx: -1, text: '/model' })
    ctx.composer.setEffortPicker({ selectedIdx: -1, text: '/effort', mode: 'execute' })
    ctx.composer.setCommandMenu({ selectedIdx: -1, text: '/' })
    ctx.sounds.setSoundsPicker({ selectedIdx: 0 })

    overlay.openPanelOverlay('scripts', 'deploy')

    expect(overlay.panelOverlay).toBe('scripts')
    expect(overlay.panelOverlayQuery).toBe('deploy')
    expect(ctx.composer.modelPicker).toBeNull()
    expect(ctx.composer.effortPicker).toBeNull()
    expect(ctx.composer.commandMenu).toBeNull()
    expect(ctx.sounds.soundsPicker).toBeNull()
  })

  it('opens with an empty query when none is given', () => {
    let overlay!: ChatOverlaySlice
    mountOverlay((slice) => {
      overlay = slice
    })
    overlay.openPanelOverlay('settings')
    expect(overlay.panelOverlay).toBe('settings')
    expect(overlay.panelOverlayQuery).toBe('')
  })

  it('Escape closes an open overlay', () => {
    let overlay!: ChatOverlaySlice
    mountOverlay((slice) => {
      overlay = slice
    })
    overlay.openPanelOverlay('skills')
    expect(overlay.panelOverlay).toBe('skills')
    flushSync()
    expect(document.querySelector('[role="dialog"]')?.getAttribute('aria-modal')).toBe('true')

    press('Escape')
    expect(overlay.panelOverlay).toBeNull()
  })

  it('attaches the Escape listener only while an overlay is open', () => {
    let overlay!: ChatOverlaySlice
    mountOverlay((slice) => {
      overlay = slice
    })
    press('Escape')
    expect(overlay.panelOverlay).toBeNull()
    expect(document.querySelector('[role="dialog"]')).toBeNull()

    overlay.openPanelOverlay('tests')
    flushSync()
    expect(document.querySelector('[role="dialog"]')?.getAttribute('aria-modal')).toBe('true')
    overlay.setPanelOverlay(null)
    press('Escape')
    expect(overlay.panelOverlay).toBeNull()
    expect(document.querySelector('[role="dialog"]')).toBeNull()

    overlay.openPanelOverlay('tests')
    press('Escape')
    expect(overlay.panelOverlay).toBeNull()
  })
})
