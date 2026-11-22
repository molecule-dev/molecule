// @vitest-environment jsdom
/**
 * Unit tests for the Solid `PasswordGenerator` — a port of
 * `@molecule/app-password-generator-react/src/__tests__/PasswordGenerator.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the DOM the component produces. Mocks `@molecule/app-ui` + `@molecule/app-solid`
 * so tests don't need a fully-bonded app, and mocks `@molecule/app-clipboard`
 * so we can assert copy semantics deterministically.
 *
 * @module
 */

import { createSignal, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    cn: (...args: unknown[]) => args.flat().filter(Boolean).join(' '),
    flex: () => 'flex',
    flex1: 'flex1',
    stack: () => 'stack',
    textSize: () => 'text',
    fontWeight: () => 'fw',
    input: () => 'input',
    button: () => 'btn',
  }),
}))

vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values?: Record<string, unknown>, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-clipboard', () => ({
  copyTextWithFallback: vi.fn(async () => true),
}))

// A plain button carrying its `data-mol-id`, the same observable contract the
// React tests' Button mock has.
vi.mock('@molecule/app-ui-solid', () => ({
  Button: (props: {
    variant?: string
    size?: string
    onClick?: () => void
    'data-mol-id'?: string
    children?: JSX.Element
  }) => (
    <button type="button" onClick={props.onClick} data-mol-id={props['data-mol-id']}>
      {props.children}
    </button>
  ),
}))

import { copyTextWithFallback } from '@molecule/app-clipboard'

const { PasswordGenerator } = await import('../PasswordGenerator.jsx')

const copyTextWithFallbackMock = vi.mocked(copyTextWithFallback)

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

beforeEach(() => {
  copyTextWithFallbackMock.mockReset()
  copyTextWithFallbackMock.mockResolvedValue(true)
})

/**
 * Mounts a {@link PasswordGenerator} with these props.
 * @param props - The props.
 */
function mount(props: Record<string, unknown> = {}): void {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <PasswordGenerator {...props} />, container))
}

/** A mounted generator whose `autoCopy` / `ariaLabel` can change after mount. */
interface PolicyView {
  /** Sets these props on the live component (React's `rerender` with new props). */
  setProps(next: { autoCopy?: boolean; ariaLabel?: string }): void
}

/**
 * Mounts a {@link PasswordGenerator} whose `autoCopy` and `ariaLabel` are
 * signals, so a test can hand it new props the way a parent's re-render does.
 *
 * @param props - The props the component mounts with.
 * @returns The live view's prop setters.
 */
