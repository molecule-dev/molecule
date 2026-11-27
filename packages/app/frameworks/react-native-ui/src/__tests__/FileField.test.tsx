// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement, createRef, type MouseEvent, type ReactNode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { unbond } from '@molecule/app-bond'
import { type FilePickerProvider, setProvider } from '@molecule/app-file-picker'
import type { PickedFile } from '@molecule/app-filesystem'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { type FileFieldHandle, setClassMap } from '@molecule/app-ui'
import { FileField as RootFileField } from '@molecule/app-ui-react'
import { classMap } from '@molecule/app-ui-tailwind'

import { FileField, isRegistered } from '../elements/index.js'
import * as nativeKit from '../index.js'

interface HostProps {
  children?: ReactNode
  disabled?: boolean
  focusable?: boolean
  id?: string
  role?: string
  testID?: string
  'aria-label'?: string
  'aria-disabled'?: boolean
  onPress?: (event: MouseEvent<HTMLButtonElement>) => void
}

vi.mock('react-native', () => ({
  Platform: { OS: 'android', select: ({ default: value }: { default: unknown }) => value },
  StyleSheet: { create: (styles: object) => styles },
  Pressable: (props: HostProps) =>
    createElement(
      'button',
      {
        type: 'button',
        id: props.id,
        role: props.role,
        'data-testid': props.testID,
        tabIndex: props.focusable ? 0 : -1,
        'aria-label': props['aria-label'],
        'aria-disabled': props['aria-disabled'],
        disabled: props.disabled,
        onClick: props.onPress,
      },
      props.children,
    ),
  Text: ({ children }: HostProps) => createElement('span', null, children),
  View: ({ children }: HostProps) => createElement('div', null, children),
}))
vi.mock('react-native-svg', () => ({ Svg: () => null }))
vi.mock('react-native-url-polyfill', () => ({ URL }))
vi.mock('@react-native-community/slider', () => ({ default: () => null }))
vi.mock('react-native-safe-area-context', async () => {
  const { createContext } = await import('react')
  return { SafeAreaInsetsContext: createContext(null) }
})

function file(name: string, type: string, size: number): PickedFile {
  return {
    name,
    type,
    size,
    arrayBuffer: async () => new ArrayBuffer(size),
    appendTo: vi.fn(),
  }
}

const png = file('photo.png', 'image/png', 3)
const pdf = file('report.pdf', 'application/pdf', 4)
const txt = file('notes.txt', 'text/plain', 5)

const pickFiles = vi.fn<FilePickerProvider['pickFiles']>()
const onValueChange = vi.fn<(files: readonly PickedFile[]) => void>()
const onRejected = vi.fn<(files: readonly PickedFile[]) => void>()
const onPickError = vi.fn<(error: Error) => void>()
const callbacks = { onValueChange, onRejected, onPickError }

beforeEach(() => {
  vi.resetAllMocks()
  setClassMap(classMap)
  setProvider({ pickFiles })
})

afterEach(() => {
  cleanup()
  unbond('file-picker')
  vi.restoreAllMocks()
})

async function press(target = screen.getByTestId('file-field')): Promise<void> {
  await act(async () => {
    fireEvent.click(target)
  })
}

it('opens the bonded picker from an external button and ignores the handle while disabled', async () => {
  expect(RootFileField).toBe(FileField)
  expect(nativeKit).toHaveProperty('FileField', FileField)
  const picker = createRef<FileFieldHandle>()
  const view = (disabled: boolean): ReactNode => (
    <>
      <button type="button" onClick={() => picker.current?.pick()}>
        Choose attachments
      </button>
      <RootFileField
        ref={picker}
        externalTrigger
        disabled={disabled}
        accept=".pdf"
        {...callbacks}
      />
    </>
  )
  pickFiles.mockResolvedValue([png, pdf])
  const { rerender } = render(view(false))
  const button = screen.getByRole('button', { name: 'Choose attachments' })

  await press(button)
  expect(pickFiles).toHaveBeenCalledExactlyOnceWith({ accept: '.pdf', includeRejected: true })
  expect(onValueChange).toHaveBeenCalledExactlyOnceWith([pdf])
  expect(onRejected).toHaveBeenCalledExactlyOnceWith([png])
  expect(screen.queryByTestId('file-field')).toBeNull()

  rerender(view(true))
  await press(button)
  expect(pickFiles).toHaveBeenCalledTimes(1)
  expect(onValueChange).toHaveBeenCalledTimes(1)
})

