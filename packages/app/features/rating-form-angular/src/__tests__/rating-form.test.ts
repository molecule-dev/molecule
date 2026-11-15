// @vitest-environment jsdom
/**
 * Unit tests of `RatingForm` — the port of
 * `@molecule/app-rating-form-react`'s own suite. The React suite renders the
 * component with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular adapter
 * uses) and asserts the same markup strings.
 *
 * @module
 */

import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { type ApplicationRef, createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
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

// The React suite's translation mock: each key falls back to its default value.
vi.mock('@molecule/app-angular', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The UI markers the React suite mocks `@molecule/app-ui-react` with: a
// `data-button` button and a `data-textarea` field.
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component } = await import('@angular/core')
  return {
    Button: Component({
      selector: 'button[mol-button]',
      standalone: true,
      inputs: ['type', 'variant', 'color', 'disabled'],
      host: {
        'data-button': '',
        '[attr.type]': 'type ?? "button"',
        '[disabled]': 'disabled || null',
      },
      template: `<ng-content></ng-content>`,
    })(
      class MockButton {
        /** Native button type. */
        type?: string
        /** Visual variant (unused by the marker). */
        variant?: string
        /** Colour variant (unused by the marker). */
        color?: string
        /** Disabled state. */
        disabled?: boolean
      },
    ),
    Textarea: Component({
      selector: 'div[mol-textarea]',
      standalone: true,
      inputs: ['placeholder', 'value', 'rows'],
      template: `<textarea
        data-textarea
        [attr.placeholder]="placeholder"
        [attr.rows]="rows"
      ></textarea>`,
    })(
      class MockTextarea {
        /** Placeholder text. */
        placeholder?: string
        /** Controlled value. */
        value?: string
        /** Rows attribute. */
        rows?: number
      },
    ),
  }
})

const { RatingForm } = await import('../rating-form.component.js')

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** The markup the component rendered. */
  readonly markup: string
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param templateUrl - The host template, receiving the props as `p`.
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(
  templateUrl: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Default,
    template: templateUrl,
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
    markup: host.innerHTML,
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

/** The host template: every prop bound as an input, the React suite's shape. */
const TEMPLATE = `<form mol-rating-form
  [onSubmit]="p['onSubmit']"
  [max]="p['max']"
  [defaultRating]="p['defaultRating']"
  [requireComment]="p['requireComment']"
  [title]="p['title']"
  [commentPlaceholder]="p['commentPlaceholder']"
  [submitLabel]="p['submitLabel']"
  [className]="p['className']"
></form>`

const mounted: Mounted[] = []

/**
 * Mounts `RatingForm` with the given props.
 *
 * @param props - The component props.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown> = {}): Promise<Mounted> {
  const m = await mount(TEMPLATE, RatingForm as Type<unknown>, {
    onSubmit: () => {},
    ...props,
  })
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('RatingForm', () => {
  it('renders the title when present and omits it otherwise', async () => {
    expect((await render({ title: 'Rate us' })).markup).toContain('Rate us')
    expect((await render()).markup).not.toContain('<h3')
  })

  it('renders a radiogroup with one star button per max', async () => {
    const markup = (await render({ max: 5 })).markup
    expect(markup).toContain('role="radiogroup"')
    expect(markup.match(/role="radio"/g) ?? []).toHaveLength(5)
  })

  it('marks the defaultRating star aria-checked', async () => {
    const markup = (await render({ defaultRating: 3 })).markup
    expect(markup.match(/aria-checked="true"/g) ?? []).toHaveLength(1)
  })

  it('renders the comment textarea with a default placeholder', async () => {
    const markup = (await render()).markup
    expect(markup).toContain('data-textarea')
    expect(markup).toContain('Share your thoughts')
  })

  it('disables the submit button until a rating is chosen', async () => {
    const noRating = (await render()).markup
    expect(noRating).toMatch(/<button[^>]*data-button=""[^>]*disabled/)
    const withRating = (await render({ defaultRating: 4 })).markup
    expect(withRating).not.toMatch(/<button[^>]*data-button=""[^>]*disabled/)
  })

  it('honours a custom submitLabel and forwards className', async () => {
    const markup = (
      await render({
        defaultRating: 4,
        submitLabel: 'Post review',
        className: 'rf-cls',
      })
    ).markup
    expect(markup).toContain('Post review')
    expect(markup).toContain('rf-cls')
  })
})
