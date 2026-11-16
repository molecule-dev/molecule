// @vitest-environment jsdom
/**
 * Unit tests of `SecretRow` — the port of
 * `@molecule/app-secret-row-react/src/__tests__/secret-row.test.tsx`. The
 * React suite renders the component with a mocked ClassMap and asserts the
 * markup; this port mounts the same mocked tree through Angular's real
 * renderer (the same `createApplication` + JIT host approach the conformance
 * kit's Angular adapter uses) and asserts the same markup strings, over the
 * real Angular `Button` and the bonded simple i18n provider.
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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { copyTextWithFallback } from '@molecule/app-clipboard'
import { createSimpleI18nProvider, setProvider as setI18nProvider } from '@molecule/app-i18n'

// ClassMap stub echoing each accessed member back as its token, so tests can
// assert which cm.* class was applied without a real bond — the same mock the
// React tests use, extended so `cm.button(…)` echoes its variant/color/size
// arguments. (Members are explicit because a Proxy's function-for-every-token
// shape breaks Angular's classMap binding, which rejects function values.)
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    flex: (args: Record<string, unknown>) =>
      `flex-${args.align ?? ''}-${args.justify ?? ''}-${args.gap ?? ''}${args.wrap ? `-wrap` : ''}`,
    sp: (side: string, n: number) => `sp-${side}${n}`,
    textSize: (size: string) => `text-${size}`,
    fontWeight: (weight: string) => `fw-${weight}`,
    textTone: (tone: string) => `tone-${tone}`,
    flex1: 'cm-flex1',
    stack: (scale: number) => `stack-${scale}`,
    textMuted: 'cm-textMuted',
    button: (args: Record<string, unknown>) =>
      `btn-${args.variant}-${args.color}-${args.size}${args.fullWidth ? '-full' : ''}`,
    buttonIconLeft: 'cm-buttonIconLeft',
    buttonIconRight: 'cm-buttonIconRight',
    cn: (...cls: unknown[]) =>
      cls
        .flat(Infinity)
        .filter((c) => typeof c === 'string' && c.length > 0)
        .join(' '),
  }),
}))

// The bonded provider `useTranslation()` falls back to (React's
// `useTranslation` contract): empty dictionaries, so every `t` returns its
// English defaultValue.
setI18nProvider(
  createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', direction: 'ltr', translations: {} },
  ]),
)

vi.mock('@molecule/app-clipboard', () => ({
  copyTextWithFallback: vi.fn(async () => true),
}))

const { SecretRow } = await import('../secret-row.component.js')

const copyTextWithFallbackMock = vi.mocked(copyTextWithFallback)

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element the component rendered into (the root div itself). */
  readonly host: HTMLElement
  /** Runs one change-detection pass (zoneless CD does not fire on its own). */
  tick(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** Distinguishes each fresh spec host so Angular never collides on ids. */
let specHostCount = 0

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template (the component element + projected content).
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(template: string, props: Record<string, unknown> = {}): Promise<Mounted> {
  specHostCount += 1
  const specHost = specHostCount
  const SpecHost = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [SecretRow],
    changeDetection: ChangeDetectionStrategy.Default,
    host: { 'data-spec-host': String(specHost) },
    template,
  })(
    class DefaultHost {
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<unknown> = createComponent(SpecHost, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    tick: () => appRef.tick(),
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/** Mounts the secret row with the given props and returns its host element. */
const render = async (props: Record<string, unknown>): Promise<HTMLElement> => {
  const m = await mount(
    `<div mol-secret-row [secret]="p['secret']" [onRotate]="p['onRotate']" [onDelete]="p['onDelete']" [maskChar]="p['maskChar']" [className]="p['className']"></div>`,
    props,
  )
  mounted.push(m)
  return m.host
}

/** The host's markup with Angular's empty comment anchors removed. */
const markupOf = (host: HTMLElement): string => host.innerHTML.replace(/<!--[\s\S]*?-->/g, '')

const secret = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: '1',
  key: 'STRIPE_API_KEY',
  value: 'sk_live_abcdef123456',
  ...over,
})

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

/** The button whose label equals `text`. */
const buttonWithText = (host: HTMLElement, text: string): HTMLButtonElement => {
  const match = [...host.querySelectorAll('button')].find(
    (button) => button.textContent?.trim() === text,
  )
  if (!match) throw new Error(`No button labelled "${text}"`)
  return match
}

/** Settles every pending microtask, so the copy promise has resolved. */
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  copyTextWithFallbackMock.mockReset()
  copyTextWithFallbackMock.mockResolvedValue(true)
})

