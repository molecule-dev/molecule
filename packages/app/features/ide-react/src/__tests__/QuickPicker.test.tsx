// @vitest-environment jsdom

/**
 * `QuickPicker`'s keyboard driving. These tests pin that the handlers read the
 * CURRENT items/selection (the picker is used with a fresh `items` array on every
 * keystroke-driven filter) and that changing the list resets the selection in the
 * same render, so Enter always acts on the row the user sees highlighted.
 *
 * @module
 */

import { cleanup, fireEvent, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { ThemeProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { QuickPicker } from '../components/QuickPicker.js'
import type { QuickPickerItem } from '../types.js'
import { buildThemeProvider } from './theme-test-provider.js'

/**
 * Wrap children with the providers the picker resolves against.
 * @param root0 - Wrapper props.
 * @param root0.children - The component(s) under test.
 * @returns The wrapped tree.
 */
function Wrap({ children }: { children: ReactNode }): ReactElement {
  return <ThemeProvider provider={buildThemeProvider()}>{children}</ThemeProvider>
}

/**
 * Two label-only rows, identified by id.
 * @param ids - The row ids, in list order.
 * @returns The items.
 */
function itemsOf(...ids: string[]): QuickPickerItem[] {
  return ids.map((id) => ({ id, label: id.toUpperCase() }))
}

const onSelect = vi.fn()
const onDismiss = vi.fn()

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  Element.prototype.scrollIntoView = (): void => {}
  onSelect.mockClear()
  onDismiss.mockClear()
})

afterEach(cleanup)

describe('QuickPicker keyboard', () => {
  it('selects the highlighted row with Enter and moves with the arrows', () => {
    const { container } = render(
      <Wrap>
        <QuickPicker items={itemsOf('a', 'b')} onSelect={onSelect} onDismiss={onDismiss} />
      </Wrap>,
    )
    const input = container.querySelector('input') as HTMLInputElement

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect.mock.calls[0][0]).toMatchObject({ id: 'b' })
  })

  it('reads the latest items after the caller replaces the list', () => {
    const { container, rerender } = render(
      <Wrap>
        <QuickPicker items={itemsOf('a', 'b')} onSelect={onSelect} onDismiss={onDismiss} />
      </Wrap>,
    )
    const input = container.querySelector('input') as HTMLInputElement
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelect.mock.calls[0][0]).toMatchObject({ id: 'b' })

    // A new list resets the selection to its first row in the same render.
    rerender(
      <Wrap>
        <QuickPicker items={itemsOf('c', 'd')} onSelect={onSelect} onDismiss={onDismiss} />
      </Wrap>,
    )
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledTimes(2)
    expect(onSelect.mock.calls[1][0]).toMatchObject({ id: 'c' })
  })

  it('dismisses on Escape', () => {
    const { container } = render(
      <Wrap>
        <QuickPicker items={itemsOf('a')} onSelect={onSelect} onDismiss={onDismiss} />
      </Wrap>,
    )
    const input = container.querySelector('input') as HTMLInputElement
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(onSelect).not.toHaveBeenCalled()
  })
})
