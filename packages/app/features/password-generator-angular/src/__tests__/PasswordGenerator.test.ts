// @vitest-environment jsdom
/**
 * Unit tests of `PasswordGenerator` — the port of
 * `@molecule/app-password-generator-react`'s own suite. The React suite renders
 * the component with mocked UI dependencies and asserts the DOM; this port
 * mounts the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same DOM, with `@molecule/app-clipboard`
 * mocked so copy semantics can be asserted deterministically.
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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { copyTextWithFallback } from '@molecule/app-clipboard'

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// resolves to the inline English default.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values?: Record<string, unknown>, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The copy/regenerate button marker the React tests mock
// `@molecule/app-ui-react` with: a plain button carrying its `data-mol-id`.
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component } = await import('@angular/core')
  return {
    Button: Component({
      selector: 'button[mol-button]',
      standalone: true,
      inputs: ['variant', 'size'],
      template: `<ng-content></ng-content>`,
    })(
      class MockButton {
        /** Button variant. */
        variant?: string
        /** Button size. */
        size?: string
      },
    ),
  }
})

vi.mock('@molecule/app-clipboard', () => ({
  copyTextWithFallback: vi.fn(async () => true),
}))

const { PasswordGenerator } = await import('../password-generator.component.js')

const copyTextWithFallbackMock = vi.mocked(copyTextWithFallback)

