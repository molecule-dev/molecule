// @vitest-environment jsdom
import { act, createRef, type Ref, useImperativeHandle } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import type { ClientSearchDocument } from '@molecule/app-client-search'
import { type SearchSession, useSearchSession } from '@molecule/app-client-search-react'
import type { ElementHandle } from '@molecule/app-ui'

import { TextField } from '../elements/TextField.js'

interface NativeTextInputHandle {
  focus(): void
  blur(): void
  setSelection(start: number, end: number): void
}

interface InputProps {
  ref?: Ref<NativeTextInputHandle>
  onChangeText?(value: string): void
}

const { focus, blur, setSelection, onInputRender } = vi.hoisted(() => ({
  focus: vi.fn(),
  blur: vi.fn(),
  setSelection: vi.fn(),
  onInputRender: vi.fn<(props: InputProps) => void>(),
}))

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => ({}),
}))
vi.mock('react-native', () => ({
  Platform: { select: ({ default: value }: { default: string }) => value },
  TextInput: function NativeInput(props: InputProps): null {
    useImperativeHandle(props.ref, () => ({ focus, blur, setSelection }), [])
    onInputRender(props)
    return null
  },
  useWindowDimensions: () => ({ width: 640 }),
}))

let root: Root
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.clearAllMocks()
  root = createRoot(document.createElement('div'))
})
afterEach(() => {
  act(() => root.unmount())
  vi.unstubAllGlobals()
})

const options = { idField: 'id', fields: ['name'] }

it('focuses and selects the current query even if the search field is already focused', () => {
  let search: SearchSession<ClientSearchDocument, ElementHandle> | undefined
  function Search(): React.JSX.Element {
    search = useSearchSession<ClientSearchDocument, ElementHandle>({
      docs: null,
      options,
      syncUrl: false,
      onOpen: vi.fn(),
    })
    return (
      <TextField
        as="input"
        type="search"
        ref={search.inputRef}
        value={search.query}
        onValueChange={search.setQuery}
      />
    )
  }
  act(() => root.render(<Search />))
  act(() => search?.setQuery('first'))
  act(() => search?.focus())
  expect(setSelection).toHaveBeenLastCalledWith(0, 5)

  act(() => onInputRender.mock.lastCall?.[0].onChangeText?.('search 🔍'))
  act(() => search?.focus())
  expect(setSelection).toHaveBeenLastCalledWith(0, 'search 🔍'.length)
  expect(focus).toHaveBeenCalledTimes(2)
  expect(focus.mock.invocationCallOrder[1]).toBeLessThan(setSelection.mock.invocationCallOrder[1])
})

it('selects the edited value of an uncontrolled text area without replacing its host handle', () => {
  const ref = createRef<ElementHandle>()
  act(() => root.render(<TextField as="textarea" defaultValue="one" ref={ref} />))
  const handle = ref.current
  expect(handle?.select).toBeTypeOf('function')
  act(() => handle?.select?.())
  expect(setSelection).toHaveBeenLastCalledWith(0, 3)
  act(() => onInputRender.mock.lastCall?.[0].onChangeText?.('one\ntwo'))
  expect(ref.current).toBe(handle)
  act(() => handle?.select?.())
  expect(setSelection).toHaveBeenLastCalledWith(0, 7)
})
