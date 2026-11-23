// @vitest-environment jsdom
/**
 * Locale-key coverage for the Angular `<AudioEffectsRack>` — a port of
 * `@molecule/app-feature-audio-effects-rack-react/src/__tests__/AudioEffectsRack.i18n.test.tsx`:
 * the same test names and assertions. Every label is rendered from a marked
 * translation, so a default that bypassed `t()` — or a key built at runtime —
 * shows up as plain English.
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
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { describe, expect, it, vi } from 'vitest'

import type { Effect } from '../types.js'

// Translations the bonded i18n provider would supply: each key maps to a marked string.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_target, prop) =>
          prop === 'cn'
            ? (...cls: unknown[]) => cls.filter((c) => typeof c === 'string' && c).join(' ')
            : () => String(prop),
      },
    ),
}))

const { AudioEffectsRack, EFFECT_KINDS, EFFECT_PARAM_SCHEMAS } =
  await import('../audio-effects-rack.component.js')

/** A mounted host: its DOM and a teardown. */
interface Mounted {
  /** The host element the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts an `<AudioEffectsRack>` with the given effects.
 *
 * @param effects - The rack's effects.
 * @returns The mounted host.
 */
async function renderRack(effects: Effect[]): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-locale-host',
    standalone: true,
    imports: [AudioEffectsRack],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<div mol-audio-effects-rack [effects]="p['effects']"></div>`,
  })(
    class LocaleHost {
      /** The props the template binds. */
      p: Record<string, unknown> = { effects }
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

const effects: Effect[] = EFFECT_KINDS.map((kind) => ({
  id: `f-${kind}`,
  kind,
  enabled: true,
  params: {},
}))

describe('<AudioEffectsRack> literal locale keys', () => {
  it('renders every effect kind label through its literal locale key', async () => {
    const { host, destroy } = await renderRack(effects)
    const titles = host.querySelectorAll('[data-mol-id="audio-effects-rack-panel-title"]')
    expect(Array.from(titles).map((el) => el.textContent)).toEqual(
      EFFECT_KINDS.map((kind) => `«audioEffectsRack.kind.${kind}»`),
    )
    const options = Array.from(
      host.querySelectorAll<HTMLOptionElement>(
        '[data-mol-id="audio-effects-rack-add-select"] option',
      ),
    ).filter((o) => o.value.length > 0)
    expect(options.map((o) => o.textContent)).toEqual(
      EFFECT_KINDS.map((kind) => `«audioEffectsRack.kind.${kind}»`),
    )
    await destroy()
  })

  it('renders every built-in param label through its literal locale key', async () => {
    for (const kind of EFFECT_KINDS) {
      const { host, destroy } = await renderRack([{ id: 'f', kind, enabled: true, params: {} }])
      for (const schema of EFFECT_PARAM_SCHEMAS[kind]) {
        const expected = `«audioEffectsRack.param.${kind}.${schema.id}»`
        const label = host.querySelector(
          `[data-mol-id="audio-effects-rack-param"][data-param-id="${schema.id}"] > span`,
        )
        const input = host.querySelector<HTMLInputElement>(
          `[data-mol-id="audio-effects-rack-param-input"][data-param-id="${schema.id}"]`,
        )
        expect(label?.textContent, `${kind}.${schema.id} label`).toBe(expected)
        expect(input?.getAttribute('aria-label'), `${kind}.${schema.id} aria-label`).toBe(expected)
      }
      await destroy()
    }
  })

  it('renders the rack chrome through literal locale keys', async () => {
    const { host, destroy } = await renderRack(effects.slice(0, 1))
    const root = host.querySelector('[data-mol-id="audio-effects-rack"]')
    expect(root?.getAttribute('aria-label')).toBe('«audioEffectsRack.aria.rack»')
    expect(host.querySelector('[data-mol-id="audio-effects-rack-title"]')?.textContent).toBe(
      '«audioEffectsRack.aria.rack»',
    )
    expect(host.querySelector('[data-mol-id="audio-effects-rack-add"] span')?.textContent).toBe(
      '«audioEffectsRack.button.add»',
    )
    const select = host.querySelector<HTMLSelectElement>(
      '[data-mol-id="audio-effects-rack-add-select"]',
    )
    expect(select?.getAttribute('aria-label')).toBe('«audioEffectsRack.button.add»')
    expect(
      host.querySelector('[data-mol-id="audio-effects-rack-add-select"] option')?.textContent,
    ).toBe('«audioEffectsRack.button.addPlaceholder»')
    expect(
      host
        .querySelector('[data-mol-id="audio-effects-rack-drag-handle"]')
        ?.getAttribute('aria-label'),
    ).toBe('«audioEffectsRack.aria.dragHandle»')
    expect(
      host.querySelector('[data-mol-id="audio-effects-rack-bypass"]')?.getAttribute('aria-label'),
    ).toBe('«audioEffectsRack.button.bypass»')
    expect(
      host.querySelector('[data-mol-id="audio-effects-rack-remove"]')?.getAttribute('aria-label'),
    ).toBe('«audioEffectsRack.button.remove»')
    await destroy()
  })

  it('renders the empty state through its literal locale key', async () => {
    const { host, destroy } = await renderRack([])
    expect(host.querySelector('[data-mol-id="audio-effects-rack-empty"]')?.textContent).toBe(
      '«audioEffectsRack.empty»',
    )
    await destroy()
  })
})
