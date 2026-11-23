/**
 * Per-item error boundary for the chat timeline.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `ChatItemBoundary` (see
 * that file for the design notes): the same props (React names), the same DOM
 * for the same input, and the same containment guarantee — a bad item
 * degrades to one inline notice and every sibling keeps working.
 *
 * Angular's `@boundary` template block is the boundary, and the boundary class
 * itself is React's `componentDidCatch`: the block's `caught = $error` alias
 * feeds an attribute binding on the notice element that calls the boundary's
 * `report()` once per caught error, which logs through the bonded logger and
 * forwards to the host's `onError` input (a failing reporter cannot escalate —
 * see the comment inside). The report cannot travel through the notice
 * component's inputs: Angular never applies input bindings to components
 * created inside an `@error` block (measured 2026-11-16 — `ngOnChanges` never
 * runs there), so the notice component is purely visual and every value it
 * needs comes from its own host bindings and its own template methods. The
 * item's template is instantiated by THIS component's view (through
 * `ngTemplateOutlet`), not projected, so a synchronous throw in the item's own
 * branching is caught by this boundary too, not only one from its descendants
 * — the placement React reaches with its child `RenderSlot`.
 *
 * React's root is a fragment (the boundary adds no wrapper element), so the
 * template's nodes render in front of the host (`placeContentBefore`) and the
 * host leaves the DOM: the DOM this component renders is exactly React's, with
 * no element of its own.
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  Component,
  ElementRef,
  inject,
  type OnChanges,
  signal,
  type SimpleChanges,
  type TemplateRef,
} from '@angular/core'

import {
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import { getLogger } from '@molecule/app-logger'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

/** React's fallback style, serialized through `styleText` once. */
const NOTICE_STYLE = styleText({ padding: '6px 12px', fontStyle: 'italic' })

/** React's `ErrorInfo`, as far as this boundary uses it: where the throw happened. */
export interface ChatItemErrorInfo {
  /** The component stack of the throw, when the framework provides one. */
  componentStack: string | null
}

/** Props for {@link ChatItemBoundary} — the React prop names, React's own contract. */
export interface ChatItemBoundaryProps {
  /** Produces the timeline item's element tree. Called during render, below the boundary. */
  render: TemplateRef<unknown>
  /** Reports a caught render error (telemetry). Never throws. */
  onError?: (error: Error, info: ChatItemErrorInfo) => void
}

/**
 * The inline notice shown in place of a timeline item that failed to render.
 * The host IS the outer `<div>`, matching React's fallback exactly. It reads
 * `t` from `useTranslation()`, so it re-renders in the new language when the
 * locale changes.
 *
 * The component holds NO inputs: Angular does not apply input bindings inside
 * an `@error` block (see the boundary's module notes), and it needs none —
 * everything it renders is its own (the localized notice).
 */
@Component({
  selector: 'div[mol-chat-item-fallback]',
  standalone: true,
  host: {
    'data-mol-id': 'chat-item-render-error',
    // `[attr.class]`, not `[class]`: Angular's classMap applies a bound class
    // string in sorted key order, while React writes React's own order into the
    // attribute. Attribute binding keeps the emitted DOM identical to React's.
    '[attr.class]': 'classes()',
    '[attr.style]': 'noticeStyle',
  },
  template: `{{ message() }}`,
})
export class ChatItemFallback {
  /** React's fallback style, serialized through `styleText` once. */
  protected readonly noticeStyle = NOTICE_STYLE

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /**
   * Computes the notice's class list.
   * @returns The class string.
   */
  classes(): string {
    const cm = getClassMap()
    return cm.cn(cm.textSize('xs'), cm.textMuted)
  }

  /**
   * The localized notice text.
   * @returns The translated text.
   */
  message(): string {
    return this.i18n.t('ide.chat.itemRenderError', undefined, {
      defaultValue: "This message couldn't be displayed.",
    })
  }
}

/**
 * Error boundary around a single chat timeline item.
 *
 * @example
 * ```html
 * <mol-chat-item-boundary [render]="itemTemplate" (error)="onRenderError($event)" />
 * ```
 */
@Component({
  selector: 'mol-chat-item-boundary',
  standalone: true,
  imports: [NgTemplateOutlet, ChatItemFallback],
  inputs: ['render', 'onError'],
  hostDirectives: [MolPlacement],
  template: `@boundary {
      @if (renderTemplate(); as tpl) {
        <ng-container [ngTemplateOutlet]="tpl"></ng-container>
      }
    } @error (caught = $error) {
      <div mol-chat-item-fallback [attr.data-mol-id]="report(caught)"></div>
    }`,
})
export class ChatItemBoundary implements OnChanges {
  /** The component's own host element, which React does not render. */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /**
   * Renders the boundary's nodes in front of the host and keeps the host out of
   * the DOM: React's root is the boundary's fragment, with no element of its own.
   */
  constructor() {
    usePlacement(() => {
      const host = this.host.nativeElement
      placeContentBefore(host, host)
      setElementPresent(host, false)
    })
  }

  /** The protected item's template, instantiated inside this boundary's view. */
  render?: TemplateRef<unknown>

  /** Reports a caught render error (telemetry). Never throws. */
  onError?: ChatItemBoundaryProps['onError']

  /** The template as a signal, so the `@if` re-renders when the input lands. */
  readonly renderTemplate = signal<TemplateRef<unknown> | undefined>(undefined)

  /** The error this boundary already reported; a new caught error reports again. */
  private reported?: unknown

  /**
   * Mirrors the input into the signal.
   * @param changes - The changed inputs.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['render']) this.renderTemplate.set(this.render)
  }

  /**
   * React's `componentDidCatch`: reports a caught render error through the
   * bonded logger and the host's `onError`, once per caught error. Called
   * from the `@error` block's `data-mol-id` attribute binding — the one place
   * Angular hands the caught value to component code (input bindings inside
   * an `@error` block never apply, see the module notes). The binding's value
   * is the constant the notice carries, so the emitted DOM is the same as if
   * the attribute were static.
   *
   * @param caught - The value the boundary caught.
   * @returns The notice element's `data-mol-id`.
   */
  report(caught: unknown): string {
    if (caught === this.reported) return 'chat-item-render-error'
    this.reported = caught
    const error = caught instanceof Error ? caught : new Error(String(caught))
    // Log unconditionally: a host that wires no reporter must still leave a trace,
    // or a contained failure becomes an invisible one.
    getLogger().error('Chat timeline item failed to render', { error, componentStack: null })
    try {
      this.onError?.(error, { componentStack: null })
    } catch (_error) {
      // A failing error reporter must never escalate into a second render throw —
      // the whole point of this boundary is that nothing here can take the app down.
    }
    return 'chat-item-render-error'
  }
}
