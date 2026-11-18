/**
 * Angular wiring for {@link useAuthFormState}.
 *
 * React context flows through the rendered tree, including projected children;
 * Angular DI does not (projected content keeps its declaration-site injector),
 * so the provider registers the shared state on its host ELEMENT (the same
 * DOM-scoped mechanism `@molecule/app-ui-angular` uses for its contexts) and
 * consumers look it up by walking their DOM ancestors — the same "nearest
 * enclosing provider" semantics React has.
 *
 * `<AuthShell>` publishes the same state, so any auth form rendered inside
 * inherits cross-view email persistence — call `useAuthFormStateContext()`
 * from the form.
 *
 * @module
 */

import {
  Component,
  ElementRef,
  EnvironmentInjector,
  inject,
  type OnDestroy,
  type OnInit,
  runInInjectionContext,
} from '@angular/core'

import { findDomContext } from '@molecule/app-ui-angular'

import { provideAuthFormState } from './form-state-context.js'
import type { AuthFormFields, AuthFormState, UseAuthFormStateOptions } from './types.js'
import { useAuthFormState } from './use-auth-form-state.js'

/**
 * Reads the shared auth form state published by the nearest
 * `<AuthFormStateProvider>`/`<AuthShell>`.
 *
 * The lookup is deferred to the first property read, so a form projected into
 * the provider resolves it reliably after the provider's initialization.
 *
 * @returns The shared {@link AuthFormState}.
 * @throws {Error} If used outside an `<AuthFormStateProvider>`/`<AuthShell>`.
 */
export function useAuthFormStateContext(): AuthFormState {
  const host = inject(ElementRef).nativeElement as HTMLElement
  const resolve = (): AuthFormState => {
    const state = findDomContext<AuthFormState>(host)
    if (!state) {
      throw new Error(
        'useAuthFormStateContext must be used within an <AuthFormStateProvider> (or <AuthShell>, which renders one).',
      )
    }
    return state
  }
  return {
    get fields() {
      return resolve().fields
    },
    get hydrated() {
      return resolve().hydrated
    },
    setField: (name, value) => resolve().setField(name, value),
    setFields: (patch) => resolve().setFields(patch),
    clear: () => resolve().clear(),
  }
}

/**
 * Provides a single {@link useAuthFormState} instance to all descendants via a
 * DOM-scoped context, so sibling/child auth forms share the same email.
 *
 * The host is `display: contents`, so it adds no box of its own — React's
 * provider renders its children with no wrapping element.
 */
@Component({
  selector: 'div[mol-auth-form-state-provider]',
  standalone: true,
  inputs: ['storage', 'storageKey', 'initialFields'],
  host: { style: 'display: contents' },
  template: `<ng-content></ng-content>`,
})
export class AuthFormStateProvider implements OnInit, OnDestroy {
  /** Storage provider backing persistence (defaults to a shared in-memory provider). */
  storage?: UseAuthFormStateOptions['storage']
  /** Storage key for the persisted fields. */
  storageKey?: string
  /** Seed values used before hydration / when storage is empty. */
  initialFields?: AuthFormFields

  private readonly injector = inject(EnvironmentInjector)
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement
  private state: AuthFormState | null = null
  private teardown: (() => void) | null = null

  /**
   * Creates the state with this instance's inputs (available only here) and
   * registers it for descendants.
   */
  ngOnInit(): void {
    this.state = runInInjectionContext(this.injector, () =>
      useAuthFormState({
        storage: this.storage,
        storageKey: this.storageKey,
        initialFields: this.initialFields,
      }),
    )
    this.teardown = provideAuthFormState(this.host, this.state)
  }

  /** Removes the DOM-scoped registration. */
  ngOnDestroy(): void {
    this.teardown?.()
  }
}
