// @vitest-environment jsdom

import { act, fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React, { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { JoinCode } from '../JoinCode.js'

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings, every
 * other property/method access returns its key as a string token.
 *
 * @returns A UIClassMap stub suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
      }
      const token = String(prop)
      const fn = (..._args: unknown[]): string => token
      return new Proxy(fn, {
        get(_t, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({}, handler) as unknown as UIClassMap
}

/**
 * Wrap children in I18nProvider.
 *
 * @param props - Props.
 * @param props.children - Children.
 * @returns The wrapped element tree.
 */
function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

/**
 * Find a slot input by its 0-based index.
 *
 * @param index - Slot index.
 * @returns The HTML input element.
 */
function getSlot(index: number): HTMLInputElement {
  const el = document.querySelector(`[data-mol-id="join-code-slot-${index}"]`)
  if (!(el instanceof HTMLInputElement)) {
    throw new Error(`No slot input at index ${index}`)
  }
  return el
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('<JoinCode>', () => {
  it('renders the configured number of slots (default 6)', () => {
    render(
      <Wrap>
        <JoinCode />
      </Wrap>,
    )
    const slots = document.querySelectorAll('[data-mol-id^="join-code-slot-"]')
    expect(slots.length).toBe(6)
  })

  it('renders custom length', () => {
    render(
      <Wrap>
        <JoinCode length={4} />
      </Wrap>,
    )
    const slots = document.querySelectorAll('[data-mol-id^="join-code-slot-"]')
    expect(slots.length).toBe(4)
  })

  it('typing a character advances focus to the next slot', () => {
    render(
      <Wrap>
        <JoinCode length={4} />
      </Wrap>,
    )
    const s0 = getSlot(0)
    s0.focus()
    fireEvent.change(s0, { target: { value: 'A' } })
    expect(getSlot(0).value).toBe('A')
    expect(document.activeElement).toBe(getSlot(1))
  })

  it('uppercases letters under alphanumeric alphabet', () => {
    const onChange = vi.fn()
    render(
      <Wrap>
        <JoinCode length={4} onChange={onChange} />
      </Wrap>,
    )
    const s0 = getSlot(0)
    fireEvent.change(s0, { target: { value: 'a' } })
    expect(getSlot(0).value).toBe('A')
    expect(onChange).toHaveBeenCalledWith('A')
  })

  it('strips characters outside the numeric alphabet', () => {
    const onChange = vi.fn()
    render(
      <Wrap>
        <JoinCode length={4} alphabet="numeric" onChange={onChange} />
      </Wrap>,
    )
    const s0 = getSlot(0)
    fireEvent.change(s0, { target: { value: 'A' } })
    // 'A' stripped — value stays empty.
    expect(getSlot(0).value).toBe('')
    fireEvent.change(s0, { target: { value: '7' } })
    expect(getSlot(0).value).toBe('7')
    expect(onChange).toHaveBeenLastCalledWith('7')
  })

  it('strips characters outside the letters alphabet', () => {
    render(
      <Wrap>
        <JoinCode length={4} alphabet="letters" />
      </Wrap>,
    )
    const s0 = getSlot(0)
    fireEvent.change(s0, { target: { value: '7' } })
    expect(getSlot(0).value).toBe('')
    fireEvent.change(s0, { target: { value: 'q' } })
    expect(getSlot(0).value).toBe('Q')
  })

  it('backspace on an empty slot focuses and clears the previous slot', () => {
    render(
      <Wrap>
        <JoinCode length={4} defaultValue="AB" />
      </Wrap>,
    )
    expect(getSlot(0).value).toBe('A')
    expect(getSlot(1).value).toBe('B')
    expect(getSlot(2).value).toBe('')
    const s2 = getSlot(2)
    s2.focus()
    fireEvent.keyDown(s2, { key: 'Backspace' })
    // Slot 1's value is removed; focus moves back.
    expect(getSlot(1).value).toBe('')
    expect(document.activeElement).toBe(getSlot(1))
  })

  it('arrow-left / arrow-right move focus between slots', () => {
    render(
      <Wrap>
        <JoinCode length={4} />
      </Wrap>,
    )
    const s0 = getSlot(0)
    s0.focus()
    fireEvent.keyDown(s0, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(getSlot(1))
    fireEvent.keyDown(getSlot(1), { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(getSlot(0))
  })

  it('paste-to-fill distributes characters across slots and truncates to length', () => {
    const onChange = vi.fn()
    render(
      <Wrap>
        <JoinCode length={4} onChange={onChange} />
      </Wrap>,
    )
    const s0 = getSlot(0)
    s0.focus()
    fireEvent.paste(s0, {
      clipboardData: { getData: () => 'abcdef' },
    })
    expect(getSlot(0).value).toBe('A')
    expect(getSlot(1).value).toBe('B')
    expect(getSlot(2).value).toBe('C')
    expect(getSlot(3).value).toBe('D')
    expect(onChange).toHaveBeenCalledWith('ABCD')
  })

  it('paste under numeric alphabet drops invalid characters', () => {
    const onChange = vi.fn()
    render(
      <Wrap>
        <JoinCode length={6} alphabet="numeric" onChange={onChange} />
      </Wrap>,
    )
    const s0 = getSlot(0)
    s0.focus()
    fireEvent.paste(s0, {
      clipboardData: { getData: () => '12-345' },
    })
    expect(onChange).toHaveBeenCalledWith('12345')
  })

  it('fires onComplete once when the code is filled', () => {
    const onComplete = vi.fn()
    render(
      <Wrap>
        <JoinCode length={3} onComplete={onComplete} />
      </Wrap>,
    )
    fireEvent.change(getSlot(0), { target: { value: '1' } })
    fireEvent.change(getSlot(1), { target: { value: '2' } })
    expect(onComplete).not.toHaveBeenCalled()
    fireEvent.change(getSlot(2), { target: { value: '3' } })
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledWith('123')
  })

  it('does not fire onComplete when autoSubmit is false', () => {
    const onComplete = vi.fn()
    render(
      <Wrap>
        <JoinCode length={3} autoSubmit={false} onComplete={onComplete} />
      </Wrap>,
    )
    fireEvent.change(getSlot(0), { target: { value: '1' } })
    fireEvent.change(getSlot(1), { target: { value: '2' } })
    fireEvent.change(getSlot(2), { target: { value: '3' } })
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('controlled mode reflects parent value and ignores invalid chars at render', () => {
    /**
     * Parent that maintains controlled state.
     *
     * @returns The controlled `<JoinCode>`.
     */
    function Parent(): React.ReactElement {
      const [value, setValue] = useState('AB')
      return <JoinCode length={4} value={value} onChange={setValue} />
    }
    render(
      <Wrap>
        <Parent />
      </Wrap>,
    )
    expect(getSlot(0).value).toBe('A')
    expect(getSlot(1).value).toBe('B')
    expect(getSlot(2).value).toBe('')
    act(() => {
      fireEvent.change(getSlot(2), { target: { value: 'c' } })
    })
    expect(getSlot(2).value).toBe('C')
  })

  it('uncontrolled mode honours defaultValue and clamps to length', () => {
    render(
      <Wrap>
        <JoinCode length={4} defaultValue="HELLO-WORLD" alphabet="alphanumeric" />
      </Wrap>,
    )
    expect(getSlot(0).value).toBe('H')
    expect(getSlot(1).value).toBe('E')
    expect(getSlot(2).value).toBe('L')
    expect(getSlot(3).value).toBe('L')
  })
})
