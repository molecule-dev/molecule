// @vitest-environment jsdom
/**
 * Unit tests of the Angular auth-shell components — the port of
 * `@molecule/app-auth-shell-react`'s own suite. Mounted through Angular's real
 * renderer (the same `createApplication` + JIT host approach the conformance
 * kit's Angular adapter uses), asserting the same markup.
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

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `authShellCardSurface`), the same mock the React tests use.
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

// React's test mocks react-router's `Link`; the Angular counterpart mocks the
// binding's `Link` directive (a plain anchor) and `useTranslation`.
vi.mock('@molecule/app-angular', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  const { Directive } = await import('@angular/core')
  return {
    ...actual,
    Link: Directive({
      selector: 'a[molLink]',
      standalone: true,
      inputs: ['molLink', 'replace', 'state'],
      host: { '[attr.href]': 'molLink' },
    })(
      class MockLink {
        /** The destination. */
        molLink = ''
      },
    ),
    useTranslation: () => ({
      // A marker provider: every key renders as «key», so text that bypassed
      // t() (a hardcoded default or literal) shows up as plain English.
      t: (key: string) => `«${key}»`,
    }),
  }
})

const {
  AuthShell,
  AuthShellBackLink,
  AuthShellCard,
  AuthShellCardColumn,
  AuthShellContainer,
  AuthShellDecoration,
  AuthShellFooter,
  AuthShellHeading,
  AuthShellPanel,
  AuthShellSplit,
  AuthShellSplitRow,
} = await import('../index.js')

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template.
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
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/**
 * Mounts and tracks a component for teardown.
 *
 * @param template - The host template.
 * @param component - The component class.
 * @param props - The props object.
 * @returns The mounted host.
 */
