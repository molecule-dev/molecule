// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react'
import { useEffect, useRef, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { useTagInput } = await import('../useTagInput.js')

/**
 * jsdom does not perform a browser's implicit form submission on Enter, so a
 * submit-count assertion would be vacuous without this: submit the enclosing
 * form when an Enter keydown reached the document NOT canceled.
 *
 * @param formRef - Ref to the form the input lives in.
 */
function useImplicitSubmissionEmulation(formRef: { current: HTMLFormElement | null }): void {
  useEffect(() => {
    const listener = (event: KeyboardEvent): void => {
      if (event.key === 'Enter' && !event.isComposing && !event.defaultPrevented)
        formRef.current?.requestSubmit()
    }
    document.addEventListener('keydown', listener)
    return () => document.removeEventListener('keydown', listener)
  }, [formRef])
}

interface EditorProps {
  initial?: string[]
  maxTags?: number
  normalize?: (raw: string, current: string[]) => string | null
  onSubmit: () => void
}

/**
 * An editor whose markup the app decided: the text input and the tag list are
 * SIBLINGS (not one wrapper), and each tag's remove control is an `<i>`, not a
 * button. `<TagInput>` cannot produce this; the hook must.
 *
 * @param props - Initial tags, limits, and a submit spy.
 */
function Editor({ initial = [], maxTags, normalize, onSubmit }: EditorProps) {
  const [tags, setTags] = useState(initial)
  const formRef = useRef<HTMLFormElement>(null)
  useImplicitSubmissionEmulation(formRef)
  const { inputProps, remove } = useTagInput({ value: tags, onChange: setTags, maxTags, normalize })
  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <input type="text" name="title" aria-label="title" />
      <input type="text" aria-label="tags" {...inputProps} />
      <ul data-testid="list">
        {tags.map((tag, i) => (
          <li key={tag}>
            <i data-testid={`remove-${tag}`} onClick={() => remove(i)} />
            {tag}
          </li>
        ))}
      </ul>
      <button type="submit">Publish</button>
    </form>
  )
}

/**
 * Renders the editor and returns its tag field plus the submit spy.
 *
 * @param props - Passed through to {@link Editor}.
 */
function mount(props: Omit<EditorProps, 'onSubmit'> = {}) {
  const onSubmit = vi.fn()
  render(<Editor {...props} onSubmit={onSubmit} />)
  const input = screen.getByLabelText('tags') as HTMLInputElement
  return { input, onSubmit }
}

const listed = (): string[] =>
  within(screen.getByTestId('list'))
    .queryAllByRole('listitem')
    .map((li) => li.textContent ?? '')

/**
 * Types `text` into the field the way a browser test's `fill` + `press('Enter')`
 * does: the value is replaced, then Enter is pressed.
 *
 * @param input - The tag field.
 * @param text - The tag text.
 * @returns Whether the Enter keydown was left uncanceled.
 */
function fillAndEnter(input: HTMLInputElement, text: string): boolean {
  fireEvent.change(input, { target: { value: text } })
  return fireEvent.keyDown(input, { key: 'Enter' })
}

afterEach(cleanup)

