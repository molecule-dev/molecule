// @vitest-environment jsdom
/// <reference types="node" />
/**
 * A ConfirmButton whose `onConfirm` rejects returns to idle so the user can
 * retry, and the rejection does not escape as an unhandled promise rejection
 * (the caller owns the error and shows its own message).
 *
 * Vue port of `@molecule/app-ui-react`'s `confirm-button-rejection` test,
 * rendered with real Vue.
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

vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? key,
  }),
}))

import { createApp, h, nextTick } from 'vue'

const { ConfirmButton } = await import('../components/ConfirmButton.js')

afterEach(() => {
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
      const onConfirm = vi.fn().mockRejectedValue(new Error('network down'))
      const host = document.createElement('div')
      document.body.appendChild(host)
      const app = createApp({
        render: () => h(ConfirmButton, { label: 'Delete', onConfirm }),
      })
      app.mount(host)
      const element = host.querySelector('button')
      if (!(element instanceof HTMLButtonElement)) {
        throw new Error('ConfirmButton did not render a button')
      }
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await nextTick()
      expect(element.getAttribute('data-state')).toBe('armed')
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      // The click handler awaits `onConfirm`: a macrotask turn lets the
      // caught rejection's `finally` land and Vue re-render the idle state.
      await new Promise((resolve) => setTimeout(resolve, 0))
      // Node reports an unhandled rejection after the microtask queue drains.
      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(onConfirm).toHaveBeenCalledTimes(1)
      expect(element.getAttribute('data-state')).toBe('idle')
      expect(element.disabled).toBe(false)
      expect(unhandled).toEqual([])
      app.unmount()
    } finally {
      process.off('unhandledRejection', onUnhandled)
    }
  })
})
