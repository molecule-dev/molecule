/**
 * Framework-neutral description of a feature package's conformance: the
 * component cases its React package renders, the plain exports every framework
 * must reproduce by value, and the exports whose value is the framework's own.
 *
 * A feature package (`@molecule/app-header-vue`) is the counterpart of one
 * React feature package (`@molecule/app-header-react`): it exports the same
 * names, renders the same DOM for the same case, and makes the same calls.
 *
 * @module
 */

import type { BindingContext, HookCaseResult, HookCases } from '../bindings/spec.js'
import type { CaseResult, UICase, UIComponentCases } from '../ui/spec.js'

/** One plain export compared by value: a constant, or a function called with each argument list. */
export interface FeatureValueCheck {
  /** The export name. */
  export: string
  /** Argument lists to call it with. Omit for a constant. */
  calls?: unknown[][]
}

/** One feature case: a UI case whose context may also seed the binding kit's services. */
export interface FeatureCase extends UICase {
  context?: BindingContext
}

/** One component's feature cases. */
export interface FeatureComponentCases extends UIComponentCases {
  cases: FeatureCase[]
}

/** One React feature package's cases. */
export interface FeatureCases {
  /** The React reference package (`@molecule/app-oauth-buttons-react`). */
  package: string
  /** Component cases, keyed by export name. */
  families: FeatureComponentCases[]
  /**
   * `'app'`: every case mounts through the framework binding's full
   * composition root with the binding kit's services (scripted HTTP, device,
   * push, storage …), because the package's components read them. Each case's
   * `context` may then seed them (`http`, `areas`, `authErrors`). Default: the
   * UI providers only.
   */
  composition?: 'app'
  /**
   * Hook cases for the package's hook exports (`useQuery`), keyed by export
   * name like the binding kit's own hook cases: each framework runs them
   * through its binding adapter over the binding plus this package
   * (`create<Fw>BindingAdapter`). The `area` fakes they need (`query`) are
   * seeded per case in `context.areas`.
   */
  hooks?: HookCases[]
  /** Plain exports compared by value. */
  values?: FeatureValueCheck[]
  /**
   * Framework-neutral exports every framework takes from ONE package instead
   * of reimplementing them (export name → that package, `'@molecule/app-push'`),
   * so they cannot drift. Each framework's package must export the very same
   * value (`===`) as that package, React's included.
   */
  shared?: Record<string, string>
  /**
   * Exports whose value is shaped by the framework (an inline style object:
   * React adds `px` to a number, Vue and Angular do not, Solid takes kebab-case
   * keys), with the reason. Each framework still exports the name; the
   * rendered DOM is where its effect is compared.
   */
  frameworkShaped?: Record<string, string>
}

/** What the React recorder stores for one feature package. */
export interface FeatureGoldens {
  /** Every runtime name the React package exports. */
  exports: string[]
  /** Export name → value (a constant) or the list of call results. */
  values: Record<string, unknown>
  /** Component → case name → result. */
  cases: Record<string, Record<string, CaseResult>>
  /** Hook → case name → result (the package's {@link FeatureCases.hooks}). */
  hooks?: Record<string, Record<string, HookCaseResult>>
}
