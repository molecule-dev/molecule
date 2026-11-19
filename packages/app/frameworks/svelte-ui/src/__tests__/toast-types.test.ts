/**
 * `useToast().addToast` takes every `ToastProps` prop but `onDismiss`, each with its own type. Svelte's
 * `ToastProps` carries rest attributes as an index signature, and `Omit` over one keeps only that
 * signature, which typed every toast prop as `unknown`; checked by `scripts/typecheck-tests.mjs`.
 *
 * @module
 */

import { describe, expect, expectTypeOf, it } from 'vitest'

import type { ToastContextValue } from '../toast.js'
import type { ToastProps } from '../types.js'

/** What a caller hands `addToast`. */
type NewToast = Parameters<ToastContextValue['addToast']>[0]

describe('useToast().addToast props', () => {
  it('keeps each named ToastProps prop with its own type', () => {
    expectTypeOf<NewToast['id']>().toEqualTypeOf<ToastProps['id']>()
    expectTypeOf<NewToast['title']>().toEqualTypeOf<ToastProps['title']>()
    expectTypeOf<NewToast['status']>().toEqualTypeOf<ToastProps['status']>()
    expectTypeOf<NewToast['duration']>().toEqualTypeOf<ToastProps['duration']>()
    const toast: NewToast = { id: 'saved', title: 'Saved', status: 'success', duration: 3000 }
    expect(toast.id).toBe('saved')
  })
})
