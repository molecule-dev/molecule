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
import type { CaseContext, CaseResult, UICase, UIComponentCases } from '../ui/spec.js'

/** One plain export compared by value: a constant, or a function called with each argument list. */
export interface FeatureValueCheck {
  /** The export name. */
  export: string
  /** Argument lists to call it with. Omit for a constant. */
  calls?: unknown[][]
}

/**
 * A feature case's context: the binding kit's services (HTTP, auth, storage,
 * areas …) with the UI kit's translations. A feature component renders through
 * the UI kit's i18n provider, so its translations take any locale, the
 * pseudo-locale `en-XA` included, not only the binding provider's four.
 */
export interface FeatureCaseContext extends Omit<BindingContext, 'translations'> {
  translations?: CaseContext['translations']
}

/** One feature case: a UI case whose context may also seed the binding kit's services. */
export interface FeatureCase extends UICase {
  context?: FeatureCaseContext
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
  /**
   * Components the package renders but does not export (a chat panel's message
   * item, a card inside a list), so a case can hold each one to React on its own
   * instead of only through the exported component that contains it. Every
   * framework's package — React's included — exports them from `src/parts.ts`
   * (built to `dist/parts.js`), a module its `package.json` does not expose, so
   * the public surface stays as it is. The React recorder imports React's
   * `dist/parts.js`; each counterpart passes its own parts module to
   * {@link runFeatureConformance} and into its adapter's exports.
   */
  parts?: string[]
  /**
   * Store the goldens per component (`goldens/<feature>/<Component>.json` plus
   * `index.json`) instead of in one file, for a package with many components: a
   * recording narrowed with `CONFORMANCE_COMPONENTS=<Component>,…` then rewrites only
   * those components' files, so ports of different components record side by side.
   */
  goldensPerComponent?: boolean
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
