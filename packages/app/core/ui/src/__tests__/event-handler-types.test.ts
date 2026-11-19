/**
 * The kits' handler types: an unannotated handler gets the kit event, and a handler written for the
 * event a kit passes is accepted. These are type assertions, checked by `npm run typecheck:tests`
 * (vitest runs them as no-ops). A Solid feature with `onChange={(event: Event) => …}` stopped
 * compiling when the handler types took `KitEvent` as a function parameter.
 */
import { describe, expect, expectTypeOf, it } from 'vitest'

import type {
  ChangeEventHandler,
  FocusEventHandler,
  FormEventHandler,
  KeyboardEventHandler,
  KitEvent,
  KitFocusEvent,
  KitKeyboardEvent,
  KitMouseEvent,
  MouseEventHandler,
} from '../types.js'

describe('kit event handler types', () => {
  it('gives an unannotated handler the kit event', () => {
    const onChange: ChangeEventHandler = (event) => {
      expectTypeOf(event).toEqualTypeOf<KitEvent>()
    }
    const onClick: MouseEventHandler = (event) => {
      expectTypeOf(event).toEqualTypeOf<KitMouseEvent>()
    }
    const onKeyDown: KeyboardEventHandler = (event) => {
      expectTypeOf(event).toEqualTypeOf<KitKeyboardEvent>()
    }
    const onFocus: FocusEventHandler = (event) => {
      expectTypeOf(event).toEqualTypeOf<KitFocusEvent>()
    }
    expect(
      [onChange, onClick, onKeyDown, onFocus].every((handler) => typeof handler === 'function'),
    ).toBe(true)
  })

  it('accepts a handler written for the DOM event the Vue, Solid, Svelte and Angular kits pass', () => {
    expectTypeOf<(event: Event) => void>().toExtend<ChangeEventHandler>()
    expectTypeOf<(event: Event) => void>().toExtend<FormEventHandler>()
    expectTypeOf<(event: MouseEvent) => void>().toExtend<MouseEventHandler>()
    expectTypeOf<(event: KeyboardEvent) => void>().toExtend<KeyboardEventHandler>()
    expectTypeOf<(event: FocusEvent) => void>().toExtend<FocusEventHandler>()
  })

  it('rejects a handler written for a different kind of event', () => {
    expectTypeOf<(event: KeyboardEvent) => void>().not.toExtend<MouseEventHandler>()
    expectTypeOf<(event: MouseEvent) => void>().not.toExtend<KeyboardEventHandler>()
    expectTypeOf<(event: { value: string }) => void>().not.toExtend<ChangeEventHandler>()
  })
})
