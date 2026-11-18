// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `PasswordGenerator` — a port of
 * `@molecule/app-password-generator-react/src/__tests__/PasswordGenerator.test.tsx`:
 * the same behavioral assertions, rendered with a real Svelte mount in jsdom
 * (the bonded ClassMap and i18n provider) and asserted on the DOM the
 * component produces. `@molecule/app-clipboard` is mocked so copy semantics
 * can be asserted deterministically.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { copyTextWithFallback } from '@molecule/app-clipboard'
import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import { setMoleculeContext } from '@molecule/app-svelte'

import PasswordGenerator from '../PasswordGenerator.svelte'
import { createPropBag } from './prop-bag.svelte.js'

vi.mock('@molecule/app-clipboard', () => ({
  copyTextWithFallback: vi.fn(async () => true),
}))

const copyTextWithFallbackMock = vi.mocked(copyTextWithFallback)

/** The instances mounted during one test, unmounted in `afterEach`. */
const mounted: Array<ReturnType<typeof mount>> = []

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

beforeEach(() => {
  copyTextWithFallbackMock.mockReset()
  copyTextWithFallbackMock.mockResolvedValue(true)
})

/**
 * Mounts a {@link PasswordGenerator} with these props and flushes its effects.
 *
 * @param props - The component props.
 * @returns The element the generator rendered into.
 */
function mountGenerator(props: Record<string, unknown> = {}): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.push(
    mount(Host, {
      target: host,
      props: { config: {}, setMoleculeContext, component: PasswordGenerator, props },
    }),
  )
  flushSync()
  return host
}

/**
 * Mounts a {@link PasswordGenerator} with a reactive prop bag, so a test can
 * hand it new props after mount (React's `rerender` with new props) and flush
 * the effect that follows.
 *
 * @param props - The props the component mounts with.
 * @returns The reactive bag the mounted host spreads.
 */
function mountReactive(props: Record<string, unknown> = {}): Record<string, unknown> {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const bag = createPropBag(props)
  mounted.push(
    mount(Host, {
      target: host,
      props: { config: {}, setMoleculeContext, component: PasswordGenerator, props: bag },
    }),
  )
  flushSync()
  return bag
}

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

/**
 * Writes a range value and dispatches the `input` event Svelte listens on.
 *
 * @param element - The range input.
 * @param value - The new value.
 */
function fireInput(element: HTMLInputElement, value: string): void {
  element.value = value
  element.dispatchEvent(new Event('input', { bubbles: true }))
  flushSync()
}