/** A mounted spec host: its DOM, a change-detection tick, and teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Sets these props and flushes change detection (React's `rerender` with new props). */
  setProps(next: Record<string, unknown>): void
  /** Flushes change detection. */
  tick(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts the component through a JIT host template, written exactly the way an
 * Angular app would write it.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [PasswordGenerator],
    changeDetection: ChangeDetectionStrategy.Default,
    template: `<div
      mol-password-generator
      [defaultLength]="p['defaultLength']"
      [defaultCharset]="p['defaultCharset']"
      [onPick]="p['onPick']"
      [autoCopy]="p['autoCopy']"
      [ariaLabel]="p['ariaLabel']"
      [dataMolId]="p['dataMolId']"
      [className]="p['className']"
    ></div>`,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    setProps: (next) => {
      Object.assign(ref.instance.p, next)
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    tick: () => {
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/**
 * Mounts a generator and remembers it for teardown.
 *
 * @param props - The component props.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown> = {}): Promise<Mounted> {
  const entry = await mount(props)
  mounted.push(entry)
  return entry
}

afterEach(async () => {
  for (const entry of mounted.splice(0)) await entry.destroy()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

beforeEach(() => {
  copyTextWithFallbackMock.mockReset()
  copyTextWithFallbackMock.mockResolvedValue(true)
})

/**
 * The read-only password readout.
 * @returns The readout element.
 */
function readout(): HTMLInputElement {
  return document.querySelector('[data-mol-id="password-readout"]') as HTMLInputElement
}

/**
 * The regenerate button.
 * @returns The regenerate button.
 */
function regenerateBtn(): HTMLButtonElement {
  return document.querySelector('[data-mol-id="password-regenerate"]') as HTMLButtonElement
}

/**
 * The copy button.
 * @returns The copy button.
 */
function copyBtn(): HTMLButtonElement {
  return document.querySelector('[data-mol-id="password-copy"]') as HTMLButtonElement
}

/**
 * The length range slider.
 * @returns The slider element.
 */
function lengthSlider(): HTMLInputElement {
  return document.querySelector('[data-mol-id="password-length"]') as HTMLInputElement
}

/**
 * The checkbox of one charset toggle row.
 *
 * @param key - The toggle's charset key.
 * @returns The checkbox element.
 */
function toggle(key: string): HTMLInputElement {
  const wrapper = document.querySelector(
    `[data-mol-id="password-toggle-${key}"]`,
  ) as HTMLLabelElement
  return wrapper.querySelector('input[type="checkbox"]') as HTMLInputElement
}

describe('PasswordGenerator', () => {
  describe('rendering', () => {
    it('mounts with a generated password of defaultLength', async () => {
      await render({ defaultLength: 20 })
      expect(readout()).not.toBeNull()
      expect(readout().value).toHaveLength(20)
    })

    it('renders all six charset toggles', async () => {
      await render()
      for (const k of ['uppercase', 'lowercase', 'digits', 'symbols', 'noSimilar', 'noAmbiguous']) {
        expect(toggle(k)).not.toBeNull()
      }
    })

    it('does not render the pick button when onPick is omitted', async () => {
      await render()
      expect(document.querySelector('[data-mol-id="password-pick"]')).toBeNull()
    })

    it('renders the pick button when onPick is supplied', async () => {
      await render({ onPick: () => undefined })
      expect(document.querySelector('[data-mol-id="password-pick"]')).not.toBeNull()
    })

    it('forwards dataMolId to the root element', async () => {
      const { host } = await render({ dataMolId: 'signup-pwgen' })
      const root = host.querySelector('[data-mol-component="password-generator"]')
      expect(root?.getAttribute('data-mol-id')).toBe('signup-pwgen')
    })
  })

  describe('regenerate', () => {
    it('produces a different password on click', async () => {
      const { tick } = await render({ defaultLength: 32 })
      const before = readout().value
      regenerateBtn().click()
      tick()
      const after = readout().value
      expect(after).not.toBe(before)
      expect(after).toHaveLength(32)
    })
  })

  describe('length slider', () => {
    it('produces a password of the new length when the slider moves', async () => {
      const { tick } = await render({ defaultLength: 20 })
      const slider = lengthSlider()
      slider.value = '40'
      slider.dispatchEvent(new Event('input', { bubbles: true }))
      tick()
      expect(readout().value).toHaveLength(40)
    })

    it('clamps slider input below 8 up to 8', async () => {
      const { tick } = await render({ defaultLength: 20 })
      const slider = lengthSlider()
      slider.value = '4'
      slider.dispatchEvent(new Event('input', { bubbles: true }))
      tick()
      expect(readout().value).toHaveLength(8)
    })
  })

  describe('charset toggles', () => {
    it('regenerates with the new policy when noSimilar is enabled', async () => {
      const { tick } = await render({ defaultLength: 64 })
      toggle('noSimilar').click()
      tick()
      const pw = readout().value
      for (const c of '0Oo1lI') {
        expect(pw).not.toContain(c)
      }
    })

    it('honors noAmbiguous — none of " \' \\" ` ~ appear', async () => {
      const { tick } = await render({ defaultLength: 64 })
      toggle('noAmbiguous').click()
      tick()
      const pw = readout().value
      for (const c of [' ', "'", '"', '`', '~']) {
        expect(pw).not.toContain(c)
      }
    })

    it('produces only digits when only digits is enabled', async () => {
      const { tick } = await render({ defaultLength: 32 })
      toggle('uppercase').click()
      toggle('lowercase').click()
      toggle('symbols').click()
      tick()
      // Only `digits` is on now.
      expect(readout().value).toMatch(/^[0-9]+$/)
    })
  })

  describe('clipboard', () => {
    it('copies the displayed password when the copy button is clicked', async () => {
      const { tick } = await render({ defaultLength: 20 })
      const value = readout().value
      copyBtn().click()
      expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
      expect(copyTextWithFallbackMock).toHaveBeenCalledWith(value)
      await vi.waitFor(() => {
        tick()
        expect(copyBtn().textContent).toBe('Copied!')
      })
    })

    it('autoCopy fires the copy on every regenerate', async () => {
      const { tick } = await render({ defaultLength: 20, autoCopy: true })
      // Mount triggers the initial regenerate — that hit shouldn't be
      // double-counted, so capture and reset before user-driven regenerate.
      copyTextWithFallbackMock.mockClear()
      regenerateBtn().click()
      tick()
      expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
      expect(copyTextWithFallbackMock).toHaveBeenCalledWith(readout().value)
    })

    it('does NOT autoCopy when the prop is omitted', async () => {
      const { tick } = await render({ defaultLength: 20 })
      copyTextWithFallbackMock.mockClear()
      regenerateBtn().click()
      tick()
      expect(copyTextWithFallbackMock).not.toHaveBeenCalled()
    })

    it('leaves the copied state off when the copy reports failure', async () => {
      copyTextWithFallbackMock.mockResolvedValue(false)
      const { tick } = await render({ defaultLength: 20 })
      const value = readout().value
      copyBtn().click()
      expect(copyTextWithFallbackMock).toHaveBeenCalledWith(value)
      await vi.waitFor(() => {
        tick()
        expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
      })
      expect(copyBtn().textContent).toBe('Copy')
    })
  })

  describe('onPick', () => {
    it('fires onPick with the current password when the pick button is clicked', async () => {
      const onPick = vi.fn()
      await render({ defaultLength: 24, onPick })
      const expected = readout().value
      const pickButton = document.querySelector(
        '[data-mol-id="password-pick"]',
      ) as HTMLButtonElement
      pickButton.click()
      expect(onPick).toHaveBeenCalledTimes(1)
      expect(onPick).toHaveBeenCalledWith(expected)
    })
  })

  describe('policy regeneration', () => {
    it('regenerates the readout when the length slider changes', async () => {
      const { tick } = await render({ defaultLength: 20 })
      const slider = lengthSlider()
      slider.value = '40'
      slider.dispatchEvent(new Event('input', { bubbles: true }))
      tick()
      expect(readout().value).toHaveLength(40)
    })

    it('copies the mount-time password once with autoCopy', async () => {
      await render({ defaultLength: 20, autoCopy: true })
      expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
      expect(copyTextWithFallbackMock).toHaveBeenCalledWith(readout().value)
    })

    it('copies nothing on mount without autoCopy', async () => {
      await render({ defaultLength: 20 })
      expect(copyTextWithFallbackMock).not.toHaveBeenCalled()
    })

    it('autoCopy copies the password a slider change produced', async () => {
      const { tick } = await render({ defaultLength: 20, autoCopy: true })
      const slider = lengthSlider()
      slider.value = '30'
      slider.dispatchEvent(new Event('input', { bubbles: true }))
      tick()
      expect(readout().value).toHaveLength(30)
      expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(2)
      expect(copyTextWithFallbackMock).toHaveBeenLastCalledWith(readout().value)
    })

    it('autoCopy copies the password a charset toggle produced', async () => {
      const { tick } = await render({ defaultLength: 64, autoCopy: true })
      toggle('noSimilar').click()
      tick()
      const pw = readout().value
      expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(2)
      expect(copyTextWithFallbackMock).toHaveBeenLastCalledWith(pw)
      for (const c of '0Oo1lI') expect(pw).not.toContain(c)
    })

    it('regenerates and copies when autoCopy turns on', async () => {
      const view = await render({ defaultLength: 64 })
      const before = readout().value
      view.setProps({ autoCopy: true })
      expect(readout().value).not.toBe(before)
      expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
      expect(copyTextWithFallbackMock).toHaveBeenCalledWith(readout().value)
    })

    it('regenerates without copying when autoCopy turns off', async () => {
      const view = await render({ defaultLength: 64, autoCopy: true })
      const before = readout().value
      view.setProps({ autoCopy: false })
      expect(readout().value).not.toBe(before)
      expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
      expect(copyTextWithFallbackMock).toHaveBeenCalledWith(before)
    })

    it('keeps the password across a re-render that changes no policy', async () => {
      const view = await render({ defaultLength: 64, autoCopy: true })
      const before = readout().value
      view.setProps({ autoCopy: true, ariaLabel: 'Generator' })
      expect(readout().value).toBe(before)
      expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
    })

    it('keeps the readout in sync when the charset toggles without autoCopy', async () => {
      const { tick } = await render({ defaultLength: 64 })
      toggle('uppercase').click()
      toggle('lowercase').click()
      toggle('symbols').click()
      tick()
      expect(readout().value).toMatch(/^[0-9]+$/)
      expect(copyTextWithFallbackMock).not.toHaveBeenCalled()
    })
  })
})
