// @vitest-environment jsdom
/// <reference types="node" />
/**
 * A ConfirmButton whose `onConfirm` rejects returns to idle so the user can
 * retry, and the rejection does not escape as an unhandled promise rejection
 * (the caller owns the error and shows its own message).
 *
 * Svelte port of `@molecule/app-ui-react`'s `confirm-button-rejection` test,
 * mounted with real Svelte like this package's other component suites.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    cn: (...cls: unknown[]) => cls.filter((c) => typeof c === 'string' && c.length > 0).join(' '),
    button: () => 'button',
  }),
}))

vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? key,
  }),
}))

import { flushSync, mount, unmount } from 'svelte'

const { default: ConfirmButton } = await import('../components/ConfirmButton.svelte')

const mounted: Array<ReturnType<typeof mount>> = []
const hosts: HTMLElement[] = []

afterEach(() => {
  for (const instance of mounted.splice(0)) unmount(instance)
  for (const host of hosts.splice(0)) host.remove()
  document.body.innerHTML = ''
})

describe('ConfirmButton with a rejecting onConfirm', () => {
  it('returns to idle and leaves no unhandled rejection', async () => {
    const unhandled: unknown[] = []
    const onUnhandled = (reason: unknown): void => {
      unhandled.push(reason)
    }
    process.on('unhandledRejection', onUnhandled)
    try {
      const onConfirm = vi.fn<() => Promise<void>>().mockRejectedValue(new Error('network down'))
      const host = document.createElement('div')
      document.body.appendChild(host)
      hosts.push(host)
      mounted.push(mount(ConfirmButton, { target: host, props: { label: 'Delete', onConfirm } }))
      const button = host.querySelector('button')
      if (!(button instanceof HTMLButtonElement)) {
        throw new Error('ConfirmButton did not render a button')
      }
      flushSync(() => button.click())
      expect(button.getAttribute('data-state')).toBe('armed')
      // The click handler awaits `onConfirm`: a macrotask turn lets the caught
      // rejection's `finally` land and Svelte re-render the idle state.
      flushSync(() => button.click())
      await new Promise((resolve) => setTimeout(resolve, 0))
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
