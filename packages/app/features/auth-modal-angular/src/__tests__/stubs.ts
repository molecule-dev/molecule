/**
 * Stand-in UI components for the unit tests: the same selectors, inputs and
 * content projection the real bonds provide, with plain DOM output so a test
 * asserts on the modal's own markup. The unit tests mock the UI and OAuth
 * packages with these (the conformance test drives the real ones).
 *
 * The components are built with `Component(...)(class)`, not decorator syntax:
 * the package tsconfig excludes `src/**\/__tests__/**`, so a decorated class in
 * a test file is transformed without `experimentalDecorators`.
 *
 * @module
 */

// Register Angular's JIT compiler facade before any @Component class loads.
import '@angular/compiler'
import { ChangeDetectionStrategy, Component, EventEmitter } from '@angular/core'

/** The stub modal's state, typed for the callers. */
class ModalStubBase {
  /** Whether the dialog renders its content. */
  open = false
  /** The dialog title. */
  title?: string
  /** The dialog size (unused by the stub). */
  size?: string
  /** The dialog's close output (the stub never emits it). */
  readonly close = new EventEmitter<unknown>()
}

/** Stand-in for `@molecule/app-ui-angular`'s `Modal` (`mol-modal`). */
export const ModalStub = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-modal',
  standalone: true,
  inputs: ['open', 'title', 'size'],
  outputs: ['close'],
  template: `@if (open) {<div><h2 data-mol-title="">{{ title }}</h2><ng-content></ng-content></div>}`,
})(ModalStubBase)

/** The stub icon's state (nothing renders). */
class IconStubBase {}

/** Stand-in for `@molecule/app-ui-angular`'s `Icon` (`[mol-icon-root]`). */
export const IconStub = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: '[mol-icon-root]',
  standalone: true,
  inputs: ['name', 'size', 'className', 'ariaHidden'],
  template: '',
})(IconStubBase)

/** The stub button's state, typed for the callers. */
class ButtonStubBase {
  /** The button type. */
  type?: string
  /** Whether the button is disabled. */
  disabled?: boolean
}

/** Stand-in for `@molecule/app-ui-angular`'s `Button` (`button[mol-button]`). */
export const ButtonStub = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'button[mol-button]',
  standalone: true,
  inputs: ['type', 'size', 'color', 'disabled'],
  host: { '[disabled]': 'disabled' },
  template: '<ng-content></ng-content>',
})(ButtonStubBase)

/** The stub OAuth row's state (nothing renders). */
class OAuthButtonsStubBase {}

/** Stand-in for `@molecule/app-oauth-buttons-angular`'s `OAuthButtons`. */
export const OAuthButtonsStub = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'div[mol-oauth-buttons]',
  standalone: true,
  inputs: ['providers', 'onSelect'],
  template: '',
})(OAuthButtonsStubBase)

/** The stub OAuth divider's state (nothing renders). */
class OAuthDividerStubBase {}

/** Stand-in for `@molecule/app-oauth-buttons-angular`'s `OAuthDivider`. */
export const OAuthDividerStub = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'div[mol-oauth-divider]',
  standalone: true,
  template: '',
})(OAuthDividerStubBase)

/** The stub modal's state (it renders only its marker). */
class AuthModalStubBase {
  /** Whether the modal is open. */
  open = false
  /** Close without authenticating. */
  onClose?: () => void
  /** Which form the modal opens on. */
  initialMode?: string
  /** OAuth config. */
  oauthConfig?: unknown
  /** Run before any login attempt. */
  onBeforeAuth?: () => void
  /** Run after a successful login. */
  onAuthenticated?: () => void
  /** Whether the captcha is solved. */
  captchaSolved?: boolean
}

/**
 * Stand-in for this package's `AuthModal` (`mol-auth-modal`) in the mount tests: a
 * `<div data-testid="auth-modal">` marker, the one React's mount test mocks the modal
 * with. The interceptor is what those tests check, not the modal.
 */
export const AuthModalStub = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-auth-modal',
  standalone: true,
  inputs: [
    'open',
    'onClose',
    'initialMode',
    'oauthConfig',
    'onBeforeAuth',
    'onAuthenticated',
    'captchaSolved',
  ],
  template: `<div data-testid="auth-modal"></div><ng-content></ng-content>`,
})(AuthModalStubBase)
