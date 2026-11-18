/**
 * SettingsContainer component (React parity).
 *
 * @module
 */

import { Component, DestroyRef, ElementRef, inject } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { provideSettingsPanelContext } from './container-context.js'

/** Props for `SettingsContainer` — the same props React's `SettingsContainer` accepts. */
export interface SettingsContainerProps {
  /** Dismiss-the-panel handler, published to every section through context. */
  onClose?: () => void
  /**
   * The section sub-components to host. They are projected content in Angular
   * (an input cannot carry a node), so this is typed `unknown`: pass them in
   * the host template, not as a value.
   */
  children?: unknown
}

/**
 * SettingsContainer component.
 *
 * Outer settings-panel layout: padded vertical stack that hosts the section
 * sub-components (projected content). The host IS the `<div>` React renders
 * (`div[mol-settings-container]`), with `cm.sp('p', 6)` + `cm.stack(6)`.
 *
 * Publishes `onClose` to descendants via the settings-panel context so
 * `<LogOutDeleteSection>` etc. can dismiss the panel after an action without
 * explicit prop threading. The registration happens in the constructor, which
 * Angular runs before any projected child is created.
 */
@Component({
  selector: 'div[mol-settings-container]',
  standalone: true,
  inputs: ['onClose'],
  host: {
    '[class]': 'classes()',
  },
  template: `<ng-content></ng-content>`,
})
export class SettingsContainer {
  /** Closes the settings panel, published to sections through the container context. */
  onClose?: () => void

  private readonly host = inject(ElementRef)

  /** The context registration removal (set in the constructor). */
  private removeContext: () => void = () => {}

  /** Registers the container context before any projected child resolves it. */
  constructor() {
    this.removeContext = provideSettingsPanelContext(this.host.nativeElement, () => this.onClose)
    inject(DestroyRef).onDestroy(this.removeContext)
  }

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /**
   * Computes the container class list (`cm.sp('p', 6)` + `cm.stack(6)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm.cn(this.cm.sp('p', 6), this.cm.stack(6))
  }
}
