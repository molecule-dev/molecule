/**
 * `AuthShell` for Angular — the counterpart of
 * `@molecule/app-auth-shell-react`'s `AuthShell` preset: container, decoration,
 * card, heading, body, footer and back link composed into one component.
 *
 * The host `<div molAuthShell>` IS React's container root. It publishes the
 * shared auth-form state to descendants through a DOM-scoped context, so forms
 * inside read it via `useAuthFormStateContext()`.
 *
 * @module
 */

import {
  Component,
  ElementRef,
  EnvironmentInjector,
  inject,
  type OnDestroy,
  type OnInit,
  runInInjectionContext,
  ViewChild,
} from '@angular/core'

import {
  MolPlacement,
  setElementPresent,
  type SlotReader,
  usePlacement,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { AuthShellBackLink } from './auth-shell-primitives.component.js'
import { provideAuthFormState } from './form-state-context.js'
import type { UseAuthFormStateOptions } from './types.js'
import { useAuthFormState } from './use-auth-form-state.js'

/**
 * Convenience preset composing container, decoration, card, heading, footer
 * and back-link into a single component, publishing the shared auth-form state.
 */
@Component({
  selector: 'div[mol-auth-shell]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [AuthShellBackLink],
  inputs: ['heading', 'subheading', 'backTo', 'showBackLink', 'formStateStorage', 'formStateKey'],
  host: { '[class]': 'containerClasses()' },
  template: `<div #decorationSlot [class]="decorationClasses()">
      <ng-content select="[slot=decoration]"></ng-content>
    </div>
    <div>
      <main [class]="cardOuterClasses()">
        <div [class]="cardSurfaceClasses()">
          <ng-content select="[slot=brand]"></ng-content>
          <header [class]="headerClasses()">
            <h1 [class]="titleClasses()">{{ heading }}</h1>
            @if (subheading) {
              <p [class]="subheadingClasses()">{{ subheading }}</p>
            }
          </header>
          <ng-content></ng-content>
          <footer #footerSlot [class]="footerClasses()">
            <ng-content select="[slot=footer]"></ng-content>
          </footer>
        </div>
      </main>
      @if (showBackLinkValue()) {
        <p mol-auth-shell-back-link [to]="backToValue()"></p>
      }
    </div>`,
})
export class AuthShell implements OnInit, OnDestroy {
  /** The heading text. */
  heading = ''
  /** The subheading text. */
  subheading = ''
  /** Destination of the back link (defaults to `/` at read time). */
  backTo?: string
  /** Whether to render the back link (defaults to `true` at read time). */
  showBackLink?: boolean
  /** Storage provider backing cross-view auth form persistence. */
  formStateStorage?: UseAuthFormStateOptions['storage']
  /** Storage key for the persisted auth form state. */
  formStateKey?: string

  /** The capture element for the `decoration` slot. */
  @ViewChild('decorationSlot') decorationSlot?: ElementRef<HTMLElement>
  /** The capture element for the `footer` slot. */
  @ViewChild('footerSlot') footerSlot?: ElementRef<HTMLElement>

  private readonly injector = inject(EnvironmentInjector)
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement
  private teardown: (() => void) | null = null

  constructor() {
    usePlacement((hasContent) => this.reconcile(hasContent))
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The host container's class (centered layout).
   * @returns The class string.
   */
  containerClasses(): string {
    const cm = this.cm()
    return cm.cn(
      cm.flex({ align: 'center', justify: 'center' }),
      cm.minH('screen'),
      cm.sp('p', 6),
      cm.authShellContainer,
    )
  }

  /**
   * The decoration layer's class.
   * @returns The class string.
   */
  decorationClasses(): string {
    return this.cm().cn(this.cm().authShellDecoration)
  }

  /**
   * The outer card `<main>`'s class.
   * @returns The class string.
   */
  cardOuterClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.w('full'), cm.authShellCardOuter)
  }

  /**
   * The card's inner surface class.
   * @returns The class string.
   */
  cardSurfaceClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), cm.sp('p', 8), cm.authShellCardSurface)
  }

  /**
   * The heading wrapper's class.
   * @returns The class string.
   */
  headerClasses(): string {
    return this.cm().flex({ direction: 'col', align: 'center', gap: 'xs' })
  }

  /**
   * The h1's class.
   * @returns The class string.
   */
  titleClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.authShellHeadingTitle)
  }

  /**
   * The subheading paragraph's class.
   * @returns The class string.
   */
  subheadingClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('sm'), cm.authShellHeadingSub)
  }

  /**
   * The footer's class.
   * @returns The class string.
   */
  footerClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textCenter, cm.textSize('sm'), cm.authShellFooter)
  }

  /**
   * The back-link destination (React's `backTo = '/'` default parameter).
   * @returns The path.
   */
  backToValue(): string {
    return this.backTo ?? '/'
  }

  /**
   * Whether the back link renders (React's `showBackLink = true` default).
   * @returns True unless bound to `false`.
   */
  showBackLinkValue(): boolean {
    return this.showBackLink ?? true
  }

  /** Creates and publishes the shared auth-form state (inputs are available here). */
  ngOnInit(): void {
    const state = runInInjectionContext(this.injector, () =>
      useAuthFormState({
        storage: this.formStateStorage,
        storageKey: this.formStateKey,
      }),
    )
    this.teardown = provideAuthFormState(this.host, state)
  }

  /**
   * Keeps the decoration and footer wrappers out of the DOM while their slot is
   * empty.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private reconcile(hasContent: SlotReader): void {
    for (const slot of [this.decorationSlot, this.footerSlot]) {
      const element = slot?.nativeElement
      if (element) setElementPresent(element, hasContent(element))
    }
  }

  /** Removes the DOM-scoped registration. */
  ngOnDestroy(): void {
    this.teardown?.()
  }
}
