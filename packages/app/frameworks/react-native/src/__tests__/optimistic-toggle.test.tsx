// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import * as react from '@molecule/app-react'

import { useOptimisticToggle } from '../index.js'

describe('React Native inherited server-backed toggle', () => {
  it('reuses the React action and saves a second press after the first answer', async () => {
    expect(useOptimisticToggle).toBe(react.useOptimisticToggle)
    const replies: Array<(value: boolean) => void> = []
    const commit = vi.fn(
      (_desired: boolean) =>
        new Promise<boolean>((resolve) => {
          replies.push(resolve)
        }),
    )
    const { result } = renderHook(() => useOptimisticToggle({ value: false, commit }))
    act(() => {
      result.current.toggle()
      result.current.toggle()
    })
    expect(result.current.value).toBe(false)
    expect(commit.mock.calls).toEqual([[true]])
    await act(async () => replies[0](true))
    expect(commit.mock.calls).toEqual([[true], [false]])
    await act(async () => replies[1](false))
    expect(result.current).toMatchObject({ value: false, pending: false, error: null })
  })
})