describe('SecretRow', () => {
  it('renders the secret key and description', async () => {
    const host = await render({ secret: secret({ description: 'Stripe API key' }) })
    expect(host.textContent).toContain('STRIPE_API_KEY')
    expect(host.textContent).toContain('Stripe API key')
  })

  it('masks the value by default rather than showing it', async () => {
    const host = await render({ secret: secret() })
    expect(host.textContent).not.toContain('sk_live_abcdef123456')
    expect(host.textContent).toContain('•')
  })

  it('renders the version label when present', async () => {
    const host = await render({ secret: secret({ version: 3 }) })
    expect(markupOf(host)).toContain('v3')
  })

  it('renders the expired badge when daysUntilRotation is negative', async () => {
    const expired = await render({ secret: secret({ daysUntilRotation: -2 }) })
    expect(expired.textContent).toContain('Expired')
    const fresh = await render({ secret: secret({ daysUntilRotation: 30 }) })
    expect(fresh.textContent).not.toContain('Expired')
  })

  it('renders a rotation countdown when daysUntilRotation is zero or positive', async () => {
    const soon = await render({ secret: secret({ daysUntilRotation: 14 }) })
    expect(soon.textContent).toContain('Rotate in 14d')
    const dueToday = await render({ secret: secret({ daysUntilRotation: 0 }) })
    expect(dueToday.textContent).toContain('Rotate in 0d')
    // Negative → expired, never a countdown.
    const expired = await render({ secret: secret({ daysUntilRotation: -1 }) })
    expect(expired.textContent).not.toContain('Rotate in')
    // Field omitted → no rotation chip at all.
    const none = await render({ secret: secret() })
    expect(none.textContent).not.toContain('Rotate in')
  })

  it('renders the last-rotated note when lastRotatedAt is provided', async () => {
    const withDate = await render({ secret: secret({ lastRotatedAt: '2026-01-02' }) })
    expect(withDate.textContent).toContain('Last rotated')
    expect(withDate.textContent).toContain('2026-01-02')
    const without = await render({ secret: secret() })
    expect(without.textContent).not.toContain('Last rotated')
  })

  it('always renders Show and Copy buttons', async () => {
    const host = await render({ secret: secret() })
    expect(host.textContent).toContain('Show')
    expect(host.textContent).toContain('Copy')
  })

  it('renders Rotate / Delete buttons only when their handlers are supplied', async () => {
    const withActions = await render({ secret: secret(), onRotate: () => {}, onDelete: () => {} })
    expect(withActions.textContent).toContain('Rotate')
    expect(withActions.textContent).toContain('Delete')
    const without = await render({ secret: secret() })
    expect(without.textContent).not.toContain('Rotate')
    expect(without.textContent).not.toContain('Delete')
  })

  it('forwards className', async () => {
    const host = await render({ secret: secret(), className: 'sr-cls' })
    expect(markupOf(host)).toContain('sr-cls')
  })

  it('copies the value through the clipboard core when Copy is clicked', async () => {
    const m = await mount(`<div mol-secret-row [secret]="p['secret']"></div>`, {
      secret: secret(),
    })
    mounted.push(m)
    buttonWithText(m.host, 'Copy').click()
    await flush()
    m.tick()
    expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith('sk_live_abcdef123456')
    expect(buttonWithText(m.host, 'Copied!').textContent?.trim()).toBe('Copied!')
  })

  it('shows no copied feedback when the clipboard core reports failure', async () => {
    copyTextWithFallbackMock.mockResolvedValueOnce(false)
    const m = await mount(`<div mol-secret-row [secret]="p['secret']"></div>`, {
      secret: secret(),
    })
    mounted.push(m)
    buttonWithText(m.host, 'Copy').click()
    await flush()
    m.tick()
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith('sk_live_abcdef123456')
    expect(buttonWithText(m.host, 'Copy').textContent?.trim()).toBe('Copy')
    expect(m.host.textContent).not.toContain('Copied!')
  })
})
