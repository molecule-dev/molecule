// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { expect, expectTypeOf, it, vi } from 'vitest'

import type {
  AriaAttributes,
  BoxProps,
  ElementProps,
  TextFieldProps,
  TextProps,
} from '@molecule/app-ui'

import { Box } from '../Box.js'
import { Pressable } from '../Pressable.js'
import { G, Path, Svg, SvgText } from '../Svg.js'
import { Text } from '../Text.js'
import { TextField } from '../TextField.js'

it('preserves mounted content and writes the original HTML attributes', () => {
  expectTypeOf<BoxProps['hidden']>().toEqualTypeOf<boolean | undefined>()
  expectTypeOf<TextProps['translate']>().toEqualTypeOf<'yes' | 'no' | undefined>()
  expectTypeOf<AriaAttributes['aria-level']>().toEqualTypeOf<number | undefined>()
  expectTypeOf<AriaAttributes['aria-rowcount']>().toEqualTypeOf<number | undefined>()
  expectTypeOf<AriaAttributes['aria-colcount']>().toEqualTypeOf<number | undefined>()
  expectTypeOf<AriaAttributes['aria-rowindex']>().toEqualTypeOf<number | undefined>()
  expectTypeOf<AriaAttributes['aria-colindex']>().toEqualTypeOf<number | undefined>()

  function Counter(): React.ReactElement {
    const [count, setCount] = useState(0)
    return (
      <Pressable as="button" onClick={() => setCount(count + 1)}>
        {count}
      </Pressable>
    )
  }
  const tree = (hidden: boolean): React.ReactElement => (
    <Box
      as="div"
      role="tree"
      hidden={hidden}
      aria-rowcount={3}
      aria-colcount={2}
      data-testid="tree"
    >
      <Box as="div" role="treeitem" aria-level={3} aria-rowindex={2} aria-colindex={1}>
        <Text as="kbd" translate="no">
          Ctrl
        </Text>
        <Counter />
      </Box>
    </Box>
  )
  const { rerender } = render(tree(false))
  const button = screen.getByRole('button')
  fireEvent.click(button)
  rerender(tree(true))
  expect(screen.getByTestId('tree').outerHTML).toContain('hidden=""')
  expect(screen.queryByRole('button')).toBeNull()
  rerender(tree(false))
  expect(screen.getByRole('button')).toBe(button)
  expect(button.textContent).toBe('1')
  expect(screen.getByTestId('tree').getAttribute('aria-rowcount')).toBe('3')
  expect(screen.getByTestId('tree').getAttribute('aria-colcount')).toBe('2')
  const item = screen.getByRole('treeitem')
  expect(item.getAttribute('aria-level')).toBe('3')
  expect(item.getAttribute('aria-rowindex')).toBe('2')
  expect(item.getAttribute('aria-colindex')).toBe('1')
  expect(screen.getByText('Ctrl').outerHTML).toBe('<kbd translate="no">Ctrl</kbd>')
})

it('renders and updates language on text, its container, and a control label', () => {
  expectTypeOf<ElementProps['lang']>().toEqualTypeOf<string | undefined>()
  const tree = (lang?: string): React.ReactElement => (
    <Box as="div" lang={lang} data-testid="translated-content">
      <Text as="span" lang="fr-CA">
        Bonjour
      </Text>
      <Pressable as="button" lang="es-MX">
        Continuar
      </Pressable>
    </Box>
  )
  const { rerender } = render(tree('en-GB'))
  const container = screen.getByTestId('translated-content')
  expect(container.getAttribute('lang')).toBe('en-GB')
  expect(screen.getByText('Bonjour').getAttribute('lang')).toBe('fr-CA')
  expect(screen.getByRole('button', { name: 'Continuar' }).getAttribute('lang')).toBe('es-MX')
  rerender(tree('pt-BR'))
  expect(container.getAttribute('lang')).toBe('pt-BR')
  rerender(tree())
  expect(container.hasAttribute('lang')).toBe(false)
})

it('forwards exact text hints and selects the slot on focus', () => {
  expectTypeOf<TextFieldProps['autoCorrect']>().toEqualTypeOf<'on' | 'off' | undefined>()
  render(
    <>
      <TextField
        as="input"
        type="search"
        spellCheck={false}
        autoCorrect="off"
        enterKeyHint="search"
      />
      <TextField as="input" defaultValue="A" selectTextOnFocus aria-label="Slot" />
    </>,
  )
  const search = screen.getByRole('searchbox')
  expect(search.getAttribute('spellcheck')).toBe('false')
  expect(search.getAttribute('autocorrect')).toBe('off')
  expect(search.getAttribute('enterkeyhint')).toBe('search')
  const slot = screen.getByRole<HTMLInputElement>('textbox', { name: 'Slot' })
  expect(slot.hasAttribute('spellcheck')).toBe(false)
  expect(slot.hasAttribute('autocorrect')).toBe(false)
  expect(slot.hasAttribute('enterkeyhint')).toBe(false)
  slot.setSelectionRange(1, 1)
  const select = vi.spyOn(slot, 'select')
  fireEvent.focus(slot)
  expect(select).toHaveBeenCalledOnce()
  expect(slot.hasAttribute('selecttextonfocus')).toBe(false)
})

