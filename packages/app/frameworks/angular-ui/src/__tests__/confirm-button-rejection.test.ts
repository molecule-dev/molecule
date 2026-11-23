// @vitest-environment jsdom
/**
 * A ConfirmButton whose `onConfirm` rejects returns to idle so the user can
 * retry, and the rejection does not escape as an unhandled promise rejection
 * (the caller owns the error and shows its own message). A port of
 * `@molecule/app-ui-react/src/__tests__/confirm-button-rejection.test.tsx`
 * onto Angular's `ConfirmButton`, mounted through the zoneless bootstrap so
 * the host bindings (`data-state`, `disabled`) are the ones a consumer gets.
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads —
// evaluating the decorators otherwise throws "needs the JIT compiler".
import '@angular/compiler'
import {
  type ApplicationRef,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

vi.mock('@molecule/app-ui', () => {
  // Only the resolvers the component CALLS may be functions; a class binding
  // rejects a function value, so every other token is the plain string.
  const CALLABLE = new Set(['button', 'spinner', 'cn'])
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_t, prop) {
      if (prop === 'cn') {
        return (...cls: unknown[]) =>
          cls
            .flat(Infinity)
            .filter((c) => typeof c === 'string' && c.length > 0)
            .join(' ')
      }
      if (typeof prop === 'string' && CALLABLE.has(prop)) return () => prop
      return String(prop)
    },
  }
  return { getClassMap: () => new Proxy({}, handler) }
})

vi.mock('@molecule/app-icons', () => ({
  getIcon: vi.fn((name: string) => ({ name, viewBox: '0 0 24 24', paths: [] })),
}))

const { ConfirmButton } = await import('../components/confirm-button.component.js')

/** The caller's confirm callback, standing in for the app's delete action. */
type OnConfirm = () => Promise<void>

/** The mounted confirm control. */
interface Mounted {
  /** The native `<button>` the component host is. */
  button: HTMLButtonElement
  /** Renders the state the last interaction set. */
  tick: () => void
}

let appRef: ApplicationRef | null = null

afterEach(() => {
  appRef?.destroy()
  appRef = null
  document.body.innerHTML = ''
})

/**
 * Renders a `button[mol-confirm-button]` with the caller's confirm callback
 * and the idle label, as a product screen would.
 *
 * @param onConfirm - The app-supplied confirm callback.
 * @returns The mounted control.
 */
async function mountConfirm(onConfirm: OnConfirm): Promise<Mounted> {
  const Host: Type<unknown> = Component({
    selector: 'div[data-test-host]',
    standalone: true,
    imports: [ConfirmButton],
    template: `<button mol-confirm-button [onConfirm]="onConfirm"
      ><span slot="label">Delete</span></button
    >`,
  })(
    class ConfirmButtonHostComponent {
      onConfirm = onConfirm
    },
  )
  appRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref = createComponent(Host, { environmentInjector: appRef.injector })
  document.body.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  appRef.tick()
  const button = document.querySelector('button[mol-confirm-button]') as HTMLButtonElement
  return { button, tick: () => appRef?.tick() }
}

/**
 * Lets pending microtasks and timers run.
 *
 * @param ms - Milliseconds to wait.
 * @returns A promise that resolves after the wait.
 */
const flush = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

describe('ConfirmButton with a rejecting onConfirm', () => {
  it('returns to idle and leaves no unhandled rejection', async () => {
    const unhandled: unknown[] = []
    const onUnhandled = (reason: unknown): void => {
      unhandled.push(reason)
    }
    process.on('unhandledRejection', onUnhandled)
    try {
      const onConfirm = vi.fn<OnConfirm>().mockRejectedValue(new Error('network down'))
      const view = await mountConfirm(onConfirm)
      view.button.click()
      view.tick()
      expect(view.button.getAttribute('data-state')).toBe('armed')
      view.button.click()
      view.tick()
      await flush(0)
      view.tick()
      // Node reports an unhandled rejection after the microtask queue drains.
      await flush(10)
      view.tick()
      expect(onConfirm).toHaveBeenCalledTimes(1)
      expect(view.button.getAttribute('data-state')).toBe('idle')
      expect(view.button.disabled).toBe(false)
      expect(unhandled).toEqual([])
    } finally {
      process.off('unhandledRejection', onUnhandled)
    }
  })
})
