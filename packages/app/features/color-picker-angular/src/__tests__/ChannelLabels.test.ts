// @vitest-environment jsdom
/**
 * The RGB channel labels must go through `t` with a LITERAL key per channel —
 * `colorPicker.r` / `.g` / `.b` — the keys the locale bond owns. A provider
 * whose `t` echoes the key it was handed turns every rendered label into an
 * assertion on the exact key the call passed; the bond's own tests prove each
 * key exists in every language.
 *
 * Port of `@molecule/app-color-picker-react/src/__tests__/ChannelLabels.test.tsx`,
 * mounted through Angular's real renderer (the JIT host approach the
 * conformance kit's Angular adapter uses).
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    cn: (...args: unknown[]) => args.flat().filter(Boolean).join(' '),
    flex: () => 'flex',
    textSize: () => 'text',
  }),
}))

vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string) => `[[${key}]]`,
  }),
}))

const { ColorPicker } = await import('../color-picker.component.js')

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** The input bindings the spec host template writes onto the component. */
const BINDINGS =
  `[value]="p['value']" [onChange]="p['onChange']"` +
  ` [dataMolId]="p['dataMolId']" [className]="p['className']"`

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template (the component element + projected content).
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Default,
    template,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/** The mounts created by {@link render}, destroyed after each test. */
const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

describe('<ColorPicker> RGB channel keys', () => {
  it('renders each RGB channel label through its literal translation key', async () => {
    const m = await mount(
      `<div mol-color-picker ${BINDINGS}></div>`,
      ColorPicker as Type<unknown>,
      { value: '#3366ff', onChange: () => {} },
    )
    mounted.push(m)
    for (const channel of ['r', 'g', 'b'] as const) {
      const input = m.host.querySelector(
        `[data-mol-id="color-picker-${channel}"]`,
      ) as HTMLInputElement
      expect(input).not.toBeNull()
      const label = input.closest('label')
      expect(label).not.toBeNull()
      expect(label?.querySelector('span')?.textContent).toBe(`[[colorPicker.${channel}]]`)
      expect(input.getAttribute('aria-label')).toBe(`[[colorPicker.${channel}]]`)
    }
  })
})
