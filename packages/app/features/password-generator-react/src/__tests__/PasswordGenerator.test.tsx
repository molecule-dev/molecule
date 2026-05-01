/**
 * Unit tests for `<PasswordGenerator>` — the configurable secure
 * password generator UI. Mocks `@molecule/app-ui` + `@molecule/app-react`
 * so tests don't need a fully-bonded app, and stubs `navigator.clipboard`
 * so we can assert copy semantics deterministically.
 *
 * @module
 */

// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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

vi.mock('@molecule/app-ui-react', () => ({
  Button: ({
    children,
    onClick,
    'data-mol-id': dataMolId,
  }: {
    children?: unknown
    onClick?: () => void
    'data-mol-id'?: string
  }) => (
    <button type="button" onClick={onClick} data-mol-id={dataMolId}>
      {children as React.ReactNode}
    </button>
  ),
}))

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
      let s = opts?.defaultValue ?? _key
      if (values) {
        for (const [k, v] of Object.entries(values)) {
          s = s.replaceAll(`{{${k}}}`, String(v))
        }
      }
      return s
    },
  }),
}))

import React from 'react'

import { PasswordGenerator } from '../PasswordGenerator.js'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

/**
 * Wires a stub clipboard with a tracked `writeText` so tests can assert
 * exactly what gets copied.
 */
function installClipboardStub() {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })
  return writeText
}

/** Helper — the read-only password readout. */
function readout(): HTMLInputElement {
  return document.querySelector('[data-mol-id="password-readout"]') as HTMLInputElement
}

/** Helper — the regenerate button. */
function regenerateBtn(): HTMLButtonElement {
  return document.querySelector('[data-mol-id="password-regenerate"]') as HTMLButtonElement
}

/** Helper — the copy button. */
function copyBtn(): HTMLButtonElement {
  return document.querySelector('[data-mol-id="password-copy"]') as HTMLButtonElement
}

/** Helper — the length range slider. */
function lengthSlider(): HTMLInputElement {
  return document.querySelector('[data-mol-id="password-length"]') as HTMLInputElement
}

/**
 * Helper — a charset checkbox.
 * @param key
 */
function toggle(key: string): HTMLInputElement {
  const wrapper = document.querySelector(
    `[data-mol-id="password-toggle-${key}"]`,
  ) as HTMLLabelElement
  return wrapper.querySelector('input[type="checkbox"]') as HTMLInputElement
}

describe('<PasswordGenerator>', () => {
  beforeEach(() => {
    installClipboardStub()
  })

  describe('rendering', () => {
    it('mounts with a generated password of defaultLength', () => {
      render(<PasswordGenerator defaultLength={20} />)
      expect(readout()).not.toBeNull()
      expect(readout().value).toHaveLength(20)
    })

    it('renders all six charset toggles', () => {
      render(<PasswordGenerator />)
      for (const k of ['uppercase', 'lowercase', 'digits', 'symbols', 'noSimilar', 'noAmbiguous']) {
        expect(toggle(k)).not.toBeNull()
      }
    })

    it('does not render the pick button when onPick is omitted', () => {
      render(<PasswordGenerator />)
      expect(document.querySelector('[data-mol-id="password-pick"]')).toBeNull()
    })

    it('renders the pick button when onPick is supplied', () => {
      render(<PasswordGenerator onPick={() => undefined} />)
      expect(document.querySelector('[data-mol-id="password-pick"]')).not.toBeNull()
    })

    it('forwards dataMolId to the root element', () => {
      const { container } = render(<PasswordGenerator dataMolId="signup-pwgen" />)
      const root = container.querySelector('[data-mol-component="password-generator"]')
      expect(root?.getAttribute('data-mol-id')).toBe('signup-pwgen')
    })
  })

  describe('regenerate', () => {
    it('produces a different password on click', () => {
      render(<PasswordGenerator defaultLength={32} />)
      const before = readout().value
      fireEvent.click(regenerateBtn())
      const after = readout().value
      expect(after).not.toBe(before)
      expect(after).toHaveLength(32)
    })
  })

  describe('length slider', () => {
    it('produces a password of the new length when the slider moves', () => {
      render(<PasswordGenerator defaultLength={20} />)
      fireEvent.change(lengthSlider(), { target: { value: '40' } })
      expect(readout().value).toHaveLength(40)
    })

    it('clamps slider input below 8 up to 8', () => {
      render(<PasswordGenerator defaultLength={20} />)
      fireEvent.change(lengthSlider(), { target: { value: '4' } })
      expect(readout().value).toHaveLength(8)
    })
  })

  describe('charset toggles', () => {
    it('regenerates with the new policy when noSimilar is enabled', () => {
      render(<PasswordGenerator defaultLength={64} />)
      fireEvent.click(toggle('noSimilar'))
      const pw = readout().value
      for (const c of '0Oo1lI') {
        expect(pw).not.toContain(c)
      }
    })

    it('honors noAmbiguous — none of " \' \\" ` ~ appear', () => {
      render(<PasswordGenerator defaultLength={64} />)
      fireEvent.click(toggle('noAmbiguous'))
      const pw = readout().value
      for (const c of [' ', "'", '"', '`', '~']) {
        expect(pw).not.toContain(c)
      }
    })

    it('produces only digits when only digits is enabled', () => {
      render(<PasswordGenerator defaultLength={32} />)
      fireEvent.click(toggle('uppercase'))
      fireEvent.click(toggle('lowercase'))
      fireEvent.click(toggle('symbols'))
      // Only `digits` is on now.
      const pw = readout().value
      expect(pw).toMatch(/^[0-9]+$/)
    })
  })

  describe('clipboard', () => {
    it('copies the displayed password when the copy button is clicked', async () => {
      const writeText = installClipboardStub()
      render(<PasswordGenerator defaultLength={20} />)
      const value = readout().value
      fireEvent.click(copyBtn())
      // `writeText` is async but called synchronously inside the handler.
      expect(writeText).toHaveBeenCalledTimes(1)
      expect(writeText).toHaveBeenCalledWith(value)
    })

    it('autoCopy fires writeText on every regenerate', async () => {
      const writeText = installClipboardStub()
      render(<PasswordGenerator defaultLength={20} autoCopy />)
      // Mount triggers the initial regenerate effect — that hit shouldn't be
      // double-counted, so capture and reset before user-driven regenerate.
      writeText.mockClear()
      fireEvent.click(regenerateBtn())
      expect(writeText).toHaveBeenCalledTimes(1)
      expect(writeText).toHaveBeenCalledWith(readout().value)
    })

    it('does NOT autoCopy when the prop is omitted', () => {
      const writeText = installClipboardStub()
      render(<PasswordGenerator defaultLength={20} />)
      writeText.mockClear()
      fireEvent.click(regenerateBtn())
      expect(writeText).not.toHaveBeenCalled()
    })
  })

  describe('onPick', () => {
    it('fires onPick with the current password when the pick button is clicked', () => {
      const onPick = vi.fn()
      render(<PasswordGenerator defaultLength={24} onPick={onPick} />)
      const expected = readout().value
      const pickButton = document.querySelector(
        '[data-mol-id="password-pick"]',
      ) as HTMLButtonElement
      fireEvent.click(pickButton)
      expect(onPick).toHaveBeenCalledTimes(1)
      expect(onPick).toHaveBeenCalledWith(expected)
    })
  })
})