function holdSelection(): {
  result: Promise<readonly PickedFile[]>
  finish(files: readonly PickedFile[]): void
} {
  let resolve: (files: readonly PickedFile[]) => void = () => {
    throw new Error('Expected the pending selection')
  }
  const result = new Promise<readonly PickedFile[]>((finish) => {
    resolve = finish
  })
  return { result, finish: resolve }
}

it('browse delivers both files in selection order', async () => {
  pickFiles.mockResolvedValue([png, pdf])
  render(
    <FileField
      {...callbacks}
      id="attachments"
      accept="image/*,.pdf"
      multiple
      aria-label="Attachments"
    >
      Choose attachments
    </FileField>,
  )

  const target = screen.getByRole('button', { name: 'Attachments' })
  expect(target.id).toBe('attachments')
  expect(target.tabIndex).toBe(0)
  expect(target.textContent).toBe('Choose attachments')
  expect(isRegistered(FileField)).toBe(true)
  await press(target)

  expect(pickFiles).toHaveBeenCalledExactlyOnceWith({
    accept: 'image/*,.pdf',
    multiple: true,
    includeRejected: true,
  })
  expect(onValueChange).toHaveBeenCalledExactlyOnceWith([png, pdf])
  expect(onRejected).not.toHaveBeenCalled()
  expect(onPickError).not.toHaveBeenCalled()
})

it('reselecting the same file calls back twice', async () => {
  pickFiles.mockResolvedValue([pdf])
  render(<FileField {...callbacks} />)

  await press()
  await press()

  expect(onValueChange.mock.calls).toEqual([[[pdf]], [[pdf]]])
})

it('cancelling keeps the previous selection without a callback', async () => {
  pickFiles.mockResolvedValueOnce([pdf]).mockResolvedValueOnce([])
  render(<FileField {...callbacks} />)

  await press()
  await press()

  expect(pickFiles).toHaveBeenCalledTimes(2)
  expect(onValueChange).toHaveBeenCalledExactlyOnceWith([pdf])
  expect(onRejected).not.toHaveBeenCalled()
  expect(onPickError).not.toHaveBeenCalled()
})

it('disabling the field keeps the previous selection', async () => {
  pickFiles.mockResolvedValueOnce([pdf]).mockResolvedValueOnce([png])
  const { rerender } = render(<FileField {...callbacks} />)
  await press()

  rerender(<FileField {...callbacks} disabled />)
  const target = screen.getByTestId('file-field')
  expect(target.getAttribute('aria-disabled')).toBe('true')
  expect(target.tabIndex).toBe(-1)
  await press(target)

  expect(pickFiles).toHaveBeenCalledTimes(1)
  expect(onValueChange).toHaveBeenCalledExactlyOnceWith([pdf])
  expect(onRejected).not.toHaveBeenCalled()
  expect(onPickError).not.toHaveBeenCalled()
})

it('browse applies the inclusive per-file maximum', async () => {
  pickFiles.mockResolvedValueOnce([txt, pdf]).mockResolvedValueOnce([png, txt])
  render(<FileField {...callbacks} maxSize={4} multiple />)

  await press()
  await press()

  expect(onValueChange.mock.calls).toEqual([[[pdf]], [[png]]])
  expect(onRejected.mock.calls).toEqual([[[txt]], [[txt]]])
})

it('a zero-byte maximum keeps an empty file and rejects one byte', async () => {
  const one = file('one.txt', 'text/plain', 1)
  const zero = file('zero.pdf', 'application/pdf', 0)
  pickFiles.mockResolvedValue([one, zero])
  render(<FileField {...callbacks} maxSize={0} />)

  await press()

  expect(onValueChange).toHaveBeenCalledExactlyOnceWith([zero])
  expect(onRejected).toHaveBeenCalledExactlyOnceWith([one])
})

it('single selection keeps the first accepted file after filtering', async () => {
  pickFiles.mockResolvedValue([txt, pdf, png])
  render(<FileField {...callbacks} accept=" .PDF, IMAGE/*, application/octet-stream " />)

  await press()

  expect(onValueChange).toHaveBeenCalledExactlyOnceWith([pdf])
  expect(onRejected).toHaveBeenCalledExactlyOnceWith([txt])
})

it('reports type and size rejections in original order without an empty value callback', async () => {
  pickFiles.mockResolvedValue([txt, pdf])
  render(<FileField {...callbacks} accept=".txt" maxSize={4} multiple />)

  await press()

  expect(onRejected).toHaveBeenCalledExactlyOnceWith([txt, pdf])
  expect(onValueChange).not.toHaveBeenCalled()
  expect(onPickError).not.toHaveBeenCalled()
})

