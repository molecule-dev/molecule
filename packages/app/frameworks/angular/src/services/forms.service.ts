/**
 * Angular service for form handling.
 *
 * @module
 */

import { Injectable, type OnDestroy } from '@angular/core'
import { BehaviorSubject, distinctUntilChanged, map, type Observable } from 'rxjs'

import type {
  FieldRegistration,
  FormController,
  FormOptions,
  FormProvider,
  FormState,
  RegisterOptions,
} from '@molecule/app-forms'

/**
 * Wrapper around a FormController that provides RxJS observables and
 * synchronous accessors for use in Angular components.
 *
 * @example
 * ```typescript
 * @Component({
 *   selector: 'app-login-form',
 *   template: `
 *     <form (ngSubmit)="onSubmit()">
 *       <input [value]="emailValue" (input)="emailReg.onChange($event)" (blur)="emailReg.onBlur()">
 *       <span *ngIf="errors$ | async as errors">{{ errors['email'] }}</span>
 *       <button type="submit" [disabled]="isSubmitting$ | async">Submit</button>
 *     </form>
 *   `
 * })
 * export class LoginFormComponent implements OnInit, OnDestroy {
 *   private form!: MoleculeFormInstance<{ email: string; password: string }>
 *   emailReg!: FieldRegistration
 *
 *   errors$ = new Observable<Partial<Record<string, string>>>()
 *   isSubmitting$ = new Observable<boolean>()
 *
 *   constructor(private formsService: MoleculeFormsService) {}
 *
 *   ngOnInit() {
 *     this.form = this.formsService.createForm(myProvider, {
 *       defaultValues: { email: '', password: '' },
 *       mode: 'onBlur',
 *     })
 *     this.emailReg = this.form.register('email', { required: true, email: true })
 *     this.errors$ = this.form.errors$
 *     this.isSubmitting$ = this.form.isSubmitting$
 *   }
 *
 *   onSubmit() {
 *     const handler = this.form.handleSubmit(async (values) => {
 *       await login(values)
 *     })
 *     handler()
 *   }
 *
 *   ngOnDestroy() {
 *     this.form.destroy()
 *   }
 * }
 * ```
 */
export class MoleculeFormInstance<T extends Record<string, unknown>> {
  private stateSubject: BehaviorSubject<FormState<T>>
  private unsubscribe: (() => void) | null = null

  /**
   * Observable of the full form state.
   */
  state$: Observable<FormState<T>>

  /**
   * Observable of form validity.
   */
  isValid$: Observable<boolean>

  /**
   * Observable of form dirty state.
   */
  isDirty$: Observable<boolean>

  /**
   * Observable of form submitting state.
   */
  isSubmitting$: Observable<boolean>

  /**
   * Observable of field errors.
   */
  errors$: Observable<Partial<Record<keyof T, string>>>

  constructor(private controller: FormController<T>) {
    this.stateSubject = new BehaviorSubject<FormState<T>>(controller.getState())

    this.unsubscribe = controller.subscribe((state: FormState<T>) => {
      this.stateSubject.next(state)
    })

    this.state$ = this.stateSubject.asObservable()

    this.isValid$ = this.state$.pipe(
      map((state) => state.isValid),
      distinctUntilChanged(),
    )

    this.isDirty$ = this.state$.pipe(
      map((state) => state.isDirty),
      distinctUntilChanged(),
    )

    this.isSubmitting$ = this.state$.pipe(
      map((state) => state.isSubmitting),
      distinctUntilChanged(),
    )

    this.errors$ = this.state$.pipe(
      map((state) => state.errors),
      distinctUntilChanged(),
    )
  }

  /**
   * Get the current form state snapshot.
   * @returns The current form state including values, errors, validity, and submission status.
   */
  get state(): FormState<T> {
    return this.controller.getState()
  }

  /**
   * Get the current form validity snapshot.
   * @returns `true` if all fields pass validation, `false` otherwise.
   */
  get isValid(): boolean {
    return this.controller.getState().isValid
  }

  /**
   * Get the current form dirty state snapshot.
   * @returns `true` if any field has been modified from its default value, `false` otherwise.
   */
  get isDirty(): boolean {
    return this.controller.getState().isDirty
  }

  /**
   * Get the current form submitting state snapshot.
   * @returns `true` if the form is currently being submitted, `false` otherwise.
   */
  get isSubmitting(): boolean {
    return this.controller.getState().isSubmitting
  }

  /**
   * Register a field for form management.
   *
   * @param name - The field name corresponding to a key in the form values type.
   * @param options - Registration options including validation rules and default value.
   * @returns The field registration with value, onChange, onBlur, and ref bindings.
   */
  register(name: keyof T, options?: Omit<RegisterOptions, 'name'>): FieldRegistration {
    return this.controller.register({ ...options, name: name as string } as RegisterOptions)
  }