describe('PasswordGenerator', () => {
  describe('rendering', () => {
    it('mounts with a generated password of defaultLength', () => {
      mountGenerator({ defaultLength: 20 })
      expect(readout()).not.toBeNull()
      expect(readout().value).toHaveLength(20)
    })

    it('renders all six charset toggles', () => {
      mountGenerator()
      for (const k of ['uppercase', 'lowercase', 'digits', 'symbols', 'noSimilar', 'noAmbiguous']) {
        expect(toggle(k)).not.toBeNull()
      }
    })

    it('does not render the pick button when onPick is omitted', () => {
      mountGenerator()
      expect(document.querySelector('[data-mol-id="password-pick"]')).toBeNull()
    })

    it('renders the pick button when onPick is supplied', () => {
      mountGenerator({ onPick: () => undefined })
      expect(document.querySelector('[data-mol-id="password-pick"]')).not.toBeNull()
    })

    it('forwards dataMolId to the root element', () => {
      const host = mountGenerator({ dataMolId: 'signup-pwgen' })
      const root = host.querySelector('[data-mol-component="password-generator"]')
      expect(root?.getAttribute('data-mol-id')).toBe('signup-pwgen')
    })
  })

  describe('regenerate', () => {
    it('produces a different password on click', () => {
      mountGenerator({ defaultLength: 32 })
      const before = readout().value
      regenerateBtn().click()
      flushSync()
      const after = readout().value
      expect(after).not.toBe(before)
      expect(after).toHaveLength(32)
    })
  })

  describe('length slider', () => {
    it('produces a password of the new length when the slider moves', () => {
      mountGenerator({ defaultLength: 20 })
      fireInput(lengthSlider(), '40')
      expect(readout().value).toHaveLength(40)
    })

    it('clamps slider input below 8 up to 8', () => {
      mountGenerator({ defaultLength: 20 })
      fireInput(lengthSlider(), '4')
      expect(readout().value).toHaveLength(8)
    })
  })

  describe('charset toggles', () => {
    it('regenerates with the new policy when noSimilar is enabled', () => {
      mountGenerator({ defaultLength: 64 })
      toggle('noSimilar').click()
      flushSync()
      const pw = readout().value
      for (const c of '0Oo1lI') {
        expect(pw).not.toContain(c)
      }
    })

    it('honors noAmbiguous — none of " \' \\" ` ~ appear', () => {
      mountGenerator({ defaultLength: 64 })
      toggle('noAmbiguous').click()
      flushSync()
      const pw = readout().value
      for (const c of [' ', "'", '"', '`', '~']) {
        expect(pw).not.toContain(c)
      }
    })

    it('produces only digits when only digits is enabled', () => {
      mountGenerator({ defaultLength: 32 })
      toggle('uppercase').click()
      toggle('lowercase').click()
      toggle('symbols').click()
      flushSync()
      // Only `digits` is on now.
      expect(readout().value).toMatch(/^[0-9]+$/)
    })
  })

  describe('clipboard', () => {
    it('copies the displayed password when the copy button is clicked', async () => {
      mountGenerator({ defaultLength: 20 })
      const value = readout().value
      copyBtn().click()
      expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
      expect(copyTextWithFallbackMock).toHaveBeenCalledWith(value)
      await vi.waitFor(() => {
        flushSync()
        expect(copyBtn().textContent?.trim()).toBe('Copied!')
      })
    })

    it('autoCopy fires the copy on every regenerate', () => {
      mountGenerator({ defaultLength: 20, autoCopy: true })
      // Mount triggers the initial regenerate — that hit shouldn't be
      // double-counted, so capture and reset before user-driven regenerate.
      copyTextWithFallbackMock.mockClear()
      regenerateBtn().click()
      flushSync()
      expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
      expect(copyTextWithFallbackMock).toHaveBeenCalledWith(readout().value)
    })

    it('does NOT autoCopy when the prop is omitted', () => {
      mountGenerator({ defaultLength: 20 })
      copyTextWithFallbackMock.mockClear()
      regenerateBtn().click()
      flushSync()
      expect(copyTextWithFallbackMock).not.toHaveBeenCalled()
    })

    it('leaves the copied state off when the copy reports failure', async () => {
      copyTextWithFallbackMock.mockResolvedValue(false)
      mountGenerator({ defaultLength: 20 })
      const value = readout().value
      copyBtn().click()
      expect(copyTextWithFallbackMock).toHaveBeenCalledWith(value)
      await vi.waitFor(() => {
        flushSync()
        expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
      })
      expect(copyBtn().textContent?.trim()).toBe('Copy')
    })
  })

  describe('onPick', () => {
    it('fires onPick with the current password when the pick button is clicked', () => {
      const onPick = vi.fn()
      mountGenerator({ defaultLength: 24, onPick })
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
    it('regenerates the readout when the length slider changes', () => {
      mountReactive({ defaultLength: 20 })
      fireInput(lengthSlider(), '40')
      expect(readout().value).toHaveLength(40)
    })

    it('copies the mount-time password once with autoCopy', () => {
      mountReactive({ defaultLength: 20, autoCopy: true })
      expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
      expect(copyTextWithFallbackMock).toHaveBeenCalledWith(readout().value)
    })

    it('copies nothing on mount without autoCopy', () => {
      mountReactive({ defaultLength: 20 })
      expect(copyTextWithFallbackMock).not.toHaveBeenCalled()
    })

    it('autoCopy copies the password a slider change produced', () => {
      mountReactive({ defaultLength: 20, autoCopy: true })
      fireInput(lengthSlider(), '30')
      expect(readout().value).toHaveLength(30)
      expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(2)
      expect(copyTextWithFallbackMock).toHaveBeenLastCalledWith(readout().value)
    })

    it('autoCopy copies the password a charset toggle produced', () => {
      mountReactive({ defaultLength: 64, autoCopy: true })
      toggle('noSimilar').click()
      flushSync()
      const pw = readout().value
      expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(2)
      expect(copyTextWithFallbackMock).toHaveBeenLastCalledWith(pw)
      for (const c of '0Oo1lI') expect(pw).not.toContain(c)
    })

    it('regenerates and copies when autoCopy turns on', () => {
      const bag = mountReactive({ defaultLength: 64 })
      const before = readout().value
      bag.autoCopy = true
      flushSync()
      expect(readout().value).not.toBe(before)
      expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
      expect(copyTextWithFallbackMock).toHaveBeenCalledWith(readout().value)
    })

    it('regenerates without copying when autoCopy turns off', () => {
      const bag = mountReactive({ defaultLength: 64, autoCopy: true })
      const before = readout().value
      bag.autoCopy = false
      flushSync()
      expect(readout().value).not.toBe(before)
      expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
      expect(copyTextWithFallbackMock).toHaveBeenCalledWith(before)
    })

    it('keeps the password across a re-render that changes no policy', () => {
      const bag = mountReactive({ defaultLength: 64, autoCopy: true })
      const before = readout().value
      bag.ariaLabel = 'Generator'
      flushSync()
      expect(readout().value).toBe(before)
      expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
    })

    it('keeps the readout in sync when the charset toggles without autoCopy', () => {
      mountReactive({ defaultLength: 64 })
      toggle('uppercase').click()
      toggle('lowercase').click()
      toggle('symbols').click()
      flushSync()
      expect(readout().value).toMatch(/^[0-9]+$/)
      expect(copyTextWithFallbackMock).not.toHaveBeenCalled()
    })
  })
})
