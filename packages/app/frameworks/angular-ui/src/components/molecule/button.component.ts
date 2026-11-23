/**
 * Angular Button UI component with UIClassMap-driven styling.
 *
 * @module
 */

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  Output,
  ViewChild,
} from '@angular/core'

import {
  MolPlacement,
  placeElementBefore,
  setElementPresent,
  usePlacement,
} from '@molecule/app-angular'
import type { ButtonVariant, ColorVariant, Size, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Angular Button UI component with UIClassMap-driven styling.
 *
 * React's root is the native `<button>`, so the button element of the
 * template renders in front of the host (`placeElementBefore`) and the host
 * itself leaves the page: the rendered tree is React's, with no wrapper
 * element around the button.
 */
@Component({
  selector: 'mol-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [MolPlacement],
  template: `
    <button
      #root
      [type]="type"
      [class]="classes"
      [style]="style"
      [attr.data-testid]="testId"
      [disabled]="disabled || loading"
      [attr.aria-busy]="loading"
      (click)="handleClick.emit($event)"
    >
      @if (loading) {
        <span [class]="cm.buttonSpinner"></span>
      }
      @if (loading && loadingText) {
        {{ loadingText }}
      } @else {
        <ng-content></ng-content>
      }
    </button>
  `,
})
/**
 * Molecule Button class.
 * @deprecated Use the React-named component `Button` instead.
 */
export class MoleculeButton {
  @Input() variant: ButtonVariant = 'solid'
  @Input() color: ColorVariant = 'primary'
  @Input() size: Size = 'md'
  @Input() loading = false
  @Input() loadingText?: string
  @Input() fullWidth = false
  @Input() className?: string
  @Input() style?: Record<string, string>
  @Input() testId?: string
  @Input() disabled = false
  @Input() type: 'button' | 'submit' | 'reset' = 'button'

  @Output() handleClick = new EventEmitter<MouseEvent>()

  /** The native button React renders as the component's root. */
  @ViewChild('root') root?: ElementRef<HTMLButtonElement>

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /** Renders the button in front of the host, which leaves the page. */
  constructor() {
    usePlacement(() => {
      const root = this.root?.nativeElement
      if (!root) return
      placeElementBefore(root, this.host.nativeElement)
      setElementPresent(this.host.nativeElement, false)
    })
  }

  /**
   * Retrieves the current UI class map.
   * @returns The UIClassMap instance for styling.
   */
  get cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the combined CSS classes for the button element.
   * @returns The button class name string.
   */
  get classes(): string {
    return this.cm.cn(
      this.cm.button({
        variant: this.variant,
        color: this.color,
        size: this.size,
        fullWidth: this.fullWidth,
      }),
      this.className,
    )
  }
}