it('consumes only nonempty plain text at the closest subscriber before insertion', () => {
  const outer = vi.fn()
  const cell = vi.fn()
  const change = vi.fn()
  render(
    <Box as="div" role="grid" onPasteText={outer}>
      <TextField
        as="input"
        aria-label="Slot"
        maxLength={1}
        onPasteText={cell}
        onValueChange={change}
      />
      <TextField as="input" aria-label="Grid editor" />
    </Box>,
  )
  const slot = screen.getByRole('textbox', { name: 'Slot' })
  const paste = (element: HTMLElement, text: string): boolean =>
    fireEvent.paste(element, {
      clipboardData: { getData: (type: string) => (type === 'text/plain' ? text : '') },
    })
  expect(paste(slot, 'ABC123')).toBe(false)
  expect(paste(slot, 'X')).toBe(false)
  expect(paste(slot, '')).toBe(true)
  expect(cell.mock.calls).toEqual([['ABC123'], ['X']])
  expect(outer).not.toHaveBeenCalled()
  expect(paste(screen.getByRole('textbox', { name: 'Grid editor' }), 'a\tb\nc\td')).toBe(false)
  expect(outer.mock.calls).toEqual([['a\tb\nc\td']])
  fireEvent.change(slot, { target: { value: '世界' } })
  expect(change.mock.calls).toEqual([['世界']])
  expect(cell).toHaveBeenCalledTimes(2)
})

it('keeps real mouse cancellation and dismisses only for an outside press', () => {
  const context = vi.fn((event: { preventDefault(): void }) => event.preventDefault())
  const down = vi.fn((event: { preventDefault(): void }) => event.preventDefault())
  const outside = vi.fn()
  render(
    <>
      <Box as="div" onContextMenu={context} onPressOutside={outside} data-testid="popup">
        <Pressable as="li" role="option" onMouseDown={down}>
          Suggestion
        </Pressable>
      </Box>
      <Box as="div" data-testid="outside" />
    </>,
  )
  const option = screen.getByRole('option')
  expect(fireEvent.mouseDown(option)).toBe(false)
  expect(fireEvent.contextMenu(option, { button: 2 })).toBe(false)
  expect(down.mock.calls[0]?.[0]).toMatchObject({ type: 'mousedown', target: option })
  expect(context.mock.calls[0]?.[0]).toMatchObject({
    type: 'contextmenu',
    button: 2,
    target: option,
  })
  expect(outside).not.toHaveBeenCalled()
  fireEvent.mouseDown(screen.getByTestId('outside'))
  expect(outside).toHaveBeenCalledOnce()
})

it('writes SVG accessibility, behavior and paint on the original shape nodes', () => {
  const node = vi.fn()
  const word = vi.fn()
  render(
    <Svg width={30} height={30} data-testid="svg">
      <G
        role="button"
        aria-label="Node"
        tabIndex={0}
        onClick={node}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            node()
          }
        }}
      >
        <Path
          d="M0 0L8 8"
          data-mol-id="edge"
          style={{ stroke: 'red', pointerEvents: 'none' }}
          webStyle={{ cursor: 'pointer' }}
        />
      </G>
      <SvgText dominantBaseline="central" data-testid="word" tabIndex={0} onClick={word}>
        Word
      </SvgText>
    </Svg>,
  )
  const group = screen.getByRole('button', { name: 'Node' })
  expect(group.localName).toBe('g')
  expect(group.parentElement).toBe(screen.getByTestId('svg'))
  const path = group.querySelector('path')
  expect(path?.getAttribute('data-mol-id')).toBe('edge')
  expect(path?.getAttribute('style')).toBe('stroke: red; pointer-events: none; cursor: pointer;')
  expect(path?.getAttribute('webstyle')).toBeNull()
  expect(fireEvent.keyDown(group, { key: 'Enter' })).toBe(false)
  expect(fireEvent.keyDown(group, { key: ' ' })).toBe(false)
  fireEvent.click(group)
  expect(node).toHaveBeenCalledTimes(3)
  const text = screen.getByTestId('word')
  expect(text.localName).toBe('text')
  expect(text.getAttribute('dominant-baseline')).toBe('central')
  fireEvent.keyDown(text, { key: 'Enter' })
  expect(word).not.toHaveBeenCalled()
  fireEvent.click(text)
  expect(word).toHaveBeenCalledOnce()
})
