// @vitest-environment jsdom
/**
 * The deprecated `MoleculeToast` and `MoleculeTooltip` are OnPush, so state their timers and
 * animation frames set renders only through a signal: the toast hides when its duration ends,
 * and a delayed tooltip shows, then takes its measured position. Each test lets the timer fire,
 * then runs one change detection pass, as the app's scheduler would.
 *
 * @module
 */
import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Each ClassMap member echoes its own name; `toast(…)` is the one these components call.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () =>
    new Proxy(
      {},
      {
        get(_t, prop) {
          if (prop === 'cn') return (...cls: unknown[]) => cls.filter(Boolean).join(' ')
          if (prop === 'toast') return () => 'toast'
          return String(prop)
        },
      },
    ),
}))

vi.mock('@molecule/app-icons', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getIcon: vi.fn((name: string) => ({ name, viewBox: '0 0 24 24', paths: [] })),
}))

const { MoleculeToast } = await import('../components/molecule/toast.component.js')
const { MoleculeTooltip } = await import('../components/molecule/tooltip.component.js')

/** A mounted consumer template. */
interface Mounted {
  /** The consumer's host element. */
  readonly host: HTMLElement
  /** The application, to run a change detection pass. */
  readonly appRef: ApplicationRef
}

const apps: ApplicationRef[] = []

/**
 * Mounts a consumer template that uses `component`.
 *
 * @param template - The consumer template.
 * @param component - The component it uses.
 * @returns The consumer's host and its application.
 */
async function mount(template: string, component: Type<unknown>): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-timer-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Eager,
    template,
  })(class SpecTimerHost {})
  const appRef = await createApplication({ providers: [provideZonelessChangeDetection()] })
  apps.push(appRef)
  const ref = createComponent(Host, { environmentInjector: appRef.injector })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return { host, appRef }
}

/** Waits for timers and animation frames queued so far to run. */
const elapse = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(() => requestAnimationFrame(() => resolve()), ms))

afterEach(() => {
  for (const appRef of apps.splice(0)) appRef.destroy()
  document.body.innerHTML = ''
})

describe('OnPush timer state of the deprecated Molecule components', () => {
  it('MoleculeToast hides itself in the pass after its duration ends', async () => {
    const { host, appRef } = await mount(
      `<mol-toast title="Saved" [duration]="20"></mol-toast>`,
      MoleculeToast as Type<unknown>,
    )
    expect(host.querySelector('[role="alert"]')).not.toBeNull()
    await elapse(40)
    appRef.tick()
    expect(host.querySelector('[role="alert"]')).toBeNull()
  })

  it('MoleculeTooltip shows after its delay and takes its measured position', async () => {
    const { host, appRef } = await mount(
      `<mol-tooltip content="Hint" [delay]="20"><button>trigger</button></mol-tooltip>`,
      MoleculeTooltip as Type<unknown>,
    )
    host.querySelector('mol-tooltip > div')?.dispatchEvent(new MouseEvent('mouseenter'))
    appRef.tick()
    expect(host.querySelector('[role="tooltip"]')).toBeNull()
    await elapse(40)
    appRef.tick()
    expect(host.querySelector('[role="tooltip"]')?.textContent?.trim()).toBe('Hint')
    await elapse(0)
    appRef.tick()
    expect(
      (host.querySelector('[role="tooltip"]')?.parentElement as HTMLElement).style.position,
    ).toBe('absolute')
  })

  it('counterexample: MoleculeTooltip with no delay shows at once on hover', async () => {
    const { host, appRef } = await mount(
      `<mol-tooltip content="Now"><button>trigger</button></mol-tooltip>`,
      MoleculeTooltip as Type<unknown>,
    )
    host.querySelector('mol-tooltip > div')?.dispatchEvent(new MouseEvent('mouseenter'))
    appRef.tick()
    expect(host.querySelector('[role="tooltip"]')?.textContent?.trim()).toBe('Now')
  })
})
