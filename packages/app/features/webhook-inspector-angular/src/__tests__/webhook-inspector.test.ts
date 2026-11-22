// @vitest-environment jsdom
/**
 * Unit tests of `WebhookInspector` — the port of
 * `@molecule/app-webhook-inspector-react`'s own suite. The React suite renders
 * the component with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup.
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
// `fontWeight`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
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
        // A tone class carries its tone, so a test can tell `bgTone('success')`
        // from `bgTone('error')` — the real ClassMap gives each its own class.
        if (token === 'bgTone' || token === 'textTone' || token === 'borderTone')
          return (tone: unknown) => `${token}-${String(tone)}`
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// resolves to the inline English default.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { WebhookInspector } = await import('../webhook-inspector.component.js')
import type { WebhookDelivery, WebhookInspectorProps } from '../types.js'

/** A mounted spec host: its element and a teardown. */
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
 * @param template - The host template (the component element).
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(template: string, props: WebhookInspectorProps): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [WebhookInspector as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Default,
    template,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: WebhookInspectorProps = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<{ p: WebhookInspectorProps }> = createComponent(Host, {
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
 * Mounts a `WebhookInspector` with the given props through the app-style host
 * template and returns the mounted host.
 *
 * @param props - The component's props.
 * @returns The mounted host.
 */
const render = async (props: WebhookInspectorProps): Promise<Mounted> => {
  const m = await mount(
    `<div
      mol-webhook-inspector
      [deliveries]="p['deliveries']"
      [onRetry]="p['onRetry']"
      [onSelect]="p['onSelect']"
      [selectedId]="p['selectedId']"
      [className]="p['className']"
    ></div>`,
    props,
  )
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

const deliveries: WebhookDelivery[] = [
  {
    id: '1',
    eventType: 'payment.succeeded',
    timestamp: '10:00',
    statusCode: 200,
    status: 'success',
    durationMs: 120,
    requestBody: { amount: 5000 },
    responseBody: 'ok',
  },
  {
    id: '2',
    eventType: 'payment.failed',
    timestamp: '10:05',
    statusCode: 500,
    status: 'failure',
    attempt: 2,
  },
]

describe('WebhookInspector', () => {
  it('renders a <details> per delivery with its event type and status code', async () => {
    const m = await render({ deliveries })
    expect(m.host.querySelectorAll('details')).toHaveLength(2)
    expect(m.host.innerHTML).toContain('payment.succeeded')
    expect(m.host.innerHTML).toContain('payment.failed')
    expect(m.host.innerHTML).toContain('200')
    expect(m.host.innerHTML).toContain('500')
  })

  it('tones the status code badge by status', async () => {
    const pending: WebhookDelivery = {
      id: '3',
      eventType: 'invoice.pending',
      timestamp: '10:07',
      statusCode: 202,
      status: 'pending',
    }
    const m = await render({ deliveries: [...deliveries, pending] })
    expect(m.host.innerHTML).toContain('bgTone-success') // success
    expect(m.host.innerHTML).toContain('bgTone-error') // failure
    expect(m.host.innerHTML).toContain('bgTone-warning') // pending
    // The colour is the theme's (a ClassMap class), never a literal in a style.
    expect(m.host.innerHTML).toContain('textOnTone')
    expect(m.host.innerHTML).not.toContain('background')
  })

  it('renders attempt number and duration when present', async () => {
    const m = await render({ deliveries })
    expect(m.host.innerHTML).toContain('#2')
    expect(m.host.innerHTML).toContain('120ms')
  })

  it('renders the request and response JSON panels', async () => {
    const m = await render({ deliveries })
    expect(m.host.innerHTML).toContain('Request')
    expect(m.host.innerHTML).toContain('Response')
    expect(m.host.innerHTML).toContain('5000')
  })

  it('renders the retry button only for failed deliveries when onRetry is supplied', async () => {
    const withRetry = await render({ deliveries, onRetry: () => {} })
    expect(withRetry.host.innerHTML.match(/Retry/g) ?? []).toHaveLength(1)
    const without = await render({ deliveries })
    expect(without.host.innerHTML).not.toContain('Retry')
  })

  it('opens the details for the selected delivery', async () => {
    const m = await render({ deliveries, selectedId: '1' })
    expect(m.host.innerHTML).toMatch(/<details[^>]*open/)
  })

  it('forwards className', async () => {
    const m = await render({ deliveries, className: 'wi-cls' })
    expect(m.host.innerHTML).toContain('wi-cls')
  })

  it('gives the retry button an accessible description naming its delivery', async () => {
    const m = await render({ deliveries, onRetry: () => {} })
    const doc = new DOMParser().parseFromString(m.host.innerHTML, 'text/html')
    const button = doc.querySelector('[data-mol-id="webhook-inspector-retry"]')
    expect(button).not.toBeNull()
    // The description is the row's event-type span, and it carries that text.
    const describedBy = button?.getAttribute('aria-describedby') ?? ''
    expect(describedBy).not.toBe('')
    expect(doc.getElementById(describedBy)?.textContent).toBe('payment.failed')
  })

  it('renders the retry button outside the summary, as a sibling of the details', async () => {
    const m = await render({ deliveries, onRetry: () => {} })
    const doc = new DOMParser().parseFromString(m.host.innerHTML, 'text/html')
    const button = doc.querySelector('[data-mol-id="webhook-inspector-retry"]')
    expect(button?.closest('summary')).toBeNull()
    expect(button?.closest('details')).toBeNull()
    expect(button?.parentElement?.nextElementSibling).toBeNull()
    expect(button?.parentElement?.previousElementSibling?.tagName).toBe('DETAILS')
  })
})
