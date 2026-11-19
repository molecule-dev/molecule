// @vitest-environment jsdom
/**
 * Form submission error defaults — a port of
 * `@molecule/app-ui-react/src/__tests__/form-submit-errors.test.tsx`: a
 * rejected async submission renders an accessible server-error list without
 * any app-owned adapter, the fieldset is disabled while a submission is in
 * flight, native action/method forms keep native submission, a controlled
 * `submitError` takes over the internal failure (and an explicit `undefined`
 * clears it), and a real HTTP client 400 body renders as field errors.
 *
 * Angular forces the translation: the form element IS the component host
 * (`form[mol-form]`), the handlers are inputs, a submission is a real DOM
 * `submit` event, and the form state hook is `useForm` from
 * `@molecule/app-angular`. Change detection is explicit, so each settlement
 * runs a pass.
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads —
// evaluating the decorators otherwise throws "needs the JIT compiler".
import '@angular/compiler'
import {
  ChangeDetectorRef,
  Component,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { By, platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { fireEvent, within } from '@testing-library/dom'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { useForm } from '@molecule/app-angular'
import { createFetchClient } from '@molecule/app-http'
import type { FormProps } from '@molecule/app-ui'

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

/** A form whose async `onFormSubmit` a test drives. */
const AsyncSaveHost = Component({
  selector: 'mol-spec-async-save-form',
  standalone: true,
  imports: [Form],
  template: `<form mol-form [onFormSubmit]="save">
    <input name="name" value="Luke" />
    <button>Save</button>
  </form>`,
})(
  class AsyncSaveHostComponent {
    /** The submission handler (React's `onFormSubmit`). */
    save: (data: Record<string, unknown>) => void | Promise<void> = () => {}
  },
)

/** A form driven by the real `useForm` submit runner, with no app-owned catch. */
const HandlerSwapHost = Component({
  selector: 'mol-spec-handler-swap-form',
  standalone: true,
  imports: [Form],
  template: `<form mol-form [onSubmit]="handlers.onSubmit" [onFormSubmit]="handlers.onFormSubmit">
    <input name="name" value="Luke" />
  </form>`,
})(
  class HandlerSwapHostComponent {
    /** The submit handlers bound to the form; a test swaps them for new ones. */
    handlers: Pick<FormProps, 'onSubmit' | 'onFormSubmit'> = {}
  },
)

const RealFormHost = Component({
  selector: 'mol-spec-real-form',
  standalone: true,
  imports: [Form],
  template: `<form mol-form [onSubmit]="submit">
    <input name="bio" value="Draft bio" />
    <button>Save profile</button>
  </form>`,
})(
  class RealFormHostComponent {
    private readonly form = useForm({ defaultValues: { bio: 'Draft bio' } })

    /** The real runner a `useForm` consumer binds. */
    readonly submit = this.form.handleSubmit(async () => {
      throw new Error('Save rejected')
    })
  },
)

/** A pending submission the test settles itself. */
const PendingHost = Component({
  selector: 'mol-spec-pending-form',
  standalone: true,
  imports: [Form],
  template: `<form mol-form [onFormSubmit]="save">
    <button>Save</button>
  </form>`,
})(
  class PendingHostComponent {
    /** The submission handler. */
    save: (data: Record<string, unknown>) => void | Promise<void> = () => {}
  },
)

/** A native action/method form: submission stays native. */
const NativeHost = Component({
  selector: 'mol-spec-native-form',
  standalone: true,
  imports: [Form],
  template: `<form mol-form action="/search" method="get">
    <input name="q" />
  </form>`,
})(class NativeHostComponent {})

/** A form whose data handler rejects while its native handler also throws. */
const BothHandlersHost = Component({
  selector: 'mol-spec-both-handlers-form',
  standalone: true,
  imports: [Form],
  template: `<form mol-form [onFormSubmit]="save" [onSubmit]="native">
    <button>Save</button>
  </form>`,
})(
  class BothHandlersHostComponent {
    /** The async data handler. */
    save = async (): Promise<void> => {
      throw new Error('Data rejected')
    }

    /** The native handler. */
    native = (): void => {
      throw new Error('Native rejected')
    }
  },
)

/** A form saving through a real HTTP client. */
const HttpHost = Component({
  selector: 'mol-spec-http-form',
  standalone: true,
  imports: [Form],
  template: `<form mol-form [onFormSubmit]="save">
    <input name="email" value="reader@example.test" />
    <button>Register</button>
  </form>`,
})(
  class HttpHostComponent {
    /** The submission handler. */
    save: (data: Record<string, unknown>) => void | Promise<void> = () => {}
  },
)

/** The rendered form element. */
const formOf = (fixture: ComponentFixture<unknown>): HTMLFormElement =>
  fixture.nativeElement.querySelector('form') as HTMLFormElement

/** The rendered fieldset. */
const fieldsetOf = (fixture: ComponentFixture<unknown>): HTMLFieldSetElement =>
  fixture.nativeElement.querySelector('fieldset') as HTMLFieldSetElement

/** The alert list's text, or null when no error list renders. */
const alertText = (): string | null => document.querySelector('[role="alert"]')?.textContent ?? null

/**
 * Mounts a spec host, arranging its fields first.
 *
 * @param host - The host component to mount.
 * @param configure - Applies the test's props before the first pass.
 * @returns The fixture.
 */
