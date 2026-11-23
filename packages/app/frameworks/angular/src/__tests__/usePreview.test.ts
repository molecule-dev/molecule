// @vitest-environment jsdom

/**
 * `usePreview` over a provider that models the two distinct URLs the function
 * cares about: `url` (load target) and `currentUrl` (the location the running
 * preview reports through `recordNavigation`).
 *
 * This is React's `usePreview.test.tsx` against the Angular function; each
 * title is React's. Only the framework-forced mechanics change: a mounted probe
 * component replaces a render, and the preview state is read through its signal.
 *
 * @module
 */

import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import type { DeviceFrame, PreviewProvider, PreviewState } from '@molecule/app-live-preview'

import { usePreview, type UsePreviewResult } from '../hooks/use-ide.js'
import { provideMolecule } from '../providers.js'

/**
 * Minimal in-memory PreviewProvider mock. Models the two distinct URLs the hook
 * cares about: `url` (load target) and `currentUrl` (the location reported by
 * the running preview via recordNavigation).
 *
 * @param initialUrl - The url the preview starts at.
 * @returns The provider.
 */
function createMockPreviewProvider(initialUrl = ''): PreviewProvider {
  let state: PreviewState = {
    url: initialUrl,
    currentUrl: initialUrl,
    isLoading: false,
    device: 'none',
    error: null,
    isConnected: false,
    canGoBack: false,
    canGoForward: false,
    loadNonce: 0,
  }
  const history: string[] = []
  let index = -1
  const listeners = new Set<(s: PreviewState) => void>()
  const notify = (): void => listeners.forEach((l) => l(state))
  const flags = (): { canGoBack: boolean; canGoForward: boolean } => ({
    canGoBack: index > 0,
    canGoForward: index < history.length - 1,
  })
  const push = (url: string): void => {
    history.length = index + 1
    if (history[index] === url) return
    history.push(url)
    index = history.length - 1
  }

  return {
    name: 'mock',
    setUrl: (url: string) => {
      push(url)
      state = {
        ...state,
        url,
        currentUrl: url,
        isLoading: true,
        error: null,
        loadNonce: state.loadNonce + 1,
        ...flags(),
      }
      notify()
    },
    getUrl: () => state.url,
    refresh: () => {
      state = { ...state, isLoading: true, loadNonce: state.loadNonce + 1 }
      notify()
    },
    setDevice: (device: DeviceFrame) => {
      state = { ...state, device }
      notify()
    },
    getState: () => state,
    navigateTo: (path: string) => {
      const url = `${state.url.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
      push(url)
      state = { ...state, url, currentUrl: url, isLoading: true, ...flags() }
      notify()
    },
    recordNavigation: (url: string) => {
      if (url === state.currentUrl) return
      push(url)
      state = { ...state, currentUrl: url, ...flags() }
      notify()
    },
    back: () => {
      if (index <= 0) return
      index--
      const url = history[index]
      state = { ...state, url, currentUrl: url, loadNonce: state.loadNonce + 1, ...flags() }
      notify()
    },
    forward: () => {
      if (index >= history.length - 1) return
      index++
      const url = history[index]
      state = { ...state, url, currentUrl: url, loadNonce: state.loadNonce + 1, ...flags() }
      notify()
    },
    canGoBack: () => index > 0,
    canGoForward: () => index < history.length - 1,
    subscribe: (cb: (s: PreviewState) => void) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    openExternal: () => {},
  }
}

/** The probe component that calls `usePreview` in an injection context. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-preview-probe',
  template: '',
})
class PreviewProbeComponent {
  readonly preview: UsePreviewResult = usePreview()
}

/**
 * Mounts the preview probe under the given provider.
 *
 * @param provider - The preview provider the module provides.
 * @returns The mounted fixture.
 */
function mount(provider: PreviewProvider): ComponentFixture<PreviewProbeComponent> {
  TestBed.configureTestingModule({
    imports: [PreviewProbeComponent as Type<PreviewProbeComponent>],
    providers: [provideZonelessChangeDetection(), provideMolecule({ preview: provider })],
  })
  const fixture = TestBed.createComponent(PreviewProbeComponent)
  fixture.detectChanges()
  return fixture
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

afterEach(() => {
  TestBed.resetTestingModule()
})

describe('usePreview', () => {
  it('exposes state and controls including recordNavigation', () => {
    const provider = createMockPreviewProvider('http://localhost:3000')
    const fixture = mount(provider)
    const preview = fixture.componentInstance.preview

    expect(preview.state().url).toBe('http://localhost:3000')
    expect(preview.state().currentUrl).toBe('http://localhost:3000')
    expect(typeof preview.recordNavigation).toBe('function')
    expect(typeof preview.setUrl).toBe('function')
  })

  it('re-renders with the new currentUrl when the preview navigates (recordNavigation)', () => {
    const provider = createMockPreviewProvider('http://localhost:3000')
    const fixture = mount(provider)
    const preview = fixture.componentInstance.preview

    preview.recordNavigation('http://localhost:3000/about')

    // The displayed location updates; the load target is untouched (no reload).
    expect(preview.state().currentUrl).toBe('http://localhost:3000/about')
    expect(preview.state().url).toBe('http://localhost:3000')
  })

  it('updates both url and currentUrl when setUrl loads a new URL', () => {
    const provider = createMockPreviewProvider('http://localhost:3000')
    const fixture = mount(provider)
    const preview = fixture.componentInstance.preview

    preview.setUrl('http://localhost:3000/dashboard')

    expect(preview.state().url).toBe('http://localhost:3000/dashboard')
    expect(preview.state().currentUrl).toBe('http://localhost:3000/dashboard')
  })

  it('exposes back/forward and re-renders the canGoBack/canGoForward flags reactively', () => {
    const provider = createMockPreviewProvider()
    const fixture = mount(provider)
    const preview = fixture.componentInstance.preview

    expect(typeof preview.back).toBe('function')
    expect(typeof preview.forward).toBe('function')
    expect(preview.state().canGoBack).toBe(false)

    preview.setUrl('http://localhost:3000/a')
    preview.recordNavigation('http://localhost:3000/b')
    expect(preview.state().canGoBack).toBe(true)
    expect(preview.state().canGoForward).toBe(false)

    const nonceBefore = preview.state().loadNonce
    preview.back()
    // Back loads the previous entry (url + a loadNonce bump) and enables Forward.
    expect(preview.state().url).toBe('http://localhost:3000/a')
    expect(preview.state().canGoForward).toBe(true)
    expect(preview.state().loadNonce).toBe(nonceBefore + 1)
  })
})
