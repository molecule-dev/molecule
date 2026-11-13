// @vitest-environment jsdom
/**
 * A ConfirmButton whose `onConfirm` rejects returns to idle so the user can
 * retry, and the rejection does not escape as an unhandled promise rejection
 * (the caller owns the error and shows its own message).
 *
 * Before the fix the `finally` reset the phase but the rejection escaped from
 * `void handleClick()`.
 *
 * @module
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ConfirmButton } from '../components/ConfirmButton.js'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    cn: (...cls: unknown[]) => cls.filter((c) => typeof c === 'string' && c.length > 0).join(' '),
    button: () => 'button',
  }),
}))

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

afterEach(cleanup)

describe('ConfirmButton with a rejecting onConfirm', () => {
  it('returns to idle and leaves no unhandled rejection', async () => {
    const unhandled: unknown[] = []
    const onUnhandled = (reason: unknown): void => {
      unhandled.push(reason)
    }
    process.on('unhandledRejection', onUnhandled)
    try {
      const onConfirm = vi.fn().mockRejectedValue(new Error('network down'))
      const { getByRole } = render(<ConfirmButton label="Delete" onConfirm={onConfirm} />)
      const button = getByRole('button')
      fireEvent.click(button)
      expect(button.getAttribute('data-state')).toBe('armed')
      await act(async () => {
        fireEvent.click(button)
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
      // Node reports an unhandled rejection after the microtask queue drains.
      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(onConfirm).toHaveBeenCalledTimes(1)
      expect(button.getAttribute('data-state')).toBe('idle')
      expect((button as HTMLButtonElement).disabled).toBe(false)
      expect(unhandled).toEqual([])
    } finally {
      process.off('unhandledRejection', onUnhandled)
    }
  })
})