it('reports the chooser error and permits retry', async () => {
  const error = new Error('chooser failed')
  pickFiles.mockRejectedValueOnce(error).mockResolvedValueOnce([pdf])
  render(<FileField {...callbacks} />)

  await press()
  expect(onPickError).toHaveBeenCalledExactlyOnceWith(error)
  expect(onValueChange).not.toHaveBeenCalled()
  expect(onRejected).not.toHaveBeenCalled()

  await press()
  expect(onValueChange).toHaveBeenCalledExactlyOnceWith([pdf])
})

it('surfaces an unhandled chooser failure through the host error channel', async () => {
  const error = new Error('chooser failed')
  pickFiles.mockRejectedValue(error)
  render(<FileField onValueChange={onValueChange} />)

  vi.useFakeTimers({ toFake: ['queueMicrotask'] })
  try {
    fireEvent.click(screen.getByTestId('file-field'))
    await Promise.resolve()
    await Promise.resolve()

    expect(() => vi.runAllTicks()).toThrow(error)
    expect(onValueChange).not.toHaveBeenCalled()
  } finally {
    vi.useRealTimers()
  }
})

it('names the Expo package and bonding call when no picker is bonded', async () => {
  unbond('file-picker')
  render(<FileField {...callbacks} />)

  await press()

  expect(onPickError).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      message: expect.stringMatching(
        /@molecule\/app-file-picker-expo.*setProvider\(provider\).*setupProviders\(\)/,
      ),
    }),
  )
  expect(onValueChange).not.toHaveBeenCalled()
  expect(onRejected).not.toHaveBeenCalled()
})

it('opens one chooser and uses the latest committed rules and callbacks when it returns', async () => {
  const { result, finish } = holdSelection()
  const receive = vi.fn<(files: readonly PickedFile[]) => void>()
  pickFiles.mockReturnValue(result)
  const { rerender } = render(<FileField {...callbacks} multiple />)

  await press()
  await press()
  expect(pickFiles).toHaveBeenCalledTimes(1)

  rerender(<FileField {...callbacks} onValueChange={receive} accept=".pdf" />)
  await act(async () => finish([png, pdf]))

  expect(receive).toHaveBeenCalledExactlyOnceWith([pdf])
  expect(onValueChange).not.toHaveBeenCalled()
  expect(onRejected).toHaveBeenCalledExactlyOnceWith([png])
})

it('discards an in-flight result if the field was disabled before it returned', async () => {
  const { result, finish } = holdSelection()
  pickFiles.mockReturnValueOnce(result).mockResolvedValueOnce([pdf])
  const { rerender } = render(<FileField {...callbacks} />)

  await press()
  rerender(<FileField {...callbacks} disabled />)
  rerender(<FileField {...callbacks} />)
  await act(async () => finish([png]))

  expect(onValueChange).not.toHaveBeenCalled()
  expect(onRejected).not.toHaveBeenCalled()
  expect(onPickError).not.toHaveBeenCalled()

  await press()
  expect(onValueChange).toHaveBeenCalledExactlyOnceWith([pdf])
})

it('discards an in-flight result when the field unmounts', async () => {
  const { result, finish } = holdSelection()
  pickFiles.mockReturnValueOnce(result)
  const { unmount } = render(<FileField {...callbacks} />)

  await press()
  unmount()
  await act(async () => finish([png]))

  expect(onValueChange).not.toHaveBeenCalled()
  expect(onRejected).not.toHaveBeenCalled()
  expect(onPickError).not.toHaveBeenCalled()
})

it('uses the translated browse label and honours a supplied label and role', () => {
  const i18n = createSimpleI18nProvider('fr', [
    {
      code: 'fr',
      name: 'French',
      direction: 'ltr',
      translations: { 'ui.fileField.browse': 'Choisir un document' },
    },
  ])
  const { rerender } = render(
    <I18nProvider provider={i18n}>
      <FileField {...callbacks} />
    </I18nProvider>,
  )
  expect(screen.getByRole('button', { name: 'Choisir un document' })).toBeDefined()

  rerender(
    <I18nProvider provider={i18n}>
      <FileField {...callbacks} role="link" aria-label="Attachments" data-mol-id="attachments" />
    </I18nProvider>,
  )
  expect(screen.getByRole('link', { name: 'Attachments' })).toBe(screen.getByTestId('attachments'))
})
