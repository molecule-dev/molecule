/**
 * MedicationRow component (React parity).
 *
 * @module
 */

import { Component, type ElementRef, ViewChild } from '@angular/core'

import {
  MolPlacement,
  setElementPresent,
  type SlotReader,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * The text a node value renders as when it is a plain string or number
 * (React's `{value}` for a text child; a node arrives as projected content).
 *
 * @param value - The prop value.
 * @returns The text, or `''` for a node value.
 */
const textOf = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : ''

/**
 * MedicationRow component.
 *
 * Medication record row — drug name, dosage/form, instructions, prescriber,
 * supply countdown, refills remaining. Used in medication-reminder,
 * patient-facing health portals, pharmacy dashboards. The host IS the card
 * `<div>` (`div[mol-medication-row]`), matching React's root exactly, so the
 * card's ClassMap classes are the host's.
 *
 * Node props (`name`, `dosage`, `form`, `instructions`, `prescriber`,
 * `actions`) are projected content (`[slot=<name>]`); plain strings are
 * inputs. The optional wrappers render only when React would render them —
 * Angular projection needs always-mounted capture points, so
 * {@link MedicationRow.reconcile} takes an unrendered wrapper out of the DOM
 * ({@link setElementPresent}).
 */
@Component({
  selector: 'div[mol-medication-row]',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: [
    'name',
    'dosage',
    'form',
    'color',
    'instructions',
    'prescriber',
    'supplyDays',
    'refills',
    'actions',
    'className',
  ],
  host: {
    '[class]': 'cardClasses()',
  },
  // prettier-ignore
  template: `<div [class]="rowClass()">@if (color) {<span aria-hidden="true" [class]="dotClass()" [style.width]="'24px'" [style.height]="'24px'" [style.background]="color"></span>}<div [class]="bodyClass()"><header [class]="headerClass()"><h3 [class]="nameClass()">@if (nameText()) {<ng-container>{{ nameText() }}</ng-container>}<ng-content select="[slot=name]"></ng-content></h3><span #dosageWrap [class]="dosageClass()">@if (dosageText()) {<ng-container>{{ dosageText() }}</ng-container>}<ng-content select="[slot=dosage]"></ng-content></span><span #formWrap [class]="smallClass()">@if (formText()) {<ng-container>{{ formText() }}</ng-container>}<ng-content select="[slot=form]"></ng-content></span></header><p #instructionsWrap [class]="instructionsClass()">@if (instructionsText()) {<ng-container>{{ instructionsText() }}</ng-container>}<ng-content select="[slot=instructions]"></ng-content></p><div [class]="metaClass()"><span #prescriberWrap [class]="smallClass()">{{ prescribedBy() }}@if (prescriberText()) {<ng-container>{{ prescriberText() }}</ng-container>}<ng-content select="[slot=prescriber]"></ng-content></span>@if (supplyDays !== undefined) {<span [class]="supplyClass()">· {{ supplyText() }}</span>}@if (refills !== undefined) {<span [class]="smallClass()">· {{ refillsText() }}</span>}</div></div><div #actionsWrap [class]="actionsClass()">@if (actionsText()) {<ng-container>{{ actionsText() }}</ng-container>}<ng-content select="[slot=actions]"></ng-content></div></div>`,
})
export class MedicationRow {
  /** Drug name — a string input, or `[slot=name]` projected content. */
  name?: unknown
  /** Dosage display — a string input, or `[slot=dosage]` projected content. */
  dosage?: unknown
  /** Form — a string input, or `[slot=form]` projected content. */
  form?: unknown
  /** Optional accent color (typically used to differentiate pill colors). */
  color?: string
  /** Instructions text — a string input, or `[slot=instructions]` content. */
  instructions?: unknown
  /** Prescriber display — a string input, or `[slot=prescriber]` content. */
  prescriber?: unknown
  /** Days of supply remaining. */
  supplyDays?: number
  /** Refills remaining. */
  refills?: number
  /** Right-side actions — a string input, or `[slot=actions]` projected content. */
  actions?: unknown
  /** Extra classes on the card. */
  className?: string

  /** The optional dosage span. */
  @ViewChild('dosageWrap') private dosageWrap?: ElementRef<HTMLElement>
  /** The optional form span. */
  @ViewChild('formWrap') private formWrap?: ElementRef<HTMLElement>
  /** The optional instructions paragraph. */
  @ViewChild('instructionsWrap') private instructionsWrap?: ElementRef<HTMLElement>
  /** The optional prescriber span. */
  @ViewChild('prescriberWrap') private prescriberWrap?: ElementRef<HTMLElement>
  /** The optional actions wrapper. */
  @ViewChild('actionsWrap') private actionsWrap?: ElementRef<HTMLElement>

  /** The i18n provider above the row. */
  private readonly i18n = useTranslation()

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
   * The card's class list (React's `Card` with no variant: the elevated card
   * plus medium padding, then `className`).
   * @returns The class string.
   */
  cardClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.card({ variant: 'elevated' }), cm.cardPadding('md'), this.className)
  }

  /**
   * The outer row's class list (`cm.flex({ align: 'start', gap: 'md' })`).
   * @returns The class string.
   */
  rowClass(): string {
    return this.cm().flex({ align: 'start', gap: 'md' })
  }

  /**
   * The pill-color dot's class list (`cm.cn(cm.shrink0, cm.roundedFull)`).
   * @returns The class string.
   */
  dotClass(): string {
    return this.cm().cn(this.cm().shrink0, this.cm().roundedFull)
  }

  /**
   * The name column's class list (`cm.cn(cm.flex1, cm.stack(1))`).
   * @returns The class string.
   */
  bodyClass(): string {
    return this.cm().cn(this.cm().flex1, this.cm().stack(1))
  }

  /**
   * The header row's class list (`cm.flex({ align: 'baseline', gap: 'sm', wrap: 'wrap' })`).
   * @returns The class string.
   */
  headerClass(): string {
    return this.cm().flex({ align: 'baseline', gap: 'sm', wrap: 'wrap' })
  }

  /**
   * The name heading's class list (`cm.cn(cm.textSize('base'), cm.fontWeight('bold'))`).
   * @returns The class string.
   */
  nameClass(): string {
    return this.cm().cn(this.cm().textSize('base'), this.cm().fontWeight('bold'))
  }

  /**
   * The dosage span's class list (`cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))`).
   * @returns The class string.
   */
  dosageClass(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('medium'))
  }

  /**
   * The small-text class (`cm.textSize('xs')`).
   * @returns The class string.
   */
  smallClass(): string {
    return this.cm().textSize('xs')
  }

  /**
   * The instructions paragraph's class (`cm.textSize('sm')`).
   * @returns The class string.
   */
  instructionsClass(): string {
    return this.cm().textSize('sm')
  }

  /**
   * The actions wrapper's class (`cm.shrink0`).
   * @returns The class string.
   */
  actionsClass(): string {
    return this.cm().cn(this.cm().shrink0)
  }

  /**
   * The meta row's class list (`cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })`).
   * @returns The class string.
   */
  metaClass(): string {
    return this.cm().flex({ align: 'center', gap: 'sm', wrap: 'wrap' })
  }

  /**
   * The supply span's class list (`cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))`).
   * @returns The class string.
   */
  supplyClass(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().fontWeight('semibold'))
  }

  /**
   * The name input's text (React's `{name}` for a text child).
   * @returns The text, or `''` for a node name.
   */
  nameText(): string {
    return textOf(this.name)
  }

  /**
   * The dosage input's text (React's `{dosage && …}` for a text child).
   * @returns The text, or `''` for a node dosage.
   */
  dosageText(): string {
    return textOf(this.dosage)
  }

  /**
   * The form input's text (React's `{form && …}` for a text child).
   * @returns The text, or `''` for a node form.
   */
  formText(): string {
    return textOf(this.form)
  }

  /**
   * The instructions input's text (React's `{instructions && …}` for a text child).
   * @returns The text, or `''` for node instructions.
   */
  instructionsText(): string {
    return textOf(this.instructions)
  }

  /**
   * The prescriber input's text (React's `{prescriber && …}` for a text child).
   * @returns The text, or `''` for a node prescriber.
   */
  prescriberText(): string {
    return textOf(this.prescriber)
  }

  /**
   * The actions input's text (React's `{actions && …}` for a text child).
   * @returns The text, or `''` for node actions.
   */
  actionsText(): string {
    return textOf(this.actions)
  }

  /**
   * The "Prescribed by" label, with the space React renders before the
   * prescriber display (`{t(…)} {prescriber}`).
   * @returns The translated label plus a trailing space.
   */
  prescribedBy(): string {
    return `${this.i18n.t('medication.prescribedBy', {}, { defaultValue: 'Prescribed by' })} `
  }

  /**
   * The translated supply line (`medication.supplyDays`).
   * @returns The text.
   */
  supplyText(): string {
    return this.i18n.t(
      'medication.supplyDays',
      { days: this.supplyDays ?? 0 },
      { defaultValue: '{{days}} day supply' },
    )
  }

  /**
   * The translated refills line (`medication.refills`).
   * @returns The text.
   */
  refillsText(): string {
    return this.i18n.t(
      'medication.refills',
      { refills: this.refills ?? 0 },
      { defaultValue: '{{refills}} refills' },
    )
  }

  /**
   * Applies React's conditions: a wrapper renders when its input holds a value
   * or its projected slot holds content (`{expr && <…>}`).
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private reconcile(hasContent: SlotReader): void {
    const dosage = this.dosageWrap?.nativeElement
    const form = this.formWrap?.nativeElement
    const instructions = this.instructionsWrap?.nativeElement
    const prescriber = this.prescriberWrap?.nativeElement
    const actions = this.actionsWrap?.nativeElement
    setElementPresent(dosage, Boolean(this.dosage) || hasContent(dosage))
    setElementPresent(form, Boolean(this.form) || hasContent(form))
    setElementPresent(instructions, Boolean(this.instructions) || hasContent(instructions))
    // The prescriber span always renders its label first, so the slot read
    // skips that one leading node.
    setElementPresent(prescriber, Boolean(this.prescriber) || hasContent(prescriber, 1))
    setElementPresent(actions, Boolean(this.actions) || hasContent(actions))
  }
}
