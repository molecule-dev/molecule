// @vitest-environment jsdom
/**
 * Unit tests for the Angular auth-page brand header — a port of
 * `@molecule/app-auth-brand-header-react/src/__tests__/auth-brand-header.test.tsx`:
 * the same test names and behavioral assertions, mounted through Angular's real
 * renderer (the same `createApplication` + JIT host approach the conformance
 * kit's Angular adapter uses) and asserted on the markup the components
 * produce.
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

import { provideDomPlacement } from '@molecule/app-angular'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `bgPrimary`),
// so tests can assert which cm.* class was applied without a real bond — the
// same mock the React package's own tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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
    // Mirrors real i18next: with no resource for the key, the (interpolated)
    // defaultValue is returned — so `{{appName}}` is substituted from `values`.
    t: (key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
      const resolved = opts?.defaultValue ?? key
      return resolved.replace(/\{\{(\w+)\}\}/g, (_m, name: string) => String(values?.[name] ?? ''))
    },
  }),
}))

const { AuthBrandHeader, AuthBrandHeaderChip, AuthBrandHeaderTagline, AuthBrandHeaderWordmark } =
  await import('../index.js')

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
    changeDetection: ChangeDetectionStrategy.Eager,
    template,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
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
 * Mounts a component and returns the markup it produced — the Angular
 * equivalent of the React suite's static render.
 *
 * @param template - The host template.
 * @param component - The component under test.
 * @param props - The props the template binds.
 * @returns The rendered markup.
 */
const render = async (
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<string> => {
  const m = await mount(template, component, props)
  mounted.push(m)
  return m.host.innerHTML
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

const chipTemplate = `<div mol-auth-brand-header-chip [icon]="p['icon']" [chipGradient]="p['chipGradient']" [chipShape]="p['chipShape']"></div>`
const wordmarkTemplate = `<h1 mol-auth-brand-header-wordmark [color]="p['color']" [className]="p['className']">Refract</h1>`
const taglineTemplate = `<p mol-auth-brand-header-tagline [className]="p['className']">Ship faster</p>`
const headerTemplate = `<div mol-auth-brand-header [className]="p['className']" [appName]="p['appName']" [tagline]="p['tagline']" [icon]="p['icon']" [chipGradient]="p['chipGradient']" [chipShape]="p['chipShape']" [wordmarkColor]="p['wordmarkColor']"></div>`

describe('AuthBrandHeader (preset mode)', () => {
  it('renders the appName in an <h1> and the tagline in a <p>', async () => {
    const markup = await render(headerTemplate, AuthBrandHeader as Type<unknown>, {
      appName: 'Acme',
      tagline: 'Ship faster',
    })
    expect(markup).toContain('<h1')
    expect(markup).toContain('Acme')
    expect(markup).toContain('<p')
    expect(markup).toContain('Ship faster')
  })

  it('renders the gradient icon chip when an icon is supplied and omits it otherwise', async () => {
    const withIcon = await render(headerTemplate, AuthBrandHeader as Type<unknown>, {
      appName: 'A',
      tagline: 'T',
      icon: 'rocket_launch',
    })
    expect(withIcon).toContain('iconGlyphFont')
    expect(withIcon).toContain('rocket_launch')
    const without = await render(headerTemplate, AuthBrandHeader as Type<unknown>, {
      appName: 'A',
      tagline: 'T',
    })
    expect(without).not.toContain('iconGlyphFont')
  })

  it('applies the wordmarkColor as an inline color on the <h1>', async () => {
    const markup = await render(headerTemplate, AuthBrandHeader as Type<unknown>, {
      appName: 'A',
      tagline: 'T',
      wordmarkColor: '#ff0000',
    })
    expect(markup).toContain('rgb(255, 0, 0)')
  })

  it('appends className onto the <header> wrapper', async () => {
    const markup = await render(headerTemplate, AuthBrandHeader as Type<unknown>, {
      appName: 'A',
      tagline: 'T',
      className: 'extra-cls',
    })
    expect(markup).toContain('extra-cls')
  })
})

describe('AuthBrandHeader (children mode)', () => {
  it('renders children verbatim inside the wrapper <div> and ignores preset props', async () => {
    const markup = await render(
      `<div mol-auth-brand-header [className]="p['className']" [appName]="p['appName']" [tagline]="p['tagline']" [icon]="p['icon']" [chipGradient]="p['chipGradient']" [chipShape]="p['chipShape']" [wordmarkColor]="p['wordmarkColor']"><div data-custom>Bespoke</div></div>`,
      AuthBrandHeader as Type<unknown>,
      { appName: 'IgnoredName', tagline: 'IgnoredTagline' },
    )
    expect(markup).toContain('<div')
    expect(markup).toContain('data-custom=""')
    expect(markup).toContain('Bespoke')
    expect(markup).not.toContain('IgnoredName')
    expect(markup).not.toContain('IgnoredTagline')
  })
})

describe('AuthBrandHeaderChip', () => {
  it('renders the icon and applies chipGradient + square shape', async () => {
    const markup = await render(chipTemplate, AuthBrandHeaderChip as Type<unknown>, {
      icon: 'star',
      chipGradient: 'linear-gradient(red, blue)',
      chipShape: 'square',
    })
    expect(markup).toContain('star')
    expect(markup).toContain('background: linear-gradient(red, blue)')
    expect(markup).toContain('authBrandHeaderChipSquare')
  })

  it('falls back to the primary background when no chipGradient is supplied so the white icon stays visible', async () => {
    const markup = await render(chipTemplate, AuthBrandHeaderChip as Type<unknown>, {
      icon: 'description',
    })
    expect(markup).toContain('description')
    expect(markup).toContain('bgPrimary')
    expect(markup).not.toContain('background:')
  })

  it('omits the primary background fallback when chipGradient supplies its own background', async () => {
    const markup = await render(chipTemplate, AuthBrandHeaderChip as Type<unknown>, {
      icon: 'description',
      chipGradient: 'linear-gradient(red, blue)',
    })
    expect(markup).not.toContain('bgPrimary')
    expect(markup).toContain('background: linear-gradient(red, blue)')
  })
})

describe('AuthBrandHeaderWordmark', () => {
  it('renders children in an <h1> and appends className + inline color', async () => {
    const markup = await render(wordmarkTemplate, AuthBrandHeaderWordmark as Type<unknown>, {
      color: '#7c3aed',
      className: 'custom-wordmark',
    })
    expect(markup).toContain('<h1')
    expect(markup).toContain('Refract')
    expect(markup).toContain('custom-wordmark')
    expect(markup).toContain('rgb(124, 58, 237)')
  })

  it('includes the wordmark ink by default so it stays legible in both themes', async () => {
    const markup = await render(wordmarkTemplate, AuthBrandHeaderWordmark as Type<unknown>)
    expect(markup).toContain('authBrandHeaderWordmark')
  })
})

describe('AuthBrandHeaderTagline', () => {
  it('renders children in a <p> and appends className', async () => {
    const markup = await render(taglineTemplate, AuthBrandHeaderTagline as Type<unknown>, {
      className: 'font-mono',
    })
    expect(markup).toContain('<p')
    expect(markup).toContain('Ship faster')
    expect(markup).toContain('authBrandHeaderTagline')
    expect(markup).toContain('font-mono')
  })
})
