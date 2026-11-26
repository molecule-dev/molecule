// @vitest-environment jsdom
/**
 * The comment field's label goes through i18n — the Angular port of
 * `@molecule/app-rating-form-react/src/__tests__/rating-form-i18n.test.tsx`:
 * the same test names and assertions, mounted through Angular's real renderer
 * in jsdom. The React original had the label as the English literal
 * `"Comment"` in its JSX (found by the pseudo-locale check); these tests mock
 * `useTranslation` with a `t` that marks every key, so a string that bypassed
 * `t()` would show up as plain English.
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

// A ClassMap proxy echoing each accessed member back as its token — the same
// mock the Angular suite uses.
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

// Translations the bonded i18n provider would supply: each key maps to a
// marked string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

vi.mock('@molecule/app-ui-angular', async (importOriginal) => {
  const { Component } = await import('@angular/core')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Button: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
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
      changeDetection: ChangeDetectionStrategy.Eager,
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

const mounted: Array<() => Promise<void>> = []

/**
 * Mounts the form through a JIT host template and returns the host element.
 *
 * @param props - The props the host template binds.
 * @returns The host element.
 */
async function render(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [RatingForm as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<form mol-rating-form
      [onSubmit]="p['onSubmit']"
      [commentPlaceholder]="p['commentPlaceholder']"
    ></form>`,
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
  mounted.push(async () => {
    appRef.destroy()
    host.remove()
  })
  return host
}

afterEach(async () => {
  for (const teardown of mounted.splice(0)) await teardown()
})

describe('RatingForm i18n', () => {
  it('renders the comment field label through t', async () => {
    const host = await render()
    const field = host.querySelector('div[mol-textarea]')
    // The label the parent template sets lands on the field's host element.
    expect(field?.getAttribute('aria-label')).toBe('«rating.comment»')
  })

  it('an explicit commentPlaceholder overrides the translated placeholder', async () => {
    const host = await render({ commentPlaceholder: 'Tell us more' })
    expect(host.querySelector('textarea')?.getAttribute('placeholder')).toBe('Tell us more')
    expect(host.innerHTML).not.toContain('«rating.commentPlaceholder»')
  })
})
