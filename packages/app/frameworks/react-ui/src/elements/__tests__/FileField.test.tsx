// @vitest-environment jsdom
import { cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, expect, it, vi } from 'vitest'

import type { FileFieldHandle } from '@molecule/app-ui'

import { FileField } from '../FileField.js'

afterEach(cleanup)

it('keeps a styled legacy drop surface and its disabled input in the original tab order', () => {
  const onValueChange = vi.fn()
  const { container } = render(
    <FileField
      disabled
      tabIndex={0}
      webInputDisplayNone
      webStyle={{ minHeight: 140 }}
      onValueChange={onValueChange}
    >
      Attach files
    </FileField>,
  )
  const target = screen.getByRole('button', { name: 'Attach files' })
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('FileField did not render a file input')

  expect(target.tabIndex).toBe(0)
  expect(target.style.minHeight).toBe('140px')
  expect(target.getAttribute('aria-disabled')).toBe('true')
  expect(input.hidden).toBe(false)
  expect(input.style.display).toBe('none')
  expect(input.disabled).toBe(true)
  expect(input.name).toBe('')
  const open = vi.spyOn(input, 'click')
  fireEvent.click(target)
  fireEvent.keyDown(target, { key: 'Enter' })
  fireEvent.change(input, { target: { files: [new File(['x'], 'ignored.txt')] } })
  expect(open).not.toHaveBeenCalled()
  expect(onValueChange).not.toHaveBeenCalled()
})

it('reports browser drag highlight changes without interfering with file delivery', () => {
  const onActiveChange = vi.fn()
  const onValueChange = vi.fn()
  const { rerender } = render(
    <FileField webDrop={{ onActiveChange }} onValueChange={onValueChange}>
      Attach files
    </FileField>,
  )
  const target = screen.getByRole('button', { name: 'Attach files' })
  const png = new File(['png'], 'photo.png', { type: 'image/png' })
  const transfer = { dataTransfer: { files: [png] } }
  const over = createEvent.dragOver(target, transfer)
  fireEvent(target, over)
  expect(over.defaultPrevented).toBe(true)
  fireEvent.dragLeave(target)
  fireEvent.dragOver(target, transfer)
  fireEvent.drop(target, transfer)

  expect(onActiveChange.mock.calls).toEqual([[true], [false], [true], [false]])
  expect(onValueChange).toHaveBeenCalledExactlyOnceWith([
    expect.objectContaining({ name: 'photo.png', size: 3, type: 'image/png' }),
  ])
  onActiveChange.mockClear()
  rerender(
    <FileField disabled webDrop={{ onActiveChange }} onValueChange={onValueChange}>
      Attach files
    </FileField>,
  )
  const disabledOver = createEvent.dragOver(target, transfer)
  fireEvent(target, disabledOver)
  expect(disabledOver.defaultPrevented).toBe(false)
  expect(onActiveChange).not.toHaveBeenCalled()
  fireEvent.drop(target, transfer)
  expect(onActiveChange).toHaveBeenCalledExactlyOnceWith(false)
  expect(onValueChange).toHaveBeenCalledTimes(1)
})

it('uses one hidden chooser with a separate drop target and a stricter drop policy', () => {
  const target = document.createElement('div')
  const field = createRef<FileFieldHandle>()
  const onDrop = vi.fn()
  const onPick = vi.fn()
  const onRejected = vi.fn()
  const png = new File(['png'], 'photo.png', { type: 'image/png' })
  const jpg = new File(['jpg'], 'photo.jpg', { type: 'image/jpeg' })
  const txt = new File(['txt'], 'notes.txt', { type: 'text/plain' })
  const { container, unmount } = render(
    <FileField
      externalTrigger
      ref={field}
      accept="image/*"
      onValueChange={onPick}
      onRejected={onRejected}
      webInputDisplayNone
      webDrop={{ target, multiple: true, rejectBatch: true, onValueChange: onDrop }}
    />,
  )
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input || !field.current) throw new Error('The chooser or its handle is missing')
  expect(container.children).toHaveLength(1)
  expect(container.firstElementChild).toBe(input)
  expect(input.multiple).toBe(false)
  const click = vi.spyOn(input, 'click')
  field.current.pick()
  expect(click).toHaveBeenCalledTimes(1)

  let inputValue = 'C:\\fakepath\\photo.png'
  Object.defineProperty(input, 'value', {
    configurable: true,
    get: () => inputValue,
    set: (value: string) => {
      inputValue = value
    },
  })
  onPick.mockImplementation(() => expect(input.value).toBe(''))
  fireEvent.change(input, { target: { files: [png, jpg] } })
  inputValue = 'C:\\fakepath\\photo.png'
  fireEvent.change(input, { target: { files: [png] } })
  expect(onPick.mock.calls).toEqual([
    [[expect.objectContaining({ name: png.name })]],
    [[expect.objectContaining({ name: png.name })]],
  ])

  expect(fireEvent.dragOver(target)).toBe(false)
  expect(fireEvent.drop(target, { dataTransfer: { files: [png, txt] } })).toBe(false)
  expect(onDrop).not.toHaveBeenCalled()
  expect(onRejected).toHaveBeenCalledExactlyOnceWith([expect.objectContaining({ name: txt.name })])
  fireEvent.drop(target, { dataTransfer: { files: [png, jpg] } })
  expect(onDrop).toHaveBeenCalledExactlyOnceWith([
    expect.objectContaining({ name: png.name }),
    expect.objectContaining({ name: jpg.name }),
  ])

  unmount()
  fireEvent.drop(target, { dataTransfer: { files: [png] } })
  expect(onDrop).toHaveBeenCalledTimes(1)
})
