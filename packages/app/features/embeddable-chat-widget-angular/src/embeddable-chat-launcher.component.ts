/**
 * Floating circular launcher rendered in the corner of the host page.
 * Angular counterpart of `@molecule/app-embeddable-chat-widget`'s
 * `EmbeddableChatLauncher` — the same props (React names), the same DOM.
 *
 * @module
 */

import { Component, ElementRef, EventEmitter, inject, ViewChild } from '@angular/core'

import {
  MolPlacement,
  placeElementBefore,
  setElementPresent,
  usePlacement,
} from '@molecule/app-angular'

import type { EmbeddableChatWidgetPosition, EmbeddableChatWidgetTheme } from './types.js'
import { useSafeTranslation } from './useSafeTranslation.js'

/**
 * Floating circular launcher rendered in the corner of the host page.
 * Click expands the chat panel.
 *
 * Fully self-contained: positioning, sizing, color, and flex centering are
 * all inline styles, so the launcher renders correctly even when the host
 * page has NOT loaded the molecule stylesheet / wired a ClassMap bond. Text
 * is resolved through a provider-optional translation function that falls
 * back to English defaults when no provider is present.
 *
 * React's root is the `<button>` when visible and nothing when hidden, so the
 * button renders immediately before the host's place when visible and the host
 * itself never appears in the page (React renders no wrapper element). The
 * React `onOpen` callback prop is the Angular `open` output, emitting the
 * native click event.
 */
@Component({
  selector: 'mol-embeddable-chat-launcher',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: ['visible', 'position', 'theme', 'className'],
  outputs: ['open'],
  // prettier-ignore
  template: `<button
      #root
      type="button"
      (click)="openClick($event)"
      [attr.aria-label]="ariaLabel()"
      data-mol-id="embeddable-chat-launcher"
      [class]="className ?? null"
      [style]="buttonStyle()"
    >
      <!-- Inline SVG keeps the launcher self-contained — no font/icon dep. -->
      <svg
        aria-hidden="true"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </button>`,
})
export class EmbeddableChatLauncher {
  /** Whether the launcher should render. Hidden while the panel is expanded. */
  visible?: boolean
  /** Floating position (`bottom-right` | `bottom-left`). */
  position?: EmbeddableChatWidgetPosition
  /** Optional theme. */
  theme?: EmbeddableChatWidgetTheme
  /** Extra classes. */
  className?: string

  /** The React `onOpen` callback prop, as an Angular output. */
  readonly open = new EventEmitter<MouseEvent>()

  /** The launcher button (React's root, rendered beside the host when visible). */
  @ViewChild('root') private root?: ElementRef<HTMLButtonElement>

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  protected readonly t = useSafeTranslation().t

  constructor() {
    usePlacement(() => {
      const button = this.root?.nativeElement
      if (!button) return
      // React renders the button or nothing; either way its host is not in the page.
      if (this.visible ?? false) placeElementBefore(button, this.host.nativeElement)
      else setElementPresent(button, false)
      setElementPresent(this.host.nativeElement, false)
    })
  }

  /**
   * The accessible label (translated, English default).
   * @returns The label.
   */
  ariaLabel(): string {
    return this.t('embeddableChatWidget.launcher.openLabel', {}, { defaultValue: 'Open chat' })
  }

  /**
   * Emits the React `onOpen` callback with the native click event.
   * @param event - The click.
   */
  openClick(event: MouseEvent): void {
    this.open.emit(event)
  }

  /**
   * The button's inline style declarations.
   * @returns The style map.
   */
  buttonStyle(): Record<string, string> {
    const positionStyle: Record<string, string> =
      this.position === 'bottom-left'
        ? { left: '24px', bottom: '24px' }
        : { right: '24px', bottom: '24px' }
    return {
      position: 'fixed',
      width: '56px',
      height: '56px',
      'border-radius': '9999px',
      border: 'none',
      cursor: 'pointer',
      'z-index': '2147483646',
      'box-shadow': '0 6px 18px rgba(0, 0, 0, 0.18)',
      background: this.theme?.primaryColor ?? '#2563eb',
      color: this.theme?.primaryForegroundColor ?? '#ffffff',
      // Center the icon inline (not via ClassMap) so it works on a bare page
      // where no Tailwind/ClassMap classes are loaded.
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      ...positionStyle,
    }
  }
}