describe('useTagInput with app-owned markup', () => {
  it('keeps every accepted addition in a single React batch', () => {
    const { result } = renderHook(() => {
      const [value, onChange] = useState<string[]>([])
      return { tags: value, ...useTagInput({ value, onChange }) }
    })
    act(() => {
      expect(result.current.add('one')).toBe(true)
      expect(result.current.add('two')).toBe(true)
      expect(result.current.add('one')).toBe(false)
    })
    expect(result.current.tags).toEqual(['one', 'two'])
  })

  it('checks maxTags against additions already accepted in the same batch', () => {
    const { result } = renderHook(() => {
      const [value, onChange] = useState<string[]>([])
      return { tags: value, ...useTagInput({ value, onChange, maxTags: 1 }) }
    })
    act(() => {
      expect(result.current.add('one')).toBe(true)
      expect(result.current.add('two')).toBe(false)
    })
    expect(result.current.tags).toEqual(['one'])
  })

  it('composes removal and addition without restoring a removed tag', () => {
    const { result } = renderHook(() => {
      const [value, onChange] = useState(['one', 'two'])
      return { tags: value, ...useTagInput({ value, onChange }) }
    })
    act(() => {
      result.current.remove(0)
      result.current.add('three')
    })
    expect(result.current.tags).toEqual(['two', 'three'])
  })

  it('consumes the draft once when Enter and blur run before React renders', () => {
    const onChange = vi.fn()
    const normalize = vi.fn((raw: string) => raw)
    const { result } = renderHook(() => useTagInput({ value: [], onChange, normalize }))
    act(() => result.current.setDraft('one'))
    act(() => {
      result.current.inputProps.onKeyDown({
        key: 'Enter',
        nativeEvent: { isComposing: false },
        preventDefault: vi.fn(),
      } as Parameters<typeof result.current.inputProps.onKeyDown>[0])
      result.current.inputProps.onBlur()
    })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(normalize).toHaveBeenCalledTimes(1)
    expect(result.current.draft).toBe('')
  })

  it('commits a programmatic draft set in the same batch', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useTagInput({ value: [], onChange }))
    act(() => {
      result.current.setDraft('one')
      result.current.inputProps.onBlur()
    })
    expect(onChange).toHaveBeenCalledExactlyOnceWith(['one'])
    expect(result.current.draft).toBe('')
  })

  it('respects controlled replacements and the latest rules through retained actions', () => {
    const before = vi.fn()
    const after = vi.fn()
    const { result, rerender } = renderHook((props) => useTagInput(props), {
      initialProps: { value: ['old'], onChange: before, maxTags: 2 },
    })
    const add = result.current.add
    const remove = result.current.remove
    rerender({ value: ['new'], onChange: after, maxTags: 1 })
    act(() => expect(add('blocked')).toBe(false))
    expect(before).not.toHaveBeenCalled()
    expect(after).not.toHaveBeenCalled()
    act(() => remove(0))
    expect(after).toHaveBeenCalledExactlyOnceWith([])
  })

  it('does not retain tag changes that the controlled owner declined', () => {
    const onChange = vi.fn()
    const value: string[] = []
    const { result } = renderHook(() => useTagInput({ value, onChange }))
    act(() => result.current.add('declined'))
    act(() => result.current.add('next'))
    expect(onChange).toHaveBeenLastCalledWith(['next'])
  })

  it('adds a suggestion without consuming the independent text draft', () => {
    const { result } = renderHook(() => {
      const [value, onChange] = useState<string[]>([])
      return { tags: value, ...useTagInput({ value, onChange }) }
    })
    act(() => result.current.setDraft('typed'))
    act(() => result.current.add('suggested'))
    expect(result.current.draft).toBe('typed')
    expect(result.current.tags).toEqual(['suggested'])
    act(() => result.current.inputProps.onBlur())
    expect(result.current.tags).toEqual(['suggested', 'typed'])
  })

  it('adds one tag per fill + Enter and never submits the form', () => {
    const { input, onSubmit } = mount()
    expect(fillAndEnter(input, 'dragons')).toBe(false)
    expect(fillAndEnter(input, 'training')).toBe(false)
    expect(listed()).toEqual(['dragons', 'training'])
    expect(input.value).toBe('')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('cancels a blank Enter so the form is not submitted', () => {
    const { input, onSubmit } = mount()
    expect(fireEvent.keyDown(input, { key: 'Enter' })).toBe(false)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('still lets Enter in another field submit the form', () => {
    const { onSubmit } = mount()
    expect(fireEvent.keyDown(screen.getByLabelText('title'), { key: 'Enter' })).toBe(true)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('removes a tag through the app’s own remove control', () => {
    mount({ initial: ['a', 'b', 'c'] })
    fireEvent.click(screen.getByTestId('remove-b'))
    expect(listed()).toEqual(['a', 'c'])
    fireEvent.click(screen.getByTestId('remove-a'))
    fireEvent.click(screen.getByTestId('remove-c'))
    expect(listed()).toEqual([])
  })

  it('rejects duplicates and blanks by default, and honors maxTags', () => {
    const { input } = mount({ maxTags: 2 })
    fillAndEnter(input, ' x ')
    fillAndEnter(input, 'x')
    fillAndEnter(input, '   ')
    fillAndEnter(input, 'y')
    fillAndEnter(input, 'z')
    expect(listed()).toEqual(['x', 'y'])
  })

  it('applies a custom normalize', () => {
    const { input } = mount({ normalize: (raw) => raw.trim().toLowerCase() || null })
    fillAndEnter(input, 'React')
    expect(listed()).toEqual(['react'])
  })

  it('commits on comma, Tab and blur; Backspace on an empty draft removes the last tag', () => {
    const { input } = mount()
    fireEvent.change(input, { target: { value: 'one' } })
    expect(fireEvent.keyDown(input, { key: ',' })).toBe(false)
    fireEvent.change(input, { target: { value: 'two' } })
    expect(fireEvent.keyDown(input, { key: 'Tab' })).toBe(false)
    fireEvent.change(input, { target: { value: 'three' } })
    fireEvent.blur(input)
    expect(listed()).toEqual(['one', 'two', 'three'])
    // An empty Tab keeps normal focus traversal.
    expect(fireEvent.keyDown(input, { key: 'Tab' })).toBe(true)
    expect(fireEvent.keyDown(input, { key: 'Backspace' })).toBe(false)
    expect(listed()).toEqual(['one', 'two'])
  })

  it('leaves a composing Enter to the input method', () => {
    const { input, onSubmit } = mount()
    fireEvent.change(input, { target: { value: '日本' } })
    expect(fireEvent.keyDown(input, { key: 'Enter', isComposing: true })).toBe(true)
    expect(listed()).toEqual([])
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
