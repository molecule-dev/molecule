// @vitest-environment jsdom
/**
 * Literal-key test for `LoyaltyTierBadge`: the `t` provider returns the key
 * itself, so every visible label proves the component translates through one
 * literal key per value (never a key built at runtime). A 1:1 port of the
 * React package's `LoyaltyTierBadgeKeys.test.tsx`, mounted through Angular's
 * real renderer the same way the behavioral suite mounts it.
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
    fontWeight: () => 'fw',
  }),
}))

vi.mock('@molecule/app-angular', () => ({
  useTranslation: () => ({
    // The marker is the key, with any interpolation values shown in
    // parentheses — so a value translated through a nested `t()` call (the
    // next tier's name) surfaces its own key in the rendered text.
    t: (key: string, values?: Record<string, unknown>) => {
      const shown = values
        ? Object.entries(values)
            .map(([k, v]) => `${k}=${String(v)}`)
            .join(', ')
        : ''
      return shown ? `${key} (${shown})` : key
    },
  }),
}))

const { LoyaltyTierBadge } = await import('../index.js')

/** The host template: every prop bound as an input on the component element. */
const TEMPLATE = `<div mol-loyalty-tier-badge [tier]="p['tier']" [points]="p['points']" [nextTierThreshold]="p['nextTierThreshold']" [nextTierLabel]="p['nextTierLabel']" [tierLabel]="p['tierLabel']" [size]="p['size']" [dataMolId]="p['dataMolId']" [className]="p['className']"></div>`

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Default,
    template: TEMPLATE,
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

const mounted: Mounted[] = []

/**
 * Mounts a {@link LoyaltyTierBadge} and remembers it for teardown.
 *
 * @param props - The badge props.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(LoyaltyTierBadge as Type<unknown>, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

describe('translated tier names come from literal keys', () => {
  it('renders each tier through its literal key', async () => {
    expect((await render({ tier: 'bronze' })).host.textContent).toContain(
      'loyaltyTierBadge.tier.bronze',
    )
    expect((await render({ tier: 'silver' })).host.textContent).toContain(
      'loyaltyTierBadge.tier.silver',
    )
    expect((await render({ tier: 'gold' })).host.textContent).toContain(
      'loyaltyTierBadge.tier.gold',
    )
    expect((await render({ tier: 'platinum' })).host.textContent).toContain(
      'loyaltyTierBadge.tier.platinum',
    )
  })

  it('renders the next tier through its literal key', async () => {
    const m = await render({ tier: 'gold', points: 50000, nextTierThreshold: 100000 })
    // The next tier after gold is platinum; the label can only come from the
    // next-tier call, since the current tier's own call reads `tier.gold`.
    expect(m.host.textContent).toContain('next=loyaltyTierBadge.tier.platinum')
  })

  it('keeps the fixed labels on their literal keys', async () => {
    const m = await render({ tier: 'silver', points: 300, nextTierThreshold: 1000 })
    expect(m.host.textContent).toContain('loyaltyTierBadge.remaining (')
    expect(m.host.querySelector('[role="progressbar"]')?.getAttribute('aria-label')).toBe(
      'loyaltyTierBadge.progress (next=loyaltyTierBadge.tier.gold)',
    )
    expect(m.host.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe(
      'loyaltyTierBadge.group (tier=loyaltyTierBadge.tier.silver)',
    )

    const top = await render({ tier: 'platinum' })
    expect(top.host.textContent).toContain('loyaltyTierBadge.topTier')
  })
})
