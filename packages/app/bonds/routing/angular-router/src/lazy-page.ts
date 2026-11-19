/**
 * Route pages loaded on demand, each rendered in the page's own outlet once its code
 * arrives.
 *
 * @module
 */

import { NgComponentOutlet } from '@angular/common'
import {
  Component,
  ErrorHandler,
  inject,
  type InputSignalWithTransform,
  signal,
  type Type,
} from '@angular/core'

/**
 * Any component `lazyPage` can load: a standalone Angular component.
 *
 * React's counterpart is what `React.lazy` accepts (a module whose `default` is a
 * component); Angular's is the component class itself, since `@angular/router` has no
 * `lazy` and a route's `component` is the class.
 */
export type LazyLoadableComponent = Type<unknown>

/**
 * The value one of a page's inputs takes: an `input()`/`input.required()` field
 * unwrapped to the value a binding writes, any other field as it is declared.
 *
 * @template Field - The field's declared type.
 */
type InputValue<Field> =
  Field extends InputSignalWithTransform<unknown, infer Write> ? Write : Field

/**
 * The props a page declares: the public fields of its component class, which are the
 * inputs this wrapper's `props` input binds onto it.
 *
 * React reads these from `ComponentProps<Page>`; an Angular component declares them as
 * class fields (a plain field, or a signal `input()`).
 *
 * @template Page - The page component.
 */
type LazyPageProps<Page> =
  Page extends Type<infer Instance>
    ? { [Field in keyof Instance]: InputValue<Instance[Field]> }
    : never

/** Options for {@link lazyPage}. */
export interface LazyPageOptions {
  /**
   * What the page's area shows while its code loads: a standalone component rendered in
   * place of the page. Defaults to nothing.
   *
   * React's `fallback` is a node; an Angular route table is module scope, where a
   * `TemplateRef` cannot be built, so the counterpart is the component that would render
   * that node.
   */
  fallback?: Type<unknown>
}

/**
 * Load a route's page on demand, inside the page's own area.
 *
 * Use it instead of Angular's `loadComponent` for every page a route renders. Navigating
 * to a page whose code has not loaded yet then replaces the previous page at once: the
 * previous page leaves and this component's own `fallback` shows in the page's area until
 * its code arrives. With `loadComponent`, `@angular/router` awaits the code after guards
 * and resolvers and before activating the route, so a navigation the URL has already
 * moved for — the Back button, which the browser has already applied, or any route with
 * `urlUpdateStrategy: 'eager'` — keeps the previous page in the DOM under the new URL,
 * and a check such as `getByRole('heading')` finds the old page's headings. Layout routes
 * (an app shell around `<router-outlet>`) stay mounted either way.
 *
 * The page's props are this component's `props` input, a record of the page's inputs,
 * which are bound onto the loaded component through `NgComponentOutlet`. Most pages read
 * their route parameters with `injectRouteParams` and take no props at all.
 *
 * @param load - Loads the page module, as `import()` does:
 *   `() => import('./pages/Article.js').then((m) => ({ default: m.Article }))`.
 * @param options - Optional `fallback` component shown in the page's area while its code
 *   loads.
 * @returns The component to use as a route's `component`: `{ path: 'article/:slug',
 *   component: Article }`. Its single input, `props`, takes the page's own props.
 *
 * @example
 * ```ts
 * import { NgComponentOutlet } from '@angular/common'
 * import { Component, type Type } from '@angular/core'
 * import { provideRouter, type Route } from '@angular/router'
 * import { lazyPage } from '@molecule/app-routing-angular-router'
 *
 * const Home = lazyPage(() => import('./pages/home.js').then((m) => ({ default: m.Home })))
 * const Article = lazyPage(
 *   () => import('./pages/article.js').then((m) => ({ default: m.Article })),
 *   { fallback: LoadingPage },
 * )
 *
 * const routes: Route[] = [
 *   { path: '', component: Home },
 *   { path: 'article/:slug', component: Article },
 * ]
 * ```
 */
export function lazyPage<Page extends LazyLoadableComponent>(
  load: () => Promise<{ default: Page }>,
  options: LazyPageOptions = {},
): Type<{ props: LazyPageProps<Page> }> {
  // The page once its code has arrived. A page that mounts after its code loaded renders
  // the component on its first change detection instead of showing the fallback for a
  // frame on every visit after the first.
  let loadedPage: Page | undefined
  let loading: Promise<{ default: Page }> | undefined
  const loadOnce = (): Promise<{ default: Page }> => {
    loading ??= load().then((module) => {
      loadedPage = module.default
      return module
    })
    return loading
  }
  const fallback = options.fallback ?? null
  const LazyPage = Component({
    selector: 'mol-lazy-page',
    standalone: true,
    imports: [NgComponentOutlet],
    inputs: ['props'],
    template: `@if (page(); as loaded) {<ng-container [ngComponentOutlet]="loaded" [ngComponentOutletInputs]="props" />} @else if (fallback) {<ng-container [ngComponentOutlet]="fallback" />}`,
  })(
    class LazyPageComponent {
      /** The loaded page's own props, bound onto it through the outlet. */
      props!: LazyPageProps<Page>
      /** The loaded page, or `null` while its code loads. */
      readonly page = signal<Page | null>(loadedPage ?? null)
      /** What the page's area shows while its code loads. */
      readonly fallback = fallback
      private readonly errors = inject(ErrorHandler)
      constructor() {
        if (loadedPage !== undefined) return
        // A failed load is the framework's error to report, as a failed `loadComponent`
        // is (React's `lazy` throws it into an error boundary): the page's area keeps
        // showing `fallback` and the error reaches the app's `ErrorHandler`.
        void loadOnce().then(
          (module) => this.page.set(module.default),
          (error: unknown) => this.errors.handleError(error),
        )
      }
    },
  )
  return LazyPage
}
