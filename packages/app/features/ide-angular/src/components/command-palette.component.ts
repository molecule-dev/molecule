/**
 * Command Palette (⌘⇧P) — searchable command list overlay.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `CommandPalette` (see
 * that file for the design notes): the same inputs (React prop names), the
 * same DOM for the same input, the same callbacks. The rows are derived from
 * the commands — a `category: label` prefix, the shortcut as the detail beside
 * the label — and selecting one (Enter on the highlighted row, or a click)
 * runs its handler and dismisses the palette; Escape and the backdrop dismiss
 * without running anything.
 *
 * React's component renders no root of its own — it is the QuickPicker's
 * fragment of two roots — so the template's nodes render in front of the host
 * (`placeContentBefore`) and the host leaves the DOM (the same placement the
 * QuickPicker component runs for its own roots): the backdrop and the panel
 * never sit under a host element, and no host appears in a `@focus` path. The
 * overlay — the filter, the
 * keyboard, the rows — is the package's `QuickPicker`, rendered as the host's
 * one child
 * with the derived rows; the palette hands it its OWN placeholder
 * translation, so the picker's default never shows through it. The derived
 * rows are rebuilt only when the `commands` input is REPLACED (React's
 * `items` memo), so a change-detection pass alone never re-sets the picker's
 * highlight; the handler map is rebuilt per selection, so it always
 * dispatches the current command. All user-facing text goes through `t()`.
 *
 * @module
 */

import { Component, ElementRef, inject, type OnChanges, type SimpleChanges } from '@angular/core'

import {
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { Command } from '@molecule/app-ide-panel-logic'

import type { QuickPickerItem } from './quick-picker.component.js'
import { QuickPicker } from './quick-picker.component.js'

/**
 * Command palette overlay over the package's QuickPicker.
 */
@Component({
  selector: 'div[mol-command-palette]',
  standalone: true,
  imports: [QuickPicker],
  inputs: ['commands', 'onDismiss'],
  hostDirectives: [MolPlacement],
  // prettier-ignore
  template: `<div mol-quick-picker [items]="derivedItems" [onSelect]="pick" [onDismiss]="onDismiss" [placeholder]="placeholderText()"></div>`,
})
export class CommandPalette implements OnChanges {
  /** Available commands. */
  commands: Command[] = []

  /** Called when the palette is dismissed. */
  onDismiss: () => void = () => {}

  /**
   * The rows QuickPicker renders, rebuilt only when `commands` is replaced
   * (React's `items` memo), so a re-render alone never resets the picker.
   */
  protected derivedItems: QuickPickerItem[] = []

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** This component's host element, for the content adoption below. */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  constructor() {
    usePlacement(() => this.place())
  }

  /**
   * Renders the QuickPicker's nodes in front of the host and keeps the host out
   * of the DOM: React renders no element of its own here.
   */
  private place(): void {
    const host = this.host.nativeElement
    placeContentBefore(host, host)
    setElementPresent(host, false)
  }

  /**
   * React's re-render: a replaced `commands` prop re-derives the rows.
   * @param changes - The changed inputs.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['commands']) this.derivedItems = this.items()
  }

  /**
   * The rows QuickPicker renders: `category: label`, the shortcut as the
   * detail beside the label.
   * @returns The derived items, in the commands' order.
   */
  protected items(): QuickPickerItem[] {
    return this.commands.map((cmd) => ({
      id: cmd.id,
      label: cmd.category ? `${cmd.category}: ${cmd.label}` : cmd.label,
      detail: cmd.shortcut,
    }))
  }

  /**
   * The palette's placeholder, translated — its OWN key
   * (`ide.commandPalette.placeholder`), so the picker's default never shows.
   * @returns The placeholder text.
   */
  protected placeholderText(): string {
    return this.i18n.t('ide.commandPalette.placeholder', undefined, {
      defaultValue: 'Type a command…',
    })
  }

  /**
   * Selects a row: runs its command, then dismisses the palette — React's
   * `onSelect` body, with the handler looked up per call so it always
   * dispatches the CURRENT command of that row. An arrow FIELD, not a method:
   * the template binds the reference into the QuickPicker's input, and a
   * plain method reference would lose `this` when it is invoked.
   *
   * @param item - The selected row's item.
   */
  protected readonly pick = (item: QuickPickerItem): void => {
    this.commandMap().get(item.id)?.()
    this.onDismiss()
  }

  /**
   * The command handlers by id, rebuilt per call from the current commands
   * (React's `commandMap` memo, rebuilt when the commands are re-passed).
   * @returns The map.
   */
  private commandMap(): Map<string, () => void> {
    const map = new Map<string, () => void>()
    for (const cmd of this.commands) map.set(cmd.id, cmd.execute)
    return map
  }
}
