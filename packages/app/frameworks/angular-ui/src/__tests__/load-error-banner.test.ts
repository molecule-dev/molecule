// @vitest-environment jsdom
/**
 * Render/behavior tests for LoadErrorBanner — a port of
 * `@molecule/app-ui-react/src/__tests__/load-error-banner.test.tsx`: the
 * message/detail/children render, rest-attribute locator pass-through, the
 * retry pending state (disabled + "Retrying…", no double-fire), the re-arm
 * after a rejected retry, and no retry button without `onRetry`.
 *
 * Angular forces two translations: node-valued props (`message`, `detail`,
 * `retryLabel`) are projected content, and change detection is explicit, so
 * each state transition runs a pass.
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads —
// evaluating the decorators otherwise throws "needs the JIT compiler".
import '@angular/compiler'
import { Component, provideZonelessChangeDetection, type Type } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { fireEvent, within } from '@testing-library/dom'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    // Tokens the banner templates CALL as functions; every other token must be
    // a plain string — Angular's class binding rejects function values.
    const CALLABLE = new Set([
      'cn',
      'stack',
      'flex',
      'textSize',
      'button',
      'alert',
      'alertLeftAccent',
    ])
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        if (typeof prop === 'string' && CALLABLE.has(prop)) return () => prop
        return String(prop)
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: vi.fn((name: string) => ({ name, viewBox: '0 0 24 24', paths: [] })),
}))

vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
  useRouter: () => ({ location: () => ({ pathname: '/', search: '' }) }),
}))

const { LoadErrorBanner } = await import('../components/load-error-banner.component.js')

/** Message only: the display-only banner. */
const MessageHost = Component({
  selector: 'mol-spec-banner-message',
  standalone: true,
  imports: [LoadErrorBanner],
  template: `<div mol-load-error-banner>
    <span slot="message">Could not load decks.</span>
  </div>`,
})(class MessageHostComponent {})

/** Message, detail, children and a rest-prop locator on the root. */
const FullHost = Component({
  selector: 'mol-spec-banner-full',
  standalone: true,
  imports: [LoadErrorBanner],
  template: `<div mol-load-error-banner data-mol-id="decks-load-error">
    <span slot="message">Could not load decks.</span>
    <span slot="detail">HTTP 503</span>
    <code data-extra="">E_TIMEOUT</code>
  </div>`,
})(class FullHostComponent {})

/** Message plus a caller-owned retry callback (and an optional mol id). */
const RetryHost = Component({
  selector: 'mol-spec-banner-retry',
  standalone: true,
  imports: [LoadErrorBanner],
  template: `<div mol-load-error-banner [onRetry]="onRetry" [retryMolId]="retryMolId">
    <span slot="message">Could not load decks.</span>
  </div>`,
})(
  class RetryHostComponent {
    /** The retry callback (React's `onRetry`). */
    onRetry?: () => void | Promise<void>
    /** The retry button's mol id. */
    retryMolId = 'load-error-retry'
  },
)

/**
 * Mounts a spec host, arranging its fields first.
 *
 * @param host - The host component to mount.
 * @param configure - Applies the test's props before the first pass.
 * @returns The fixture.
 */
function render<T>(host: Type<T>, configure?: (instance: T) => void): ComponentFixture<T> {
  TestBed.configureTestingModule({
    imports: [host],
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const fixture = TestBed.createComponent(host)
  if (configure) configure(fixture.componentInstance)
  fixture.detectChanges()
  return fixture
}

/**
 * The retry button, by its mol id.
 *
 * @param molId - The button's `data-mol-id`.
 * @returns The button, or null.
 */
const retryButton = (molId = 'load-error-retry'): HTMLButtonElement | null =>
  document.body.querySelector(`[data-mol-id="${molId}"]`)

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

afterEach(() => {
  TestBed.resetTestingModule()
  document.body.innerHTML = ''
})

describe('LoadErrorBanner', () => {
  it('renders message, detail, children, and rest-prop locator', () => {
    render(FullHost)
    expect(within(document.body).getByText('Could not load decks.')).toBeTruthy()
    expect(within(document.body).getByText('HTTP 503')).toBeTruthy()
    expect(document.body.querySelector('[data-extra]')).toBeTruthy()
    expect(document.body.querySelector('[data-mol-id="decks-load-error"]')).toBeTruthy()
  })

  it('renders no retry button without onRetry', () => {
    render(MessageHost)
    expect(within(document.body).queryByText('Retry')).toBeNull()
  })

  it('calls onRetry and shows the pending label while pending', async () => {
    let resolveRetry: () => void = () => {}
    const onRetry = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRetry = resolve
        }),
    )
    const fixture = render(RetryHost, (instance) => {
      instance.onRetry = onRetry
    })
    fixture.detectChanges()
    const retry = within(document.body).getByText('Retry') as HTMLButtonElement
    fireEvent.click(retry)
    fixture.detectChanges()
    expect(onRetry).toHaveBeenCalledTimes(1)
    // Pending: disabled + label swapped — a second click must not re-fire.
    const pendingButton = within(document.body).getByText('Retrying…') as HTMLButtonElement
    expect(pendingButton.disabled).toBe(true)
    fireEvent.click(pendingButton)
    expect(onRetry).toHaveBeenCalledTimes(1)
    resolveRetry()
    await vi.waitFor(() => {
      fixture.detectChanges()
      expect((within(document.body).getByText('Retry') as HTMLButtonElement).disabled).toBe(false)
    })
  })

  it('re-arms after a rejected retry (failure keeps the banner usable)', async () => {
    const onRetry = vi.fn().mockRejectedValueOnce(new Error('still down'))
    const fixture = render(RetryHost, (instance) => {
      instance.onRetry = onRetry
    })
    fixture.detectChanges()
    fireEvent.click(within(document.body).getByText('Retry'))
    await vi.waitFor(() => {
      fixture.detectChanges()
      expect((within(document.body).getByText('Retry') as HTMLButtonElement).disabled).toBe(false)
    })
    fireEvent.click(within(document.body).getByText('Retry'))
    expect(onRetry).toHaveBeenCalledTimes(2)
  })

  it('retry button carries retryMolId (default and custom)', () => {
    render(RetryHost, (instance) => {
      instance.onRetry = () => {}
    })
    expect(retryButton()).toBeTruthy()
    TestBed.resetTestingModule()
    document.body.innerHTML = ''
    render(RetryHost, (instance) => {
      instance.onRetry = () => {}
      instance.retryMolId = 'decks-retry'
    })
    expect(retryButton('decks-retry')).toBeTruthy()
  })
})