  /**
   * Get the value of a specific field.
   *
   * @param name - The field name corresponding to a key in the form values type.
   * @returns The current value of the specified field.
   */
  getValue<K extends keyof T>(name: K): T[K] {
    return this.controller.getValue(name)
  }

  /**
   * Set the value of a specific field.
   *
   * @param name - The field name corresponding to a key in the form values type.
   * @param value - The new value to set for the field.
   */
  setValue<K extends keyof T>(name: K, value: T[K]): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.controller.setValue(name as any, value as any)
  }

  /**
   * Get the error for a specific field.
   *
   * @param name - The field name to retrieve the error for.
   * @returns The error message for the field, or `undefined` if the field has no error.
   */
  getError(name: keyof T): string | undefined {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.controller.getError(name as any)
  }

  /**
   * Set the error for a specific field.
   *
   * @param name - The field name to set or clear the error for.
   * @param error - The error message to set, or `undefined` to clear the error.
   */
  setError(name: keyof T, error: string | undefined): void {
    if (error !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.controller.setError(name as any, error)
    } else {
      this.controller.clearError(name)
    }
  }

  /**
   * Clear all field errors.
   */
  clearErrors(): void {
    this.controller.clearErrors()
  }

  /**
   * Create a submit handler function.
   *
   * @param onSubmit - Callback invoked with validated form values on successful submission.
   * @param onError - Optional callback invoked with field errors when validation fails.
   * @returns A submit handler function that can be called from form submit events.
   */
  handleSubmit(
    onSubmit: (values: T) => void | Promise<void>,
    onError?: (errors: Partial<Record<keyof T, string>>) => void,
  ): (event?: { preventDefault?: () => void }) => Promise<void> {
    return this.controller.handleSubmit(onSubmit, onError)
  }

  /**
   * Reset the form to initial values.
   *
   * @param values - Optional partial values to use as the new initial state.
   */
  reset(values?: Partial<T>): void {
    this.controller.reset(values)
  }

  /**
   * Validate all fields.
   *
   * @returns A promise that resolves to `true` if all fields are valid, `false` otherwise.
   */
  validate(): Promise<boolean> {
    return this.controller.validate()
  }

  /**
   * Destroy the form instance and clean up subscriptions.
   */
  destroy(): void {
    this.unsubscribe?.()
    this.unsubscribe = null
    this.stateSubject.complete()
    this.controller.destroy()
  }
}

/**
 * Angular service for form handling.
 *
 * Wraps molecule form providers and creates form instances that expose
 * state as RxJS observables.
 *
 * @example
 * ```typescript
 * @Component({
 *   selector: 'app-registration',
 *   template: `
 *     <form (ngSubmit)="submit()">
 *       <div *ngIf="form">
 *         <input
 *           [value]="(form.state$ | async)?.values?.['username']"
 *           (input)="usernameReg.onChange($event)"
 *           (blur)="usernameReg.onBlur()"
 *         />
 *         <span *ngIf="(form.errors$ | async)?.['username'] as error">{{ error }}</span>
 *         <button type="submit" [disabled]="form.isSubmitting$ | async">Register</button>
 *       </div>
 *     </form>
 *   `
 * })
 * export class RegistrationComponent implements OnInit, OnDestroy {
 *   form!: MoleculeFormInstance<{ username: string; email: string }>
 *   usernameReg!: FieldRegistration
 *
 *   constructor(private formsService: MoleculeFormsService) {}
 *
 *   ngOnInit() {
 *     this.form = this.formsService.createForm(myFormProvider, {
 *       defaultValues: { username: '', email: '' },
 *     })
 *     this.usernameReg = this.form.register('username', { required: true })
 *   }
 *
 *   submit() {
 *     const handler = this.form.handleSubmit(async (values) => {
 *       await registerUser(values)
 *     })
 *     handler()
 *   }
 *
 *   ngOnDestroy() {
 *     this.form.destroy()
 *   }
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class MoleculeFormsService implements OnDestroy {
  private instances: MoleculeFormInstance<Record<string, unknown>>[] = []

  /**
   * Create a form instance from a provider.
   *
   * @param provider - The form provider that creates form controllers.
   * @param options - Form configuration including default values and validation mode.
   * @returns A new form instance with RxJS observables for reactive state tracking.
   */
  createForm<T extends Record<string, unknown>>(
    provider: FormProvider,
    options: FormOptions<T>,
  ): MoleculeFormInstance<T> {
    const controller = provider.createForm(options)
    const instance = new MoleculeFormInstance<T>(controller)
    this.instances.push(instance as MoleculeFormInstance<Record<string, unknown>>)
    return instance
  }

  /**
   * Destroy all managed form instances on service destruction.
   */
  ngOnDestroy(): void {
    for (const instance of this.instances) {
      instance.destroy()
    }
    this.instances = []
  }
}