const render = async (
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> => {
  const m = await mount(template, component, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('AuthShellContainer', () => {
  it('renders its children and forwards className + style', async () => {
    const m = await render(
      `<div mol-auth-shell-container [className]="p['className']" [layout]="p['layout']" [style]="p['style']"><div data-c></div></div>`,
      AuthShellContainer,
      { className: 'cont-cls', style: { background: 'red' } },
    )
    expect(m.host.innerHTML).toContain('data-c')
    expect(m.host.innerHTML).toContain('cont-cls')
    expect(m.host.innerHTML).toContain('background')
    expect(m.host.innerHTML).toContain('red')
  })
})

describe('AuthShellDecoration', () => {
  it('renders its children inside the non-interactive decoration layer', async () => {
    const m = await render(
      `<div mol-auth-shell-decoration><div data-orb></div></div>`,
      AuthShellDecoration,
    )
    expect(m.host.innerHTML).toContain('data-orb')
    expect(m.host.innerHTML).toContain('authShellDecoration')
  })
})

describe('AuthShellCard', () => {
  it('renders its children and the dataMolId', async () => {
    const m = await render(
      `<main mol-auth-shell-card [surfaceClassName]="p['surfaceClassName']" [className]="p['className']" [outerClassName]="p['outerClassName']" [dataMolId]="p['dataMolId']"><div data-body></div></main>`,
      AuthShellCard,
      { dataMolId: 'auth-card' },
    )
    expect(m.host.innerHTML).toContain('data-body')
    expect(m.host.innerHTML).toContain('data-mol-id="auth-card"')
  })

  it('uses the default glass surface unless surfaceClassName overrides it', async () => {
    const def = await render(
      `<main mol-auth-shell-card [surfaceClassName]="p['surfaceClassName']"><div></div></main>`,
      AuthShellCard,
    )
    expect(def.host.innerHTML).toContain('authShellCardSurface')
    const custom = await render(
      `<main mol-auth-shell-card [surfaceClassName]="p['surfaceClassName']"><div></div></main>`,
      AuthShellCard,
      { surfaceClassName: 'my-surface' },
    )
    expect(custom.host.innerHTML).toContain('my-surface')
    expect(custom.host.innerHTML).not.toContain('authShellCardSurface')
  })
})

describe('AuthShellHeading', () => {
  it('renders the heading inside an <h1>', async () => {
    const m = await render(
      `<header mol-auth-shell-heading [heading]="p['heading']" [subheading]="p['subheading']" [eyebrow]="p['eyebrow']"></header>`,
      AuthShellHeading,
      { heading: 'Sign in' },
    )
    expect(m.host.innerHTML).toContain('<h1')
    expect(m.host.innerHTML).toContain('Sign in')
  })

  it('renders the subheading and eyebrow when present and omits them otherwise', async () => {
    const full = await render(
      `<header mol-auth-shell-heading [heading]="p['heading']" [subheading]="p['subheading']" [eyebrow]="p['eyebrow']"></header>`,
      AuthShellHeading,
      { heading: 'H', subheading: 'welcome back', eyebrow: 'ACCOUNT' },
    )
    expect(full.host.innerHTML).toContain('welcome back')
    expect(full.host.innerHTML).toContain('ACCOUNT')
    const bare = await render(
      `<header mol-auth-shell-heading [heading]="p['heading']" [subheading]="p['subheading']" [eyebrow]="p['eyebrow']"></header>`,
      AuthShellHeading,
      { heading: 'H' },
    )
    expect(bare.host.innerHTML).not.toContain('welcome back')
    expect(bare.host.innerHTML).not.toContain('ACCOUNT')
  })
})

describe('AuthShellFooter', () => {
  it('renders its children inside a <footer>', async () => {
    const m = await render(
      `<footer mol-auth-shell-footer><span data-f></span></footer>`,
      AuthShellFooter,
    )
    expect(m.host.innerHTML).toContain('<footer')
    expect(m.host.innerHTML).toContain('data-f')
  })
})

describe('AuthShellBackLink', () => {
  it('renders a Link to "/" with the default "Back to home" label', async () => {
    const m = await render(
      `<p mol-auth-shell-back-link [to]="p['to']" [label]="p['label']"></p>`,
      AuthShellBackLink,
    )
    expect(m.host.innerHTML).toContain('href="/"')
    expect(m.host.innerHTML).toContain('«auth.backHome»')
  })

  it('takes the default label through i18n by default', async () => {
    const m = await render(
      `<p mol-auth-shell-back-link [to]="p['to']" [label]="p['label']"></p>`,
      AuthShellBackLink,
    )
    // The marker provider renders every translated string as «key»; plain
    // English here would mean the label bypassed t().
    expect(m.host.innerHTML).toContain('«auth.backHome»')
    expect(m.host.innerHTML).not.toContain('Back to home')
  })

  it('falls back to the default label when the label is empty or blank', async () => {
    // An empty or blank label would leave the link with no accessible name (the
    // glyph is aria-hidden), so it falls back to the translated default.
    for (const label of ['', '  ']) {
      const m = await render(
        `<p mol-auth-shell-back-link [to]="p['to']" [label]="p['label']"></p>`,
        AuthShellBackLink,
        { label },
      )
      expect(m.host.innerHTML).toContain('«auth.backHome»')
    }
  })

  it('renders the arrow glyph aria-hidden so the label alone names the link', async () => {
    const m = await render(
      `<p mol-auth-shell-back-link [to]="p['to']" [label]="p['label']"></p>`,
      AuthShellBackLink,
    )
    // The glyph is a Material Symbols ligature name — "arrow_back" paints a
    // left arrow — not text a screen reader should announce. The link's
    // accessible name is its t() label alone. (Angular orders the span's
    // attributes differently from React, so pin the attribute to the span
    // without relying on attribute order.)
    expect(m.host.innerHTML).toMatch(/<span [\s\S]*?aria-hidden="true"[\s\S]*?>arrow_back<\/span>/)
  })

  it('honours a custom destination and label', async () => {
    const m = await render(
      `<p mol-auth-shell-back-link [to]="p['to']" [label]="p['label']"></p>`,
      AuthShellBackLink,
      { to: '/welcome', label: 'Go back' },
    )
    expect(m.host.innerHTML).toContain('href="/welcome"')
    expect(m.host.innerHTML).toContain('Go back')
    // An explicit label bypasses t(), so no marker wraps it.
    expect(m.host.innerHTML).not.toContain('«')
  })
})

describe('AuthShellSplit', () => {
  it('renders its children (row + optional footer sibling) and forwards className', async () => {
    const m = await render(
      `<div mol-auth-shell-split [className]="p['className']"><div data-row></div><footer data-site-footer></footer></div>`,
      AuthShellSplit,
      { className: 'split-cls' },
    )
    expect(m.host.innerHTML).toContain('data-row')
    expect(m.host.innerHTML).toContain('data-site-footer')
    expect(m.host.innerHTML).toContain('split-cls')
  })
})

describe('AuthShellSplitRow', () => {
  it('renders its two column children and forwards className', async () => {
    const m = await render(
      `<main mol-auth-shell-split-row [className]="p['className']"><div data-panel></div><div data-col></div></main>`,
      AuthShellSplitRow,
      { className: 'row-cls' },
    )
    expect(m.host.innerHTML).toContain('data-panel')
    expect(m.host.innerHTML).toContain('data-col')
    expect(m.host.innerHTML).toContain('row-cls')
  })
})

describe('AuthShellPanel', () => {
  it('renders its children inside the panel aside (hidden below lg) by default', async () => {
    const m = await render(
      `<aside mol-auth-shell-panel [className]="p['className']"><div data-brand></div></aside>`,
      AuthShellPanel,
    )
    expect(m.host.innerHTML).toContain('<aside')
    expect(m.host.innerHTML).toContain('data-brand')
    expect(m.host.innerHTML).toContain('authShellPanel')
  })

  it('appends className alongside the shared panel collapse', async () => {
    const m = await render(
      `<aside mol-auth-shell-panel [className]="p['className']">x</aside>`,
      AuthShellPanel,
      { className: 'my-panel' },
    )
    expect(m.host.innerHTML).toContain('my-panel')
    // The panel's below-lg collapse is the one universally-shared concern and always
    // applies; the app's className (width / gradient / padding) appends.
    expect(m.host.innerHTML).toContain('authShellPanel')
  })
})

describe('AuthShellCardColumn', () => {
  it('renders its children inside a centered section and appends className', async () => {
    const m = await render(
      `<mol-auth-shell-card-column [className]="p['className']" [as]="p['as']"><div data-card></div></mol-auth-shell-card-column>`,
      AuthShellCardColumn,
      { className: 'col-cls' },
    )
    expect(m.host.innerHTML).toContain('<section')
    expect(m.host.innerHTML).toContain('data-card')
    expect(m.host.innerHTML).toContain('col-cls')
  })

  it('renders as <main> when as="main" is passed', async () => {
    const m = await render(
      `<mol-auth-shell-card-column [className]="p['className']" [as]="p['as']">x</mol-auth-shell-card-column>`,
      AuthShellCardColumn,
      { as: 'main' },
    )
    expect(m.host.innerHTML).toContain('<main')
    expect(m.host.innerHTML).not.toContain('<section')
  })
})

describe('AuthShell (preset)', () => {
  it('renders the heading, children, and back link by default', async () => {
    const m = await render(
      `<div mol-auth-shell [heading]="p['heading']" [subheading]="p['subheading']" [backTo]="p['backTo']" [showBackLink]="p['showBackLink']"><form data-form></form></div>`,
      AuthShell,
      { heading: 'Welcome', subheading: 'sign in to continue' },
    )
    expect(m.host.innerHTML).toContain('Welcome')
    expect(m.host.innerHTML).toContain('sign in to continue')
    expect(m.host.innerHTML).toContain('data-form')
    expect(m.host.innerHTML).toContain('«auth.backHome»')
  })

  it("renders the back link's arrow glyph aria-hidden", async () => {
    const m = await render(
      `<div mol-auth-shell [heading]="p['heading']" [subheading]="p['subheading']" [backTo]="p['backTo']" [showBackLink]="p['showBackLink']"><form data-form></form></div>`,
      AuthShell,
      { heading: 'Welcome', subheading: 'sign in to continue' },
    )
    // The composed AuthShellBackLink hides its Material Symbols glyph from
    // the accessibility tree, exactly as the standalone primitive does.
    // (Angular orders the span's attributes differently from React.)
    expect(m.host.innerHTML).toMatch(/<span [\s\S]*?aria-hidden="true"[\s\S]*?>arrow_back<\/span>/)
  })

  it('renders the brand, decoration, and footer slots when supplied', async () => {
    const m = await render(
      `<div mol-auth-shell [heading]="p['heading']" [subheading]="p['subheading']" [backTo]="p['backTo']" [showBackLink]="p['showBackLink']"><h2 slot="brand" data-brand></h2><div slot="decoration" data-decoration></div><div data-body></div><p slot="footer" data-footer></p></div>`,
      AuthShell,
      { heading: 'H', subheading: 'S' },
    )
    expect(m.host.innerHTML).toContain('data-brand')
    expect(m.host.innerHTML).toContain('data-decoration')
    expect(m.host.innerHTML).toContain('data-footer')
  })

  it('hides the back link when showBackLink is false', async () => {
    const m = await render(
      `<div mol-auth-shell [heading]="p['heading']" [subheading]="p['subheading']" [backTo]="p['backTo']" [showBackLink]="p['showBackLink']">x</div>`,
      AuthShell,
      { heading: 'H', subheading: 'S', showBackLink: false },
    )
    expect(m.host.innerHTML).not.toContain('«auth.backHome»')
    expect(m.host.innerHTML).not.toContain('arrow_back')
  })
})
