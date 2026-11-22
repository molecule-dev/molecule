// @vitest-environment jsdom
/**
 * Unit tests of the Angular `SettingsActionsBar` — the port of
 * `@molecule/app-settings-actions-bar-react`'s own suite: the same test names
 * and behavioral assertions, mounted through Angular's real renderer (the same
 * `createApplication` + JIT host approach the package's conformance test uses)
 * with the UI dependencies mocked the way the React suite mocks them.
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
import { afterEach, describe, expect, it, vi } from 'vitest'

// The REAL companion locale bond (not mocked) — proves t('settingsActions.saved')
// and its siblings resolve from the bond's canonical en table, not just the
// inline defaultValue that would otherwise mask a missing key.
import { en as settingsActionsBarEn } from '@molecule/app-locales-settings-actions-bar'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `surface`), so tests can assert which cm.* class was applied without a real
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
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (
      _key: string,
      values: Record<string, unknown> | undefined,
      opts?: { defaultValue?: string },
    ) => {
      let out = opts?.defaultValue ?? _key
      if (values)
        for (const [k, v] of Object.entries(values)) out = out.replace(`{{${k}}}`, String(v))
      return out
    },
  }),
}))

// `Button` is the only UI component dependency — stub it to an inspectable
// `<button>` carrying `data-button` and the disabled state, the same markers
// the React suite's `@molecule/app-ui-react` stub renders.
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component } = await import('@angular/core')
  return {
    Button: Component({
      selector: 'button[mol-button]',
      standalone: true,
      inputs: [
        'variant',
        'color',
        'size',
        'loading',
        'loadingText',
        'fullWidth',
        'className',
        'style',
        'testId',
        'disabled',
        'type',
      ],
      host: {
        'data-button': '',
        '[disabled]': 'disabled === true',
      },
      template: '<ng-content></ng-content>',
    })(
      class MockButton {
        /** Button variant. */
        variant?: string
        /** Button color. */
        color?: string
        /** Button size. */
        size?: string
        /** Whether the button is in its loading state. */
        loading?: boolean
        /** Text shown instead of children while loading. */
        loadingText?: string
        /** Whether the button stretches to fill its container. */
        fullWidth?: boolean
        /** Extra classes joined onto the button classes. */
        className?: string
        /** Inline style object. */
        style?: unknown
        /** `data-testid` for the button. */
        testId?: string
        /** Disables the button. */
        disabled?: boolean
        /** The button's `type` attribute. */
        type?: string
      },
    ),
  }
})

const { SettingsActionsBar } = await import('../settings-actions-bar.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts the standalone component through a JIT host template, written the way
 * an Angular app would write it.
 *
 * @param template - The host template (the component element + projected content).
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(template: string, props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [SettingsActionsBar],
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

const template = `<div mol-settings-actions-bar
  [onSave]="p['onSave']"
  [onCancel]="p['onCancel']"
  [loading]="p['loading']"
  [disabled]="p['disabled']"
  [savedAt]="p['savedAt']"
  [error]="p['error']"
  [sticky]="p['sticky']"
  [className]="p['className']"
></div>`

const withLeading = `<div mol-settings-actions-bar
  [onSave]="p['onSave']"
  [error]="p['error']"
><span slot="leading" data-leading></span></div>`

const mounted: Mounted[] = []

/**
 * Renders a {@link SettingsActionsBar} with the given props and returns its
 * markup, the way React's `renderToStaticMarkup` helper does in the React
 * suite.
 *
 * @param props - The component props.
 * @param hostTemplate - The host template (defaults to the plain one).
 * @returns The serialized markup.
 */
const html = async (
  props: Record<string, unknown>,
  hostTemplate: string = template,
): Promise<string> => {
  const m = await mount(hostTemplate, props)
  mounted.push(m)
  return m.host.innerHTML
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('SettingsActionsBar', () => {
  it('always renders the Save button', async () => {
    expect(await html({ onSave: () => {} })).toContain('Save changes')
  })

  it('renders the Cancel button only when onCancel is supplied', async () => {
    const withCancel = await html({ onSave: () => {}, onCancel: () => {} })
    expect(withCancel).toContain('Cancel')
    const without = await html({ onSave: () => {} })
    expect(without).not.toContain('Cancel')
  })

  it('shows the saving label and disables Save while loading', async () => {
    const markup = await html({ onSave: () => {}, loading: true })
    expect(markup).toContain('Saving…')
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('disables Save when the disabled prop is set', async () => {
    const markup = await html({ onSave: () => {}, disabled: true })
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('renders the "Saved" status when savedAt is supplied', async () => {
    expect(await html({ onSave: () => {}, savedAt: Date.now() })).toContain('Saved')
  })

  it('paints a real theme surface + top border on the bar (not transparent)', async () => {
    const markup = await html({ onSave: () => {} })
    // The stub ClassMap resolves each token to its own name, so a real
    // `cm.surface`/`cm.borderT` class token must appear on the wrapper — the
    // transparent-sticky-bar regression would leave both absent.
    expect(markup).toMatch(/class="[^"]*\bsurface\b[^"]*"/)
    expect(markup).toMatch(/class="[^"]*\bborderT\b[^"]*"/)
  })

  it('resolves settingsActions.saved (and its siblings) from the companion locale bond', () => {
    // The finding: t('settingsActions.saved') was rendered by the component but
    // existed in NO locale bond, so every non-English locale silently fell back
    // to English. Guard that the key is now bonded and interpolation-ready.
    expect(typeof settingsActionsBarEn['settingsActions.saved']).toBe('string')
    expect(settingsActionsBarEn['settingsActions.saved']).toContain('{{at}}')
    for (const key of [
      'settingsActions.cancel',
      'settingsActions.saving',
      'settingsActions.save',
      'settingsActions.saved',
    ] as const) {
      expect(settingsActionsBarEn[key].length, `${key} missing/empty in the bond`).toBeGreaterThan(
        0,
      )
    }
  })

  it('renders the bonded "Saved {{at}}" template with the relative time interpolated', async () => {
    expect(await html({ onSave: () => {}, savedAt: Date.now() })).toContain('Saved just now')
  })

  it('renders the inline error and leading slot', async () => {
    const markup = await html({ onSave: () => {}, error: 'Something went wrong' }, withLeading)
    expect(markup).toContain('Something went wrong')
    expect(markup).toContain('data-leading=""')
  })

  it('applies the sticky inline style by default and drops it when sticky is false', async () => {
    // Angular writes the declarations through the CSSOM, so jsdom serializes
    // them with a space after the colon (React's SSR string has none).
    expect(await html({ onSave: () => {} })).toMatch(/position:\s*sticky/)
    expect(await html({ onSave: () => {}, sticky: false })).not.toMatch(/position:\s*sticky/)
  })

  it('forwards className', async () => {
    expect(await html({ onSave: () => {}, className: 'sab-cls' })).toContain('sab-cls')
  })
})
