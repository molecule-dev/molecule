// @vitest-environment jsdom
/**
 * Unit tests of `ComparisonRow` — the port of
 * `@molecule/app-comparison-row-react`'s own suite. The React suite renders
 * the component with a mocked ClassMap and asserts the markup; this port
 * mounts the same tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup strings. The delta's tone is a
 * ClassMap class, so the assertions check which `textTone-<tone>` class the
 * row picked.
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

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        // Tone resolvers echo their argument, so assertions can tell which
        // semantic tone (`textTone-success`) the row picked.
        return (...args: unknown[]) => (args.length > 0 ? `${token}-${String(args[0])}` : token)
      },
    }
    return new Proxy({}, handler)
  },
}))

const { ComparisonRow } = await import('../comparison-row.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const mounted: Mounted[] = []

/**
 * Mounts the ComparisonRow through a JIT host template, written exactly the
 * way an Angular app would write it.
 *
 * @param props - The inputs the template binds as `p['name']`.
 * @param projected - Extra projected content (e.g. a `[slot=label]` element).
 * @param formatRef - A template ref name to bind as the `formatDelta` input.
 * @returns The mounted host.
 */
async function render(
  props: Record<string, unknown> = {},
  projected = '',
  formatRef = '',
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [ComparisonRow as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Default,
    template: `<div mol-comparison-row [label]="p['label']" [current]="p['current']" [previous]="p['previous']" [deltaPct]="p['deltaPct']" [periodLabel]="p['periodLabel']" [className]="p['className']"${formatRef ? ` [formatDelta]="fmt"` : ''}>${projected}</div>`,
  })(
    class SpecHost {
      /** The inputs the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref = createComponent(Host, { environmentInjector: appRef.injector })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  mounted.push({
    host,
    destroy: async () => {
      ref.destroy()
      host.remove()
      await appRef.destroy()
    },
  })
  return mounted[mounted.length - 1]!
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('ComparisonRow', () => {
  it('renders the label and current value', async () => {
    const m = await render({ label: 'Revenue', current: '$12,345' })
    const markup = m.host.innerHTML
    expect(markup).toContain('Revenue')
    expect(markup).toContain('$12,345')
  })

  it('renders the previous value (struck through) when present and omits it otherwise', async () => {
    const withPrev = await render({ label: 'R', current: '$100', previous: '$80' })
    expect(withPrev.host.innerHTML).toContain('$80')
    expect(withPrev.host.innerHTML).toContain('line-through')
    const without = await render({ label: 'R', current: '$100' })
    expect(without.host.innerHTML).not.toContain('line-through')
  })

  it('renders an up arrow + percentage for a positive delta', async () => {
    const m = await render({ label: 'R', current: '$1', deltaPct: 12.5 })
    const markup = m.host.innerHTML
    expect(markup).toContain('▲')
    expect(markup).toContain('12.5%')
    expect(markup).toContain('textTone-success')
    expect(markup).not.toContain('style=')
  })

  it('renders a down arrow for a negative delta', async () => {
    const m = await render({ label: 'R', current: '$1', deltaPct: -8 })
    const markup = m.host.innerHTML
    expect(markup).toContain('▼')
    expect(markup).toContain('8.0%')
    expect(markup).toContain('textTone-error')
  })

  it('renders the neutral dash for a zero delta', async () => {
    const m = await render({ label: 'R', current: '$1', deltaPct: 0 })
    expect(m.host.innerHTML).toContain('–')
    expect(m.host.innerHTML).toContain('textTone-secondary')
  })

  it('uses a custom formatDelta when supplied', async () => {
    const m = await render(
      { label: 'R', current: '$1', deltaPct: 5 },
      `<ng-template #fmt let-delta let-a0="a0"><span data-fmt="">delta {{ a0 }}</span></ng-template>`,
      'fmt',
    )
    const markup = m.host.innerHTML
    expect(markup).toContain('data-fmt=""')
    expect(markup).toContain('delta 5')
  })

  it('renders the periodLabel and forwards className', async () => {
    const m = await render({
      label: 'R',
      current: '$1',
      periodLabel: 'vs. last week',
      className: 'cr-cls',
    })
    const markup = m.host.innerHTML
    expect(markup).toContain('vs. last week')
    expect(markup).toContain('cr-cls')
  })
})
