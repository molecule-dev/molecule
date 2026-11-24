/**
 * NodeEditorToggle component (React parity).
 *
 * @module
 */

import {
  type AfterViewChecked,
  Component,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core'

import { MolPlacement, rendersNode, setElementPresent, usePlacement } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Switch } from '@molecule/app-ui-angular'

/**
 * Next value of the module-wide toggle id counter.
 *
 * React derives the title and subtitle paragraphs' ids from `useId()`, which
 * numbers ids from one process-wide counter; the switch is named and described
 * by them, so the port generates ids from the same kind of counter — unique per
 * instance.
 */
let nextToggleId = 0

/**
 * NodeEditorToggle component.
 *
 * iOS-style switch row with an optional leading icon tile. The host IS the
 * outer `<div>` (`div[mol-node-editor-toggle]`), matching React's root exactly;
 * the switch is the `<mol-switch>` from `@molecule/app-ui-angular`.
 *
 * Node props are projected content: `title` is `[slot=title]` and `subtitle`
 * is `[slot=subtitle]`. Plain strings may also be passed as inputs.
 *
 * @remarks
 * The switch is named by the visible title paragraph (`aria-labelledby`) and
 * described by the subtitle (`aria-describedby`) — the same text a sighted user
 * reads beside it. An explicit `ariaLabel` overrides the title as the name.
 * Angular needs the `<ng-content>` capture point mounted, so the subtitle
 * paragraph stays in the template and leaves the page while it has nothing to
 * render; the placement function re-decides it whenever the slot changes.
 */
@Component({
  selector: 'div[mol-node-editor-toggle]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [Switch],
  inputs: ['title', 'subtitle', 'icon', 'checked', 'onChange', 'ariaLabel'],
  host: {
    '[class]': 'classes()',
  },
  template: `<div [class]="groupClasses()">
      @if (icon) {
        <div [class]="iconTileClasses()">
          <span [class]="iconClasses()">{{ icon }}</span>
        </div>
      }
      <div>
        <p [attr.id]="titleId" [class]="titleClasses()">
          @if (hasTitle) {
            {{ title }}
          }
          <ng-content select="[slot=title]" />
        </p>
        <p #subtitleEl [attr.id]="subtitleId" [class]="subtitleClasses()">
          @if (rendersSubtitle()) {
            {{ subtitle }}
          }
          <ng-content select="[slot=subtitle]" />
        </p>
      </div>
    </div>
    <mol-switch
      [size]="'sm'"
      [checked]="checked"
      data-mol-id="node-editor-toggle"
      (change)="handleChange($event)"
    ></mol-switch>`,
})
export class NodeEditorToggle implements AfterViewChecked {
  /** Row title — a string input, or `[slot=title]` projected content. */
  title?: unknown
  /** Optional second line — a string input, or `[slot=subtitle]` projected content. */
  subtitle?: unknown
  /** Material-symbols icon for the leading tile (omit for no tile). */
  icon?: string
  /** Whether the switch is on. */
  checked!: boolean
  /** Called with the switch's next checked state. */
  onChange?: (next: boolean) => void
  /** Accessible label for the switch (overrides the title paragraph as its name). */
  ariaLabel?: string

  /** The instance's id base for the title and subtitle paragraphs (where React's binding calls `useId()`). */
  private readonly instanceId = nextToggleId++
  /** The title paragraph's id, which names the switch unless `ariaLabel` overrides it. */
  readonly titleId = `node-editor-toggle-title-${this.instanceId}`
  /** The subtitle paragraph's id, which describes the switch when one renders. */
  readonly subtitleId = `node-editor-toggle-subtitle-${this.instanceId}`

  /** The host element (the root `<div>`). */
  private readonly host = inject(ElementRef)

  /** The optional subtitle paragraph (its projected nodes decide whether it shows). */
  @ViewChild('subtitleEl', { static: true }) private subtitleEl?: ElementRef<HTMLElement>

  /** Whether the subtitle paragraph renders (placement decides, so a refilled slot returns). */
  private readonly subtitleShown = signal(false)

  /**
   * Keeps the subtitle paragraph on the page only while it renders a text input
   * or projected `[slot=subtitle]` content, re-decided whenever either changes.
   */
  constructor() {
    usePlacement((hasContent) => {
      const subtitleEl = this.subtitleEl?.nativeElement
      const showSubtitle =
        rendersNode(this.subtitle) || (subtitleEl ? hasContent(subtitleEl) : false)
      this.subtitleShown.set(showSubtitle)
      setElementPresent(subtitleEl, showSubtitle)
    })
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Whether a string title input renders (a projected title is not).
   * @returns True when the title input renders as text.
   */
  get hasTitle(): boolean {
    return rendersNode(this.title)
  }

  /**
   * Whether the subtitle paragraph interpolates a string input.
   * @returns True when the subtitle input renders as text.
   */
  rendersSubtitle(): boolean {
    return rendersNode(this.subtitle)
  }

  /**
   * Whether the subtitle paragraph renders: a truthy string input or a
   * projected `[slot=subtitle]` element.
   * @returns True when the subtitle shows.
   */
  showSubtitle(): boolean {
    return rendersNode(this.subtitle) || this.subtitleShown()
  }

  /**
   * Applies the switch's accessible name and description to the element that
   * carries `role="switch"`.
   *
   * `<mol-switch>` moves host `aria-*` attributes onto its trigger button once,
   * at its own view check, so a binding that CLEARS later (the subtitle goes
   * away) would leave the moved copy behind on the button. Writing the three
   * attributes on the button on every pass keeps them in step with React's
   * render, removals included. Children check before their parent, so this runs
   * after the switch's own move.
   */
  ngAfterViewChecked(): void {
    const button = (this.host.nativeElement as HTMLElement).querySelector('button[role="switch"]')
    if (!button) return
    const attrs: [string, string | undefined][] = [
      ['aria-label', this.ariaLabel],
      // React names the switch by the title paragraph unless `ariaLabel` is given.
      ['aria-labelledby', this.ariaLabel === undefined ? this.titleId : undefined],
      ['aria-describedby', this.showSubtitle() ? this.subtitleId : undefined],
    ]
    for (const [name, value] of attrs) {
      if (value === undefined) button.removeAttribute(name)
      else button.setAttribute(name, value)
    }
  }

  /**
   * Forwards the switch's genuine native change event, reading the hidden
   * checkbox's `checked` at emit time (React reads `e.target.checked`).
   * @param event - The native change event.
   */
  handleChange(event: Event): void {
    this.onChange?.((event.target as HTMLInputElement | null)?.checked ?? false)
  }

  /**
   * The host's class list.
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(
      cm.sp('p', 4),
      cm.flex({ align: 'center', justify: 'between' }),
      cm.nodeEditorPanelToggleRow,
    )
  }

  /**
   * The left group's class list.
   * @returns The class string.
   */
  groupClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.flex({ align: 'center' }), cm.nodeEditorPanelToggleGroup)
  }

  /**
   * The icon tile's class list.
   * @returns The class string.
   */
  iconTileClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.sp('p', 2), cm.nodeEditorPanelToggleIconTile)
  }

  /**
   * The icon glyph's class list.
   * @returns The class string.
   */
  iconClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('sm'), cm.iconGlyphFont)
  }

  /**
   * The title's class list.
   * @returns The class string.
   */
  titleClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.nodeEditorPanelToggleTitle)
  }

  /**
   * The subtitle's class list.
   * @returns The class string.
   */
  subtitleClasses(): string {
    return this.cm().cn(this.cm().nodeEditorPanelToggleSubtitle)
  }
}
