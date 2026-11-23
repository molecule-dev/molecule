// @vitest-environment jsdom
/**
 * Controlled `submitError` rendering on the Form: server field errors arrive
 * as text in an accessible list, malformed values are dropped, and no markup
 * from the server is inserted — a port of
 * `@molecule/app-ui-react/src/__tests__/form-submit-error-rendering.test.tsx`.
 *
 * Angular forces the translation: `submitError` is an input on the
 * `form[mol-form]` host, and the class map is resolved through the package's
 * module mock (the same stubs the other definition/render tests use).
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads —
// evaluating the decorators otherwise throws "needs the JIT compiler".
import '@angular/compiler'
import { ChangeDetectionStrategy, Component, provideZonelessChangeDetection } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { within } from '@testing-library/dom'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    // Only `cn` is CALLED; the class tokens are plain strings — what Angular's
    // class binding requires.
    const CALLABLE = new Set(['cn'])
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        if (typeof prop === 'string' && CALLABLE.has(prop)) return () => prop
        return String(prop)
      },
    }
    return new Proxy({}, handler)
  },
}))

const { Form } = await import('../components/form.component.js')

/** A controlled form carrying a server error body (React's `submitError`). */
const ControlledHost = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-spec-controlled-form',
  standalone: true,
  imports: [Form],
  template: `<form mol-form [submitError]="submitError">
    <input name="email" value="taken@example.test" />
  </form>`,
})(
  class ControlledHostComponent {
    /** The controlled failure, exactly as a form controller reports it. */
    submitError: unknown
  },
)

/**
 * Mounts the controlled form carrying the given failure.
 *
 * @param submitError - The controlled failure (React's `submitError` prop).
 * @returns The fixture.
 */
function renderControlled(submitError: unknown): ComponentFixture<unknown> {
  TestBed.configureTestingModule({
    imports: [ControlledHost],
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const fixture = TestBed.createComponent(ControlledHost)
  fixture.componentInstance.submitError = submitError
  fixture.detectChanges()
  return fixture
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

afterEach(() => {
  TestBed.resetTestingModule()
  document.body.innerHTML = ''
})

describe('controlled Form error rendering', () => {
  it.each([
    { status: 400, data: { errors: { email: ['is already taken'], name: ['is too short'] } } },
    {
      status: 422,
      response: { data: { errors: { email: ['is already taken'], name: ['is too short'] } } },
    },
    { status: 400, body: { errors: { email: ['is already taken'], name: ['is too short'] } } },
  ])(
    'renders controlled P342-shaped field errors from each supported error body: %#',
    (submitError) => {
      renderControlled(submitError)
      expect(within(document.body).queryByRole('alert')?.textContent).toContain(
        'email is already taken',
      )
      expect(
        within(document.body)
          .queryAllByRole('listitem')
          .map((node) => node.textContent),
      ).toEqual(['email is already taken', 'name is too short'])
      expect((within(document.body).getByRole('textbox') as HTMLInputElement).value).toBe(
        'taken@example.test',
      )
      expect(document.querySelector('form')!.hasAttribute('submitError')).toBe(false)
    },
  )

  it('renders controlled non-X1 invoice errors as text and ignores malformed fields', () => {
    renderControlled({
      response: {
        data: {
          errors: { total: 'must be positive', ref: ['<script>bad()</script>', null, {}] },
        },
      },
    })
    expect(
      within(document.body)
        .getAllByRole('listitem')
        .map((node) => node.textContent),
    ).toEqual(['total must be positive', 'ref <script>bad()</script>'])
    expect(document.querySelector('script')).toBeNull()
  })

  it.each([new Error('Offline'), { data: { errors: { field: [null, {}] } } }, null])(
    'renders a controlled ordinary or malformed failure instead of an empty error list: %#',
    (error) => {
      renderControlled(error)
      expect(within(document.body).queryByRole('alert')?.textContent).toBe(
        error instanceof Error ? 'Offline' : 'Unable to submit. Please try again.',
      )
    },
  )
})
