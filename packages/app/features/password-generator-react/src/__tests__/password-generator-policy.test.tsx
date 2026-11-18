/**
 * Policy-driven regeneration of `<PasswordGenerator>`: changing the length or a
 * character class refreshes the readout from the interaction itself, and
 * `autoCopy` copies each new password: the mount-time one and one an
 * `autoCopy` change made after they commit, an interaction's inside the event.
 *
 * @module
 */

// @vitest-environment jsdom

import { cleanup, fireEvent, render } from '@testing-library/react'
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

vi.mock('@molecule/app-clipboard', () => ({
  copyTextWithFallback: vi.fn(async () => true),
}))

import React from 'react'

import { copyTextWithFallback } from '@molecule/app-clipboard'

import { PasswordGenerator } from '../PasswordGenerator.js'

const copyTextWithFallbackMock = vi.mocked(copyTextWithFallback)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

beforeEach(() => {
  copyTextWithFallbackMock.mockReset()
  copyTextWithFallbackMock.mockResolvedValue(true)
})

/**
 * The read-only password readout.
 *
 * @returns The readout input.
 */
function readout(): HTMLInputElement {
  return document.querySelector('[data-mol-id="password-readout"]') as HTMLInputElement
}

/**
 * The length range slider.
 *
 * @returns The slider input.
 */
function lengthSlider(): HTMLInputElement {
  return document.querySelector('[data-mol-id="password-length"]') as HTMLInputElement
}

/**
 * A charset checkbox.
 *
 * @param key - Charset key.
 * @returns The checkbox input.
 */
function toggle(key: string): HTMLInputElement {
  const wrapper = document.querySelector(
    `[data-mol-id="password-toggle-${key}"]`,
  ) as HTMLLabelElement
  return wrapper.querySelector('input[type="checkbox"]') as HTMLInputElement
}

describe('<PasswordGenerator> policy regeneration', () => {
  it('regenerates the readout when the length slider changes', () => {
    render(<PasswordGenerator defaultLength={20} />)
    fireEvent.change(lengthSlider(), { target: { value: '40' } })
    expect(readout().value).toHaveLength(40)
  })

  it('copies the mount-time password once with autoCopy', () => {
    render(<PasswordGenerator defaultLength={20} autoCopy />)
    expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith(readout().value)
  })

  it('copies nothing on mount without autoCopy', () => {
    render(<PasswordGenerator defaultLength={20} />)
    expect(copyTextWithFallbackMock).not.toHaveBeenCalled()
  })

  it('autoCopy copies the password a slider change produced', () => {
    render(<PasswordGenerator defaultLength={20} autoCopy />)
    fireEvent.change(lengthSlider(), { target: { value: '30' } })
    expect(readout().value).toHaveLength(30)
    expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(2)
    expect(copyTextWithFallbackMock).toHaveBeenLastCalledWith(readout().value)
  })

  it('autoCopy copies the password a charset toggle produced', () => {
    render(<PasswordGenerator defaultLength={64} autoCopy />)
    fireEvent.click(toggle('noSimilar'))
    const pw = readout().value
    expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(2)
    expect(copyTextWithFallbackMock).toHaveBeenLastCalledWith(pw)
    for (const c of '0Oo1lI') expect(pw).not.toContain(c)
  })

  it('regenerates and copies when autoCopy turns on', () => {
    const view = render(<PasswordGenerator defaultLength={64} />)
    const before = readout().value
    view.rerender(<PasswordGenerator defaultLength={64} autoCopy />)
    expect(readout().value).not.toBe(before)
    expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith(readout().value)
  })

  it('regenerates without copying when autoCopy turns off', () => {
    const view = render(<PasswordGenerator defaultLength={64} autoCopy />)
    const before = readout().value
    view.rerender(<PasswordGenerator defaultLength={64} />)
    expect(readout().value).not.toBe(before)
    expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith(before)
  })

  it('keeps the password across a re-render that changes no policy', () => {
    const view = render(<PasswordGenerator defaultLength={64} autoCopy />)
    const before = readout().value
    view.rerender(<PasswordGenerator defaultLength={64} autoCopy ariaLabel="Generator" />)
    expect(readout().value).toBe(before)
    expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
  })

  it('keeps the readout in sync when the charset toggles without autoCopy', () => {
    render(<PasswordGenerator defaultLength={64} />)
    fireEvent.click(toggle('uppercase'))
    fireEvent.click(toggle('lowercase'))
    fireEvent.click(toggle('symbols'))
    expect(readout().value).toMatch(/^[0-9]+$/)
    expect(copyTextWithFallbackMock).not.toHaveBeenCalled()
  })
})
