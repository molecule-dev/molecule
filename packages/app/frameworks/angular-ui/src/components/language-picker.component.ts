/**
 * LanguagePicker component (React parity): a globe trigger that opens a
 * modal grid of the registered locales.
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  type DoCheck,
  ElementRef,
  inject,
  Renderer2,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { IconName } from '@molecule/app-icons'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { moveRestAttributes } from '../utilities/rest-attrs.js'
import { styleText } from '../utilities/style.js'
import { Icon } from './icon.component.js'
import { Modal } from './modal.component.js'
import { MolTemplateOutlet } from './template-outlet.directive.js'

/**
 * LanguagePicker component.
 *
 * React's root is a FRAGMENT (trigger button + locale modal), so the host is
 * unwrapped (`data-parity-unwrap`, `display: contents`). Rest props (`title`,
 * `data-*`, `aria-*`, native event handlers) are spread onto the trigger
 * button in React; here they land on the host and are moved onto it.
 */
@Component({
  selector: 'mol-language-picker',
  standalone: true,
  imports: [Icon, Modal, MolTemplateOutlet],
  inputs: [
    'labelKey',
    'labelDefault',
    'modalTitleKey',
    'modalTitleDefault',
    'icon',
    'iconSize',
    'display',
    'className',
    'style',
    'renderTrigger',
  ],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  template: `@if (asTemplate(renderTrigger); as customTrigger) {
      <ng-container [molTemplateOutlet]="customTrigger"></ng-container>
    } @else {
      <button
        #trigger
        type="button"
        data-mol-id="language-picker-trigger"
        [attr.aria-label]="ariaLabel()"
        (click)="open()"
        [class]="classes()"
        [style]="hostStyle()"
      >
        <svg mol-icon-root [name]="icon ?? 'globe'" [size]="iconSize ?? 16"></svg>
        @if (triggerLabel(); as label) {
          <span>{{ label }}</span>
        }
      </button>
    }
    <mol-modal
      [open]="isOpen()"
      (close)="isOpen.set(false)"
      [title]="modalTitle()"
      [size]="'lg'"
      data-mol-id="language-picker-modal"
      ><div [class]="cm().languageGrid">
        @for (locale of sortedLocales(); track locale.code) {
          <button
            type="button"
            [attr.data-mol-id]="'language-picker-option-' + locale.code"
            [attr.data-active]="locale.code === currentLocale() ? 'true' : null"
            [attr.aria-pressed]="locale.code === currentLocale() ? 'true' : 'false'"
            (click)="pick(locale.code)"
            [class]="locale.code === currentLocale() ? cm().languageActive : cm().languageOption"
          >
            {{ locale.name }}
          </button>
        }
      </div></mol-modal
    >`,
})
export class LanguagePicker implements AfterViewInit, DoCheck {
  /** i18n key for the trigger label / aria-label (default `footer.language`). */
  labelKey?: string
  /** Fallback label if the i18n key is missing (default `Language`). */
  labelDefault?: string
  /** i18n key for the modal title (default `languagePicker.modalTitle`). */
  modalTitleKey?: string
  /** Fallback modal title if the i18n key is missing (default `Choose language`). */
  modalTitleDefault?: string
  /** Icon glyph before the current locale name (default `globe`). */
  icon?: IconName
  /** Pixel size for the rendered icon (default 16). */
  iconSize?: number
  /** What the trigger renders: the locale name, its code, or the icon only. */
  display: 'name' | 'code' | 'icon' = 'name'
  /** Extra classes appended to the trigger button. */
  className?: string
  /** Inline style object for the trigger button (React camelCase). */
  style?: Record<string, unknown>
  /** Optional trigger replacement (a node value rendered as a template). */
  renderTrigger?: unknown

  /** The default trigger button. */
  @ViewChild('trigger') trigger?: ElementRef<HTMLButtonElement>

  /** Whether the locale modal is open. */
  readonly isOpen = signal(false)

  /**
   * i18n state: locale, locale list and the async setter. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  readonly i18n = useTranslation()

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)
  private readonly renderer = inject(Renderer2)
  private movedRest = false

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The trigger's accessible label.
   * @returns The label text.
   */
  ariaLabel(): string {
    return this.i18n.t(
      this.labelKey ?? 'footer.language',
      {},
      {
        defaultValue: this.labelDefault ?? 'Language',
      },
    )
  }

  /**
   * The modal title.
   * @returns The title text.
   */
  modalTitle(): string {
    return this.i18n.t(
      this.modalTitleKey ?? 'languagePicker.modalTitle',
      {},
      {
        defaultValue: this.modalTitleDefault ?? 'Choose language',
      },
    )
  }

  /**
   * The trigger's class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().languagePickerTrigger, this.className)
  }

  /**
   * Serializes the trigger's inline style.
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    return styleText(this.style)
  }

  /**
   * Narrows a node-valued prop to a TemplateRef.
   *
   * @param value - The prop value.
   * @returns The template, or null.
   */
  asTemplate(value: unknown): TemplateRef<unknown> | null {
    return value instanceof TemplateRef ? value : null
  }

  /**
   * The active locale code.
   * @returns The code.
   */
  currentLocale(): string {
    return this.i18n.locale()
  }

  /**
   * The registered locales, sorted by native name (React sorts a copy).
   * @returns The sorted locales.
   */
  sortedLocales(): { code: string; name: string }[] {
    return [...this.i18n.locales()].sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * The trigger's text (React's `display` switch).
   * @returns The text, or null for the icon-only display.
   */
  triggerLabel(): string | null {
    if (this.display === 'icon') return null
    if (this.display === 'code') return this.currentLocale()
    const current = this.sortedLocales().find((locale) => locale.code === this.currentLocale())
    return current?.name ?? this.currentLocale()
  }

  /** Opens the locale modal. */
  open(): void {
    this.isOpen.set(true)
  }

  /**
   * Switches the locale and closes the modal (React's option click).
   * @param code - The locale code.
   */
  async pick(code: string): Promise<void> {
    await this.i18n.setLocale(code)
    this.isOpen.set(false)
  }

  /**
   * Moves React's rest props (title, data-*, aria-*, native handlers) from
   * the host onto the trigger button, and drops the capture wrapper.
   */
  ngAfterViewInit(): void {
    this.syncRest()
  }

  /**
   * Re-applies rest attributes on later passes (a props step may add them).
   */
  ngDoCheck(): void {
    this.syncRest()
  }

  /** Moves any host rest attributes onto the trigger button. */
  private syncRest(): void {
    const trigger = this.trigger?.nativeElement
    if (!trigger || this.movedRest) return
    moveRestAttributes(this.host.nativeElement, trigger)
    this.movedRest = true
  }
}
