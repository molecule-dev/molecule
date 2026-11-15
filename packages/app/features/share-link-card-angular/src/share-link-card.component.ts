/**
 * ShareLinkCard component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewInit,
  Component,
  type DoCheck,
  ElementRef,
  inject,
  Renderer2,
  type TemplateRef,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Switch } from '@molecule/app-ui-angular'

import { CopyLinkField } from './copy-link-field.component.js'
import { hasNodes, SlotWrapper } from './slot-dom.js'
import type { ShareLinkCardProps } from './types.js'

/**
 * ShareLinkCard component.
 *
 * Share-link card — bundles a read-only URL field + copy button, an optional
 * QR code slot, and an optional password-protect toggle. The host IS the outer
 * `<div>` (`div[mol-share-link-card]`), matching React's root Card exactly.
 *
 * QR rendering is slot-based so apps can bring their own QR component; pass
 * BOTH `showQR` and `qr` content — the QR node alone renders nothing. Node
 * props (`title`, `description`, `qr`) are projected content, selected by
 * `[slot=title]`, `[slot=description]` and `[slot=qr]`. Requires a bonded
 * ClassMap and the bonded i18n provider.
 */
@Component({
  selector: 'div[mol-share-link-card]',
  standalone: true,
  imports: [CopyLinkField, Switch, NgTemplateOutlet],
  inputs: ['url', 'showQR', 'passwordProtect', 'className', 'dataMolId'],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
  },
  template: `<div #stack [class]="stackClasses()">
    <header #headerSlot [class]="headerClasses()">
      <h3 #titleSlot [class]="titleClasses()"><ng-content select="[slot=title]"></ng-content></h3>
      <p #descriptionSlot [class]="descriptionClasses()">
        <ng-content select="[slot=description]"></ng-content>
      </p>
    </header>
    <div mol-share-link-copy-field [value]="url ?? ''"></div>
    <div #qrSlot [class]="qrClasses()"><ng-content select="[slot=qr]"></ng-content></div>
    @if (passwordProtect) {
      <div [class]="passwordRowClasses()">
        <span [class]="cm().textSize('sm')">
          @if (nodeLabel()) {
            <ng-container *ngTemplateOutlet="nodeLabel()"></ng-container>
          } @else {
            {{ labelText() }}
          }
        </span>
        <mol-switch
          [checked]="passwordProtect.enabled"
          (change)="onSwitchChange($event)"
        ></mol-switch>
      </div>
    }
  </div>`,
})
export class ShareLinkCard implements AfterViewInit, DoCheck {
  /** The URL users can copy/share. */
  url?: string
  /** Whether the QR is visible. Defaults to false. */
  showQR?: boolean
  /** Password-protect toggle — pass to render the toggle row. */
  passwordProtect?: ShareLinkCardProps['passwordProtect']
  /** Extra classes on the outer Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string

  /** The stack container (the header's and QR wrapper's parent). */
  @ViewChild('stack') stack?: ElementRef<HTMLElement>
  /** The header wrapper. */
  @ViewChild('headerSlot') headerSlot?: ElementRef<HTMLElement>
  /** The `<h3>` title wrapper. */
  @ViewChild('titleSlot') titleSlot?: ElementRef<HTMLElement>
  /** The `<p>` description wrapper. */
  @ViewChild('descriptionSlot') descriptionSlot?: ElementRef<HTMLElement>
  /** The QR wrapper. */
  @ViewChild('qrSlot') qrSlot?: ElementRef<HTMLElement>

  /** Whether title content was projected (read once at view init). */
  private hasTitle = false
  /** Whether description content was projected (read once at view init). */
  private hasDescription = false
  /** Whether QR content was projected (read once at view init). */
  private hasQr = false

  /** The wrapper sync for React's conditional header/h3/p/QR rendering. */
  private readonly sync = new SlotWrapper(inject(ElementRef), inject(Renderer2))

  /** Reactive translations, read in the injection context. */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The Card's class list (React's `Card` defaults: elevated + md padding, plus
   * `className`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().card({ variant: 'elevated' }),
      this.cm().cardPadding('md'),
      this.className,
    )
  }

  /**
   * The inner stack's class (React's `cm.stack(3)`).
   * @returns The class string.
   */
  stackClasses(): string {
    return this.cm().stack(3)
  }

  /**
   * The header's class (React's `cm.stack(1)`).
   * @returns The class string.
   */
  headerClasses(): string {
    return this.cm().stack(1)
  }

  /**
   * The title's class (React's `cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))`).
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(this.cm().textSize('base'), this.cm().fontWeight('semibold'))
  }

  /**
   * The description's class (React's `cm.textSize('sm')`).
   * @returns The class string.
   */
  descriptionClasses(): string {
    return this.cm().textSize('sm')
  }

  /**
   * The QR wrapper's class (React's
   * `cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.sp('py', 2))`).
   * @returns The class string.
   */
  qrClasses(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', justify: 'center' }),
      this.cm().sp('py', 2),
    )
  }

  /**
   * The password row's class (React's
   * `cm.flex({ align: 'center', justify: 'between', gap: 'sm' })`).
   * @returns The class string.
   */
  passwordRowClasses(): string {
    return this.cm().flex({ align: 'center', justify: 'between', gap: 'sm' })
  }

  /**
   * The password row's node label, when one was passed as `TemplateRef`.
   * @returns The template, or null for a text/default label.
   */
  nodeLabel(): TemplateRef<unknown> | null {
    const label = this.passwordProtect?.label
    return label != null &&
      typeof label === 'object' &&
      typeof (label as { createEmbeddedView?: unknown }).createEmbeddedView === 'function'
      ? (label as TemplateRef<unknown>)
      : null
  }

  /**
   * The password row's text label (React's
   * `label ?? t('shareLink.passwordProtect', …)` for a string label).
   * @returns The label text.
   */
  labelText(): string {
    const label = this.passwordProtect?.label
    return typeof label === 'string'
      ? label
      : this.i18n.t('shareLink.passwordProtect', undefined, { defaultValue: 'Password protect' })
  }

  /**
   * Forwards the switch's new state to the configured callback (React's
   * `onChange={(e) => passwordProtect.onChange(e.target.checked)}`).
   *
   * @param event - The native `change` event.
   */
  onSwitchChange(event: Event): void {
    this.passwordProtect?.onChange((event.target as HTMLInputElement).checked)
  }

  /**
   * Reads the projected slots' presence (view queries resolve only at view
   * init) and applies React's conditional rendering.
   */
  ngAfterViewInit(): void {
    this.hasTitle = hasNodes(this.titleSlot?.nativeElement)
    this.hasDescription = hasNodes(this.descriptionSlot?.nativeElement)
    this.hasQr = hasNodes(this.qrSlot?.nativeElement)
    this.syncSlots()
  }

  /** Re-applies React's conditional rendering when `showQR` changes. */
  ngDoCheck(): void {
    this.syncSlots()
  }

  /** Attaches or detaches the header/h3/p/QR wrappers against the wanted DOM. */
  private syncSlots(): void {
    const stack = this.stack?.nativeElement
    const header = this.headerSlot?.nativeElement
    const title = this.titleSlot?.nativeElement
    const description = this.descriptionSlot?.nativeElement
    const qr = this.qrSlot?.nativeElement
    // Children first, so the header's own detach never loses their state.
    this.sync.sync(title, this.hasTitle, header)
    this.sync.sync(description, this.hasDescription, header)
    this.sync.sync(header, this.hasTitle || this.hasDescription, stack)
    this.sync.sync(qr, this.showQR === true && this.hasQr, stack)
  }
}
