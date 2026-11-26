// @vitest-environment jsdom
/**
 * A ConfirmButton whose `onConfirm` rejects returns to idle so the user can
 * retry, and the rejection does not escape as an unhandled promise rejection
 * (the caller owns the error and shows its own message).
 *
 * Solid port of `@molecule/app-ui-react`'s `confirm-button-rejection.test.tsx`:
 * same component, same click sequence, same observations, mounted with real
 * Solid like the other Solid component suites.
 *
 * @module
 */
import { waitFor } from '@testing-library/dom'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => ({
    cn: (...cls: unknown[]) => cls.filter((c) => typeof c === 'string' && c.length > 0).join(' '),
    button: () => 'button',
  }),
}))

vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { ConfirmButton } = await import('../components/ConfirmButton.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Renders a ConfirmButton with the given confirm handler.
 *
 * @param onConfirm - The handler the confirming click calls.
 * @returns The rendered native `<button>`.
 */
function renderConfirmButton(onConfirm: () => void | Promise<void>): HTMLButtonElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <ConfirmButton label="Delete" onConfirm={onConfirm} />, container))
  const control = container.querySelector('button')
  if (!(control instanceof HTMLButtonElement)) {
    throw new Error('ConfirmButton did not render a button')
  }
  return control
}

describe('ConfirmButton with a rejecting onConfirm', () => {
  it('returns to idle and leaves no unhandled rejection', async () => {
    const unhandled: unknown[] = []
    const onUnhandled = (reason: unknown): void => {
      unhandled.push(reason)
    }
    process.on('unhandledRejection', onUnhandled)
    try {
      const onConfirm = vi.fn<() => Promise<void>>().mockRejectedValue(new Error('network down'))
      const button = renderConfirmButton(onConfirm)
      button.click()
      expect(button.getAttribute('data-state')).toBe('armed')
      button.click()
      await waitFor(() => expect(button.getAttribute('data-state')).toBe('idle'))
      // Node reports an unhandled rejection after the microtask queue drains.
      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(onConfirm).toHaveBeenCalledTimes(1)
      expect(button.getAttribute('data-state')).toBe('idle')
      expect(button.disabled).toBe(false)
      expect(unhandled).toEqual([])
    } finally {
      process.off('unhandledRejection', onUnhandled)
    }
  })
})