function mountPolicy(props: { defaultLength: number; autoCopy?: boolean }): PolicyView {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const [autoCopy, setAutoCopy] = createSignal(props.autoCopy ?? false)
  const [ariaLabel, setAriaLabel] = createSignal<string | undefined>(undefined)
  disposers.push(
    render(
      () => (
        <PasswordGenerator
          defaultLength={props.defaultLength}
          autoCopy={autoCopy()}
          ariaLabel={ariaLabel()}
        />
      ),
      container,
    ),
  )
  return {
    setProps: (next) => {
      if (next.autoCopy !== undefined) setAutoCopy(next.autoCopy)
      if (next.ariaLabel !== undefined) setAriaLabel(next.ariaLabel)
    },
  }
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
 * Writes a range value and dispatches the `input` event Solid listens on.
 *
 * @param element - The range input.
 * @param value - The new value.
 */
function fireInput(element: HTMLInputElement, value: string): void {
  element.value = value
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('PasswordGenerator', () => {
  describe('rendering', () => {
    it('mounts with a generated password of defaultLength', () => {
      mount({ defaultLength: 20 })
      expect(readout()).not.toBeNull()
      expect(readout().value).toHaveLength(20)
    })

    it('renders all six charset toggles', () => {
      mount()
      for (const k of ['uppercase', 'lowercase', 'digits', 'symbols', 'noSimilar', 'noAmbiguous']) {
        expect(toggle(k)).not.toBeNull()
      }
    })

    it('does not render the pick button when onPick is omitted', () => {
      mount()
      expect(document.querySelector('[data-mol-id="password-pick"]')).toBeNull()
    })

    it('renders the pick button when onPick is supplied', () => {
      mount({ onPick: () => undefined })
      expect(document.querySelector('[data-mol-id="password-pick"]')).not.toBeNull()
    })

    it('forwards dataMolId to the root element', () => {
      mount({ dataMolId: 'signup-pwgen' })
      const root = document.querySelector('[data-mol-component="password-generator"]')
      expect(root?.getAttribute('data-mol-id')).toBe('signup-pwgen')
    })
  })

  describe('regenerate', () => {
    it('produces a different password on click', () => {
      mount({ defaultLength: 32 })
      const before = readout().value
      regenerateBtn().click()
      const after = readout().value
      expect(after).not.toBe(before)
      expect(after).toHaveLength(32)
    })
  })

  describe('length slider', () => {
    it('produces a password of the new length when the slider moves', () => {
      mount({ defaultLength: 20 })
      fireInput(lengthSlider(), '40')
      expect(readout().value).toHaveLength(40)
    })

    it('clamps slider input below 8 up to 8', () => {
      mount({ defaultLength: 20 })
      fireInput(lengthSlider(), '4')
      expect(readout().value).toHaveLength(8)
    })
  })

  describe('charset toggles', () => {
    it('regenerates with the new policy when noSimilar is enabled', () => {
      mount({ defaultLength: 64 })
      toggle('noSimilar').click()
      const pw = readout().value
      for (const c of '0Oo1lI') {
        expect(pw).not.toContain(c)
      }
    })

    it('honors noAmbiguous — none of " \' \\" ` ~ appear', () => {
      mount({ defaultLength: 64 })
      toggle('noAmbiguous').click()
      const pw = readout().value
      for (const c of [' ', "'", '"', '`', '~']) {
        expect(pw).not.toContain(c)
      }
    })

    it('produces only digits when only digits is enabled', () => {
      mount({ defaultLength: 32 })
      toggle('uppercase').click()
      toggle('lowercase').click()
      toggle('symbols').click()
      // Only `digits` is on now.
      expect(readout().value).toMatch(/^[0-9]+$/)
    })
  })

  describe('clipboard', () => {
    it('copies the displayed password when the copy button is clicked', async () => {
      mount({ defaultLength: 20 })
      const value = readout().value
      copyBtn().click()
      expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
      expect(copyTextWithFallbackMock).toHaveBeenCalledWith(value)
      await vi.waitFor(() => expect(copyBtn().textContent).toBe('Copied!'))
    })

    it('autoCopy fires the copy on every regenerate', () => {
      mount({ defaultLength: 20, autoCopy: true })
      // Mount triggers the initial regenerate — that hit shouldn't be
      // double-counted, so capture and reset before user-driven regenerate.
      copyTextWithFallbackMock.mockClear()
      regenerateBtn().click()
      expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
      expect(copyTextWithFallbackMock).toHaveBeenCalledWith(readout().value)
    })

    it('does NOT autoCopy when the prop is omitted', () => {
      mount({ defaultLength: 20 })
      copyTextWithFallbackMock.mockClear()
      regenerateBtn().click()
      expect(copyTextWithFallbackMock).not.toHaveBeenCalled()
    })

    it('leaves the copied state off when the copy reports failure', async () => {
      copyTextWithFallbackMock.mockResolvedValue(false)
      mount({ defaultLength: 20 })
      const value = readout().value
      copyBtn().click()
      expect(copyTextWithFallbackMock).toHaveBeenCalledWith(value)
      await vi.waitFor(() => expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1))
      expect(copyBtn().textContent).toBe('Copy')
    })
  })

  describe('onPick', () => {
    it('fires onPick with the current password when the pick button is clicked', () => {
      const onPick = vi.fn()
      mount({ defaultLength: 24, onPick })
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
      mountPolicy({ defaultLength: 20 })
      fireInput(lengthSlider(), '40')
      expect(readout().value).toHaveLength(40)
    })

    it('copies the mount-time password once with autoCopy', () => {
      mountPolicy({ defaultLength: 20, autoCopy: true })
      expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
      expect(copyTextWithFallbackMock).toHaveBeenCalledWith(readout().value)
    })

    it('copies nothing on mount without autoCopy', () => {
      mountPolicy({ defaultLength: 20 })
      expect(copyTextWithFallbackMock).not.toHaveBeenCalled()
    })

    it('autoCopy copies the password a slider change produced', () => {
      mountPolicy({ defaultLength: 20, autoCopy: true })
      fireInput(lengthSlider(), '30')
      expect(readout().value).toHaveLength(30)
      expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(2)
      expect(copyTextWithFallbackMock).toHaveBeenLastCalledWith(readout().value)
    })

    it('autoCopy copies the password a charset toggle produced', () => {
      mountPolicy({ defaultLength: 64, autoCopy: true })
      toggle('noSimilar').click()
      const pw = readout().value
      expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(2)
      expect(copyTextWithFallbackMock).toHaveBeenLastCalledWith(pw)
      for (const c of '0Oo1lI') expect(pw).not.toContain(c)
    })

    it('regenerates and copies when autoCopy turns on', () => {
      const view = mountPolicy({ defaultLength: 64 })
      const before = readout().value
      view.setProps({ autoCopy: true })
      expect(readout().value).not.toBe(before)
      expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
      expect(copyTextWithFallbackMock).toHaveBeenCalledWith(readout().value)
    })

    it('regenerates without copying when autoCopy turns off', () => {
      const view = mountPolicy({ defaultLength: 64, autoCopy: true })
      const before = readout().value
      view.setProps({ autoCopy: false })
      expect(readout().value).not.toBe(before)
      expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
      expect(copyTextWithFallbackMock).toHaveBeenCalledWith(before)
    })

    it('keeps the password across a re-render that changes no policy', () => {
      const view = mountPolicy({ defaultLength: 64, autoCopy: true })
      const before = readout().value
      view.setProps({ autoCopy: true, ariaLabel: 'Generator' })
      expect(readout().value).toBe(before)
      expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
    })

    it('keeps the readout in sync when the charset toggles without autoCopy', () => {
      mountPolicy({ defaultLength: 64 })
      toggle('uppercase').click()
      toggle('lowercase').click()
      toggle('symbols').click()
      expect(readout().value).toMatch(/^[0-9]+$/)
      expect(copyTextWithFallbackMock).not.toHaveBeenCalled()
    })
  })
})