function render<T>(host: Type<T>, configure?: (instance: T) => void): ComponentFixture<T> {
  TestBed.configureTestingModule({
    imports: [host],
    providers: [provideZonelessChangeDetection()],
  })
  const fixture = TestBed.createComponent(host)
  if (configure) configure(fixture.componentInstance)
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
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('Form submission error defaults', () => {
  it('catches an async onFormSubmit failure, renders it, and allows a successful retry', async () => {
    const save = vi
      .fn<(data: Record<string, unknown>) => void | Promise<void>>()
      .mockRejectedValueOnce({ data: { errors: { name: ['is unavailable'] } } })
      .mockResolvedValueOnce(undefined)
    const fixture = render(AsyncSaveHost, (instance) => {
      instance.save = save
    })
    fireEvent.submit(formOf(fixture))
    await vi.waitFor(() => {
      fixture.detectChanges()
      expect(alertText()).not.toBeNull()
    })
    expect(alertText()).toBe('name is unavailable')
    expect(save).toHaveBeenCalledWith({ name: 'Luke' })
    expect(fieldsetOf(fixture).disabled).toBe(false)
    fireEvent.submit(formOf(fixture))
    await vi.waitFor(() => {
      fixture.detectChanges()
      expect(alertText()).toBeNull()
    })
    expect(save).toHaveBeenCalledTimes(2)
  })

  it('calls the submit handlers the parent passed most recently', async () => {
    const first = { onSubmit: vi.fn(), onFormSubmit: vi.fn() }
    const second = { onSubmit: vi.fn(), onFormSubmit: vi.fn() }
    const fixture = render(HandlerSwapHost, (instance) => {
      instance.handlers = first
    })
    fixture.componentInstance.handlers = second
    // The host component is OnPush (Angular 22's default): a new handler is a new input once its view is marked.
    fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck()
    fixture.detectChanges()
    fireEvent.submit(formOf(fixture))
    await fixture.whenStable()
    expect(first.onSubmit).not.toHaveBeenCalled()
    expect(first.onFormSubmit).not.toHaveBeenCalled()
    expect(second.onSubmit).toHaveBeenCalledTimes(1)
    expect(second.onFormSubmit).toHaveBeenCalledWith({ name: 'Luke' })
  })

  it('uses the real useForm submit handler without an app-owned error catch', async () => {
    const fixture = render(RealFormHost)
    fireEvent.submit(formOf(fixture))
    await vi.waitFor(() => {
      fixture.detectChanges()
      expect(alertText()).toBe('Save rejected')
    })
    expect((within(document.body).getByRole('textbox') as HTMLInputElement).value).toBe('Draft bio')
  })

  it('disables the fieldset until the async handler settles', async () => {
    let resolve!: () => void
    const pending = new Promise<void>((done) => {
      resolve = done
    })
    const fixture = render(PendingHost, (instance) => {
      instance.save = () => pending
    })
    fireEvent.submit(formOf(fixture))
    fixture.detectChanges()
    expect(fieldsetOf(fixture).disabled).toBe(true)
    resolve()
    await vi.waitFor(() => {
      fixture.detectChanges()
      expect(fieldsetOf(fixture).disabled).toBe(false)
    })
    expect(alertText()).toBeNull()
  })

  it('keeps native action/method forms and successful forms free of error UI', () => {
    const fixture = render(NativeHost)
    const element = formOf(fixture)
    expect(element.action).toMatch(/\/search$/)
    expect(element.method).toBe('get')
    expect(fireEvent.submit(element)).toBe(true)
    expect(alertText()).toBeNull()
  })

  it('lets a controlled error clear an internally captured rejection', async () => {
    const save = async (): Promise<void> => {
      throw new Error('Rejected')
    }
    const fixture = render(AsyncSaveHost, (instance) => {
      instance.save = save
    })
    fireEvent.submit(formOf(fixture))
    await vi.waitFor(() => {
      fixture.detectChanges()
      expect(alertText()).toBe('Rejected')
    })
    // The caller now passes its own `submitError` (explicitly undefined): the
    // internal failure is superseded, exactly as React's `Object.hasOwn` check
    // treats a present-but-undefined prop. Angular writes an input by
    // assigning the property, which is what this does.
    const formDebug = fixture.debugElement.query(By.directive(Form))
    const form: InstanceType<typeof Form> = formDebug.componentInstance
    const cdr = formDebug.injector.get(ChangeDetectorRef)
    form.submitError = undefined
    cdr.detectChanges()
    expect(alertText()).toBeNull()
  })

  it('handles an async data-handler rejection even when the native handler throws too', async () => {
    const fixture = render(BothHandlersHost)
    fireEvent.submit(formOf(fixture))
    await vi.waitFor(() => {
      fixture.detectChanges()
      expect(alertText()).toBe('Data rejected')
    })
  })

  it('renders a real HTTP client 400 response without a caller-owned error adapter', async () => {
    const request = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            errors: { email: ['is already taken'], displayName: ['is too short'] },
          }),
          { status: 400, headers: { 'content-type': 'application/json' } },
        ),
    )
    vi.stubGlobal('fetch', request)
    const http = createFetchClient({ baseURL: 'https://accounts.example/api' })
    const fixture = render(HttpHost, (instance) => {
      instance.save = async (data) => {
        await http.post('/registrations', data)
      }
    })
    fireEvent.submit(formOf(fixture))
    await vi.waitFor(() => {
      fixture.detectChanges()
      expect(alertText() ?? '').toContain('email is already taken')
    })
    expect(
      within(document.body)
        .getAllByRole('listitem')
        .map((node) => node.textContent),
    ).toEqual(['email is already taken', 'displayName is too short'])
    expect(request).toHaveBeenCalledOnce()
    expect(fieldsetOf(fixture).disabled).toBe(false)
  })
})
