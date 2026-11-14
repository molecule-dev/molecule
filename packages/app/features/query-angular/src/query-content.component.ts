/**
 * Render resource-dependent content only after its document exists — the
 * Angular counterpart of `QueryContent` in `@molecule/app-query-react`, with
 * the node-valued props as `TemplateRef`s. The component is headless: it owns
 * no translations and no styling, and projects the rendered branch beside the
 * host (`display: contents`), so the DOM is exactly the branch's own.
 * @module
 */
import {
  ChangeDetectorRef,
  Component,
  type DoCheck,
  effect,
  type EmbeddedViewRef,
  inject,
  type OnChanges,
  signal,
  type TemplateRef,
  untracked,
  ViewChild,
  ViewContainerRef,
} from '@angular/core'

import type { QueryContentContext, QueryContentErrorContext, QueryContentProps } from './types.js'

/** What the component currently shows: one template and its context. */
interface Branch {
  template: TemplateRef<unknown> | null
  context: Record<string, unknown>
}

/**
 * The loaded-data branch receives a non-null document. Pending, failed initial
 * reads and missing records never mount that branch, so its actions cannot
 * swallow an early click. Cached data remains mounted during refresh, including
 * a failed refresh. Status fallbacks belong outside the list or record
 * container rendered by `children`, and so does a refresh line; the default
 * fallbacks render nothing.
 *
 * The templates receive the render arguments as template context: `children`
 * gets the document as `$implicit` and `a0` (`let-data`), `error` gets the
 * error value (`let-error`), and `pending`/`missing` render without a context.
 */
@Component({
  selector: 'mol-query-content',
  standalone: true,
  template: '<ng-container #outlet></ng-container>',
  inputs: ['query', 'pending', 'missing', 'children', 'error'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
})
export class QueryContent<T = unknown> implements DoCheck, OnChanges {
  /** State from useQuery, or any compatible query observer. */
  query: QueryContentProps<T>['query'] = { data: undefined, status: 'idle', error: undefined }
  /** Mounted only with a real document, including false, zero and an empty list. */
  children: TemplateRef<QueryContentContext<T>> | null = null
  /** Initial idle/loading content. Render a status template, never a fake item or action. */
  pending: TemplateRef<unknown> | null = null
  /** Content for a loaded null record. Null is distinct from an unfinished request. */
  missing: TemplateRef<unknown> | null = null
  /** A failed initial read. Cached data stays visible if its refresh fails. */
  error: TemplateRef<QueryContentErrorContext> | null = null

  /** Where the chosen branch renders. */
  @ViewChild('outlet', { read: ViewContainerRef, static: true })
  private outlet!: ViewContainerRef
  /** Marks this region for check when the observed document changes. */
  private readonly changeDetector = inject(ChangeDetectorRef)
  /** The observer the reactivity effect is subscribed to (a new prop re-subscribes it). */
  private readonly observer = signal<QueryContentProps<T>['query']>(this.query)
  /** The template currently mounted. */
  private current: TemplateRef<unknown> | null = null
  /** The context object the mounted view reads (updated in place). */
  private readonly context: Record<string, unknown> = {}
  /** The mounted branch view, when a template is showing. */
  private view?: EmbeddedViewRef<unknown>

  constructor() {
    // A `useQuery` result exposes its state through getters that read the
    // observer's own signals. React re-renders a `QueryContent`'s parent on
    // every state change; Angular only re-checks a view something marked, and
    // the parent's `[query]="query"` binding reads none of those signals. Read
    // them here, in an effect, so a changed document marks this region for
    // check exactly when React would re-render it. A replaced `query` prop
    // re-subscribes the same effect to the new observer.
    effect(() => {
      const query = this.observer()
      void query?.data
      void query?.status
      void query?.error
      untracked(() => {
        this.update()
        this.changeDetector.markForCheck()
      })
    })
  }

  /**
   * The branch the current query state shows.
   * @returns The template and its context, or nothing.
   */
  private branch(): Branch {
    const query = this.query
    if (query?.data === undefined) {
      return query?.status === 'error' && this.error
        ? {
            template: this.error,
            context: { $implicit: query.error, a0: query.error },
          }
        : { template: this.pending ?? null, context: {} }
    }
    if (query.data === null) return { template: this.missing ?? null, context: {} }
    return { template: this.children, context: { $implicit: query.data, a0: query.data } }
  }

  /**
   * Follows a replaced `query` prop: the reactivity effect subscribes to the
   * new observer's own signals on its next run.
   */
  ngOnChanges(): void {
    this.observer.set(this.query)
  }

  /**
   * Mounts the branch the query state shows, and refreshes the mounted view's
   * context when the state changes. Runs on every change-detection pass, so an
   * input set by a host binding is always folded in before this runs.
   */
  ngDoCheck(): void {
    this.update()
  }

  /**
   * Shows the branch the current query state describes: a different template
   * replaces the mounted view, and a changed document (or error) is written into
   * the context the mounted view reads.
   */
  private update(): void {
    const next = this.branch()
    if (next.template !== this.current) {
      this.view?.destroy()
      this.view = undefined
      this.current = next.template
      if (next.template) this.view = this.outlet.createEmbeddedView(next.template, this.context)
    }
    for (const key of Object.keys(this.context)) {
      if (!(key in next.context)) delete this.context[key]
    }
    Object.assign(this.context, next.context)
    this.view?.markForCheck()
  }
}
